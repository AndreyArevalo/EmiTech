// ─────────────────────────────────────────────────────────────────────────────
// modules/whatsapp/bot.service.ts
// Flujo conversacional multi-tenant con mensajes interactivos Meta Cloud API
// ─────────────────────────────────────────────────────────────────────────────
import { prisma } from "@emitech/database";
import { parseDateNatural, formatTime, formatDateSpanish } from "../../lib/dateUtils";
import { getAvailableSlots } from "../appointments/appointment.service";
import { askAI } from "../../lib/ai";
import { notifyAdminNewAppointment } from "../../lib/notifyAdmin";
import { BotReply, ListSection } from "../../lib/meta";
import { baileysSessions } from "../../lib/baileys-manager";

// ─── Helpers de texto ─────────────────────────────────────────────────────────
function isYes(text: string): boolean {
  return ["sí","si","s","yes","confirmar","confirmo","listo","ok","dale","claro","correcto","exacto","si, confirmar"]
    .includes(text.trim().toLowerCase());
}
function isNo(text: string): boolean {
  return ["no","n","corregir","cambiar","editar","modificar","otro","corregir datos"]
    .includes(text.trim().toLowerCase());
}
function isReset(text: string): boolean {
  return ["menu","menú","inicio","start","hola","buenas","buenos días","buenas tardes","buenas noches","cancelar","salir","volver"]
    .some(k => text.trim().toLowerCase() === k || text.trim().toLowerCase().startsWith(k + " "));
}

// ─── Builders de mensajes interactivos ───────────────────────────────────────
function txt(text: string): BotReply {
  return { kind: "text", text };
}

function serviceListReply(
  services: { id: string; name: string; emoji: string | null; order: number }[],
  header: string
): BotReply {
  const sorted = [...services].sort((a, b) => a.order - b.order);
  return {
    kind: "list",
    body: header,
    buttonLabel: "Ver servicios",
    sections: [{
      title: "Servicios disponibles",
      rows: sorted.map((s, i) => ({
        id: String(i + 1),
        title: `${s.emoji || "💅"} ${s.name}`,
      })),
    }],
  };
}

function staffListReply(
  staff: { id: string; name: string }[],
  header: string
): BotReply {
  return {
    kind: "list",
    body: header,
    buttonLabel: "Ver profesionales",
    sections: [{
      title: "Profesionales disponibles",
      rows: staff.map((s, i) => ({
        id: String(i + 1),
        title: s.name,
      })),
    }],
  };
}

// Meta: máximo 10 filas TOTALES en un mensaje de lista (no por sección)
// Solución: primero elegir turno (Mañana/Tarde) con botones, luego mostrar ≤10 slots

function turnButtons(dateISO: string, mananaCount: number, tardeCount: number): BotReply {
  const fecha = formatDateSpanish(dateISO);
  const buttons: { id: string; title: string }[] = [];
  if (mananaCount > 0) buttons.push({ id: "turno_manana", title: `☀️ Mañana (${mananaCount})` });
  if (tardeCount > 0)  buttons.push({ id: "turno_tarde",  title: `🌙 Tarde (${tardeCount})` });
  return {
    kind: "buttons",
    body: `¿Qué turno prefieres para el *${fecha}*?`,
    buttons,
  };
}

function slotsListReply(dateISO: string, slots: string[]): BotReply {
  const fecha = formatDateSpanish(dateISO);
  // slots viene de un solo turno (≤10), así que solo habrá 1 sección
  const manana = slots.filter(s => parseInt(s) < 12);
  const tarde  = slots.filter(s => parseInt(s) >= 12);

  const sections: ListSection[] = [];
  let idx = 1;
  if (manana.length > 0) {
    sections.push({ title: "Mañana", rows: manana.map(s => ({ id: String(idx++), title: formatTime(s) })) });
  }
  if (tarde.length > 0) {
    sections.push({ title: "Tarde", rows: tarde.map(s => ({ id: String(idx++), title: formatTime(s) })) });
  }

  return {
    kind: "list",
    body: `✨ Horarios para el *${fecha}*:`,
    buttonLabel: "Ver horarios",
    sections,
  };
}

// Dado el array completo de slots, decide qué mostrar al usuario
// Si solo hay un turno → ir directo a la lista. Si hay dos → pedir turno primero.
type SlotsDecision =
  | { kind: "list"; slots: string[] }
  | { kind: "turn-select"; manana: string[]; tarde: string[] };

