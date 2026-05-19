# Trelk Mini Web App

![NestJS](https://img.shields.io/badge/NestJS-11-E0234E?style=flat-square&logo=nestjs)
![Fastify](https://img.shields.io/badge/Fastify-5-000000?style=flat-square&logo=fastify)
![TypeScript](https://img.shields.io/badge/TypeScript-6-3178C6?style=flat-square&logo=typescript)
![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react)
![MongoDB](https://img.shields.io/badge/MongoDB-8-47A248?style=flat-square&logo=mongodb)
![Redis](https://img.shields.io/badge/Redis-7-DC382D?style=flat-square&logo=redis)
![Docker](https://img.shields.io/badge/Docker-ready-2496ED?style=flat-square&logo=docker)
![License](https://img.shields.io/badge/license-MIT-green?style=flat-square)

Backend API + frontend para el ecosistema de mini apps de Telegram de **Trelk**. Expone todos los servicios que consumen los bots y las Telegram Web Apps: autenticación vía Telegram Init Data, reseñas, pagos, gamificación, análisis, moderación de contenido, notificaciones en tiempo real y mucho más.

---

## 🚀 Demo

<!-- view on telegra in trelkbot -->

> 🤖 **Bot App:** [@TrelkBot](https://t.me/TrelkBot/trelkdocs)

---

## 🧠 ¿Qué problema resuelve?

Las mini apps de Telegram necesitan una capa de backend cohesiva que unifique en un solo servicio:

- Autenticación sin passwords (Telegram Init Data + JWT)
- Sistema de reseñas con moderación automática de contenido y resúmenes con IA
- Gamificación (puntos, logros, racha diaria)
- Pagos (ePayco)
- Notificaciones push y eventos en tiempo real vía SSE
- Recomendaciones personalizadas por usuario
- Análisis de uso y métricas de comandos de bot
- Internacionalización en 40+ idiomas

---

## ⚙️ Tech Stack

### Backend

| Capa | Tecnología | Por qué |
|---|---|---|
| Framework | NestJS 11 + Fastify 5 | DI estructurado, alto rendimiento HTTP |
| Lenguaje | TypeScript 6 | Type safety end-to-end |
| Base de datos | MongoDB 8 + Mongoose | Esquemas flexibles, queries documentales |
| Caché / sesiones | Redis 7 + ioredis | TTL nativo, pub/sub para SSE |
| Colas | BullMQ 5 | Jobs con retry, delays y cron |
| Autenticación | Passport JWT + Telegram Init Data | Sin contraseñas, nativo de Telegram |
| Validación | class-validator + class-transformer | Decoradores, DTOs automáticos |
| Rate limiting | @nestjs/throttler + Nginx | Doble capa: app + proxy |
| Moderación | @moderation-api/sdk | Detección automática de contenido ofensivo |
| Traducciones | @parvineyvazov/json-translator | i18n automático con IA |
| Infra | Docker + Nginx | Contenedores con rolling deploy |

### Frontend

| Capa | Tecnología |
|---|---|
| UI | React 19 + TypeScript 5 |
| Build | Vite 6 + Cloudflare Workers (wrangler) |
| Estilos | Tailwind CSS 3 |
| Estado | Zustand 5 |
| Datos async | TanStack Query v5 |
| Animaciones | Framer Motion 12 |
| i18n | react-i18next 15 |
| Offline | Dexie (IndexedDB) |
| Router | React Router DOM 7 |

---

## 🏗 Arquitectura

```
┌─────────────────────────────────────────────────────┐
│                    Telegram Client                  │
│              (Bot / Mini Web App)                   │
└──────────────┬──────────────────────────────────────┘
               │ HTTPS
┌──────────────▼──────────────────────────────────────┐
│              Nginx (Reverse Proxy)                  │
│  Rate limiting · Gzip · Cache · Security headers    │
└──────────────┬──────────────────────────────────────┘
               │ HTTP (keepalive pool)
┌──────────────▼──────────────────────────────────────┐
│         NestJS 11 / Fastify 5 (API)                 │
│                                                     │
│  ┌──────────┐ ┌──────────┐ ┌──────────────────────┐│
│  │   Auth   │ │ Reviews  │ │  Gamification / Stats ││
│  │ Payments │ │Moderation│ │  Recommendations / AI ││
│  │  Search  │ │Analytics │ │  Realtime (SSE)       ││
│  └──────────┘ └──────────┘ └──────────────────────┘│
└───────┬────────────┬────────────────────────────────┘
        │            │
┌───────▼────┐ ┌─────▼──────┐
│  MongoDB 8 │ │  Redis 7   │
│ (datos)    │ │(caché/colas)│
└────────────┘ └────────────┘

Frontend → Cloudflare Pages (CDN edge)
```

---

## 🔥 Módulos principales

| Módulo | Descripción |
|---|---|
| `auth` | Login vía Telegram Init Data, emisión de JWT |
| `users` / `users-ui` | Perfil, configuración, UI personalizada |
| `reviews` | CRUD de reseñas con paginación y filtros |
| `review-summary` | Resumen de reseñas con IA |
| `review-replies` | Respuestas a reseñas |
| `review-helpful` | Sistema de votos "útil" |
| `moderation` | Análisis automático de contenido con Moderation API |
| `ratings` | Cálculo de puntuación ponderada |
| `gamification` | Puntos, logros, racha diaria |
| `payments` | Integración ePayco |
| `realtime` | Server-Sent Events (SSE) para notificaciones live |
| `notifications` | Historial de notificaciones por usuario |
| `analytics` / `analytics-tracking` | Eventos de uso, funnel de conversión |
| `command-stats` / `command-reliability` | Métricas de comandos del bot |
| `recommendations` | Recomendaciones personalizadas |
| `search` | Búsqueda full-text en MongoDB |
| `translator` | i18n dinámico con traducción automática |
| `github-webhook` | CI/CD triggers desde GitHub |
| `security` | Auditoría de acciones sensibles |
| `reports` | Sistema de denuncias con flujo de moderación |
| `abuse` | Detección y bloqueo de abuso |
| `health` | Liveness / readiness endpoints |

---

## 🧪 Cómo ejecutar

### Docker (recomendado)

```bash
cp .env.example .env
# Editar .env con valores reales

docker compose up -d
# API disponible en http://localhost:3008
# Docs en http://localhost:3008/docs
```

### Local (desarrollo)

```bash
npm install
cp .env.example .env
# Editar .env

npm run start:dev
```

### Frontend (Cloudflare Pages)

```bash
cd frontend
npm install
cp .env.example .env   # configurar VITE_API_URL

npm run dev            # desarrollo local
npm run deploy         # build + wrangler deploy a Cloudflare
```

---

## 🔑 Variables de entorno

| Variable | Descripción | Requerida |
|---|---|---|
| `NODE_ENV` | `development` / `production` | ✅ |
| `PORT` | Puerto de la API (default: 3008) | — |
| `MONGODB_URI` | URI de conexión MongoDB Atlas | ✅ |
| `JWT_SECRET` | Secreto JWT (≥ 32 chars) | ✅ |
| `JWT_EXPIRATION` | TTL del token en segundos | ✅ |
| `BOT_TOKEN` | Token del bot de Telegram | ✅ |
| `TG_AUTH_MAX_AGE` | Edad máxima del Init Data (segundos) | ✅ |
| `REDIS_ENABLED` | Activar Redis (`true`/`false`) | — |
| `REDIS_HOST` | Host de Redis | Condicional |
| `REDIS_PORT` | Puerto de Redis | Condicional |
| `REDIS_USERNAME` | Usuario Redis (si TLS) | — |
| `REDIS_PASSWORD` | Contraseña Redis | — |
| `CORS_ORIGINS` | Orígenes permitidos (comma-separated) | ✅ |
| `THROTTLE_TTL` | Ventana de rate limiting (ms) | — |
| `THROTTLE_LIMIT` | Máx. requests por ventana | — |
| `EPAYCO_BASE_URL` | URL base de ePayco | — |
| `EPAYCO_P_KEY` | Private key de ePayco | — |

Ver `.env.example` para la lista completa.

---

## 🧠 Decisiones técnicas

**NestJS sobre Express/Fastify bare-metal** — el sistema de módulos de NestJS permite escalar el equipo sin colisiones: cada dominio vive en su propio módulo con inyección de dependencia explícita.

**Fastify como adapter** — en benchmarks internos Fastify procesa un 30-40 % más requests/s que el adapter Express de NestJS, sin cambiar nada en la lógica de negocio.

**Redis opcional** — el flag `REDIS_ENABLED` permite desplegar en ambientes sin Redis (menor coste en staging); los módulos de caché degradan a no-op transparentemente.

**SSE sobre WebSockets** — para notificaciones push unidireccionales SSE es suficiente y mucho más simple de escalar detrás de proxies HTTP/2 sin estado.

**Moderation API externa** — externalizar la moderación de contenido evita mantener modelos propios y permite actualizaciones de políticas sin redeployar.

**Cloudflare Workers para el frontend** — el frontend se despliega en el edge de Cloudflare (0 ms TTFB percibido), desacoplado del ciclo de deploy del backend.

---

## 📄 Licencia

MIT © Trelk
