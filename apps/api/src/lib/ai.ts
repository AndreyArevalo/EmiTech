// ─────────────────────────────────────────────────────────────────────────────
// lib/ai.ts — Fallback IA via OpenRouter (portado de services/ia.js)
// Se activa cuando el bot no reconoce el mensaje del cliente.
// ─────────────────────────────────────────────────────────────────────────────
import axios from "axios";
import { prisma } from "@emitech/database";

interface AskAIParams {
  tenantId: string;
  userMessage: string;
}

export async function askAI({ tenantId, userMessage }: AskAIParams): Promise<string | null> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) return null;

  // Obtener contexto del salón dinámicamente
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    include: {
      services: { where: { active: true }, orderBy: { order: "asc" } },
      workingHours: { where: { isOpen: true, staffId: null } },
      botConfig: true,
    },
  });
  if (!tenant) return null;

  const servicesList = tenant.services
    .map(s => `- ${s.name}: $${Number(s.price).toLocaleString("es-CO")} COP, ${s.duration} min`)
    .join("\n");

  const DAYS_ES = ["Domingo","Lunes","Martes","Miércoles","Jueves","Viernes","Sábado"];
  const scheduleList = tenant.workingHours
    .sort((a, b) => a.dayOfWeek - b.dayOfWeek)
    .map(h => `- ${DAYS_ES[h.dayOfWeek]}: ${h.openTime} – ${h.closeTime}`)
    .join("\n");

  const systemPrompt = [
    `Eres el asistente virtual de "${tenant.name}", un salón de belleza${tenant.city ? ` en ${tenant.city}` : ""}.`,
    `Responde de forma breve, amable y en español.`,
    ``,
    `SERVICIOS:`,
    servicesList || "Consultar en el salón.",
    ``,
    `HORARIOS:`,
    scheduleList || "Consultar disponibilidad.",
    ``,
    `Si preguntan cómo agendar una cita, diles que escriban *hola* o *menu*.`,
    `No inventes precios ni horarios que no estén en esta lista.`,
    `No saludes ni te despidas de forma extensa — ve directo al punto.`,
  ].join("\n");

  try {
    const res = await axios.post(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        model: "openai/gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage },
        ],
        max_tokens: 200,
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://emitech.co",
          "X-Title": "EmiTech Bot",
        },
        timeout: 15000,
      }
    );
    return res.data?.choices?.[0]?.message?.content || null;
  } catch (err: any) {
    console.error("[AI] Error:", err.message);
    return null;
  }
}
