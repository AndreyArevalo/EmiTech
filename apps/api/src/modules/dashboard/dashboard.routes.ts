import { FastifyInstance } from "fastify";
import { prisma } from "@emitech/database";
import dayjs from "dayjs";

export async function dashboardRoutes(app: FastifyInstance) {
  const auth = { onRequest: [(app as any).authenticate] };

  // GET /api/dashboard/stats — Estadísticas principales
  app.get("/stats", auth, async (req: any) => {
    const { tenantId } = req.user;
    const today = dayjs().format("YYYY-MM-DD");
    const weekStart = dayjs().startOf("week").format("YYYY-MM-DD");
    const monthStart = dayjs().startOf("month").format("YYYY-MM-DD");

    const [todayAppts, weekAppts, monthAppts, totalClients, pendingAppts] =
      await Promise.all([
        prisma.appointment.count({ where: { tenantId, date: today } }),
        prisma.appointment.count({ where: { tenantId, date: { gte: weekStart }, status: "CONFIRMED" } }),
        prisma.appointment.count({ where: { tenantId, date: { gte: monthStart }, status: { in: ["CONFIRMED", "COMPLETED"] } } }),
        prisma.client.count({ where: { tenantId } }),
        prisma.appointment.count({ where: { tenantId, status: "PENDING" } }),
      ]);

    const todayApptsDetail = await prisma.appointment.findMany({
      where: { tenantId, date: today },
      include: { client: true, service: true, staff: true },
      orderBy: { time: "asc" },
    });

    return {
      todayCount: todayAppts,
      weekCount: weekAppts,
      monthCount: monthAppts,
      totalClients,
      pendingCount: pendingAppts,
      todayAppointments: todayApptsDetail,
    };
  });
}
