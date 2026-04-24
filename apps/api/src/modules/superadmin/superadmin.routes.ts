// ─────────────────────────────────────────────────────────────────────────────
// modules/superadmin/superadmin.routes.ts
// Solo accesible con rol SUPERADMIN (equipo EmiTech)
// Gestión de todos los tenants: crear, listar, cambiar plan, suspender
// ─────────────────────────────────────────────────────────────────────────────
import { FastifyInstance } from "fastify";
import { prisma } from "@emitech/database";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { activateSubscription, suspendSubscription } from "../billing/billing.service";

function superAdminOnly(app: FastifyInstance) {
  return {
    onRequest: [
      (app as any).authenticate,
      async (req: any, reply: any) => {
        if (req.user?.role !== "SUPERADMIN") {
          return reply.status(403).send({ error: "Acceso denegado — solo SUPERADMIN" });
        }
      },
    ],
  };
}

export async function superadminRoutes(app: FastifyInstance) {
  const guard = superAdminOnly(app);

  // ─── GET /api/admin/plans — Listar planes disponibles ────────────────────
  app.get("/plans", guard, async () => {
    return prisma.plan.findMany({ where: { active: true }, orderBy: { price: "asc" } });
  });

  // ─── GET /api/admin/tenants — Listar todos los salones ───────────────────
  app.get("/tenants", guard, async (req: any) => {
    const { search, status } = req.query as any;
    return prisma.tenant.findMany({
      where: {
        ...(search && {
          OR: [
            { name: { contains: search, mode: "insensitive" } },
            { slug: { contains: search, mode: "insensitive" } },
          ],
        }),
      },
      include: {
        subscription: { include: { plan: true } },
        _count: { select: { appointments: true, clients: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  });

  // ─── GET /api/admin/tenants/:id — Detalle de un tenant ───────────────────
  app.get("/tenants/:id", guard, async (req: any, reply) => {
    const tenant = await prisma.tenant.findUnique({
      where: { id: req.params.id },
      include: {
        subscription: { include: { plan: true } },
        users: { select: { id: true, name: true, email: true, role: true, active: true } },
        _count: { select: { appointments: true, clients: true, services: true } },
      },
    });
    if (!tenant) return reply.status(404).send({ error: "No encontrado" });
    return tenant;
  });

  // ─── POST /api/admin/tenants — Crear nuevo salón (onboarding manual) ─────
  app.post("/tenants", guard, async (req: any, reply) => {
    const schema = z.object({
      salonName: z.string().min(2),
      slug: z.string().min(2).regex(/^[a-z0-9-]+$/, "Solo minúsculas, números y guiones"),
      adminEmail: z.string().email(),
      adminName: z.string().min(2),
      adminPassword: z.string().min(8),
      planId: z.string(),
      city: z.string().optional(),
      phone: z.string().optional(),
    });

    const body = schema.safeParse(req.body);
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() });

    // Verificar slug único
    const existing = await prisma.tenant.findUnique({ where: { slug: body.data.slug } });
    if (existing) return reply.status(409).send({ error: "El slug ya está en uso" });

    const plan = await prisma.plan.findUnique({ where: { id: body.data.planId } });
    if (!plan) return reply.status(404).send({ error: "Plan no encontrado" });

    const passwordHash = await bcrypt.hash(body.data.adminPassword, 12);

    // Crear tenant + usuario + config bot + suscripción en una transacción
    const tenant = await prisma.$transaction(async (tx) => {
      const t = await tx.tenant.create({
        data: {
          name: body.data.salonName,
          slug: body.data.slug,
          city: body.data.city,
          phone: body.data.phone,
        },
      });

      await tx.botConfig.create({
        data: {
          tenantId: t.id,
          welcomeMessage: `✨ ¡Hola! Bienvenida a *${body.data.salonName}* 💅\n\nEstoy aquí para ayudarte a agendar tu cita de forma rápida y sencilla.\n\n¿Qué servicio deseas agendar hoy?`,
          closedMessage: `😴 En este momento estamos fuera de horario de atención.\n\nPuedes escribirnos de nuevo durante nuestro horario habitual y con gusto te atendemos. ¡Gracias por contactar a *${body.data.salonName}*! 💕`,
          confirmMessage: `✅ ¡Tu cita ha sido registrada con éxito!\n\nEn breve te confirmaremos la disponibilidad. Cualquier cambio te avisamos por aquí. ¡Gracias por elegirnos! 🌸`,
          reminderMessage: `💅 Hola *{nombre}*, te recordamos que tienes una cita en *${body.data.salonName}* hoy a las *{hora}* para *{servicio}*.\n\n¡Te esperamos! Si necesitas cancelar o reprogramar, escríbenos. 🙏`,
          isOpen: true,
          requiresConfirm: true,
        },
      });

      await tx.user.create({
        data: {
          tenantId: t.id,
          email: body.data.adminEmail,
          name: body.data.adminName,
          passwordHash,
          role: "OWNER",
        },
      });

      // Trial 30 días
      const trialEnd = new Date();
      trialEnd.setDate(trialEnd.getDate() + 30);
      await tx.subscription.create({
        data: {
          tenantId: t.id,
          planId: body.data.planId,
          status: "TRIAL",
          trialEndsAt: trialEnd,
        },
      });

      // Horarios por defecto (lunes–viernes 8–18)
      await tx.workingHours.createMany({
        data: [1,2,3,4,5].map(d => ({
          tenantId: t.id,
          dayOfWeek: d,
          openTime: "08:00",
          closeTime: "18:00",
          isOpen: true,
        })),
      });

      return t;
    });

    return reply.status(201).send({
      tenant,
      credentials: { email: body.data.adminEmail, password: body.data.adminPassword },
    });
  });

  // ─── PATCH /api/admin/tenants/:id/reset-password ─────────────────────────
  app.patch("/tenants/:id/reset-password", guard, async (req: any, reply) => {
    const owner = await prisma.user.findFirst({
      where: { tenantId: req.params.id, role: "OWNER" },
    });
    if (!owner) return reply.status(404).send({ error: "No se encontró el dueño del salón" });

    const DEFAULT_PASSWORD = "12345678";
    const hash = await bcrypt.hash(DEFAULT_PASSWORD, 12);
    await prisma.user.update({ where: { id: owner.id }, data: { passwordHash: hash } });

    return { ok: true, email: owner.email, password: DEFAULT_PASSWORD };
  });

  // ─── PATCH /api/admin/tenants/:id/suspend ─────────────────────────────────
  app.patch("/tenants/:id/suspend", guard, async (req: any, reply) => {
    const tenant = await prisma.tenant.findUnique({ where: { id: req.params.id } });
    if (!tenant) return reply.status(404).send({ error: "No encontrado" });
    await prisma.tenant.update({ where: { id: req.params.id }, data: { active: false } });
    await suspendSubscription(req.params.id);
    return { ok: true };
  });

  // ─── PATCH /api/admin/tenants/:id/activate ────────────────────────────────
  app.patch("/tenants/:id/activate", guard, async (req: any, reply) => {
    const tenant = await prisma.tenant.findUnique({
      where: { id: req.params.id },
      include: { subscription: true },
    });
    if (!tenant) return reply.status(404).send({ error: "No encontrado" });

    // Usar el plan existente de la suscripción, o el planId del body si se envía
    const planId = (req.body as any)?.planId || tenant.subscription?.planId;
    if (!planId) return reply.status(400).send({ error: "No hay plan asociado a este salón" });

    await prisma.tenant.update({ where: { id: req.params.id }, data: { active: true } });
    await activateSubscription(req.params.id, planId);
    return { ok: true };
  });

  // ─── GET /api/admin/stats — Métricas globales de EmiTech ─────────────────
  app.get("/stats", guard, async () => {
    const [totalTenants, activeSubs, trialSubs, totalAppointments, totalClients] =
      await Promise.all([
        prisma.tenant.count(),
        prisma.subscription.count({ where: { status: "ACTIVE" } }),
        prisma.subscription.count({ where: { status: "TRIAL" } }),
        prisma.appointment.count(),
        prisma.client.count(),
      ]);

    const recentTenants = await prisma.tenant.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      include: { subscription: { include: { plan: true } } },
    });

    return { totalTenants, activeSubs, trialSubs, totalAppointments, totalClients, recentTenants };
  });
}
