// ─────────────────────────────────────────────────────────────────────────────
// lib/baileys-renderer.ts
// Convierte BotReply (diseñado para Meta Interactive Messages) a texto
// formateado para WhatsApp vía Baileys.
//
// Meta tenía listas y botones interactivos clickeables.
// Con Baileys enviamos texto plano con opciones numeradas.
// El usuario responde con "1", "2", "3"... y baileys-manager.ts
// traduce ese número al ID original antes de pasarlo al bot.
// ─────────────────────────────────────────────────────────────────────────────

import { BotReply } from "./meta";

// ─── Renderizar BotReply a string de WhatsApp ─────────────────────────────────
export function renderBotReply(reply: BotReply): string {
  switch (reply.kind) {
    case "text":
      return reply.text;

    case "buttons": {
      // Confirmar/rechazar → palabras clave en lugar de números
      // El bot ya maneja "si", "no", "mañana", "tarde" como texto
      const isYesNo =
        reply.buttons.length === 2 &&
        reply.buttons.some((b) => b.id === "si" || b.id === "no");

      const isTurno =
        reply.buttons.length <= 2 &&
        reply.buttons.some(
          (b) => b.id === "turno_manana" || b.id === "turno_tarde"
        );

      if (isYesNo) {
        return (
          reply.body +
          "\n\n" +
          "Responde *si* para confirmar o *no* para corregir."
        );
      }

      if (isTurno) {
        const parts: string[] = [];
        if (reply.buttons.find((b) => b.id === "turno_manana")) {
          parts.push("*mañana*");
        }
        if (reply.buttons.find((b) => b.id === "turno_tarde")) {
          parts.push("*tarde*");
        }
        return reply.body + "\n\nEscribe " + parts.join(" o ") + ":";
      }

      // Botones genéricos → numerados
      let text = reply.body + "\n\n";
      reply.buttons.forEach((btn, i) => {
        text += `${numEmoji(i + 1)} ${btn.title}\n`;
      });
      text += "\nResponde con el número:";
      return text;
    }

    case "list": {
      let text = reply.body + "\n\n";
      let idx = 1;

      for (const section of reply.sections) {
        // Mostrar el título de sección solo si hay más de una
        if (reply.sections.length > 1 && section.title) {
          text += `*${section.title}*\n`;
        }
        for (const row of section.rows) {
          text += `${numEmoji(idx)} ${row.title}\n`;
          idx++;
        }
        if (reply.sections.length > 1) text += "\n";
      }

      text += "\nResponde con el número:";
      return text;
    }

    default:
      return "";
  }
}

// ─── Extraer mapa de opciones (número → ID) ───────────────────────────────────
// Usado por baileys-manager.ts para traducir "1" → "2026-05-04", etc.
export function extractOptions(reply: BotReply): Map<string, string> {
  const opts = new Map<string, string>();

  if (reply.kind === "list") {
    let idx = 1;
    for (const section of reply.sections) {
      for (const row of section.rows) {
        opts.set(String(idx), row.id);
        idx++;
      }
    }
  } else if (reply.kind === "buttons") {
    // Para si/no y turno, el bot ya maneja las palabras clave directamente
    // así que no necesitamos traducción numérica — devolvemos mapa vacío
    // y el renderizador muestra las palabras a usar.
    const isYesNo = reply.buttons.some((b) => b.id === "si" || b.id === "no");
    const isTurno = reply.buttons.some(
      (b) => b.id === "turno_manana" || b.id === "turno_tarde"
    );

    if (!isYesNo && !isTurno) {
      // Botones genéricos → mapeo numérico
      reply.buttons.forEach((btn, i) => {
        opts.set(String(i + 1), btn.id);
      });
    }
    // Para si/no y turno: el usuario escribe la palabra ("si", "mañana", etc.)
    // y el bot ya lo maneja — no necesitamos traducción
  }

  return opts;
}

// ─── Emoji numérico ───────────────────────────────────────────────────────────
function numEmoji(n: number): string {
  const emojis = ["1️⃣", "2️⃣", "3️⃣", "4️⃣", "5️⃣", "6️⃣", "7️⃣", "8️⃣", "9️⃣", "🔟"];
  return emojis[n - 1] ?? `${n}.`;
}
