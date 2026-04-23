import { FastifyInstance } from "fastify";
import { prisma } from "@emitech/database";
import { z } from "zod";

const serviceSchema = z.object({
  name: z.string().min(2),
  description: z.string().optional(),
  duration: z.number().int().min(15).default(60),
  price: z.number().min(0),
  emoji: z.string().optional(),
  active: z.boolean().optional(),
  order: z.number().int().optional(),
});

export async function serviceRoutes(app: FastifyInstance) {
  const auth = { onRequest: [(app as any).authenticate] };

  app.get("/", auth, async (req: any) =>
    prisma.service.findMany({
      where: { tenantId: req.user.tenantId },
      orderBy: { order: "asc" },
    })
  );

  app.post("/", auth, async (req: any, reply) => {
    const body = serviceSchema.safeParse(req.body);
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() });
    const service = await prisma.service.create({
      data: { ...body.data, tenantId: req.user.tenantId },
    });
    return reply.status(201).send(service);
  });

  app.put("/:id", auth, async (req: any, reply) => {
    const body = serviceSchema.partial().safeParse(req.body);
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() });
    const existing = await prisma.service.findFirst({
      where: { id: req.params.id, tenantId: req.user.tenantId },
    });
    if (!existing) return reply.status(404).send({ error: "Servicio no encontrado" });
    return prisma.service.update({ where: { id: req.params.id }, data: body.data });
  });

  app.delete("/:id", auth, async (req: any, reply) => {
    const existing = await prisma.service.findFirst({
      where: { id: req.params.id, tenantId: req.user.tenantId },
    });
    if (!existing) return reply.status(404).send({ error: "No encontrado" });
    await prisma.service.update({ where: { id: req.params.id }, data: { active: false } });
    return { ok: true };
  });
}
