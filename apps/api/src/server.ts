// ─────────────────────────────────────────────────────────────────────────────
// apps/api/src/server.ts — Servidor principal Fastify
// ─────────────────────────────────────────────────────────────────────────────
import "dotenv/config";
import Fastify from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import jwt from "@fastify/jwt";
import rateLimit from "@fastify/rate-limit";

import { authRoutes } from "./modules/auth/auth.routes";
import { tenantRoutes } from "./modules/tenants/tenant.routes";
import { serviceRoutes } from "./modules/services/service.routes";
import { staffRoutes } from "./modules/staff/staff.routes";
import { appointmentRoutes } from "./modules/appointments/appointment.routes";
import { clientRoutes } from "./modules/clients/client.routes";
import { whatsappRoutes } from "./modules/whatsapp/whatsapp.routes";
import { billingRoutes } from "./modules/billing/billing.routes";
import { dashboardRoutes } from "./modules/dashboard/dashboard.routes";
import { startRemindersWorker } from "./modules/whatsapp/reminders.worker";
import { baileysSessions } from "./lib/baileys-manager";
import { requireActiveSubscription } from "./middlewares/subscription";
import { superadminRoutes } from "./modules/superadmin/superadmin.routes";

const app = Fastify({
  logger: {
    level: process.env.NODE_ENV === "production" ? "info" : "debug",
    transport:
      process.env.NODE_ENV !== "production"
        ? { target: "pino-pretty", options: { colorize: true } }
        : undefined,
  },
});

async function buildApp() {
  // ─── Plugins ─────────────────────────────────────────────────────────────
  await app.register(helmet, { contentSecurityPolicy: false });
  await app.register(cors, {
    origin: [
      process.env.WEB_URL || "http://localhost:3000",
      "https://emitech.app",
      "https://www.emitech.app",
    ],
    credentials: true,
  });
  await app.register(jwt, {
    secret: process.env.JWT_SECRET || "dev-secret-change-in-production",
  });
  await app.register(rateLimit, {
    max: 100,
    timeWindow: "1 minute",
  });

  // ─── Decorators: autenticación + suscripción ──────────────────────────────
  app.decorate("authenticate", async function (request: any, reply: any) {
    try {
      await request.jwtVerify();
    } catch (err) {
      reply.status(401).send({ error: "No autorizado" });
    }
  });

  // Combina autenticación + verificación de suscripción activa
  app.decorate("authenticateWithSub", async function (request: any, reply: any) {
    try {
      await request.jwtVerify();
    } catch {
      return reply.status(401).send({ error: "No autorizado" });
    }
    await requireActiveSubscription(request, reply);
  });

  // ─── Rutas ────────────────────────────────────────────────────────────────
  await app.register(authRoutes, { prefix: "/api/auth" });
  await app.register(tenantRoutes, { prefix: "/api/tenants" });
  await app.register(serviceRoutes, { prefix: "/api/services" });
  await app.register(staffRoutes, { prefix: "/api/staff" });
  await app.register(appointmentRoutes, { prefix: "/api/appointments" });
  await app.register(clientRoutes, { prefix: "/api/clients" });
  await app.register(whatsappRoutes, { prefix: "/api/whatsapp" });
  await app.register(billingRoutes, { prefix: "/api/billing" });
  await app.register(dashboardRoutes, { prefix: "/api/dashboard" });
  await app.register(superadminRoutes, { prefix: "/api/admin" });

  // ─── Meta: Data Deletion Callback ────────────────────────────────────────
  // POST /api/data-deletion — Meta llama esto cuando un usuario pide eliminar sus datos
  app.post("/api/data-deletion", async (req: any, reply) => {
    // Meta envía un signed_request en el body
    const confirmationCode = `DEL-${Date.now()}`;
    return reply.send({
      url: `https://emitech.app/delete-data?code=${confirmationCode}`,
      confirmation_code: confirmationCode,
    });
  });

  // GET /api/data-deletion — para verificación de Meta
  app.get("/api/data-deletion", async (req: any, reply) => {
    return reply.send({ status: "ok", message: "Data deletion endpoint activo" });
  });

  // ─── Health check ─────────────────────────────────────────────────────────
  app.get("/health", async () => ({
    status: "ok",
    version: "1.0.0",
    timestamp: new Date().toISOString(),
  }));

  return app;
}

async function start() {
  try {
    // Iniciar worker de recordatorios (BullMQ + Redis)
    if (process.env.REDIS_URL) {
      startRemindersWorker();
    } else {
      console.warn("[REMINDER] REDIS_URL no configurado — recordatorios desactivados");
    }

    const server = await buildApp();
    const port = Number(process.env.PORT) || 3001;
    await server.listen({ port, host: "0.0.0.0" });
    console.log(`🚀 EmiTech API corriendo en http://localhost:${port}`);

    // ─── Baileys: reconectar sesiones persistidas en disco ──────────────────
    // Si el servidor se reinicia, retoma automáticamente las sesiones que
    // ya estaban autenticadas (sin necesidad de escanear QR de nuevo).
    const persistedTenants = baileysSessions.getPersistedTenantIds();
    if (persistedTenants.length > 0) {
      console.log(`[BAILEYS] Reconectando ${persistedTenants.length} sesión(es) persistida(s)...`);
      for (const tenantId of persistedTenants) {
        baileysSessions.initSession(tenantId).catch((err) =>
          console.error(`[BAILEYS] Error reconectando tenant ${tenantId}:`, err.message)
        );
      }
    } else {
      console.log("[BAILEYS] Sin sesiones previas. Cada salón debe escanear su QR.");
    }
  } catch (err) {
    console.error("Error al iniciar servidor:", err);
    process.exit(1);
  }
}

start();