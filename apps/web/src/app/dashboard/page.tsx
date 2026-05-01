"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { dashboardApi, appointmentsApi, tenantApi } from "@/lib/api";
import { Calendar, Users, CheckCircle, XCircle, Clock, AlertCircle, TrendingUp } from "lucide-react";
import toast from "react-hot-toast";
import dayjs from "dayjs";
import "dayjs/locale/es";
dayjs.locale("es");

function StatCard({ title, value, icon: Icon, color }: any) {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm font-medium text-gray-500">{title}</p>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
          <Icon size={20} className="text-white" />
        </div>
      </div>
      <p className="text-3xl font-bold text-gray-900">{value ?? "—"}</p>
    </div>
  );
}

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  PENDING: { label: "Pendiente", color: "bg-yellow-100 text-yellow-700" },
  CONFIRMED: { label: "Confirmada", color: "bg-green-100 text-green-700" },
  CANCELLED: { label: "Cancelada", color: "bg-red-100 text-red-700" },
  COMPLETED: { label: "Completada", color: "bg-blue-100 text-blue-700" },
  NO_SHOW: { label: "No se presentó", color: "bg-gray-100 text-gray-600" },
};

export default function DashboardPage() {
  const qc = useQueryClient();
  const { data: stats, isLoading } = useQuery({ queryKey: ["dashboard-stats"], queryFn: dashboardApi.stats });

  const { data: pendingAppts = [] } = useQuery({
    queryKey: ["appointments", "PENDING"],
    queryFn: () => appointmentsApi.list({ status: "PENDING" }),
    refetchInterval: 30_000,
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      appointmentsApi.updateStatus(id, status),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["appointments"] });
      qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
      toast.success(vars.status === "CONFIRMED" ? "Cita confirmada ✓" : "Cita rechazada");
    },
    onError: () => toast.error("Error al actualizar la cita"),
  });

  function formatTime(time24: string) {
    const [h, m] = time24.split(":").map(Number);
    const p = h < 12 ? "AM" : "PM";
    const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
    return `${h12}:${String(m).padStart(2, "0")} ${p}`;
  }

  const { data: tenant } = useQuery({ queryKey: ["tenant-me"], queryFn: tenantApi.me });
  const salonName = tenant?.name || "";

  const todayStr = dayjs().format("dddd D [de] MMMM");

  return (
    <div>
      {/* Header */}
      <div className="mb-8 flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 capitalize mt-1">{todayStr}</p>
        </div>
        {salonName && (
          <div className="text-right">
            <p className="text-xs text-gray-400 uppercase tracking-widest font-semibold mb-0.5">Tu salón</p>
            <h2
              className="text-2xl font-extrabold"
              style={{
                background: "linear-gradient(135deg, #9b6dff, #7c4dff)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
                letterSpacing: "-0.5px",
              }}
            >
              {salonName}
            </h2>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-8">
        <StatCard title="Citas hoy" value={stats?.todayCount} icon={Calendar} color="bg-purple-500" />
        <StatCard title="Esta semana" value={stats?.weekCount} icon={CheckCircle} color="bg-green-500" />
        <StatCard title="Este mes" value={stats?.monthCount} icon={Clock} color="bg-blue-500" />
        <StatCard title="Pendientes" value={stats?.pendingCount} icon={AlertCircle} color="bg-yellow-500" />
      </div>
      {/* Ingresos del mes */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-8 flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ background: "linear-gradient(135deg, #9b6dff, #7c4dff)" }}>
          <TrendingUp size={22} className="text-white" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-500">Ingresos estimados este mes</p>
          <p className="text-2xl font-bold text-gray-900">
            ${(stats?.monthRevenue ?? 0).toLocaleString("es-CO")} <span className="text-sm font-normal text-gray-400">COP</span>
          </p>
        </div>
        <div className="text-right hidden sm:block">
          <p className="text-xs text-gray-400">Basado en citas confirmadas</p>
          <p className="text-xs text-gray-400">y completadas del mes</p>
        </div>
      </div>

      {/* Citas pendientes de confirmar */}
      {pendingAppts.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-yellow-200 mb-8">
          <div className="px-6 py-4 border-b border-yellow-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-yellow-400 animate-pulse" />
              <h2 className="font-semibold text-gray-900">Citas por confirmar</h2>
            </div>
            <span className="text-xs font-medium bg-yellow-100 text-yellow-700 px-2.5 py-1 rounded-full">
              {pendingAppts.length} pendiente{pendingAppts.length !== 1 ? "s" : ""}
            </span>
          </div>
          <div className="divide-y divide-gray-50">
            {pendingAppts.map((appt: any) => (
              <div key={appt.id} className="px-6 py-4 flex items-center gap-4">
                <div className="w-20 shrink-0">
                  <p className="font-semibold text-gray-900 text-sm">{formatTime(appt.time)}</p>
                  <p className="text-xs text-gray-400">{appt.date}</p>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate">{appt.guestName || appt.client?.name || "Sin nombre"}</p>
                  <p className="text-sm text-gray-500 truncate">{appt.service?.name}</p>
                </div>
                {appt.staff && (
                  <p className="text-sm text-gray-400 hidden md:block shrink-0">{appt.staff.name}</p>
                )}
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => updateStatus.mutate({ id: appt.id, status: "CONFIRMED" })}
                    disabled={updateStatus.isPending}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-50 text-green-700 hover:bg-green-100 text-xs font-medium transition-colors disabled:opacity-50"
                    title="Confirmar"
                  >
                    <CheckCircle size={14} />
                    Confirmar
                  </button>
                  <button
                    onClick={() => updateStatus.mutate({ id: appt.id, status: "CANCELLED" })}
                    disabled={updateStatus.isPending}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 text-xs font-medium transition-colors disabled:opacity-50"
                    title="Rechazar"
                  >
                    <XCircle size={14} />
                    Rechazar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Citas de hoy */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">Citas de hoy</h2>
          <span className="text-sm text-gray-400">{stats?.todayAppointments?.length ?? 0} citas</span>
        </div>

        {isLoading ? (
          <div className="p-8 text-center text-gray-400">Cargando...</div>
        ) : !stats?.todayAppointments?.length ? (
          <div className="p-8 text-center text-gray-400">No hay citas para hoy 🌸</div>
        ) : (
          <div className="divide-y divide-gray-50">
            {stats.todayAppointments.map((appt: any) => {
              const status = STATUS_MAP[appt.status] || STATUS_MAP.PENDING;
              const [h, m] = appt.time.split(":");
              const hNum = +h; const period = hNum < 12 ? "AM" : "PM";
              const h12 = hNum === 0 ? 12 : hNum > 12 ? hNum - 12 : hNum;
              const timeStr = `${h12}:${m} ${period}`;
              return (
                <div key={appt.id} className="px-6 py-4 flex items-center gap-4">
                  <div className="w-16 text-center">
                    <p className="font-semibold text-gray-900 text-sm">{timeStr}</p>
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{appt.guestName || appt.client?.name || "Sin nombre"}</p>
                    <p className="text-sm text-gray-500">{appt.service?.name}</p>
                  </div>
                  {appt.staff && (
                    <p className="text-sm text-gray-400">{appt.staff.name}</p>
                  )}
                  <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${status.color}`}>
                    {status.label}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
