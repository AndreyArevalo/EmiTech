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
}
