# ============================================================
# Trelk Mini App — Multi-stage Dockerfile
# ============================================================
# Build: docker build -t trelk-app .
# Run:   docker run -p 3008:3008 --env-file .env trelk-app
# ============================================================

# === Stage 1: Build ===
FROM node:20-alpine AS builder

WORKDIR /app

# Copiar archivos de dependencias primero (cache layer)
COPY package.json package-lock.json* ./

# Instalar dependencias
RUN npm ci --only=production && \
    cp -R node_modules /tmp/prod_modules && \
    npm ci

# Copiar código fuente
COPY tsconfig.json nest-cli.json ./
COPY src/ src/
COPY views/ views/
COPY public/ public/

# Build TypeScript
RUN npx nest build

# === Stage 2: Production ===
FROM node:20-alpine AS production

# Crear usuario no-root por seguridad
RUN addgroup -g 1001 -S trelk && \
    adduser -S trelk -u 1001 -G trelk

WORKDIR /app

# Copiar solo los artefactos necesarios
COPY --from=builder /tmp/prod_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/views ./views
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./

# Crear directorios necesarios con permisos correctos
RUN mkdir -p logs tmp && \
    chown -R trelk:trelk /app

# Cambiar a usuario no-root
USER trelk

# Health check integrado
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:3008/health/live || exit 1

# Exponer puerto
EXPOSE 3008

# Variables de entorno por defecto
ENV NODE_ENV=production
ENV PORT=3008

# Arrancar la aplicación
CMD ["node", "dist/main.js"]
