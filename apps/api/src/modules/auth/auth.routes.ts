// ─────────────────────────────────────────────────────────────────────────────
// modules/auth/auth.routes.ts
// ─────────────────────────────────────────────────────────────────────────────
import { FastifyInstance } from "fastify";
import bcrypt from "bcryptjs";
import { prisma } from "@emitech/database";
import { z } from "zod";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export async function authRoutes(app: FastifyInstance) {
  // POST /api/auth/login
  app.post("/login", async (req, reply) => {
    const body = loginSchema.safeParse(req.body);
    if (!body.success) {
      return reply.status(400).send({ error: "Datos inválidos", details: body.error.flatten() });
    }

    const { email, password } = body.data;

    const user = await prisma.user.findFirst({
      where: { email, active: true },
      include: { tenant: true },
    });

    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      return reply.status(401).send({ error: "Credenciales incorrectas" });
    }

    const token = app.jwt.sign(
      { userId: user.id, tenantId: user.tenantId, role: user.role },
      { expiresIn: "7d" }
    );

    return reply.send({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        tenant: {
          id: user.tenant.id,
          name: user.tenant.name,
          slug: user.tenant.slug,
          logoUrl: user.tenant.logoUrl,
        },
      },
    });
  });

  // POST /api/auth/me — Verificar token
  app.get(
    "/me",
    { onRequest: [(app as any).authenticate] },
    async (req: any, reply) => {
      const { userId } = req.user;
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { tenant: { include: { subscription: { include: { plan: true } } } } },
      });
      if (!user) return reply.status(404).send({ error: "Usuario no encontrado" });
      return { user };
    }
  );

  // POST /api/auth/change-password
  app.post(
    "/change-password",
    { onRequest: [(app as any).authenticate] },
    async (req: any, reply) => {
      const schema = z.object({
        currentPassword: z.string(),
        newPassword: z.string().min(8),
      });
      const body = schema.safeParse(req.body);
      if (!body.success) return reply.status(400).send({ error: "Datos inválidos" });

      const user = await prisma.user.findUnique({ where: { id: req.user.userId } });
      if (!user || !(await bcrypt.compare(body.data.currentPassword, user.passwordHash))) {
        return reply.status(401).send({ error: "Contraseña actual incorrecta" });
      }

      const newHash = await bcrypt.hash(body.data.newPassword, 12);
      await prisma.user.update({ where: { id: user.id }, data: { passwordHash: newHash } });
      return { ok: true };
    }
  );
}
