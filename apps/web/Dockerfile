# ─────────────────────────────────────────────────────────────────────────────
# apps/web/Dockerfile — EmiTech Panel Web (Next.js)
# NEXT_PUBLIC_API_URL se pasa como build-arg (se hornea en el bundle)
# ─────────────────────────────────────────────────────────────────────────────
FROM node:20-alpine

# Prisma necesita OpenSSL en Alpine
RUN apk add --no-cache openssl

RUN npm install -g pnpm

WORKDIR /app

# Copiar archivos de workspace
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json turbo.json tsconfig.base.json ./
COPY packages/database/package.json       ./packages/database/
COPY packages/database/tsconfig.json      ./packages/database/
COPY packages/database/prisma             ./packages/database/prisma/
COPY apps/web/package.json                ./apps/web/

# Instalar dependencias
RUN pnpm install --frozen-lockfile

# Copiar código fuente
COPY packages/database/src ./packages/database/src
COPY apps/web              ./apps/web

# Generar tipos de Prisma y compilar database
RUN pnpm --filter @emitech/database exec prisma generate
RUN pnpm --filter @emitech/database build

# URL de la API (debe ser la IP pública del droplet)
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_TELEMETRY_DISABLED=1

# Build del panel web
RUN pnpm --filter @emitech/web build

ENV NODE_ENV=production
EXPOSE 3000

WORKDIR /app/apps/web
CMD ["pnpm", "start"]
