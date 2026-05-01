// ─────────────────────────────────────────────────────────────────────────────
// modules/appointments/appointment.routes.ts
// ─────────────────────────────────────────────────────────────────────────────
import { FastifyInstance } from "fastify";
import { prisma } from "@emitech/database";
import { z } from "zod";
import { getAvailableSlots } from "./appointment.service";
import { baileysSessions } from "../../lib/baileys-manager";
import { formatTime, formatDateSpanish } from "../../lib/dateUtils";

export async function appointmentRoutes(app: FastifyInstance) {
  const auth = { onRequest: [(app as any).authenticate] };

  // GET /api/appointments?date=2026-04-25&staffId=xxx&dateFrom=xxx&dateTo=xxx&status=xxx
  app.get("/", auth, async (req: any) => {
    const { date, staffId, status, dateFrom, dateTo } = req.query as any;
    const { tenantId } = req.user;

    const dateFilter = dateFrom && dateTo
      ? { date: { gte: dateFrom, lte: dateTo } }
      : date
        ? { date }
        : {};

    return prisma.appointment.findMany({
      where: {
        tenantId,
        ...dateFilter,
        ...(staffId && { staffId }),
        ...(status && { status }),
      },
      include: { client: true, service: true, staff: true },
      orderBy: [{ date: "asc" }, { time: "asc" }],
    });
  });

  // GET /api/appointments/slots?date=2026-04-25&serviceId=xxx&staffId=xxx
  app.get("/slots", auth, async (req: any, reply: any) => {
    const { date, serviceId, staffId } = req.query as any;
    const { tenantId } = req.user;
    if (!date || !serviceId) {
      return reply.status(400).send({ error: "date y serviceId son requeridos" });
    }
    return getAvailableSlots({ tenantId, date, serviceId, staffId });
  });

  // GET /api/appointments/:id
  app.get("/:id", auth, async (req: any, reply) => {
    const appt = await prisma.appointment.findFirst({
      where: { id: req.params.id, tenantId: req.user.tenantId },
      include: { client: true, service: true, staff: true },
    });
    if (!appt) return reply.status(404).send({ error: "Cita no encontrada" });
    return appt;
  });

  // POST /api/appointments — Crear cita manualmente desde el panel
  app.post("/", auth, async (req: any, reply) => {
    const schema = z.object({
      clientId: z.string(),
      serviceId: z.string(),
      staffId: z.string().optional(),
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      time: z.string().regex(/^\d{2}:\d{2}$/),
      notes: z.string().optional(),
    });
    const body = schema.safeParse(req.body);
    if (!body.success) return reply.status(400).send({ error: "Datos inválidos", details: body.error.flatten() });

    const service = await prisma.service.findFirst({
      where: { id: body.data.serviceId, tenantId: req.user.tenantId },
    });
    if (!service) return reply.status(404).send({ error: "Servicio no encontrado" });

    const appt = await prisma.appointment.create({
      data: {
        tenantId: req.user.tenantId,
        status: "CONFIRMED",
        duration: service.duration,
        ...body.data,
      },
      include: { client: true, service: true, staff: true },
    });
    return reply.status(201).send(appt);
  });

  // PATCH /api/appointments/:id/status
  app.patch("/:id/status", auth, async (req: any, reply) => {
    const schema = z.object({
      status: z.enum(["PENDING", "CONFIRMED", "CANCELLED", "COMPLETED", "NO_SHOW"]),
    });
    const body = schema.safeParse(req.body);
    if (!body.success) return reply.status(400).send({ error: "Estado inválido" });

    const appt = await prisma.appointment.findFirst({
      where: { id: req.params.id, tenantId: req.user.tenantId },
    });
    if (!appt) return reply.status(404).send({ error: "Cita no encontrada" });

    const updated = await prisma.appointment.update({
      where: { id: req.params.id },
      data: {
        status: body.data.status,
        ...(body.data.status === "CONFIRMED" && { confirmedAt: new Date() }),
        ...(body.data.status === "CANCELLED" && { cancelledAt: new Date() }),
      },
      include: { client: true, service: true },
    });

    // Notificar al cliente por WhatsApp si hay sesión activa
    if (baileysSessions.isConnected(req.user.tenantId)) {
      const clientJid = updated.client.waId || updated.client.phone;
      const fecha = formatDateSpanish(updated.date);
      const hora  = formatTime(updated.time);

      try {
        if (body.data.status === "CONFIRMED") {
          // Mensaje de confirmación por el admin — siempre incluye fecha y hora
          const msg =
            `✅ ¡Tu cita fue confirmada!\n\n` +
            `💅 ${updated.service.name}\n` +
            `📅 ${fecha}\n` +
            `🕒 ${hora}\n\n` +
            `¡Te esperamos! 🌸`;
          await baileysSessions.sendText(req.user.tenantId, clientJid, msg);
        }

        if (body.data.status === "CANCELLED") {
          const tenant2 = await prisma.tenant.findUnique({
            where: { id: req.user.tenantId },
            include: { botConfig: true },
          });
          const rejectTpl = tenant2?.botConfig?.rejectMessage ||
            "Lo sentimos, tu cita del *{fecha}* a las *{hora}* no pudo confirmarse. Escríbenos para reagendar. 🙏";
          const msg = rejectTpl
            .replace("{nombre}", updated.client.name || "")
            .replace("{fecha}", fecha)
            .replace("{hora}", hora)
            .replace("{servicio}", updated.service.name);
          await baileysSessions.sendText(req.user.tenantId, clientJid, msg);
        }
      } catch (err: any) {
        console.error("[PANEL] Error notificando al cliente:", err.message);
      }
    }

    return updated;
  });

  // DELETE /api/appointments/:id
  app.delete("/:id", auth, async (req: any, reply) => {
    const appt = await prisma.appointment.findFirst({
      where: { id: req.params.id, tenantId: req.user.tenantId },
    });
    if (!appt) return reply.status(404).send({ error: "Cita no encontrada" });
    await prisma.appointment.delete({ where: { id: req.params.id } });
    return { ok: true };
  });
}
