# ─────────────────────────────────────────────────────────────────────────────
# apps/api/Dockerfile — EmiTech API (Fastify)
# ─────────────────────────────────────────────────────────────────────────────
FROM node:20-alpine

RUN npm install -g pnpm

WORKDIR /app

# Copiar archivos de workspace
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json turbo.json tsconfig.base.json ./
COPY packages/database/package.json       ./packages/database/
COPY packages/database/tsconfig.json      ./packages/database/
COPY packages/database/prisma             ./packages/database/prisma/
COPY apps/api/package.json                ./apps/api/
COPY apps/api/tsconfig.json               ./apps/api/

# Instalar dependencias
RUN pnpm install --frozen-lockfile

# Copiar código fuente
COPY packages/database/src ./packages/database/src
COPY apps/api/src           ./apps/api/src

# Generar cliente Prisma y compilar
RUN pnpm --filter @emitech/database exec prisma generate
RUN pnpm --filter @emitech/database build
RUN pnpm --filter @emitech/api build

ENV NODE_ENV=production
EXPOSE 3001

# Correr migraciones y luego iniciar el servidor
CMD sh -c "cd /app/packages/database && npx prisma migrate deploy && cd /app/apps/api && node dist/server.js"
