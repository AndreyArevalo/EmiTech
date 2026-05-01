"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { appointmentsApi } from "@/lib/api";
import { useState } from "react";
import { CheckCircle, XCircle, Calendar, List, ChevronLeft, ChevronRight } from "lucide-react";
import toast from "react-hot-toast";
import dayjs from "dayjs";
import isoWeek from "dayjs/plugin/isoWeek";
import "dayjs/locale/es";
dayjs.extend(isoWeek);
dayjs.locale("es");

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  PENDING:   { label: "Pendiente",      color: "bg-yellow-100 text-yellow-700" },
  CONFIRMED: { label: "Confirmada",     color: "bg-green-100 text-green-700"   },
  CANCELLED: { label: "Cancelada",      color: "bg-red-100 text-red-500"       },
  COMPLETED: { label: "Completada",     color: "bg-blue-100 text-blue-700"     },
  NO_SHOW:   { label: "No se presentó", color: "bg-gray-100 text-gray-600"     },
};

const CARD_COLORS: Record<string, string> = {
  PENDING:   "border-l-yellow-400 bg-yellow-50",
  CONFIRMED: "border-l-green-500 bg-green-50",
  CANCELLED: "border-l-red-400 bg-red-50 opacity-60",
  COMPLETED: "border-l-blue-500 bg-blue-50",
  NO_SHOW:   "border-l-gray-400 bg-gray-50 opacity-60",
};

// Horas visibles en el grid (7am → 9pm)
const HOURS = Array.from({ length: 15 }, (_, i) => i + 7);

