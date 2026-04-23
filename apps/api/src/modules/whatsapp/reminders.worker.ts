// ─────────────────────────────────────────────────────────────────────────────
// modules/whatsapp/reminders.worker.ts
// Worker BullMQ: envía recordatorios automáticos de citas
// Portado y mejorado desde services/recordatorios.js
//
// Mejoras vs. versión original:
//   ✅ Multi-tenant (procesa N salones)
//   ✅ Usa Meta Cloud API (no Baileys)
//   ✅ Config reminderHoursBefore por salón
//   ✅ Persiste jobs en Redis (sobrevive reinicios)
//   ✅ No envía duplicados gracias al campo reminderSent en DB
// ─────────────────────────────────────────────────────────────────────────────
import { Worker, Queue } from "bullmq";
import IORedis from "ioredis";
import { prisma } from "@emitech/database";
import { sendTextMessage } from "../../lib/meta";
import { formatTime, formatDateSpanish } from "../../lib/dateUtils";
import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";

dayjs.extend(utc);
dayjs.extend(timezone);

const QUEUE_NAME = "reminders";

// ─── Conexión Redis ───────────────────────────────────────────────────────────
function createRedisConnection() {
  const url = process.env.REDIS_URL || "redis://localhost:6379";
  return new IORedis(url, { maxRetriesPerRequest: null });
}

// ─── Lógica del job: enviar recordatorios pendientes ─────────────────────────
async function processReminders() {
  const now = dayjs();
  const todayISO = now.format("YYYY-MM-DD");

  // Obtener todos los tenants activos con WhatsApp configurado
  const tenants = await prisma.tenant.findMany({
    where: { active: true, waPhoneNumberId: { not: null }, waAccessToken: { not: null } },
    include: { botConfig: true },
  });

  for (const tenant of tenants) {
    if (!tenant.waPhoneNumberId || !tenant.waAccessToken) continue;

    const tz = tenant.timezone || "America/Bogota";
    const nowTz = dayjs().tz(tz);
    const reminderHours = tenant.botConfig?.reminderHoursBefore ?? 2;

    // Buscar citas confirmadas de hoy que aún no tienen recordatorio
    const appointments = await prisma.appointment.findMany({
      where: {
        tenantId: tenant.id,
        date: todayISO,
        status: "CONFIRMED",
        reminderSent: false,
      },
      include: { client: true, service: true },
    });

    for (const appt of appointments) {
      // Calcular si ya es tiempo de enviar el recordatorio
      const [h, m] = appt.time.split(":").map(Number);
      const apptMinutes = h * 60 + m;
      const nowMinutes = nowTz.hour() * 60 + nowTz.minute();
      const minutesUntilAppt = apptMinutes - nowMinutes;

      // Enviar si faltan ≤ reminderHours horas y aún no se envió
      if (minutesUntilAppt > 0 && minutesUntilAppt <= reminderHours * 60) {
        const clientPhone = appt.client.phone;
        if (!clientPhone) continue;

        const reminderTemplate =
          tenant.botConfig?.reminderMessage ??
          "Hola {nombre}, te recordamos tu cita hoy a las {hora} para {servicio} en {salon}. ¡Te esperamos! 🌸";

        const texto = reminderTemplate
          .replace("{nombre}", appt.client.name || "")
          .replace("{hora}", formatTime(appt.time))
          .replace("{servicio}", appt.service.name)
          .replace("{salon}", tenant.name)
          .replace("{fecha}", formatDateSpanish(appt.date));

        try {
          await sendTextMessage(
            tenant.waPhoneNumberId,
            tenant.waAccessToken,
            clientPhone,
            texto
          );

          // Marcar como enviado para no repetir
          await prisma.appointment.update({
            where: { id: appt.id },
            data: { reminderSent: true },
          });

          console.log(`[REMINDER] ✅ Enviado a ${clientPhone} — cita ${appt.id} (${tenant.name})`);
        } catch (err: any) {
          console.error(`[REMINDER] ❌ Error cita ${appt.id}:`, err.message);
        }
      }
    }
  }
}

