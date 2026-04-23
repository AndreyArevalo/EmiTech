# EmiTech — Inicio Rápido

## 1. Pre-requisitos
- Node.js 20+
- Docker Desktop (para Postgres + Redis local)

## 2. Variables de entorno
```bash
cp .env.example .env
# Editar .env con tus credenciales
```

## 3. Levantar base de datos y Redis
```bash
docker-compose up -d
```

## 4. Instalar dependencias
```bash
npm install
```

## 5. Generar cliente Prisma + migrar DB
```bash
npm run db:generate
npm run db:migrate
```

## 6. Cargar datos de prueba
```bash
cd packages/database && npm run db:seed
# Usuario: admin@geminis.com / emitech2024
```

## 7. Iniciar en desarrollo
```bash
npm run dev
# API →  http://localhost:3001
# Web →  http://localhost:3000
```

## 8. Configurar WhatsApp (Meta)
1. Crear app en https://developers.facebook.com
2. Activar "WhatsApp Business API"
3. Copiar `Phone Number ID`, `Access Token` y `Business ID`
4. En el panel web → Configuración → Conexión WhatsApp → pegar datos
5. Registrar webhook: `https://tu-api.railway.app/api/whatsapp/webhook`
   - Verify Token: el valor de `META_WEBHOOK_VERIFY_TOKEN` en tu `.env`
   - Suscribir a: `messages`

## Deploy en Railway
1. Push a GitHub
2. Crear proyecto en Railway → conectar repo
3. Agregar PostgreSQL y Redis como plugins
4. Configurar variables de entorno (copiar de `.env`)
5. Deploy automático ✅

## Credenciales demo
- Email: `admin@geminis.com`
- Password: `emitech2024`
- Salón: Geminis Salón (slug: `geminis-demo`)
