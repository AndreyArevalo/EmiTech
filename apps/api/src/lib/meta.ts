// ─────────────────────────────────────────────────────────────────────────────
// lib/meta.ts — Meta Cloud API: enviar mensajes WhatsApp
// ─────────────────────────────────────────────────────────────────────────────
import axios from "axios";

const META_API_URL = "https://graph.facebook.com/v19.0";

const headers = (token: string) => ({
  Authorization: `Bearer ${token}`,
  "Content-Type": "application/json",
});

// ─── Tipos para respuestas del bot ────────────────────────────────────────────
export type ListSection = {
  title: string;
  rows: { id: string; title: string; description?: string }[];
};

export type BotReply =
  | { kind: "text"; text: string }
  | { kind: "list"; body: string; buttonLabel: string; sections: ListSection[] }
  | { kind: "buttons"; body: string; buttons: { id: string; title: string }[] };

// ─── Texto simple ─────────────────────────────────────────────────────────────
export async function sendTextMessage(
  phoneNumberId: string,
  accessToken: string,
  to: string,
  text: string
): Promise<void> {
  await axios.post(
    `${META_API_URL}/${phoneNumberId}/messages`,
    { messaging_product: "whatsapp", recipient_type: "individual", to, type: "text", text: { body: text } },
    { headers: headers(accessToken) }
  );
}

// ─── Lista interactiva ────────────────────────────────────────────────────────
export async function sendListMessage(
  phoneNumberId: string,
  accessToken: string,
  to: string,
  body: string,
  buttonLabel: string,
  sections: ListSection[]
): Promise<void> {
  await axios.post(
    `${META_API_URL}/${phoneNumberId}/messages`,
    {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to,
      type: "interactive",
      interactive: {
        type: "list",
        body: { text: body },
        action: { button: buttonLabel, sections },
      },
    },
    { headers: headers(accessToken) }
  );
}

// ─── Botones ──────────────────────────────────────────────────────────────────
export async function sendButtonMessage(
  phoneNumberId: string,
  accessToken: string,
  to: string,
  body: string,
  buttons: { id: string; title: string }[]
): Promise<void> {
  await axios.post(
    `${META_API_URL}/${phoneNumberId}/messages`,
    {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to,
      type: "interactive",
      interactive: {
        type: "button",
        body: { text: body },
        action: {
          buttons: buttons.map(b => ({ type: "reply", reply: { id: b.id, title: b.title } })),
        },
      },
    },
    { headers: headers(accessToken) }
  );
}

// ─── Enviar cualquier BotReply ────────────────────────────────────────────────
export async function sendBotReply(
  phoneNumberId: string,
  accessToken: string,
  to: string,
  reply: BotReply
): Promise<void> {
  if (reply.kind === "text") {
    await sendTextMessage(phoneNumberId, accessToken, to, reply.text);
  } else if (reply.kind === "list") {
    await sendListMessage(phoneNumberId, accessToken, to, reply.body, reply.buttonLabel, reply.sections);
  } else if (reply.kind === "buttons") {
    await sendButtonMessage(phoneNumberId, accessToken, to, reply.body, reply.buttons);
  }
}

// ─── Marcar como leído ────────────────────────────────────────────────────────
export async function markAsRead(
  phoneNumberId: string,
  accessToken: string,
  messageId: string
): Promise<void> {
  await axios.post(
    `${META_API_URL}/${phoneNumberId}/messages`,
    { messaging_product: "whatsapp", status: "read", message_id: messageId },
    { headers: headers(accessToken) }
  );
}
