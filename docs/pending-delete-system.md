# Pending Delete System (Undo Actions)

Sistema de eliminación diferida con ventana de undo, gestionado por worker BullMQ.
Soporta dos modos configurables via env: **Aware** (backend BullMQ) y **Persistent** (localStorage).

## Arquitectura — Strategy Pattern

```
                    ┌─────────────────────┐
                    │   UndoStrategy      │  (interface)
                    │   push() / undo()   │
                    └─────┬───────┬───────┘
                          │       │
             ┌────────────┘       └────────────┐
             ▼                                 ▼
  ┌──────────────────┐             ┌──────────────────────┐
  │ AwareUndoStrategy│             │PersistentUndoStrategy│
  │ (backend+BullMQ) │             │  (localStorage)      │
  └──────────────────┘             └──────────────────────┘

  Factory: createUndoStrategy(mode?) → reads VITE_UNDO_MODE
  Fallback: if aware fails → auto-switch to persistent
```

### Modo Aware (default)

```
Usuario → DELETE endpoint → marca pending_delete → BullMQ job (6s delay)
                                                       ↓
                                               Worker ejecuta delete real
                                                       
Usuario → POST /undo → cancela job + restaura doc
```

### Modo Persistent

```
Usuario → DELETE endpoint → hard delete inmediato
Frontend guarda rollbackData en localStorage + timer local
Si Undo → re-crea el dato via API con rollbackData
Si no Undo → timer limpia localStorage
```

## Variables de entorno

| Variable | Default | Descripción |
|----------|---------|-------------|
| `VITE_UNDO_MODE` | `aware` | `aware` (backend) o `persistent` (localStorage) |
| `VITE_UNDO_DELAY_MS` | `6000` | Duración de la ventana de undo (ms) |
| `VITE_UNDO_MAX_STACK` | `5` | Máximo de acciones undo simultáneas |

## Flujo completo (modo Aware)

1. **Delete**: El endpoint marca documentos con `status: 'pending_delete'`, `pendingDeleteAt`, `deleteJobId`
2. **Queue**: Se crea un job BullMQ con delay de 6 segundos
3. **Frontend**: UI se actualiza inmediatamente (optimistic), muestra UndoToast con botón Undo + CountdownRing
4. **Si Undo**: El endpoint `/undo` restaura `status: 'active'` y cancela el job en BullMQ
5. **Si no Undo**: Tras 6s, el worker ejecuta `deleteMany()` sobre los documentos que siguen en `pending_delete`

## Campos añadidos a los schemas

```typescript
status: 'active' | 'pending_delete'   // default: 'active'
pendingDeleteAt: number | null         // timestamp de expiración
deleteJobId: string | null             // ID del job BullMQ
```

**Índice**: `{ status: 1, pendingDeleteAt: 1 }`

## Módulos implementados

### Backend (NestJS)

- **PendingDeleteModule** (`/src/modules/pending-delete/`) — Módulo global con `PendingDeleteService`
- **PendingDeleteService** — Servicio genérico con métodos:
  - `schedule(entity, model, ids, userId, delayMs)` — Marca items y agenda job
  - `scheduleAll(entity, model, userId, filter, delayMs)` — Marca todos los items matching
  - `cancel(model, ids, userId)` — Undo por IDs específicos
  - `cancelByJobId(model, jobId, userId)` — Undo por jobId (para "delete all")

### Worker (app-workers)

- **Queue**: `finalize-delete` en `/src/queues/pendingDelete.queue.ts`
- **Worker**: `/src/workers/pendingDelete.worker.ts`
  - Soporta entidades: `favorite`, `history`, `command_favorite`
  - Verifica que el doc sigue en `pending_delete` antes de eliminar
  - Métricas: processed, deleted, skipped, errors

### Frontend — Strategy Pattern

- **Estrategias** (`/src/lib/undo-system/strategies/`):
  - `UndoStrategy` — Interface: `push()`, `undo()`, `dispose()`
  - `AwareUndoStrategy` — Backend BullMQ (timers auto-remove)
  - `PersistentUndoStrategy` — localStorage + timers locales
- **Factory** (`/src/lib/undo-system/factory.ts`):
  - `createUndoStrategy(mode?)` — Lee `VITE_UNDO_MODE`
  - `switchStrategy(mode)` — Cambio en runtime (fallback)
- **Config** (`/src/lib/undo-system/config.ts`):
  - `getUndoConfig()` → `{ mode, delayMs, maxStack }`
- **useUndoStore** (`/src/hooks/useUndo.ts`) — Zustand store delegando a la estrategia activa
- **UndoToast** (`/src/components/UndoToast.tsx`) — Toast unificado con CountdownRing (mismo estilo que Toast global)

## Endpoints

### Favoritos

| Método | Ruta | Descripción |
|--------|------|-------------|
| DELETE | `/api/v1/ui/favorites/:id` | Marca como pending_delete |
| POST | `/api/v1/ui/favorites/batch-delete` | Marca batch como pending_delete |
| POST | `/api/v1/ui/favorites/undo` | Undo (body: `{ ids: string[] }`) |

### Historial

| Método | Ruta | Descripción |
|--------|------|-------------|
| DELETE | `/api/v1/ui/history` | Marca como pending_delete (body: `{ ids? }`) |
| POST | `/api/v1/ui/history/undo` | Undo (body: `{ ids?, jobId? }`) |

### Command Favorites

| Método | Ruta | Descripción |
|--------|------|-------------|
| DELETE | `/api/v1/ui/command-favorites/:command` | Marca como pending_delete |
| POST | `/api/v1/ui/command-favorites/undo` | Undo (body: `{ commands?, jobId? }`) |

## Respuesta de los endpoints DELETE

```json
{
  "ok": true,
  "status": "pending_delete",
  "expiresAt": 1710000000000,
  "jobId": "pd:favorite:123:1710000000000",
  "count": 1
}
```

## Cómo añadir un nuevo módulo

1. **Schema**: Añadir campos `status`, `pendingDeleteAt`, `deleteJobId` + índice `{ status: 1, pendingDeleteAt: 1 }`

2. **Service**: Inyectar `PendingDeleteService` y usarlo en los métodos de delete:
   ```typescript
   constructor(
     @InjectModel(MyEntity.name, 'mbot') private readonly model: Model<MyDoc>,
     private readonly pendingDelete: PendingDeleteService,
   ) {}

   async delete(id: string, userId: number) {
     return this.pendingDelete.schedule('my_entity', this.model, [id], userId);
   }

   async undoDelete(ids: string[], userId: number) {
     return this.pendingDelete.cancel(this.model, ids, userId);
   }
   ```

3. **Controller**: Añadir endpoint `POST /undo`

4. **Worker** (`app-workers/src/workers/pendingDelete.worker.ts`):
   - Añadir modelo en `db/client.ts`
   - Añadir case en `getModel()`:
     ```typescript
     case 'my_entity': return MyEntityModel;
     ```

5. **Frontend**: Usar `useUndoStore.getState().push(...)` para registrar la acción undo

## Edge cases manejados

- **Undo después de expiración** → Error limpio `400 Bad Request`
- **Doble delete** → Idempotente (no marca lo que ya está en `pending_delete`)
- **Worker ejecuta mientras undo** → El worker verifica `status: 'pending_delete'` antes de borrar
- **App reload** → Items en `pending_delete` no se muestran (filtrados en queries)
- **Múltiples undos simultáneos** → Máximo configurable via `VITE_UNDO_MAX_STACK` (default: 5)
- **Fallback automático** → Si `aware` falla, auto-switch a `persistent`
- **Strategy swap** → `switchStrategy('persistent')` disponible en runtime
