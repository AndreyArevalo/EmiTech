import { FastifyInstance } from "fastify";
import { prisma } from "@emitech/database";

export async function clientRoutes(app: FastifyInstance) {
  const auth = { onRequest: [(app as any).authenticate] };

  app.get("/", auth, async (req: any) => {
    const { search } = req.query as any;
    return prisma.client.findMany({
      where: {
        tenantId: req.user.tenantId,
        ...(search && {
          OR: [
            { name: { contains: search, mode: "insensitive" } },
            { phone: { contains: search } },
          ],
        }),
      },
      include: { _count: { select: { appointments: true } } },
      orderBy: { lastVisit: "desc" },
      take: 50,
    });
  });

  app.get("/:id", auth, async (req: any, reply) => {
    const client = await prisma.client.findFirst({
      where: { id: req.params.id, tenantId: req.user.tenantId },
      include: {
        appointments: {
          include: { service: true },
          orderBy: { date: "desc" },
          take: 10,
        },
      },
    });
    if (!client) return reply.status(404).send({ error: "Cliente no encontrado" });
    return client;
  });
}
