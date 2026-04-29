// ─────────────────────────────────────────────────────────────────────────────
// lib/notifyAdmin.ts — Baileys version
// Notifica al dueño del salón cuando llega una nueva cita.
// Usa un código corto numérico (1-999) para confirmar o rechazar.
// El admin responde: "confirmar_42" o "rechazar_42"
// ─────────────────────────────────────────────────────────────────────────────
import { prisma } from "@emitech/database";
import { baileysSessions } from "./baileys-manager";
import { formatTime, formatDateSpanish } from "./dateUtils";

interface NotifyAdminParams {
  tenantId: string;
  appointmentId: string;
  shortCode: number;
  clientName: string;
  clientPhone: string;
  serviceName: string;
  dateISO: string;
  time: string;
}

export async function notifyAdminNewAppointment(params: NotifyAdminParams): Promise<void> {
  const { tenantId, shortCode, clientName, clientPhone, serviceName, dateISO, time } = params;

  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { phone: true, name: true },
  });

  // Solo notificar si el salón tiene número admin configurado y sesión activa
  if (!tenant?.phone || !baileysSessions.isConnected(tenantId)) return;

  const body =
    `📌 *Nueva cita #${shortCode} — ${tenant.name}*\n\n` +
    `👤 ${clientName || "Sin nombre"}\n` +
    `📞 ${clientPhone}\n` +
    `💅 ${serviceName}\n` +
    `📅 ${formatDateSpanish(dateISO)}\n` +
    `🕒 ${formatTime(time)}\n\n` +
    `Para *confirmar* responde:\n` +
    `*confirmar_${shortCode}*\n\n` +
    `Para *rechazar* responde:\n` +
    `*rechazar_${shortCode}*\n\n` +
    `O gestiona desde el panel: /dashboard/appointments`;

  try {
    await baileysSessions.sendText(tenantId, tenant.phone, body);
  } catch (err: any) {
    console.error("[NOTIFY_ADMIN] Error enviando notificación:", err.message);
  }
}
