# 📋 Diagnóstico de Issues - WhatsApp Bot

**Fecha:** 23 de abril, 2026  
**Base de datos:** PostgreSQL emitech  
**Conversación analizada:** 573156191389 (301 mensajes)

---

## ❌ ISSUE 1: Botón "Cancelar" causa reinicio del flujo

### Problema
Cuando el usuario intenta hacer clic en "✏️ Corregir datos", el bot reinicia desde el saludo inicial en lugar de mostrar las opciones para corregir.

### Causa
En `bot.service.ts` línea 22, la función `isReset()` incluye la palabra **"cancelar"**:

```typescript
function isReset(text: string): boolean {
  return ["menu","menú","inicio","start","hola","buenas","buenos días","buenas tardes","buenas noches","cancelar"]
    .some(k => text.trim().toLowerCase() === k || ...);
}
```

Cuando Meta Cloud API envía la respuesta del botón "no" (ID: "no"), el código evalúa `isReset()` primero (línea 391), antes de evaluar `isNo()` (línea 628). 

Aunque "cancelar" está también en `isNo()`, el flujo nunca llega ahí porque se detiene en el check de reset.

### Solución
**Remover "cancelar" de `isReset()`** y mantenerlo solo en `isNo()`:

```typescript
function isReset(text: string): boolean {
  return ["menu","menú","inicio","start","hola","buenas","buenos días","buenas tardes","buenas noches"]
    .some(k => text.trim().toLowerCase() === k || text.trim().toLowerCase().startsWith(k + " "));
}
```

### Archivos a modificar
- `apps/api/src/modules/whatsapp/bot.service.ts` (línea 22)

---

## ✅ ISSUE 2: Número de teléfono diferente (NO ES UN BUG)

### Lo que ves
- Panel Admin: `+573154385745` (Teléfono Admin)
- Base de datos: `573156191389` (Teléfono del cliente)

### Explicación
**Esto es correcto y esperado.** El sistema funciona así:

1. **Teléfono Admin** (`+573154385745`): Número de configuración del salón en el panel
2. **Teléfono Cliente** (`573156191389`): Número de quien inició la conversación con el bot

Cuando un cliente envía un mensaje a tu WhatsApp del salón, se crea:
- Un registro en `Client` (nombre y teléfono del cliente)
- Un registro en `Conversation` (conversación con ese cliente específico)

**El sistema permite múltiples clientes.** Cada uno genera su propia conversación.

### Confirmación
Query ejecutada mostró:
```sql
SELECT c.phone, COUNT(m.id) as message_count 
FROM "Conversation" c 
LEFT JOIN "Message" m ON c.id = m."conversationId" 
GROUP BY c.id, c.phone;

-- Resultado:
phone     | message_count
----------+---------------
573156191389 |           301
```

Hay solo 1 conversación porque el cliente `573156191389` es quien testeó el bot 301 veces.

---

## 💳 ISSUE 3: Pasarelas de Pago (Recomendaciones)

### Estado actual
Ambas pasarelas están implementadas:
- ✅ MercadoPago (Argentina/LATAM general)
- ✅ Wompi (Colombia específicamente)

### En el código

**`billing.service.ts` implementa ambas:**
- `createMercadoPagoCheckout()` (línea 9)
- `createWompiCheckoutUrl()` (línea 59)

**`billing.routes.ts` expone ambos endpoints:**
- `POST /api/billing/checkout/mercadopago`
- `POST /api/billing/checkout/wompi`

### Recomendación: Usar SOLO Wompi para Colombia

**Razones:**
1. ✅ Wompi es **100% colombiano** y optimizado para el mercado local
2. ✅ Mejor integración con bancos y métodos de pago locales
3. ✅ **Menor complejidad:** Una pasarela = menos mantenimiento
4. ✅ **Menos configuración de secrets:** Solo 3 variables en `.env` vs 2 de MP
5. ✅ Mejor UX para clientes colombianos
6. ❌ MercadoPago es overkill si solo operan en Colombia

### Plan de migración
1. **Fase 1:** Mantener ambas (estado actual)
2. **Fase 2:** Si expanden a otros países → Mantener ambas
3. **Fase 3:** Si se enfocan en Colombia → Remover MercadoPago

### Variables `.env` actuales
```bash
# MercadoPago
MP_ACCESS_TOKEN="your-mercadopago-access-token"
MP_WEBHOOK_SECRET="your-mp-webhook-secret"

# Wompi (recomendado para Colombia)
WOMPI_PUBLIC_KEY="pub_test_xxx"
WOMPI_PRIVATE_KEY="prv_test_xxx"
WOMPI_EVENTS_SECRET="your-wompi-events-secret"
```

---

## 🔧 Resumen de fixes necesarios

| Issue | Archivo | Línea | Acción | Prioridad |
|-------|---------|-------|--------|-----------|
| Botón cancelar | `bot.service.ts` | 22 | Remover "cancelar" de `isReset()` | 🔴 ALTA |
| Número teléfono | N/A | N/A | No requiere cambios | ✅ OK |
| Pasarelas pago | `billing.routes.ts` | Opcional | Considerar simplificar a Wompi | 🟡 MEDIA |

---

## 📊 Estado de la conversación de prueba

```
Teléfono: 573156191389
Mensajes: 301 total
Activa: Sí
Modo humano: No
Paso actual: esperando_servicio
Última actualización: 2026-04-23 21:28:49.686

Patrón detectado:
1. Bot saluda → Pide servicio
2. Usuario selecciona servicio
3. Bot pide fecha
4. Usuario selecciona fecha
5. Bot pide hora
6. Usuario selecciona hora
7. ⚠️ BUCLE: Vuelve al saludo inicial
```

El bucle es causado por la palabra "cancelar" en `isReset()`.

