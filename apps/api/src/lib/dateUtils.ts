// ─────────────────────────────────────────────────────────────────────────────
// lib/dateUtils.ts — Utilidades de fecha (portado de normalizadorFecha.js)
// ─────────────────────────────────────────────────────────────────────────────

const DIAS_SEMANA: Record<string, number> = {
  domingo: 0, lunes: 1, martes: 2, miercoles: 3, miércoles: 3,
  jueves: 4, viernes: 5, sabado: 6, sábado: 6,
};
const MESES: Record<string, number> = {
  enero: 0, febrero: 1, marzo: 2, abril: 3, mayo: 4, junio: 5,
  julio: 6, agosto: 7, septiembre: 8, setiembre: 8, octubre: 9,
  noviembre: 10, diciembre: 11,
};

function toISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function nextWeekday(nombre: string, base: Date): Date | null {
  const target = DIAS_SEMANA[nombre];
  if (target === undefined) return null;
  const d = new Date(base);
  d.setHours(0, 0, 0, 0);
  let diff = target - d.getDay();
  if (diff <= 0) diff += 7;
  d.setDate(d.getDate() + diff);
  return d;
}

export interface DateParseResult {
  valid: boolean;
  dateISO?: string;
  error?: string;
}

export function parseDateNatural(texto: string, base = new Date()): DateParseResult {
  const hoy = new Date(base);
  hoy.setHours(0, 0, 0, 0);

  const t = texto.trim().toLowerCase()
    .replace(/^(para\s+)?el\s+(pr[oó]ximo\s+)/, "")
    .replace(/^pr[oó]ximo\s+/, "")
    .replace(/^para\s+el\s+/, "")
    .replace(/^el\s+/, "");

  if (t === "hoy") return { valid: true, dateISO: toISO(hoy) };
  if (t === "mañana" || t === "manana") {
    const d = new Date(hoy); d.setDate(d.getDate() + 1);
    return { valid: true, dateISO: toISO(d) };
  }
  if (t === "pasado mañana" || t === "pasado manana") {
    const d = new Date(hoy); d.setDate(d.getDate() + 2);
    return { valid: true, dateISO: toISO(d) };
  }
  if (DIAS_SEMANA[t] !== undefined) {
    const d = nextWeekday(t, hoy);
    return d ? { valid: true, dateISO: toISO(d) } : { valid: false, error: "Día inválido" };
  }

  // ISO: 2026-04-25
  const isoMatch = t.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) {
    const d = new Date(+isoMatch[1], +isoMatch[2] - 1, +isoMatch[3]);
    return isNaN(d.getTime()) ? { valid: false, error: "Fecha inválida" } : { valid: true, dateISO: toISO(d) };
  }

  // "25 de abril"
  const textMatch = t.match(/^(\d{1,2})\s+de\s+([a-záéíóúñ]+)$/i);
  if (textMatch) {
    const dia = +textMatch[1];
    const mes = MESES[textMatch[2].toLowerCase()];
    if (mes === undefined) return { valid: false, error: "Mes no reconocido" };
    let anio = hoy.getFullYear();
    let d = new Date(anio, mes, dia);
    if (d < hoy) { anio++; d = new Date(anio, mes, dia); }
    return { valid: true, dateISO: toISO(d) };
  }

  return { valid: false, error: "No pude interpretar la fecha" };
}

export function formatTime(time24: string): string {
  const [h, m] = time24.split(":").map(Number);
  const period = h < 12 ? "AM" : "PM";
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${h12}:${String(m).padStart(2, "0")} ${period}`;
}

export function formatDateSpanish(dateISO: string): string {
  const [y, m, d] = dateISO.split("-").map(Number);
  const MESES_ES = ["enero","febrero","marzo","abril","mayo","junio",
    "julio","agosto","septiembre","octubre","noviembre","diciembre"];
  const DIAS_ES = ["domingo","lunes","martes","miércoles","jueves","viernes","sábado"];
  const dayOfWeek = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return `${DIAS_ES[dayOfWeek]} ${d} de ${MESES_ES[m - 1]}`;
}
