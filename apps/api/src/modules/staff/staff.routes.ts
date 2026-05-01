import { FastifyInstance } from "fastify";
import { prisma } from "@emitech/database";
import { z } from "zod";

export async function staffRoutes(app: FastifyInstance) {
  const auth = { onRequest: [(app as any).authenticate] };

  app.get("/", auth, async (req: any) =>
    prisma.staff.findMany({
      where: { tenantId: req.user.tenantId, active: true },
      include: { staffServices: { include: { service: true } }, workingHours: true },
    })
  );

  app.post("/", auth, async (req: any, reply) => {
    const schema = z.object({
      name: z.string().min(2),
      phone: z.string().optional(),
      serviceIds: z.array(z.string()).optional(),
    });
    const body = schema.safeParse(req.body);
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() });

    const staff = await prisma.staff.create({
      data: {
        name: body.data.name,
        phone: body.data.phone,
        tenantId: req.user.tenantId,
        staffServices: body.data.serviceIds
          ? { create: body.data.serviceIds.map((id) => ({ serviceId: id })) }
          : undefined,
      },
      include: { staffServices: { include: { service: true } } },
    });
    return reply.status(201).send(staff);
  });

  app.delete("/:id", auth, async (req: any) => {
    await prisma.staff.update({
      where: { id: req.params.id },
      data: { active: false },
    });
    return { ok: true };
  });

  // GET /api/staff/:id/hours — horario del profesional
  app.get("/:id/hours", auth, async (req: any) => {
    const hours = await prisma.workingHours.findMany({
      where: { staffId: req.params.id, tenantId: req.user.tenantId },
      orderBy: { dayOfWeek: "asc" },
    });
    return hours;
  });

  // PUT /api/staff/:id/hours — guardar horario del profesional
  // Enviar array vacío [] para borrar (usar horario del salón)
  app.put("/:id/hours", auth, async (req: any, reply) => {
    const schema = z.array(z.object({
      dayOfWeek: z.number().min(0).max(6),
      openTime:  z.string(),
      closeTime: z.string(),
      isOpen:    z.boolean(),
    }));
    const body = schema.safeParse(req.body);
    if (!body.success) return reply.status(400).send({ error: "Datos inválidos" });

    // Borrar horarios actuales del staff
    await prisma.workingHours.deleteMany({
      where: { staffId: req.params.id, tenantId: req.user.tenantId },
    });

    // Si viene array vacío → usa horario del salón (sin registros propios)
    if (body.data.length === 0) return { ok: true, mode: "salon" };

    // Crear los nuevos horarios
    await prisma.workingHours.createMany({
      data: body.data.map(d => ({
        tenantId:  req.user.tenantId,
        staffId:   req.params.id,
        dayOfWeek: d.dayOfWeek,
        openTime:  d.openTime,
        closeTime: d.closeTime,
        isOpen:    d.isOpen,
        slotMins:  30,
      })),
    });
    return { ok: true, mode: "custom" };
  });
}
