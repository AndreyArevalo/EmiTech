// ─────────────────────────────────────────────────────────────────────────────
// modules/whatsapp/whatsapp.routes.ts — Baileys version
// Reemplaza el webhook de Meta por gestión de sesiones Baileys
// ─────────────────────────────────────────────────────────────────────────────
import { FastifyInstance } from "fastify";
import { prisma } from "@emitech/database";
import { handleBotMessage } from "./bot.service";
import { baileysSessions } from "../../lib/baileys-manager";
import QRCode from "qrcode";

export async function whatsappRoutes(app: FastifyInstance) {
  const auth = { onRequest: [(app as any).authenticate] };

  // Conectar el handler del bot al gestor de sesiones (una sola vez)
  baileysSessions.setMessageHandler(handleBotMessage);

  // ─── QR: obtener QR para conectar el WhatsApp de un salón ────────────────
  // GET /api/whatsapp/qr/:tenantId
  // El panel llama esto para mostrar el QR al dueño del salón.
  // Respuestas posibles:
  //   { status: "qr", qrImage: "data:image/png;base64,..." }  ← escanear
  //   { status: "connected", qrImage: null }                  ← ya conectado
  //   { status: "connecting", qrImage: null }                 ← esperar y reintentar
  app.get("/qr/:tenantId", auth, async (req: any, reply) => {
    const { tenantId } = req.params;

    if (req.user.role !== "SUPERADMIN" && req.user.tenantId !== tenantId) {
      return reply.status(403).send({ error: "No autorizado" });
    }

    const { status, qr } = baileysSessions.getStatus(tenantId);

    if (status === "not_initialized") {
      // Disparar inicio de sesión y pedir al cliente que reintente en 3s
      baileysSessions.initSession(tenantId).catch((err) =>
        app.log.error(err, `[BAILEYS] Error iniciando sesión para ${tenantId}`)
      );
      return { status: "connecting", qrImage: null };
    }

    if (status === "connected") {
      return { status: "connected", qrImage: null };
    }

    if (status === "qr" && qr) {
      const qrImage = await QRCode.toDataURL(qr);
      return { status: "qr", qrImage };
    }

    return { status, qrImage: null };
  });

  // ─── Status: estado de conexión ──────────────────────────────────────────
  // GET /api/whatsapp/status/:tenantId
  app.get("/status/:tenantId", auth, async (req: any, reply) => {
    const { tenantId } = req.params;

    if (req.user.role !== "SUPERADMIN" && req.user.tenantId !== tenantId) {
      return reply.status(403).send({ error: "No autorizado" });
    }

    const { status } = baileysSessions.getStatus(tenantId);
    return { tenantId, status, connected: status === "connected" };
  });

  // ─── Desconectar: cerrar sesión de un tenant ──────────────────────────────
  // DELETE /api/whatsapp/session/:tenantId
  app.delete("/session/:tenantId", auth, async (req: any, reply) => {
    const { tenantId } = req.params;

    if (req.user.role !== "SUPERADMIN" && req.user.tenantId !== tenantId) {
      return reply.status(403).send({ error: "No autorizado" });
    }

    await baileysSessions.removeSession(tenantId);
    return { ok: true, message: "Sesión cerrada. Escanea el QR para reconectar." };
  });

  // ─── ENDPOINTS DEL PANEL (sin cambios funcionales) ───────────────────────

  app.get("/conversations", auth, async (req: any) =>
    prisma.conversation.findMany({
      where: { tenantId: req.user.tenantId },
      include: {
        client: true,
        messages: { orderBy: { createdAt: "desc" }, take: 1 },
      },
      orderBy: { updatedAt: "desc" },
      take: 50,
    })
  );

  app.get("/conversations/:id/messages", auth, async (req: any, reply) => {
    const conv = await prisma.conversation.findFirst({
      where: { id: req.params.id, tenantId: req.user.tenantId },
    });
    if (!conv) return reply.status(404).send({ error: "No encontrado" });
    return prisma.message.findMany({
      where: { conversationId: conv.id },
      orderBy: { createdAt: "asc" },
    });
  });

  app.post("/conversations/:id/send", auth, async (req: any, reply) => {
    const { text } = req.body as { text: string };
    if (!text) return reply.status(400).send({ error: "text requerido" });

    const conv = await prisma.conversation.findFirst({
      where: { id: req.params.id, tenantId: req.user.tenantId },
    });
    if (!conv) return reply.status(404).send({ error: "Conversación no encontrada" });

    if (!baileysSessions.isConnected(req.user.tenantId)) {
      return reply.status(400).send({ error: "WhatsApp no conectado. Escanea el QR primero." });
    }

    await baileysSessions.sendText(req.user.tenantId, conv.phone, text);

    // Activar humanMode con expiración de 20 minutos
    const humanModeUntil = new Date(Date.now() + 20 * 60 * 1000).toISOString();
    const existingData = (conv.data as Record<string, any>) || {};
    await prisma.conversation.update({
      where: { id: conv.id },
      data: {
        humanMode: true,
        data: { ...existingData, humanModeUntil },
      },
    });

    await prisma.message.create({
      data: { conversationId: conv.id, direction: "OUT", content: text },
    });
    return { ok: true };
  });

  app.patch("/conversations/:id/human-mode", auth, async (req: any, reply) => {
    const { humanMode } = req.body as { humanMode: boolean };
    const conv = await prisma.conversation.findFirst({
      where: { id: req.params.id, tenantId: req.user.tenantId },
    });
    if (!conv) return reply.status(404).send({ error: "No encontrado" });
    return prisma.conversation.update({ where: { id: conv.id }, data: { humanMode } });
  });
}
