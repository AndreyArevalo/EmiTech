// ─────────────────────────────────────────────────────────────────────────────
// modules/whatsapp/whatsapp.routes.ts
// Webhook Meta Cloud API + endpoints de gestión de conversaciones
// ─────────────────────────────────────────────────────────────────────────────
import { FastifyInstance } from "fastify";
import { prisma } from "@emitech/database";
import { handleBotMessage } from "./bot.service";
import { sendBotReply, sendTextMessage, markAsRead } from "../../lib/meta";
import crypto from "crypto";

export async function whatsappRoutes(app: FastifyInstance) {
  const auth = { onRequest: [(app as any).authenticate] };

  // ─── VERIFICACIÓN DEL WEBHOOK (Meta) ─────────────────────────────────────
  // GET /api/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=xxx&hub.challenge=yyy
  app.get("/webhook", async (req: any, reply) => {
    const { "hub.mode": mode, "hub.verify_token": token, "hub.challenge": challenge } = req.query;
    const VERIFY_TOKEN = process.env.META_WEBHOOK_VERIFY_TOKEN;
    if (mode === "subscribe" && token === VERIFY_TOKEN) {
      return reply.status(200).type("text/plain").send(String(challenge));
    }
    return reply.status(403).type("text/plain").send("Forbidden");
  });

  // ─── RECEPCIÓN DE MENSAJES (Meta webhook) ────────────────────────────────
  // POST /api/whatsapp/webhook
  app.post("/webhook", {
    config: { rawBody: true }, // necesario para validar firma
  }, async (req: any, reply) => {
    // Validar firma HMAC (solo en producción)
    if (process.env.NODE_ENV === "production") {
      const signature = req.headers["x-hub-signature-256"] as string;
      const appSecret = process.env.META_APP_SECRET || "";
      if (appSecret && signature) {
        const expectedSig = "sha256=" + crypto
          .createHmac("sha256", appSecret)
          .update(JSON.stringify(req.body) || "")
          .digest("hex");
        if (signature !== expectedSig) {
          return reply.status(401).send("Invalid signature");
        }
      }
    }

    const body = req.body as any;
    reply.status(200).send("EVENT_RECEIVED"); // responder 200 siempre primero

    try {
      const entry = body?.entry?.[0];
      const changes = entry?.changes?.[0];
      const value = changes?.value;

      if (!value?.messages || value.messages.length === 0) return;

      const phoneNumberId: string = value.metadata?.phone_number_id;
      const message = value.messages[0];

      // Extraer texto — soporta texto plano e interactivos (botones/lista)
      let text = "";
      if (message.type === "text") {
        text = message.text?.body || "";
      } else if (message.type === "interactive") {
        const itype = message.interactive?.type;
        if (itype === "list_reply") {
          text = message.interactive.list_reply.id;
        } else if (itype === "button_reply") {
          text = message.interactive.button_reply.id;
        }
      } else {
        return; // ignorar otros tipos (imagen, audio, etc.)
      }

      const from: string = message.from;
      const messageId: string = message.id;

      // Buscar tenant por phoneNumberId
      const tenant = await prisma.tenant.findFirst({
        where: { waPhoneNumberId: phoneNumberId, active: true },
      });
      if (!tenant || !tenant.waAccessToken) return;

      // Marcar como leído
      await markAsRead(phoneNumberId, tenant.waAccessToken, messageId).catch(() => {});

      // Procesar con el bot y enviar respuesta
      const botReply = await handleBotMessage(tenant.id, from, text, messageId);
      if (botReply) {
        await sendBotReply(phoneNumberId, tenant.waAccessToken, from, botReply);
      }
    } catch (err) {
      app.log.error(err, "Error procesando webhook WhatsApp");
    }
  });

  // ─── ENDPOINTS DEL PANEL ─────────────────────────────────────────────────

  // GET /api/whatsapp/conversations — Listar conversaciones activas
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

  // GET /api/whatsapp/conversations/:id/messages
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

  // POST /api/whatsapp/conversations/:id/send — Admin envía mensaje manual
  app.post("/conversations/:id/send", auth, async (req: any, reply) => {
    const { text } = req.body as { text: string };
    if (!text) return reply.status(400).send({ error: "text requerido" });

    const conv = await prisma.conversation.findFirst({
      where: { id: req.params.id, tenantId: req.user.tenantId },
    });
    if (!conv) return reply.status(404).send({ error: "Conversación no encontrada" });

    const tenant = await prisma.tenant.findUnique({ where: { id: req.user.tenantId } });
    if (!tenant?.waPhoneNumberId || !tenant.waAccessToken) {
      return reply.status(400).send({ error: "WhatsApp no configurado" });
    }

    await sendTextMessage(tenant.waPhoneNumberId, tenant.waAccessToken, conv.phone, text);
    await prisma.message.create({
      data: { conversationId: conv.id, direction: "OUT", content: text },
    });
    return { ok: true };
  });

  // PATCH /api/whatsapp/conversations/:id/human-mode — Tomar/liberar control
  app.patch("/conversations/:id/human-mode", auth, async (req: any, reply) => {
    const { humanMode } = req.body as { humanMode: boolean };
    const conv = await prisma.conversation.findFirst({
      where: { id: req.params.id, tenantId: req.user.tenantId },
    });
    if (!conv) return reply.status(404).send({ error: "No encontrado" });
    return prisma.conversation.update({ where: { id: conv.id }, data: { humanMode } });
  });
}
