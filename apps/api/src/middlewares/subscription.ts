// ─────────────────────────────────────────────────────────────────────────────
// middlewares/subscription.ts
// Verifica que el tenant tenga suscripción activa o trial vigente.
// Se aplica en las rutas del panel y del bot.
// ─────────────────────────────────────────────────────────────────────────────
import { FastifyRequest, FastifyReply } from "fastify";
import { prisma } from "@emitech/database";

export async function requireActiveSubscription(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const user = (request as any).user;
  if (!user?.tenantId) return; // ya cubierto por authenticate

  // SUPERADMIN siempre pasa
  if (user.role === "SUPERADMIN") return;

  const sub = await prisma.subscription.findUnique({
    where: { tenantId: user.tenantId },
  });

  if (!sub) {
    return reply.status(402).send({
      error: "sin_suscripcion",
      message: "Tu salón no tiene una suscripción activa. Elige un plan para continuar.",
      upgradeUrl: "/dashboard/billing",
    });
  }

  const now = new Date();

  // Trial vigente → OK
  if (sub.status === "TRIAL" && sub.trialEndsAt && sub.trialEndsAt > now) return;

  // Activo → OK
  if (sub.status === "ACTIVE") return;

  // Trial vencido sin plan activo
  if (sub.status === "TRIAL" && (!sub.trialEndsAt || sub.trialEndsAt <= now)) {
    return reply.status(402).send({
      error: "trial_vencido",
      message: "Tu período de prueba ha finalizado. Activa un plan para seguir usando EmiTech.",
      upgradeUrl: "/dashboard/billing",
    });
  }

  // PAST_DUE / SUSPENDED / CANCELLED
  return reply.status(402).send({
    error: "suscripcion_inactiva",
    message: "Tu suscripción está suspendida o cancelada. Renueva tu plan para continuar.",
    upgradeUrl: "/dashboard/billing",
  });
}
