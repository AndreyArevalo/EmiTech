// ─────────────────────────────────────────────────────────────────────────────
// modules/appointments/appointment.service.ts
// Lógica de slots disponibles
// ─────────────────────────────────────────────────────────────────────────────
import { prisma } from "@emitech/database";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";

dayjs.extend(utc);
dayjs.extend(timezone);

interface GetSlotsParams {
  tenantId: string;
  date: string;        // "2026-04-25"
  serviceId: string;
  staffId?: string;
}

function toMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

function minutesToStr(m: number): string {
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
}

export async function getAvailableSlots({ tenantId, date, serviceId, staffId }: GetSlotsParams) {
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
  const tz = tenant?.timezone || "America/Bogota";

  const dayOfWeek = dayjs.tz(date, tz).day(); // 0=Dom

  // Horarios laborables del día — primero busca por estilista, luego salón
  let wh = staffId
    ? await prisma.workingHours.findFirst({ where: { tenantId, dayOfWeek, isOpen: true, staffId } })
    : null;

  if (!wh) {
    wh = await prisma.workingHours.findFirst({ where: { tenantId, dayOfWeek, isOpen: true, staffId: null } });
  }

  if (!wh) return [];

  const service = await prisma.service.findUnique({ where: { id: serviceId } });

  // slotMins        = unidad base del calendario (ej. 30 min) — define la granularidad
  // serviceDuration = duración real del servicio (ej. 90 min para extensión de pestañas)
  //
  // Un slot es válido solo si el servicio completo cabe antes del cierre Y no cruza el descanso.
  // Ejemplo: slotMins=30, extensión=90min, cierre=18:00 → última slot válida = 16:30
  const slotMins        = wh.slotMins;
  const serviceDuration = service?.duration || slotMins;

  const openMin  = toMinutes(wh.openTime);
  const closeMin = toMinutes(wh.closeTime);

  // Descanso opcional (ej. 12:00–14:00)
  const breakStartMin = wh.breakStart ? toMinutes(wh.breakStart) : null;
  const breakEndMin   = wh.breakEnd   ? toMinutes(wh.breakEnd)   : null;

  // Generar candidatos cada slotMins donde el servicio completo cabe antes del cierre
  const allSlots: string[] = [];
  for (let m = openMin; m + serviceDuration <= closeMin; m += slotMins) {
    allSlots.push(minutesToStr(m));
  }

  // Citas ya ocupadas en esa fecha
  const taken = await prisma.appointment.findMany({
    where: {
      tenantId,
      date,
      status: { in: ["PENDING", "CONFIRMED"] },
      ...(staffId && { staffId }),
    },
    select: { time: true, duration: true },
  });

  // Marcar cada mini-slot (de slotMins) que ocupa cada cita existente
  const takenSet = new Set<string>();
  for (const t of taken) {
    const startMin = toMinutes(t.time);
    for (let i = 0; i < t.duration; i += slotMins) {
      takenSet.add(minutesToStr(startMin + i));
    }
  }

  // Tiempo actual (para filtrar pasados si es hoy)
  const nowTZ      = dayjs().tz(tz);
  const todayStr   = nowTZ.format("YYYY-MM-DD");
  const currentMin = nowTZ.hour() * 60 + nowTZ.minute();

  return allSlots.filter((slot) => {
    const startMin = toMinutes(slot);
    const endMin   = startMin + serviceDuration;

    // Descartar si hoy y la hora ya pasó
    if (date === todayStr && startMin <= currentMin) return false;

    // Descartar si el servicio cruza el descanso
    // (un servicio cruza el descanso si empieza antes de que termine el break
    //  Y termina después de que empiece el break)
    if (breakStartMin !== null && breakEndMin !== null) {
      if (startMin < breakEndMin && endMin > breakStartMin) return false;
    }

    // Verificar que TODOS los mini-slots que necesita este servicio están libres
    for (let i = 0; i < serviceDuration; i += slotMins) {
      if (takenSet.has(minutesToStr(startMin + i))) return false;
    }

    return true;
  });
}