// ─── Cron: vencimiento de suscripciones ──────────────────────────────────────
// Corre 1 vez al día. Revisa trials y suscripciones vencidas.
// Si faltan 3 días → avisa al admin por WhatsApp.
// Si ya venció → marca PAST_DUE y suspende el bot.
async function processSubscriptionExpiry() {
  const now = dayjs();

  // ── 1. Trials vencidos ───────────────────────────────────────────────────
  const expiredTrials = await prisma.subscription.findMany({
    where: {
      status: "TRIAL",
      trialEndsAt: { lt: now.toDate() },
    },
    include: { tenant: true },
  });

  for (const sub of expiredTrials) {
    await prisma.subscription.update({
      where: { id: sub.id },
      data: { status: "PAST_DUE" },
    });
    // Desactivar bot (no el tenant completo, para que el admin pueda pagar)
    await prisma.botConfig.updateMany({
      where: { tenantId: sub.tenantId },
      data: { isOpen: false },
    });
    console.log(`[BILLING] ⚠️ Trial vencido — tenant ${sub.tenantId} (${sub.tenant.name})`);

    // Notificar al admin del salón por WhatsApp si tiene número configurado
    if (sub.tenant.phone && sub.tenant.waPhoneNumberId && sub.tenant.waAccessToken) {
      try {
        await sendTextMessage(
          sub.tenant.waPhoneNumberId,
          sub.tenant.waAccessToken,
          sub.tenant.phone,
          `⚠️ *EmiTech — Tu período de prueba ha vencido*\n\n` +
          `El bot de ${sub.tenant.name} está pausado.\n\n` +
          `Para reactivarlo, ingresa al panel y elige un plan: ${process.env.WEB_URL || "https://emitech.co"}/dashboard/billing\n\n` +
          `¿Necesitas ayuda? Escríbenos.`
        );
      } catch {}
    }
  }

  // ── 2. Suscripciones activas vencidas ────────────────────────────────────
  const expiredSubs = await prisma.subscription.findMany({
    where: {
      status: "ACTIVE",
      currentPeriodEnd: { lt: now.toDate() },
    },
    include: { tenant: true },
  });

  for (const sub of expiredSubs) {
    await prisma.subscription.update({
      where: { id: sub.id },
      data: { status: "PAST_DUE" },
    });
    await prisma.botConfig.updateMany({
      where: { tenantId: sub.tenantId },
      data: { isOpen: false },
    });
    console.log(`[BILLING] ⚠️ Suscripción vencida — tenant ${sub.tenantId} (${sub.tenant.name})`);

    if (sub.tenant.phone && sub.tenant.waPhoneNumberId && sub.tenant.waAccessToken) {
      try {
        await sendTextMessage(
          sub.tenant.waPhoneNumberId,
          sub.tenant.waAccessToken,
          sub.tenant.phone,
          `🔔 *EmiTech — Tu suscripción ha vencido*\n\n` +
          `El bot de ${sub.tenant.name} está pausado.\n\n` +
          `Renueva tu plan en: ${process.env.WEB_URL || "https://emitech.co"}/dashboard/billing\n\n` +
          `¿Tienes preguntas? Contáctanos.`
        );
      } catch {}
    }
  }

  // ── 3. Avisos de vencimiento próximo (3 días antes) ──────────────────────
  const warningDate = now.add(3, "day").toDate();

  const soonTrials = await prisma.subscription.findMany({
    where: {
      status: "TRIAL",
      trialEndsAt: { gt: now.toDate(), lt: warningDate },
    },
    include: { tenant: true },
  });

  const soonSubs = await prisma.subscription.findMany({
    where: {
      status: "ACTIVE",
      currentPeriodEnd: { gt: now.toDate(), lt: warningDate },
    },
    include: { tenant: true, plan: true },
  });

  for (const sub of [...soonTrials, ...soonSubs]) {
    const isTrial = sub.status === "TRIAL";
    const fecha = dayjs(isTrial ? sub.trialEndsAt! : sub.currentPeriodEnd!).format("D [de] MMMM");

    if (sub.tenant.phone && sub.tenant.waPhoneNumberId && sub.tenant.waAccessToken) {
      try {
        await sendTextMessage(
          sub.tenant.waPhoneNumberId,
          sub.tenant.waAccessToken,
          sub.tenant.phone,
          `✨ *EmiTech — Recordatorio de renovación*\n\n` +
          `Tu ${isTrial ? "período de prueba" : "suscripción"} de *${sub.tenant.name}* vence el *${fecha}*.\n\n` +
          `Para continuar sin interrupciones: ${process.env.WEB_URL || "https://emitech.co"}/dashboard/billing\n\n` +
          `¡Gracias por confiar en EmiTech! 🌸`
        );
        console.log(`[BILLING] 📅 Aviso de vencimiento enviado — tenant ${sub.tenantId}`);
      } catch {}
    }
  }
}

// ─── Inicializar queue + worker ───────────────────────────────────────────────
export function startRemindersWorker() {
  const connection = createRedisConnection();
  const queue = new Queue(QUEUE_NAME, { connection });

  // Job de recordatorios de citas — cada 30 minutos
  queue.add(
    "check-reminders",
    {},
    {
      repeat: { every: 30 * 60 * 1000 },
      removeOnComplete: 5,
      removeOnFail: 10,
    }
  );

  // Job de vencimiento de suscripciones — cada 24 horas
  queue.add(
    "check-subscriptions",
    {},
    {
      repeat: { every: 24 * 60 * 60 * 1000 },
      removeOnComplete: 3,
      removeOnFail: 5,
    }
  );

  const worker = new Worker(
    QUEUE_NAME,
    async (job) => {
      if (job.name === "check-reminders") {
        console.log("[REMINDER] Procesando recordatorios de citas...");
        await processReminders();
      } else if (job.name === "check-subscriptions") {
        console.log("[BILLING] Verificando vencimientos de suscripciones...");
        await processSubscriptionExpiry();
      }
    },
    { connection }
  );

  worker.on("completed", (job) => console.log(`[WORKER] ✅ Job completado: ${job.name}`));
  worker.on("failed", (job, err) => console.error(`[WORKER] ❌ Job fallido: ${job?.name}:`, err.message));

  console.log("[WORKER] Worker iniciado — recordatorios cada 30 min, suscripciones cada 24h");
  return { queue, worker };
}
