"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { appointmentsApi } from "@/lib/api";
import { useState } from "react";
import { CheckCircle, XCircle, Calendar } from "lucide-react";
import toast from "react-hot-toast";
import dayjs from "dayjs";

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  PENDING: { label: "Pendiente", color: "bg-yellow-100 text-yellow-700" },
  CONFIRMED: { label: "Confirmada", color: "bg-green-100 text-green-700" },
  CANCELLED: { label: "Cancelada", color: "bg-red-100 text-red-700" },
  COMPLETED: { label: "Completada", color: "bg-blue-100 text-blue-700" },
  NO_SHOW: { label: "No se presentó", color: "bg-gray-100 text-gray-600" },
};

export default function AppointmentsPage() {
  const [selectedDate, setSelectedDate] = useState(dayjs().format("YYYY-MM-DD"));
  const qc = useQueryClient();

  const { data: appointments = [], isLoading } = useQuery({
    queryKey: ["appointments", selectedDate],
    queryFn: () => appointmentsApi.list({ date: selectedDate }),
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      appointmentsApi.updateStatus(id, status),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["appointments"] }); },
    onError: () => toast.error("Error al actualizar la cita"),
  });

  function formatTime(time24: string) {
    const [h, m] = time24.split(":").map(Number);
    const p = h < 12 ? "AM" : "PM";
    const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
    return `${h12}:${String(m).padStart(2,"0")} ${p}`;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Citas</h1>
          <p className="text-gray-500 mt-1">Gestiona todas las reservas del salón</p>
        </div>
        <div className="flex items-center gap-3">
          <Calendar size={18} className="text-gray-400" />
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
      </div>

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
                  <div className="w-20">
                    <p className="font-semibold text-gray-900 text-sm">{formatTime(appt.time)}</p>
                    <p className="text-xs text-gray-400">{appt.service?.duration} min</p>
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{appt.guestName || appt.client?.name || "Sin nombre"}</p>
                    <p className="text-sm text-gray-500">{appt.service?.name}</p>
                  </div>
                  {appt.staff && <p className="text-sm text-gray-400 hidden md:block">{appt.staff.name}</p>}
                  <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${status.color}`}>
                    {status.label}
                  </span>
                  {appt.status === "PENDING" && (
                    <div className="flex gap-2">
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
    </div>
  );
}