function decideSlotsStep(allSlots: string[]): SlotsDecision {
  const manana = allSlots.filter(s => parseInt(s) < 12).slice(0, 10);
  const tarde  = allSlots.filter(s => parseInt(s) >= 12).slice(0, 10);
  if (manana.length === 0 || tarde.length === 0) {
    // Solo hay un turno, mostrar directamente
    return { kind: "list", slots: manana.length > 0 ? manana : tarde };
  }
  return { kind: "turn-select", manana, tarde };
}

// Formato corto para títulos de lista (máx 24 chars en Meta)
// Ej: "mié 22 sep" (10 chars máximo)
function formatDateForList(iso: string): string {
  const date = new Date(`${iso}T00:00:00`);

  const text = new Intl.DateTimeFormat("es-CO", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(date);

  return text.charAt(0).toUpperCase() + text.slice(1);
}

async function buildDateList(
  tenantId: string,
  serviceId: string,
  staffId?: string | null
): Promise<BotReply> {
  try {
    const dates: { iso: string; label: string }[] = [];
    const today = new Date();

    // WhatsApp permite máximo 10 rows totales en una lista interactiva
    const MAX_TOTAL_ROWS = 10;

    for (let i = 0; i <= 30 && dates.length < MAX_TOTAL_ROWS; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);

      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      const iso = `${y}-${m}-${day}`;

      const slots = await getAvailableSlots({
        tenantId,
        date: iso,
        serviceId,
        staffId: staffId ?? undefined,
      });

      if (slots.length > 0) {
        dates.push({
          iso,
          label: formatDateForList(iso),
        });
      }
    }

    if (dates.length === 0) {
      return txt(
        "No encontré disponibilidad en los próximos días 😔 Por favor escríbeme la fecha que prefieres (ej: *lunes 5 de mayo*)."
      );
    }

    // Máximo 10 filas totales
    // Repartimos 5 y 5 para conservar dos secciones
    const primera = dates.slice(0, 5);
    const segunda = dates.slice(5, 10);

    const sections: ListSection[] = [];

    if (primera.length > 0) {
      sections.push({
        title: "Esta semana",
        rows: primera.map((d) => ({
          id: d.iso,
          title: d.label,
        })),
      });
    }

    if (segunda.length > 0) {
      sections.push({
        title: "Próximas fechas",
        rows: segunda.map((d) => ({
          id: d.iso,
          title: d.label,
        })),
      });
    }

    return {
      kind: "list",
      body: "¿Para qué fecha deseas tu cita?",
      buttonLabel: "Ver fechas",
      sections,
    };
  } catch (err) {
    return txt(
      "¿Para qué fecha deseas tu cita?\n\nEjemplos: *mañana*, *el viernes*, *25 de abril*"
    );
  }
}

function confirmationButtons(resumen: string): BotReply {
  return {
    kind: "buttons",
    body: resumen,
    buttons: [
      { id: "si", title: "✅ Confirmar" },
      { id: "no", title: "✏️ Corregir datos" },
    ],
  };
}

// ─── Resumen de cita (reutilizable) ──────────────────────────────────────────
function buildResumen(d: Record<string, any>): string {
  return (
    `📋 *Resumen de tu cita:*\n\n` +
    `👤 Nombre: ${d.name}\n` +
    `💅 Servicio: ${d.serviceName}\n` +
    (d.staffName ? `✂️ Profesional: ${d.staffName}\n` : "") +
    `📅 Fecha: ${formatDateSpanish(d.dateISO)}\n` +
    `🕒 Hora: ${formatTime(d.time)}\n\n` +
    `¿Todo correcto?`
  );
}

