// ─────────────────────────────────────────────────────────────────────────────
// modules/billing/billing.routes.ts
// ─────────────────────────────────────────────────────────────────────────────
import { FastifyInstance } from "fastify";
import { prisma } from "@emitech/database";
import { z } from "zod";
import {
  createWompiCheckoutUrl,
  activateSubscription,
  suspendSubscription,
} from "./billing.service";
import crypto from "crypto";

export async function billingRoutes(app: FastifyInstance) {
  const auth = { onRequest: [(app as any).authenticate] };

  // GET /api/billing/plans — Planes disponibles (público)
  app.get("/plans", async () =>
    prisma.plan.findMany({ where: { active: true }, orderBy: { price: "asc" } })
  );

  // GET /api/billing/subscription — Suscripción del salón actual
  app.get("/subscription", auth, async (req: any) =>
    prisma.subscription.findUnique({
      where: { tenantId: req.user.tenantId },
      include: { plan: true },
    })
  );

  // POST /api/billing/checkout/wompi
  app.post("/checkout/wompi", auth, async (req: any, reply) => {
    const schema = z.object({
      planId: z.string(),
      email: z.string().email(),
    });
    const body = schema.safeParse(req.body);
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() });

    const plan = await prisma.plan.findUnique({ where: { id: body.data.planId } });
    if (!plan) return reply.status(404).send({ error: "Plan no encontrado" });

    try {
      const result = await createWompiCheckoutUrl({
        tenantId: req.user.tenantId,
        planId: plan.id,
        planName: plan.name,
        price: Number(plan.price),
        email: body.data.email,
        redirectUrl: `${process.env.WEB_URL || "http://localhost:3000"}/dashboard/billing`,
      });
      return result;
    } catch (err: any) {
      return reply.status(500).send({ error: err.message });
    }
  });

  // ─── WEBHOOK Wompi ────────────────────────────────────────────────────────
  // POST /api/billing/webhook/wompi
  app.post("/webhook/wompi", { config: { rawBody: true } }, async (req: any, reply) => {
    reply.status(200).send("OK");

    try {
      // Validar firma Wompi
      const signature = req.headers["x-event-checksum"] as string;
      const eventsSecret = process.env.WOMPI_EVENTS_SECRET || "";
      const rawBody = (req.rawBody || "").toString();

      const expectedSig = crypto
        .createHash("sha256")
        .update(rawBody + eventsSecret)
        .digest("hex");

      if (signature && signature !== expectedSig) {
        app.log.warn("Wompi webhook: firma inválida");
        return;
      }

      const event = req.body as any;
      const txStatus = event?.data?.transaction?.status;
      const reference = event?.data?.transaction?.reference as string;

      if (!reference) return;

      // Buscar suscripción por referencia Wompi
      const sub = await prisma.subscription.findFirst({
        where: { wompiSubId: reference },
      });
      if (!sub) return;

      if (txStatus === "APPROVED") {
        await activateSubscription(sub.tenantId, sub.planId);
      } else if (["DECLINED", "VOIDED", "ERROR"].includes(txStatus)) {
        await suspendSubscription(sub.tenantId);
      }
    } catch (err: any) {
      app.log.error(err, "Error procesando webhook Wompi");
    }
  });

  // ─── SUPERADMIN: Activar suscripción manualmente ──────────────────────────
  // POST /api/billing/admin/activate
  app.post("/admin/activate", auth, async (req: any, reply) => {
    if (req.user.role !== "SUPERADMIN") {
      return reply.status(403).send({ error: "Acceso denegado" });
    }
    const schema = z.object({ tenantId: z.string(), planId: z.string() });
    const body = schema.safeParse(req.body);
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() });

    await activateSubscription(body.data.tenantId, body.data.planId);
    return { ok: true };
  });
}
