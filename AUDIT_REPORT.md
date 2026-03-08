# 🔍 Auditoría Arquitectónica — Trelk Mini App
## Para +1M DAU en Producción

**Fecha:** Julio 2025  
**Estado actual:** Monolito NestJS + Fastify con frontend SSR (Handlebars + jQuery/Aj)

---

## 1. DIAGNÓSTICO CRÍTICO

### 🔴 Severidad CRÍTICA (Bloquea producción)

| # | Problema | Archivo(s) | Impacto |
|---|---------|-----------|---------|
| C1 | **MongoDB URI con credenciales hardcodeadas** | `app.module.ts` L14 | Cualquier leak del código expone la base de datos completa |
| C2 | **JWT_SECRET = 'secret'** (fallback por defecto) | `auth.service.ts`, `jwt.strategy.ts` | Tokens forjables por cualquier atacante |
| C3 | **`.env` con credenciales de Redis, Twilio, ePay, Azure IA** | `.env` (38 líneas de secrets) | Commit accidental = breach total |
| C4 | **Sin rate limiting en NINGÚN endpoint** | Global | Bot de 100 req/s tumba el servidor; brute-force en `/users/api` |
| C5 | **`updateConfig` acepta `$set` arbitrario en MongoDB** | `user.service.ts` L76 | Prototype pollution + escritura arbitrary en documentos de usuario |
| C6 | **Sin CORS configurado** | `main.ts` | Request forgery desde cualquier dominio |
| C7 | **Token de sesión expira en 1h sin refresh automático** | `auth.service.ts`, `cookie.strategy.ts` | 1M usuarios haciendo re-auth cada hora = 277 auth/seg constantes |

### 🟠 Severidad ALTA (Degrada rendimiento/escalabilidad)

| # | Problema | Archivo(s) | Impacto |
|---|---------|-----------|---------|
| A1 | **Templates leídos con `readFileSync` en cada request** | `template.service.ts` | I/O bloqueante en cada navegación AJAX |
| A2 | **Sin Redis** — sesiones y caché solo en MongoDB | Global | Cada request = query a MongoDB; no escala a 1M DAU |
| A3 | **Sin health check ni readiness probe** | Global | Kubernetes/Docker no puede saber si el pod está vivo |
| A4 | **Sin connection pooling explícito para Mongoose** | `app.module.ts` | Conexiones agotadas bajo carga |
| A5 | **Sin compresión (gzip/brotli)** | `main.ts` | Payloads 3-4x más grandes de lo necesario |
| A6 | **`console.log` como único logging** | Todo el proyecto | Sin niveles, sin rotación, sin correlación de requests |
| A7 | **Sin IndexedDB/localStorage en frontend para caché** | `trelk.js` | Cada navegación re-descarga HTML/JS del servidor |

### 🟡 Severidad MEDIA (Deuda técnica)

| # | Problema | Archivo(s) | Impacto |
|---|---------|-----------|---------|
| M1 | **Dead code:** `TwoFactorAuthService` vacío | `twofactor.service.ts` | Confusión para devs + peso en bundle |
| M2 | **Dead code:** `TranslateService` 100% comentado | `translate.service.ts` | Instanciado en `main.ts` sin usar |
| M3 | **Dead code:** `AjaxRedirectMiddleware` no funciona en Fastify | `ajax-redirect.middleware.ts` | Reemplazado por `rewriteUrl`, quedó obsoleto |
| M4 | **Dead code:** `telegram.strategy.ts` deprecated | `telegram.strategy.ts` | Confusión sobre qué validación se usa |
| M5 | **Dependencias fantasma:** `nest`, `nestjs`, `hbs`, `inquirer` | `package.json` | Paquetes inútiles que agregan superficie de ataque |
| M6 | **`forwardRef()` circular entre AuthModule ↔ UserModule** | `auth.module.ts`, `user.module.ts` | Fragil, difícil de testear, memory leaks potenciales |
| M7 | **Sin API versioning** | Global | Cambios breaking rompen clientes existentes |
| M8 | **Sin Swagger/OpenAPI** | Global | Sin documentación auto-generada para endpoints |
| M9 | **Sin tests** de ningún tipo | Global | Sin red de seguridad para refactors |
| M10 | **Frontend monolítico** (2246 líneas en un solo JS) | `trelk.js` | Imposible tree-shake, cachear por módulo, o debuggear |

---

## 2. PLAN DE ACCIÓN IMPLEMENTADO

### Fase 1: Seguridad + Configuración (Este commit)
- [x] ConfigModule con validación Joi de env vars
- [x] Rate limiting con @nestjs/throttler
- [x] CORS restrictivo
- [x] Helmet headers via Fastify
- [x] Sanitización de `updateConfig`
- [x] Sesiones de 24h con refresh automático
- [x] Template caching en `TemplateService`
- [x] Health check endpoint
- [x] Eliminar dead code
- [x] Limpiar dependencias

### Fase 2: Redis + Rendimiento
- [x] Redis para caché de sesiones (con fallback a MongoDB)
- [x] Compresión gzip/brotli
- [x] Mongoose connection pooling

### Fase 3: Frontend Vite (scaffold)
- [x] Proyecto separado `app/frontend/` con Vite
- [x] Misma estructura de clases y flujo Aj/jQuery
- [x] Build estático servido por NestJS o nginx

### Fase 4: Docker + DevOps
- [x] Dockerfile multi-stage
- [x] docker-compose.yml con MongoDB + Redis
- [x] nginx.conf de producción
- [x] Health checks para orquestadores

---

## 3. MÉTRICAS OBJETIVO POST-IMPLEMENTACIÓN

| Métrica | Antes | Después |
|---------|-------|---------|
| Secrets hardcoded | 3+ | 0 |
| Rate limiting | ninguno | 100 req/min global, 10/min auth |
| Template I/O por request | 1 readFileSync | 0 (cache en memoria) |
| Session TTL | 1h fijo | 24h con sliding window |
| Health endpoint | inexistente | GET /health |
| Dead code files | 4 | 0 |
| Dependencias innecesarias | 5+ | 0 |
| Docker ready | no | sí |
| Compresión | no | gzip + brotli |