function formatTime(time24: string) {
  const [h, m] = time24.split(":").map(Number);
  const p = h < 12 ? "AM" : "PM";
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${h12}:${String(m).padStart(2, "0")} ${p}`;
}

export default function AppointmentsPage() {
  const [view, setView] = useState<"list" | "week">("list");
  const [selectedDate, setSelectedDate] = useState(dayjs().format("YYYY-MM-DD"));
  const [weekStart, setWeekStart] = useState(dayjs().startOf("isoWeek"));
  const qc = useQueryClient();

  // Vista lista
  const { data: appointments = [], isLoading } = useQuery({
    queryKey: ["appointments", selectedDate],
    queryFn: () => appointmentsApi.list({ date: selectedDate }),
    enabled: view === "list",
  });

  // Vista semana
  const weekEnd = weekStart.endOf("isoWeek");
  const { data: weekAppts = [], isLoading: weekLoading } = useQuery({
    queryKey: ["appointments-week", weekStart.format("YYYY-MM-DD")],
    queryFn: () => appointmentsApi.list({
      dateFrom: weekStart.format("YYYY-MM-DD"),
      dateTo: weekEnd.format("YYYY-MM-DD"),
    }),
    enabled: view === "week",
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      appointmentsApi.updateStatus(id, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["appointments"] });
      qc.invalidateQueries({ queryKey: ["appointments-week"] });
      toast.success("Cita actualizada");
    },
    onError: () => toast.error("Error al actualizar la cita"),
  });

  const weekDays = Array.from({ length: 7 }, (_, i) => weekStart.add(i, "day"));

  const apptsByDate: Record<string, any[]> = {};
  for (const a of weekAppts) {
    if (!apptsByDate[a.date]) apptsByDate[a.date] = [];
    apptsByDate[a.date].push(a);
  }

  function topPx(time: string) {
    const [h, m] = time.split(":").map(Number);
    return (h - 7) * 60 + m;
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Citas</h1>
          <p className="text-gray-500 mt-1">Gestiona todas las reservas del salón</p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Toggle vista */}
          <div className="flex rounded-xl border border-gray-200 overflow-hidden">
            <button
              onClick={() => setView("list")}
              className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-colors ${
                view === "list" ? "bg-purple-600 text-white" : "bg-white text-gray-500 hover:bg-gray-50"
              }`}
            >
              <List size={15} /> Lista
            </button>
            <button
              onClick={() => setView("week")}
              className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-colors ${
                view === "week" ? "bg-purple-600 text-white" : "bg-white text-gray-500 hover:bg-gray-50"
              }`}
            >
              <Calendar size={15} /> Semana
            </button>
          </div>

          {/* Fecha (lista) */}
          {view === "list" && (
            <div className="flex items-center gap-2">
              <Calendar size={16} className="text-gray-400" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
          )}

          {/* Navegación semana */}
          {view === "week" && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setWeekStart(w => w.subtract(1, "week"))}
                className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="text-sm font-medium text-gray-700 min-w-[160px] text-center capitalize">
                {weekStart.format("D MMM")} – {weekEnd.format("D MMM YYYY")}
              </span>
              <button
                onClick={() => setWeekStart(w => w.add(1, "week"))}
                className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
              >
                <ChevronRight size={16} />
              </button>
              <button
                onClick={() => setWeekStart(dayjs().startOf("isoWeek"))}
                className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
              >
                Hoy
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── VISTA LISTA ───────────────────────────────────────────────────────── */}
      {view === "list" && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
          {isLoading ? (
            <div className="p-8 text-center text-gray-400">Cargando citas...</div>
          ) : appointments.length === 0 ? (
            <div className="p-12 text-center">
              <Calendar size={40} className="mx-auto text-gray-200 mb-3" />
              <p className="text-gray-400">No hay citas para este día</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {appointments.map((appt: any) => {
                const status = STATUS_MAP[appt.status] || STATUS_MAP.PENDING;
                return (
                  <div key={appt.id} className="px-6 py-4 flex items-center gap-4">
                    <div className="w-20 shrink-0">
                      <p className="font-semibold text-gray-900 text-sm">{formatTime(appt.time)}</p>
                      <p className="text-xs text-gray-400">{appt.service?.duration} min</p>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 truncate">{appt.client?.name || "Sin nombre"}</p>
                      <p className="text-sm text-gray-500 truncate">{appt.service?.name} · 📞 {appt.client?.phone}</p>
                    </div>
                    {appt.staff && (
                      <p className="text-sm text-gray-400 hidden md:block shrink-0">{appt.staff.name}</p>
                    )}
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium shrink-0 ${status.color}`}>
                      {status.label}
                    </span>
                    {appt.status === "PENDING" && (
                      <div className="flex gap-2 shrink-0">
                        <button
                          onClick={() => updateStatus.mutate({ id: appt.id, status: "CONFIRMED" })}
                          className="p-1.5 rounded-lg bg-green-50 text-green-600 hover:bg-green-100 transition-colors"
                          title="Confirmar"
                        >
                          <CheckCircle size={16} />
                        </button>
                        <button
                          onClick={() => updateStatus.mutate({ id: appt.id, status: "CANCELLED" })}
                          className="p-1.5 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 transition-colors"
                          title="Cancelar"
                        >
                          <XCircle size={16} />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── VISTA SEMANA ──────────────────────────────────────────────────────── */}
      {view === "week" && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          {weekLoading ? (
            <div className="p-8 text-center text-gray-400">Cargando semana...</div>
          ) : (
            <div className="overflow-x-auto">
              {/* Cabecera días */}
              <div className="grid sticky top-0 bg-white z-10 border-b border-gray-100"
                style={{ gridTemplateColumns: "52px repeat(7, 1fr)" }}>
                <div />
                {weekDays.map((day) => {
                  const isToday = day.format("YYYY-MM-DD") === dayjs().format("YYYY-MM-DD");
                  const count = (apptsByDate[day.format("YYYY-MM-DD")] || []).length;
                  return (
                    <div key={day.toString()}
                      className={`py-3 px-1 text-center border-l border-gray-100 ${isToday ? "bg-purple-50" : ""}`}>
                      <p className={`text-xs font-semibold uppercase tracking-wide ${isToday ? "text-purple-600" : "text-gray-400"}`}>
                        {day.format("ddd")}
                      </p>
                      <p className={`text-lg font-bold mt-0.5 ${isToday ? "text-purple-700" : "text-gray-800"}`}>
                        {day.format("D")}
                      </p>
                      {count > 0 && (
                        <span className="inline-block text-xs bg-purple-100 text-purple-600 font-semibold px-1.5 rounded-full">
                          {count}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Grid horas */}
              <div className="grid" style={{ gridTemplateColumns: "52px repeat(7, 1fr)" }}>
                {/* Horas */}
                <div className="border-r border-gray-100">
                  {HOURS.map((h) => (
                    <div key={h} style={{ height: "60px" }} className="flex items-start justify-end pr-2 pt-1 border-b border-gray-50">
                      <span className="text-xs text-gray-400">
                        {h === 12 ? "12pm" : h < 12 ? `${h}am` : `${h - 12}pm`}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Columnas por día */}
                {weekDays.map((day) => {
                  const dateStr = day.format("YYYY-MM-DD");
                  const isToday = dateStr === dayjs().format("YYYY-MM-DD");
                  const dayAppts = apptsByDate[dateStr] || [];

                  return (
                    <div key={dateStr}
                      className={`relative border-l border-gray-100 ${isToday ? "bg-purple-50/20" : ""}`}
                      style={{ height: `${HOURS.length * 60}px` }}>
                      {/* Líneas de hora */}
                      {HOURS.map((h) => (
                        <div key={h}
                          className="absolute w-full border-b border-gray-50"
                          style={{ top: `${(h - 7) * 60}px`, height: "60px" }} />
                      ))}

                      {/* Citas */}
                      {dayAppts.map((appt: any) => {
                        const top = topPx(appt.time);
                        const height = Math.max(appt.service?.duration || 30, 28);
                        const cardColor = CARD_COLORS[appt.status] || CARD_COLORS.PENDING;
                        return (
                          <div key={appt.id}
                            className={`absolute left-0.5 right-0.5 rounded-md border-l-4 px-1.5 py-0.5 overflow-hidden select-none ${cardColor}`}
                            style={{ top: `${top}px`, height: `${height}px`, zIndex: 2 }}
                            title={`${appt.client?.name} — ${appt.service?.name} (${formatTime(appt.time)})`}>
                            <p className="text-xs font-semibold text-gray-800 leading-tight truncate">
                              {formatTime(appt.time)} {appt.client?.name || "Sin nombre"}
                            </p>
                            {height >= 44 && (
                              <p className="text-xs text-gray-500 truncate">{appt.service?.name}</p>
                            )}
                            {height >= 56 && appt.staff && (
                              <p className="text-xs text-gray-400 truncate">{appt.staff.name}</p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
