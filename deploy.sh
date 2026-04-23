#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
# deploy.sh — Script de despliegue EmiTech en DigitalOcean
# Uso: bash deploy.sh
# ─────────────────────────────────────────────────────────────────────────────
set -e

echo ""
echo "🚀 Desplegando EmiTech..."
echo ""

# Verificar que existe el .env
if [ ! -f ".env" ]; then
  echo "❌ No se encontró el archivo .env"
  echo "   Copia .env.example como .env y llena los valores reales:"
  echo "   cp .env.example .env && nano .env"
  exit 1
fi

# Verificar que Docker está instalado
if ! command -v docker &> /dev/null; then
  echo "❌ Docker no está instalado. Instalando..."
  curl -fsSL https://get.docker.com | sh
  echo "✅ Docker instalado"
fi

# Verificar que Docker Compose está disponible
if ! docker compose version &> /dev/null; then
  echo "❌ Docker Compose no disponible"
  exit 1
fi

echo "📦 Construyendo imágenes y levantando servicios..."
docker compose -f docker-compose.prod.yml up -d --build

echo ""
echo "⏳ Esperando que la base de datos esté lista..."
sleep 10

# Mostrar estado de los contenedores
echo ""
echo "📊 Estado de los servicios:"
docker compose -f docker-compose.prod.yml ps

# Obtener IP pública del servidor
IP=$(curl -s ifconfig.me 2>/dev/null || echo "TU_IP")

echo ""
echo "✅ ¡EmiTech desplegado!"
echo ""
echo "   🌐 Panel admin:  http://$IP"
echo "   🔌 API:          http://$IP:3001"
echo "   🤖 Webhook Meta: http://$IP:3001/api/whatsapp/webhook"
echo ""
echo "📋 Ver logs en tiempo real:"
echo "   docker compose -f docker-compose.prod.yml logs -f api"
echo "   docker compose -f docker-compose.prod.yml logs -f web"
echo ""
