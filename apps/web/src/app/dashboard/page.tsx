"use client";
import { useQuery } from "@tanstack/react-query";
import { dashboardApi, appointmentsApi } from "@/lib/api";
import { Calendar, Users, CheckCircle, Clock, AlertCircle } from "lucide-react";
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
  const { data: stats, isLoading } = useQuery({ queryKey: ["dashboard-stats"], queryFn: dashboardApi.stats });

  const todayStr = dayjs().format("dddd D [de] MMMM");

  const user = typeof window !== "undefined"
    ? JSON.parse(localStorage.getItem("emitech_user") || "{}")
    : {};
  const salonName = user?.tenant?.name;

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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard title="Citas hoy" value={stats?.todayCount} icon={Calendar} color="bg-brand-500" />
        <StatCard title="Esta semana" value={stats?.weekCount} icon={CheckCircle} color="bg-green-500" />
        <StatCard title="Este mes" value={stats?.monthCount} icon={Clock} color="bg-blue-500" />
        <StatCard title="Pendientes de confirmar" value={stats?.pendingCount} icon={AlertCircle} color="bg-yellow-500" />
      </div>

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
                    <p className="font-medium text-gray-900">{appt.client?.name || appt.client?.phone}</p>
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
