import { FastifyInstance } from "fastify";
import { prisma } from "@emitech/database";
import { z } from "zod";

export async function tenantRoutes(app: FastifyInstance) {
  const auth = { onRequest: [(app as any).authenticate] };

  // GET /api/tenants/me — Info y config del salón
  app.get("/me", auth, async (req: any) => {
    return prisma.tenant.findUnique({
      where: { id: req.user.tenantId },
      include: { botConfig: true, workingHours: true, subscription: { include: { plan: true } } },
    });
  });

  // PUT /api/tenants/me — Actualizar datos del salón
  app.put("/me", auth, async (req: any, reply) => {
    const schema = z.object({
      name: z.string().optional(),
      phone: z.string().optional(),
      address: z.string().optional(),
      city: z.string().optional(),
      timezone: z.string().optional(),
    });
    const body = schema.safeParse(req.body);
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() });
    return prisma.tenant.update({ where: { id: req.user.tenantId }, data: body.data });
  });

  // PUT /api/tenants/me/bot-config — Configuración del bot
  app.put("/me/bot-config", auth, async (req: any, reply) => {
    const schema = z.object({
      welcomeMessage: z.string().optional(),
      closedMessage: z.string().optional(),
      confirmMessage: z.string().optional(),
      reminderMessage: z.string().optional(),
      isOpen: z.boolean().optional(),
      requiresConfirm: z.boolean().optional(),
      reminderHoursBefore: z.number().int().min(1).max(24).optional(),
    });
    const body = schema.safeParse(req.body);
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() });

    return prisma.botConfig.upsert({
      where: { tenantId: req.user.tenantId },
      update: body.data,
      create: { tenantId: req.user.tenantId, ...body.data },
    });
  });

  // PUT /api/tenants/me/working-hours — Horarios del salón
  app.put("/me/working-hours", auth, async (req: any, reply) => {
    const schema = z.array(z.object({
      dayOfWeek: z.number().int().min(0).max(6),
      openTime: z.string(),
      closeTime: z.string(),
      isOpen: z.boolean(),
      slotMins: z.number().int().optional(),
      breakStart: z.string().nullable().optional(),
      breakEnd: z.string().nullable().optional(),
    }));
    const body = schema.safeParse(req.body);
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() });

    // Reemplazar horarios del salón (sin staff específico)
    await prisma.workingHours.deleteMany({
      where: { tenantId: req.user.tenantId, staffId: null },
    });
    await prisma.workingHours.createMany({
      data: body.data.map((h) => ({ ...h, tenantId: req.user.tenantId })),
    });
    return { ok: true };
  });

  // PUT /api/tenants/me/whatsapp — Conectar Meta WhatsApp
  app.put("/me/whatsapp", auth, async (req: any, reply) => {
    const schema = z.object({
      waPhoneNumberId: z.string(),
      waAccessToken: z.string(),
      waBusinessId: z.string(),
    });
    const body = schema.safeParse(req.body);
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() });
    return prisma.tenant.update({ where: { id: req.user.tenantId }, data: body.data });
  });
}
