// ─────────────────────────────────────────────────────────────────────────────
// lib/notifyAdmin.ts — Notificación al admin del salón cuando llega una cita
// Equivalente mejorado del textoAdmin de procesarCita.js
// ─────────────────────────────────────────────────────────────────────────────
import { prisma } from "@emitech/database";
import { sendButtonMessage, sendTextMessage } from "./meta";
import { formatTime, formatDateSpanish } from "./dateUtils";

interface NotifyAdminParams {
  tenantId: string;
  appointmentId: string;
  clientName: string;
  clientPhone: string;
  serviceName: string;
  dateISO: string;
  time: string;
}

export async function notifyAdminNewAppointment(params: NotifyAdminParams): Promise<void> {
  const { tenantId, appointmentId, clientName, clientPhone, serviceName, dateISO, time } = params;

  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { phone: true, waPhoneNumberId: true, waAccessToken: true, name: true },
  });

  // Solo notificar si el salón tiene número propio configurado como admin
  if (!tenant?.phone || !tenant.waPhoneNumberId || !tenant.waAccessToken) return;

  const body =
    `📌 *Nueva cita — ${tenant.name}*\n\n` +
    `👤 ${clientName || "Sin nombre"}\n` +
    `📞 ${clientPhone}\n` +
    `💅 ${serviceName}\n` +
    `📅 ${formatDateSpanish(dateISO)}\n` +
    `🕒 ${formatTime(time)}\n\n` +
    `¿Confirmas esta cita?`;

  try {
    await sendButtonMessage(
      tenant.waPhoneNumberId,
      tenant.waAccessToken,
      tenant.phone,
      body,
      [
        { id: `confirm_${appointmentId}`, title: "✅ Confirmar" },
        { id: `reject_${appointmentId}`, title: "❌ Rechazar" },
      ]
    );
  } catch (err: any) {
    // Fallback: texto simple si los botones fallan (ej. número no en WhatsApp Business)
    console.error("[NOTIFY_ADMIN] Error con botones, intentando texto simple:", err.message);
    try {
      await sendTextMessage(tenant.waPhoneNumberId, tenant.waAccessToken, tenant.phone,
        body + `\n\nResponde CONFIRMAR o RECHAZAR el ID: ${appointmentId.slice(-6).toUpperCase()}`);
    } catch {}
  }
}