// ─── Admin: confirmar / rechazar cita por WhatsApp ────────────────────────────
async function handleAdminAction(
  tenantId: string,
  phone: string,
  action: string,
  apptId: string
): Promise<BotReply | null> {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    include: { botConfig: true },
  });

  // Verificar que el mensaje viene del número admin del salón
  const adminPhone = (tenant?.phone || "").replace(/\D/g, "").slice(-10);
  const fromPhone = phone.replace(/\D/g, "").slice(-10);
  if (!adminPhone || adminPhone !== fromPhone) return null;

  const appt = await prisma.appointment.findFirst({
    where: { id: apptId, tenantId },
    include: { client: true, service: true },
  });
  if (!appt) return txt("❌ Cita no encontrada.");

  const label = `${appt.client.name || appt.client.phone} · ${formatDateSpanish(appt.date)} ${formatTime(appt.time)}`;

  if (action === "confirm") {
    if (appt.status === "CONFIRMED") return txt(`✅ Esta cita ya estaba confirmada.\n${label}`);
    await prisma.appointment.update({
      where: { id: apptId },
      data: { status: "CONFIRMED", confirmedAt: new Date() },
    });

    // Notificar al cliente via Baileys
    if (tenant && baileysSessions.isConnected(tenantId)) {
      const tpl = tenant.botConfig?.confirmMessage ||
        "✅ ¡Tu cita fue confirmada! Te esperamos el {fecha} a las {hora}. 🌸";
      const msg = tpl
        .replace("{nombre}", appt.client.name || "")
        .replace("{fecha}", formatDateSpanish(appt.date))
        .replace("{hora}", formatTime(appt.time))
        .replace("{servicio}", appt.service.name);
      try {
        await baileysSessions.sendText(tenantId, appt.client.phone, msg);
      } catch {}
    }
    return txt(`✅ Cita confirmada:\n${label}`);
  }

  if (action === "reject") {
    if (appt.status === "CANCELLED") return txt(`❌ Esta cita ya estaba cancelada.\n${label}`);
    await prisma.appointment.update({
      where: { id: apptId },
      data: { status: "CANCELLED", cancelledAt: new Date() },
    });

    // Notificar al cliente via Baileys
    if (baileysSessions.isConnected(tenantId)) {
      const msg =
        `Lo sentimos, tu cita del *${formatDateSpanish(appt.date)}* a las *${formatTime(appt.time)}* ` +
        `no pudo confirmarse. Escríbenos para reagendar. 🙏`;
      try {
        await baileysSessions.sendText(tenantId, appt.client.phone, msg);
      } catch {}
    }
    return txt(`❌ Cita rechazada:\n${label}`);
  }

  return null;
}

