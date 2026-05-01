"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { staffApi } from "@/lib/api";
import { useState } from "react";
import { Plus, Trash2, UserCheck, Clock, X, Save } from "lucide-react";
import toast from "react-hot-toast";

const DAYS = [
  { key: 1, label: "Lunes" },
  { key: 2, label: "Martes" },
  { key: 3, label: "Miércoles" },
  { key: 4, label: "Jueves" },
  { key: 5, label: "Viernes" },
  { key: 6, label: "Sábado" },
  { key: 0, label: "Domingo" },
];

const DEFAULT_HOURS = DAYS.map(d => ({
  dayOfWeek: d.key,
  openTime: "08:00",
  closeTime: "18:00",
  isOpen: d.key !== 0, // Dom cerrado por defecto
}));

// ─── Modal de Horario ──────────────────────────────────────────────────────────
function ScheduleModal({ staff, onClose }: { staff: any; onClose: () => void }) {
  const qc = useQueryClient();

  const { data: existingHours = [], isLoading } = useQuery({
    queryKey: ["staff-hours", staff.id],
    queryFn: () => staffApi.getHours(staff.id),
  });

  const hasCustom = existingHours.length > 0;
  const [mode, setMode] = useState<"salon" | "custom">(hasCustom ? "custom" : "salon");
  const [hours, setHours] = useState<any[]>(() =>
    hasCustom ? existingHours : DEFAULT_HOURS
  );

  // Sincronizar cuando carguen los datos
  const initialized = !isLoading;

  const save = useMutation({
    mutationFn: () => staffApi.saveHours(staff.id, mode === "salon" ? [] : hours),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["staff"] });
      qc.invalidateQueries({ queryKey: ["staff-hours", staff.id] });
      toast.success("Horario guardado");
      onClose();
    },
    onError: () => toast.error("Error al guardar horario"),
  });

  function toggleDay(dayOfWeek: number) {
    setHours(h => h.map(d => d.dayOfWeek === dayOfWeek ? { ...d, isOpen: !d.isOpen } : d));
  }

  function setTime(dayOfWeek: number, field: "openTime" | "closeTime", value: string) {
    setHours(h => h.map(d => d.dayOfWeek === dayOfWeek ? { ...d, [field]: value } : d));
  }

  // Si seleccionamos custom y no tenemos horas cargadas aún, inicializamos
  function handleModeChange(newMode: "salon" | "custom") {
    setMode(newMode);
    if (newMode === "custom" && hours.length === 0) {
      setHours(DEFAULT_HOURS);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h3 className="font-bold text-gray-900">Horario de {staff.name}</h3>
            <p className="text-xs text-gray-400 mt-0.5">Define cuándo trabaja este profesional</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100">
            <X size={18} />
          </button>
        </div>

        {/* Modo */}
        <div className="px-6 pt-4">
          <div className="flex rounded-xl border border-gray-200 overflow-hidden">
            <button
              onClick={() => handleModeChange("salon")}
              className={`flex-1 py-2 text-sm font-medium transition-colors ${
                mode === "salon" ? "bg-purple-600 text-white" : "bg-white text-gray-500 hover:bg-gray-50"
              }`}
            >
              Mismo que el salón
            </button>
            <button
              onClick={() => handleModeChange("custom")}
              className={`flex-1 py-2 text-sm font-medium transition-colors ${
                mode === "custom" ? "bg-purple-600 text-white" : "bg-white text-gray-500 hover:bg-gray-50"
              }`}
            >
              Personalizado
            </button>
          </div>
          {mode === "salon" && (
            <p className="text-xs text-gray-400 mt-2 text-center">
              Este profesional seguirá el horario general del salón
            </p>
          )}
        </div>

        {/* Horario por día */}
        {mode === "custom" && (
          <div className="px-6 py-4 overflow-y-auto flex-1">
            {isLoading ? (
              <p className="text-center text-gray-400 py-4">Cargando...</p>
            ) : (
              <div className="space-y-3">
                {DAYS.map(day => {
                  const h = hours.find(x => x.dayOfWeek === day.key) || {
                    dayOfWeek: day.key, openTime: "08:00", closeTime: "18:00", isOpen: false,
                  };
                  return (
                    <div key={day.key} className={`flex items-center gap-3 p-3 rounded-xl border transition-colors ${
                      h.isOpen ? "border-purple-200 bg-purple-50/40" : "border-gray-100 bg-gray-50"
                    }`}>
                      {/* Toggle */}
                      <button
                        onClick={() => toggleDay(day.key)}
                        className={`w-10 h-6 rounded-full transition-colors shrink-0 ${
                          h.isOpen ? "bg-purple-600" : "bg-gray-300"
                        }`}
                      >
                        <span className={`block w-4 h-4 bg-white rounded-full shadow mx-1 transition-transform ${
                          h.isOpen ? "translate-x-4" : "translate-x-0"
                        }`} />
                      </button>

                      {/* Día */}
                      <span className={`text-sm font-medium w-20 shrink-0 ${h.isOpen ? "text-gray-800" : "text-gray-400"}`}>
                        {day.label}
                      </span>

                      {/* Horas */}
                      {h.isOpen ? (
                        <div className="flex items-center gap-2 flex-1">
                          <input
                            type="time"
                            value={h.openTime}
                            onChange={e => setTime(day.key, "openTime", e.target.value)}
                            className="border border-gray-300 rounded-lg px-2 py-1 text-sm flex-1 focus:outline-none focus:ring-2 focus:ring-purple-500"
                          />
                          <span className="text-gray-400 text-xs">a</span>
                          <input
                            type="time"
                            value={h.closeTime}
                            onChange={e => setTime(day.key, "closeTime", e.target.value)}
                            className="border border-gray-300 rounded-lg px-2 py-1 text-sm flex-1 focus:outline-none focus:ring-2 focus:ring-purple-500"
                          />
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400 flex-1">No trabaja este día</span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex gap-3">
          <button onClick={onClose} className="flex-1 border border-gray-300 text-gray-600 py-2 rounded-xl text-sm">
            Cancelar
          </button>
          <button
            onClick={() => save.mutate()}
            disabled={save.isPending}
            className="flex-1 flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 text-white py-2 rounded-xl text-sm font-medium disabled:opacity-60 transition-colors"
          >
            <Save size={14} />
            {save.isPending ? "Guardando..." : "Guardar horario"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Página principal ──────────────────────────────────────────────────────────
export default function StaffPage() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [scheduleStaff, setScheduleStaff] = useState<any>(null);
  const [form, setForm] = useState({ name: "", phone: "" });

  const { data: staff = [] } = useQuery({ queryKey: ["staff"], queryFn: staffApi.list });

  const create = useMutation({
    mutationFn: () => staffApi.create(form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["staff"] });
      setShowForm(false);
      setForm({ name: "", phone: "" });
      toast.success("Profesional agregado");
    },
  });

  const remove = useMutation({
    mutationFn: staffApi.delete,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["staff"] }); toast.success("Profesional eliminado"); },
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Equipo</h1>
          <p className="text-gray-500 mt-1">Profesionales del salón</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors"
        >
          <Plus size={16} /> Agregar profesional
        </button>
      </div>

      <div className="grid gap-4">
        {staff.map((s: any) => {
          const hasCustomSchedule = s.workingHours?.length > 0;
          return (
            <div key={s.id} className="bg-white rounded-2xl px-6 py-4 shadow-sm border border-gray-100 flex items-center gap-4">
              <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center shrink-0">
                <span className="text-purple-600 font-semibold text-sm">{s.name[0]}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900">{s.name}</p>
                {s.phone && <p className="text-sm text-gray-400">{s.phone}</p>}
                {s.staffServices?.length > 0 && (
                  <p className="text-xs text-gray-400 mt-0.5 truncate">
                    {s.staffServices.map((ss: any) => ss.service.name).join(", ")}
                  </p>
                )}
              </div>
              {/* Badge horario */}
              <span className={`hidden sm:inline text-xs px-2.5 py-1 rounded-full font-medium shrink-0 ${
                hasCustomSchedule
                  ? "bg-purple-100 text-purple-700"
                  : "bg-gray-100 text-gray-500"
              }`}>
                {hasCustomSchedule ? "Horario propio" : "Horario del salón"}
              </span>
              {/* Botón horario */}
              <button
                onClick={() => setScheduleStaff(s)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-purple-50 hover:border-purple-200 hover:text-purple-700 text-xs font-medium transition-colors shrink-0"
                title="Configurar horario"
              >
                <Clock size={13} /> Horario
              </button>
              <button
                onClick={() => remove.mutate(s.id)}
                className="p-2 rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors shrink-0"
              >
                <Trash2 size={16} />
              </button>
            </div>
          );
        })}

        {staff.length === 0 && (
          <div className="bg-white rounded-2xl p-12 text-center border border-dashed border-gray-200">
            <UserCheck size={40} className="mx-auto text-gray-200 mb-3" />
            <p className="text-gray-400">Agrega los profesionales de tu salón</p>
          </div>
        )}
      </div>

      {/* Modal nuevo profesional */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <h3 className="font-bold text-gray-900 mb-4">Nuevo profesional</h3>
            <div className="space-y-3">
              <input
                placeholder="Nombre completo"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              <input
                placeholder="Teléfono WhatsApp (para recordatorios)"
                value={form.phone}
                onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <div className="flex gap-3 mt-4">
              <button onClick={() => setShowForm(false)} className="flex-1 border border-gray-300 text-gray-600 py-2 rounded-lg text-sm">
                Cancelar
              </button>
              <button
                onClick={() => create.mutate()}
                disabled={!form.name || create.isPending}
                className="flex-1 bg-purple-600 hover:bg-purple-700 text-white py-2 rounded-lg text-sm font-medium disabled:opacity-60"
              >
                {create.isPending ? "Guardando..." : "Guardar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal horario */}
      {scheduleStaff && (
        <ScheduleModal staff={scheduleStaff} onClose={() => setScheduleStaff(null)} />
      )}
    </div>
  );
}
