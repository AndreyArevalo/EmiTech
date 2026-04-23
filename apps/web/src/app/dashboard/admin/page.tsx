"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import {
  Plus, Search, Building2, CheckCircle2, XCircle,
  AlertCircle, ChevronRight, ShieldCheck,
} from "lucide-react";
import toast from "react-hot-toast";

// ─── Tipos ────────────────────────────────────────────────────────────────────
type SubStatus = "TRIAL" | "ACTIVE" | "PAST_DUE" | "CANCELLED" | "SUSPENDED";

interface Tenant {
  id: string;
  name: string;
  slug: string;
  active: boolean;
  createdAt: string;
  subscription?: { status: SubStatus; trialEndsAt?: string; currentPeriodEnd?: string };
  _count?: { appointments: number };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const STATUS_LABELS: Record<SubStatus, string> = {
  TRIAL: "Trial", ACTIVE: "Activo", PAST_DUE: "Vencido",
  CANCELLED: "Cancelado", SUSPENDED: "Suspendido",
};

const STATUS_COLORS: Record<SubStatus, string> = {
  TRIAL: "bg-blue-100 text-blue-700",
  ACTIVE: "bg-emerald-100 text-emerald-700",
  PAST_DUE: "bg-amber-100 text-amber-700",
  CANCELLED: "bg-gray-100 text-gray-500",
  SUSPENDED: "bg-red-100 text-red-700",
};

function toSlug(name: string) {
  return name.toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim().replace(/\s+/g, "-");
}

// ─── Modal nuevo salón ────────────────────────────────────────────────────────
function NewSalonModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    salonName: "", slug: "", ownerEmail: "", ownerPassword: "", timezone: "America/Bogota",
  });

  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  const create = useMutation({
    mutationFn: (data: typeof form) => api.post("/api/admin/tenants", data).then(r => r.data),
    onSuccess: () => {
      toast.success("Salón creado correctamente");
      qc.invalidateQueries({ queryKey: ["admin-tenants"] });
      onClose();
    },
    onError: (err: any) => toast.error(err.response?.data?.error || "Error al crear salón"),
  });

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">Nuevo salón</h2>
          <p className="text-sm text-gray-500 mt-1">Se crea con 30 días de trial gratuito</p>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nombre del salón</label>
            <input
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-fuchsia-400"
              placeholder="Ej: Geminis Studio"
              value={form.salonName}
              onChange={e => {
                set("salonName", e.target.value);
                set("slug", toSlug(e.target.value));
              }}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Slug <span className="text-gray-400 font-normal">(ID único en URL)</span>
            </label>
            <input
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-fuchsia-400 font-mono"
              placeholder="geminis-studio"
              value={form.slug}
              onChange={e => set("slug", e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
            />
            <p className="text-xs text-gray-400 mt-1">Solo letras minúsculas, números y guiones</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email del administrador</label>
            <input
              type="email"
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-fuchsia-400"
              placeholder="admin@salon.com"
              value={form.ownerEmail}
              onChange={e => set("ownerEmail", e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña inicial</label>
            <input
              type="password"
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-fuchsia-400"
              placeholder="Mínimo 8 caracteres"
              value={form.ownerPassword}
              onChange={e => set("ownerPassword", e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Zona horaria</label>
            <select
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-fuchsia-400"
              value={form.timezone}
              onChange={e => set("timezone", e.target.value)}
            >
              <option value="America/Bogota">Colombia (Bogotá)</option>
              <option value="America/Mexico_City">México</option>
              <option value="America/Lima">Perú</option>
              <option value="America/Santiago">Chile</option>
              <option value="America/Argentina/Buenos_Aires">Argentina</option>
            </select>
          </div>
        </div>

        <div className="p-6 border-t border-gray-100 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50"
          >
            Cancelar
          </button>
          <button
            onClick={() => create.mutate(form)}
            disabled={create.isPending || !form.salonName || !form.ownerEmail || !form.ownerPassword}
            className="flex-1 px-4 py-2.5 rounded-xl bg-fuchsia-500 text-white text-sm font-medium hover:bg-fuchsia-600 disabled:opacity-50"
          >
            {create.isPending ? "Creando..." : "Crear salón"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────
export default function AdminPage() {
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const qc = useQueryClient();

  const { data: tenants = [], isLoading } = useQuery<Tenant[]>({
    queryKey: ["admin-tenants", search],
    queryFn: () => api.get("/api/admin/tenants", { params: { search } }).then(r => r.data),
  });

  const { data: stats } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: () => api.get("/api/admin/stats").then(r => r.data),
  });

  const suspend = useMutation({
    mutationFn: (id: string) => api.patch(`/api/admin/tenants/${id}/suspend`),
    onSuccess: () => { toast.success("Salón suspendido"); qc.invalidateQueries({ queryKey: ["admin-tenants"] }); },
    onError: () => toast.error("Error al suspender"),
  });

  const activate = useMutation({
    mutationFn: (id: string) => api.patch(`/api/admin/tenants/${id}/activate`),
    onSuccess: () => { toast.success("Salón activado"); qc.invalidateQueries({ queryKey: ["admin-tenants"] }); },
    onError: () => toast.error("Error al activar"),
  });

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-fuchsia-100 rounded-xl flex items-center justify-center">
            <ShieldCheck size={20} className="text-fuchsia-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">SuperAdmin</h1>
            <p className="text-sm text-gray-500">Gestión de salones EmiTech</p>
          </div>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-fuchsia-500 text-white rounded-xl text-sm font-medium hover:bg-fuchsia-600 transition-colors"
        >
          <Plus size={16} />
          Nuevo salón
        </button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-4 gap-4 mb-8">
          {[
            { label: "Total salones", value: stats.totalTenants },
            { label: "Activos", value: stats.activeTenants },
            { label: "En trial", value: stats.trialTenants },
            { label: "Citas totales", value: stats.totalAppointments },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-2xl border border-gray-100 p-5">
              <p className="text-2xl font-bold text-gray-900">{s.value ?? "—"}</p>
              <p className="text-sm text-gray-500 mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Search */}
      <div className="relative mb-5">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-fuchsia-400"
          placeholder="Buscar salón..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* Lista de salones */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-gray-400 text-sm">Cargando...</div>
        ) : tenants.length === 0 ? (
          <div className="p-12 text-center">
            <Building2 size={40} className="text-gray-200 mx-auto mb-3" />
            <p className="text-gray-500 text-sm">No hay salones todavía</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {tenants.map((t) => {
              const status = t.subscription?.status ?? "TRIAL";
              const isSuspended = status === "SUSPENDED" || !t.active;
              return (
                <div key={t.id} className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50 transition-colors">
                  {/* Ícono */}
                  <div className="w-10 h-10 bg-fuchsia-50 rounded-xl flex items-center justify-center shrink-0">
                    <Building2 size={18} className="text-fuchsia-500" />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-gray-900 truncate">{t.name}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[status as SubStatus]}`}>
                        {STATUS_LABELS[status as SubStatus]}
                      </span>
                    </div>
                    <p className="text-sm text-gray-400 font-mono mt-0.5">{t.slug}</p>
                  </div>

                  {/* Citas */}
                  <div className="text-center hidden md:block">
                    <p className="text-sm font-semibold text-gray-700">{t._count?.appointments ?? 0}</p>
                    <p className="text-xs text-gray-400">citas</p>
                  </div>

                  {/* Vencimiento */}
                  <div className="text-right hidden lg:block w-32">
                    {t.subscription?.currentPeriodEnd && (
                      <>
                        <p className="text-xs text-gray-400">Vence</p>
                        <p className="text-sm text-gray-600">
                          {new Date(t.subscription.currentPeriodEnd).toLocaleDateString("es-CO")}
                        </p>
                      </>
                    )}
                    {t.subscription?.trialEndsAt && status === "TRIAL" && (
                      <>
                        <p className="text-xs text-gray-400">Trial hasta</p>
                        <p className="text-sm text-gray-600">
                          {new Date(t.subscription.trialEndsAt).toLocaleDateString("es-CO")}
                        </p>
                      </>
                    )}
                  </div>

                  {/* Acciones */}
                  <div className="flex items-center gap-2">
                    {isSuspended ? (
                      <button
                        onClick={() => activate.mutate(t.id)}
                        title="Activar"
                        className="p-2 rounded-lg text-emerald-600 hover:bg-emerald-50 transition-colors"
                      >
                        <CheckCircle2 size={18} />
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          if (confirm(`¿Suspender "${t.name}"? El bot dejará de funcionar.`)) {
                            suspend.mutate(t.id);
                          }
                        }}
                        title="Suspender"
                        className="p-2 rounded-lg text-red-500 hover:bg-red-50 transition-colors"
                      >
                        <XCircle size={18} />
                      </button>
                    )}
                    <ChevronRight size={16} className="text-gray-300" />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showModal && <NewSalonModal onClose={() => setShowModal(false)} />}
    </div>
  );
}