// ─── Handler principal ────────────────────────────────────────────────────────
export async function handleBotMessage(
  tenantId: string,
  phone: string,
  text: string,
  waMessageId?: string
): Promise<BotReply | null> {
  const t = text.trim();
  if (!t) return null;

  // Deduplicar por messageId de WhatsApp
  if (waMessageId) {
    const existing = await prisma.message.findFirst({ where: { waMessageId } });
    if (existing) return null;
  }

  // ─── Admin: confirmar/rechazar cita vía botón WhatsApp ───────────────────
  const adminMatch = t.match(/^(confirmar|rechazar)_(.+)$/);
  if (adminMatch) {
    const action = adminMatch[1] === "confirmar" ? "confirm" : "reject";
    return handleAdminAction(tenantId, phone, action, adminMatch[2]);
  }

  // Cargar tenant + config
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    include: { botConfig: true },
  });
  if (!tenant) return null;
  const cfg = tenant.botConfig;

  // Bot cerrado
  if (cfg && !cfg.isOpen && !isReset(t)) {
    return txt(cfg.closedMessage);
  }

  // Obtener/crear cliente y conversación
  let client = await prisma.client.findUnique({ where: { tenantId_phone: { tenantId, phone } } });
  if (!client) {
    client = await prisma.client.create({ data: { tenantId, phone } });
  }

  let conv = await prisma.conversation.findUnique({ where: { tenantId_phone: { tenantId, phone } } });
  if (!conv) {
    conv = await prisma.conversation.create({
      data: { tenantId, phone, clientId: client.id, step: "inicio" },
    });
  }

  if (conv.humanMode) return null;

  // Guardar mensaje entrante
  await prisma.message.create({
    data: { conversationId: conv.id, direction: "IN", content: t, waMessageId },
  });

  // Servicios activos del salón
  const services = await prisma.service.findMany({
    where: { tenantId, active: true },
    orderBy: { order: "asc" },
  });

  async function reply(r: BotReply): Promise<BotReply> {
    const content = r.kind === "text" ? r.text : r.kind === "list" ? r.body : r.body;
    await prisma.message.create({
      data: { conversationId: conv!.id, direction: "OUT", content },
    });
    return r;
  }

  async function updateStep(step: string, data: object = {}) {
    conv = await prisma.conversation.update({
      where: { id: conv!.id },
      data: { step, data },
    });
  }

  const convData = conv.data as Record<string, any>;

  // ─── RESET / INICIO ───────────────────────────────────────────────────────
  // Bienvenida si: el usuario escribió un saludo explícito (isReset)
  // o es un usuario nuevo (step=inicio y primer mensaje).
  // Ignorar si step=inicio pero hay mensajes previos — evita eco de notificaciones Meta.
  if (isReset(t) || conv.step === "inicio") {
    if (conv.step === "inicio" && !isReset(t)) {
      const msgCount = await prisma.message.count({ where: { conversationId: conv.id } });
      if (msgCount > 1) return null; // eco o webhook automático, ignorar
    }
    if (cfg && !cfg.isOpen) return reply(txt(cfg.closedMessage));
    const welcome = cfg?.welcomeMessage ?? "¡Hola! Bienvenida/o 💅 ¿Qué servicio deseas agendar?";
    await updateStep("esperando_servicio");
    return reply(serviceListReply(services, welcome));
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PASO 1: Elegir servicio
  // ═══════════════════════════════════════════════════════════════════════════
  if (conv.step === "esperando_servicio") {
    const tl = t.toLowerCase();
    let found = services.find((_, i) => tl === String(i + 1));
    if (!found) found = services.find(s => tl.includes(s.name.toLowerCase().split(" ")[0]));
    if (!found) {
      return reply(serviceListReply(services, "No reconocí ese servicio 😊 Por favor elige uno:"));
    }

    // Buscar estilistas para este servicio
    let allStaff = await prisma.staff.findMany({
      where: { tenantId, active: true, staffServices: { some: { serviceId: found.id } } },
      orderBy: { name: "asc" },
    });
    if (allStaff.length === 0) {
      allStaff = await prisma.staff.findMany({ where: { tenantId, active: true }, orderBy: { name: "asc" } });
    }

    if (allStaff.length <= 1) {
      const staffId = allStaff[0]?.id ?? null;
      const staffName = allStaff[0]?.name ?? null;
      await updateStep("esperando_fecha", { serviceId: found.id, serviceName: found.name, staffId, staffName });
      const dateList = await buildDateList(tenantId, found.id, staffId ?? undefined);
      return reply(dateList);
    }

    await updateStep("esperando_staff", {
      serviceId: found.id,
      serviceName: found.name,
      staffOptions: allStaff.map(s => ({ id: s.id, name: s.name })),
    });
    return reply(staffListReply(
      allStaff,
      `Perfecto, *${found.name}* ${found.emoji ?? "💅"}\n\n¿Con qué profesional deseas tu cita?`
    ));
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PASO 1B: Elegir estilista
  // ═══════════════════════════════════════════════════════════════════════════
  if (conv.step === "esperando_staff") {
    const staffOptions: { id: string; name: string }[] = convData.staffOptions || [];
    const tl = t.toLowerCase();
    let chosen = staffOptions.find((_, i) => tl === String(i + 1));
    if (!chosen) chosen = staffOptions.find(s => tl.includes(s.name.toLowerCase().split(" ")[0]));
    if (!chosen) {
      return reply(staffListReply(staffOptions, "No reconocí esa opción 😊 Por favor elige:"));
    }
    await updateStep("esperando_fecha", { ...convData, staffId: chosen.id, staffName: chosen.name });
    const dateList = await buildDateList(tenantId, convData.serviceId, chosen.id);
    return reply(dateList);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PASO 2: Fecha
  // ═══════════════════════════════════════════════════════════════════════════
  if (conv.step === "esperando_fecha") {
    // Acepta ISO directo (de la lista) o texto natural
    const isoRegex = /^\d{4}-\d{2}-\d{2}$/;
    let dateISO: string | null = null;

    if (isoRegex.test(t)) {
      dateISO = t;
    } else {
      const parsed = parseDateNatural(t);
      if (parsed.valid && parsed.dateISO) dateISO = parsed.dateISO;
    }

    if (!dateISO) {
      const dateList = await buildDateList(tenantId, convData.serviceId, convData.staffId ?? undefined);
      return reply(dateList);
    }

    const today = new Date().toISOString().slice(0, 10);
    if (dateISO < today) {
      const dateList = await buildDateList(tenantId, convData.serviceId, convData.staffId ?? undefined);
      return reply(dateList);
    }

    const allSlots = await getAvailableSlots({
      tenantId,
      date: dateISO,
      serviceId: convData.serviceId,
      staffId: convData.staffId ?? undefined,
    });

    if (allSlots.length === 0) {
      const dateList = await buildDateList(tenantId, convData.serviceId, convData.staffId ?? undefined);
      return reply(dateList);
    }

    const decision = decideSlotsStep(allSlots);
    if (decision.kind === "list") {
      await updateStep("esperando_hora", { ...convData, dateISO, slots: decision.slots });
      return reply(slotsListReply(dateISO, decision.slots));
    } else {
      // Guardar ambos turnos para recuperarlos en esperando_turno
      await updateStep("esperando_turno", {
        ...convData, dateISO,
        mananaSlots: decision.manana,
        tardeSlots: decision.tarde,
      });
      return reply(turnButtons(dateISO, decision.manana.length, decision.tarde.length));
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PASO 2B: Elegir turno (Mañana / Tarde)
  // ═══════════════════════════════════════════════════════════════════════════
  if (conv.step === "esperando_turno") {
    const tl = t.toLowerCase();
    const mananaSlots: string[] = convData.mananaSlots || [];
    const tardeSlots:  string[] = convData.tardeSlots  || [];

    let slots: string[] | null = null;
    if (tl === "turno_manana" || tl.includes("mañana") || tl.includes("manana")) {
      slots = mananaSlots;
    } else if (tl === "turno_tarde" || tl.includes("tarde")) {
      slots = tardeSlots;
    }

    if (!slots) {
      return reply(turnButtons(convData.dateISO, mananaSlots.length, tardeSlots.length));
    }

    await updateStep("esperando_hora", { ...convData, slots });
    return reply(slotsListReply(convData.dateISO, slots));
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PASO 3: Hora
  // ═══════════════════════════════════════════════════════════════════════════
  if (conv.step === "esperando_hora") {
    const slots: string[] = convData.slots || [];

    // Selección por número de lista
    const num = parseInt(t);
    let slot: string | null = null;
    if (!isNaN(num) && num >= 1 && num <= slots.length) {
      slot = slots[num - 1];
    } else {
      // Formato 12h: "9 am", "2:30 pm"
      const m12 = t.toLowerCase().match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)$/i);
      if (m12) {
        let h = +m12[1]; const min = +(m12[2] || "0"); const period = m12[3].toLowerCase();
        if (period === "pm" && h !== 12) h += 12;
        if (period === "am" && h === 12) h = 0;
        const candidate = `${String(h).padStart(2,"0")}:${String(min).padStart(2,"0")}`;
        if (slots.includes(candidate)) slot = candidate;
      }
      // Formato 24h
      const m24 = t.match(/^(\d{1,2}):(\d{2})$/);
      if (m24) {
        const candidate = `${String(+m24[1]).padStart(2,"0")}:${String(+m24[2]).padStart(2,"0")}`;
        if (slots.includes(candidate)) slot = candidate;
      }
    }

    if (!slot) {
      return reply(slotsListReply(convData.dateISO, slots));
    }

    const newData = { ...convData, time: slot } as Record<string, any>;
    // Si ya tenemos el nombre (corrección de fecha/hora), saltar directo a confirmación
    if (newData.name) {
      await updateStep("esperando_confirmacion", newData);
      return reply(confirmationButtons(buildResumen(newData)));
    }

    await updateStep("esperando_nombre", newData);
    return reply(txt("¡Perfecto! 🌸\n\n¿A nombre de quién quedará la cita?"));
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PASO 4: Nombre
  // ═══════════════════════════════════════════════════════════════════════════
  if (conv.step === "esperando_nombre") {
    if (t.length < 2 || !/[a-zA-ZáéíóúñÁÉÍÓÚÑ]/.test(t)) {
      return reply(txt("Por favor escríbeme tu nombre completo 😊"));
    }
    const d = { ...convData, name: t };
    await updateStep("esperando_confirmacion", d);
    return reply(confirmationButtons(buildResumen(d)));
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PASO 5: Confirmación
  // ═══════════════════════════════════════════════════════════════════════════
  if (conv.step === "esperando_confirmacion") {
    if (isYes(t)) {
      const service = await prisma.service.findUnique({ where: { id: convData.serviceId } });

      await prisma.client.update({
        where: { id: client.id },
        data: { name: convData.name, lastVisit: new Date(), totalVisits: { increment: 1 } },
      });

      const requiresConfirm = cfg?.requiresConfirm ?? true;
      const appt = await prisma.appointment.create({
        data: {
          tenantId,
          clientId: client.id,
          serviceId: convData.serviceId,
          staffId: convData.staffId ?? undefined,
          date: convData.dateISO,
          time: convData.time,
          duration: service?.duration ?? 60,
          status: requiresConfirm ? "PENDING" : "CONFIRMED",
        },
      });

      await updateStep("inicio", {});

      notifyAdminNewAppointment({
        tenantId,
        appointmentId: appt.id,
        clientName: convData.name,
        clientPhone: phone,
        serviceName: convData.serviceName,
        dateISO: convData.dateISO,
        time: convData.time,
      }).catch(() => {});

      const confirmMsg = cfg?.confirmMessage ??
        "✅ ¡Tu solicitud fue registrada! En breve te confirmamos tu cita. 🌸\n\nSi necesitas algo más, escribe *menu*.";
      return reply(txt(confirmMsg));
    }

    if (isNo(t)) {
      await updateStep("corrigiendo_campo", convData);
      return reply({
        kind: "list",
        body: "¿Qué dato deseas cambiar?",
        buttonLabel: "Seleccionar",
        sections: [{
          title: "Opciones",
          rows: [
            { id: "corr_servicio", title: "💅 Servicio" },
            { id: "corr_estilista", title: "✂️ Profesional" },
            { id: "corr_fecha", title: "📅 Fecha" },
            { id: "corr_hora", title: "🕒 Hora" },
            { id: "corr_nombre", title: "👤 Nombre" },
          ],
        }],
      });
    }

    return reply(confirmationButtons(
      "Por favor usa los botones para confirmar o corregir tu cita 😊"
    ));
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PASO 6: Corrección
  // ═══════════════════════════════════════════════════════════════════════════
  if (conv.step === "corrigiendo_campo") {
    const tl = t.toLowerCase();
    if (tl === "1" || tl === "corr_servicio" || tl.includes("servicio")) {
      await updateStep("esperando_servicio", {});
      return reply(serviceListReply(services, "¿Qué servicio deseas agendar?"));
    }
    if (tl === "2" || tl === "corr_estilista" || tl.includes("estilista") || tl.includes("profesional")) {
      let allStaff = await prisma.staff.findMany({ where: { tenantId, active: true }, orderBy: { name: "asc" } });
      await updateStep("esperando_staff", { ...convData, staffOptions: allStaff.map(s => ({ id: s.id, name: s.name })) });
      return reply(staffListReply(allStaff, "¿Con qué profesional deseas tu cita?"));
    }
    if (tl === "3" || tl === "corr_fecha" || tl.includes("fecha")) {
      await updateStep("esperando_fecha", convData);
      const dateList = await buildDateList(tenantId, convData.serviceId, convData.staffId ?? undefined);
      return reply(dateList);
    }
    if (tl === "4" || tl === "corr_hora" || tl.includes("hora")) {
      const allSlots = await getAvailableSlots({ tenantId, date: convData.dateISO, serviceId: convData.serviceId, staffId: convData.staffId });
      if (allSlots.length === 0) {
        await updateStep("esperando_fecha", convData);
        return reply(txt("No quedan horarios para esa fecha. Por favor elige otra fecha."));
      }
      const decision = decideSlotsStep(allSlots);
      if (decision.kind === "list") {
        await updateStep("esperando_hora", { ...convData, slots: decision.slots });
        return reply(slotsListReply(convData.dateISO, decision.slots));
      } else {
        await updateStep("esperando_turno", { ...convData, mananaSlots: decision.manana, tardeSlots: decision.tarde });
        return reply(turnButtons(convData.dateISO, decision.manana.length, decision.tarde.length));
      }
    }
    if (tl === "5" || tl === "corr_nombre" || tl.includes("nombre")) {
      await updateStep("esperando_nombre", convData);
      return reply(txt("¿A nombre de quién quedará la cita?"));
    }
    return reply(txt("No entendí 😊 Escribe *menu* para reiniciar."));
  }

  // ─── Fallback con IA ──────────────────────────────────────────────────────
  const aiResponse = await askAI({ tenantId, userMessage: t });
  if (aiResponse) return reply(txt(aiResponse));

  return reply(txt("No entendí tu mensaje 😊\n\nEscribe *hola* para iniciar o *menu* para ver opciones."));
}
