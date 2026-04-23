"use client";
import { useQuery, useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useState } from "react";
import { CheckCircle, Zap, Crown, Sparkles } from "lucide-react";
import toast from "react-hot-toast";
import dayjs from "dayjs";

const PLAN_ICONS: Record<string, any> = {
  basic: Zap,
  pro: Crown,
  enterprise: Sparkles,
};

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  TRIAL:     { label: "Prueba gratuita",  color: "bg-blue-100 text-blue-700" },
  ACTIVE:    { label: "Activa",           color: "bg-green-100 text-green-700" },
  PAST_DUE:  { label: "Pago pendiente",   color: "bg-yellow-100 text-yellow-700" },
  CANCELLED: { label: "Cancelada",        color: "bg-red-100 text-red-700" },
  SUSPENDED: { label: "Suspendida",       color: "bg-red-100 text-red-700" },
};

export default function BillingPage() {
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [showModal, setShowModal] = useState(false);

  const { data: plans = [] } = useQuery({
    queryKey: ["plans"],
    queryFn: () => api.get("/api/billing/plans").then(r => r.data),
  });
  const { data: subscription } = useQuery({
    queryKey: ["subscription"],
    queryFn: () => api.get("/api/billing/subscription").then(r => r.data),
  });

  const checkout = useMutation({
    mutationFn: async () => {
      if (!selectedPlan || !email) throw new Error("Datos incompletos");
      const res = await api.post("/api/billing/checkout/wompi", { planId: selectedPlan, email });
      return res.data;
    },
    onSuccess: (data) => {
      const url = data.checkoutUrl;
      if (url) window.open(url, "_blank");
      setShowModal(false);
      toast.success("Redirigiendo al pago de Wompi...");
    },
    onError: (err: any) => toast.error(err?.response?.data?.error || "Error al procesar pago"),
  });

  const urlParams = typeof window !== "undefined"
    ? new URLSearchParams(window.location.search)
    : null;
  const paymentStatus = urlParams?.get("status");

  const subStatus = subscription ? STATUS_LABELS[subscription.status] : null;

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Planes y facturación</h1>
        <p className="text-gray-500 mt-1">Gestiona tu suscripción a EmiTech</p>
      </div>

      {/* Resultado de pago */}
      {paymentStatus === "success" && (
        <div className="mb-6 bg-green-50 border border-green-200 rounded-2xl p-4 flex items-center gap-3">
          <CheckCircle size={20} className="text-green-500 shrink-0" />
          <div>
            <p className="font-medium text-green-800">¡Pago exitoso!</p>
            <p className="text-sm text-green-600">Tu suscripción ha sido activada. Recarga la página si aún no se refleja.</p>
          </div>
        </div>
      )}
      {paymentStatus === "failure" && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-2xl p-4">
          <p className="font-medium text-red-800">El pago no fue procesado.</p>
          <p className="text-sm text-red-600">Intenta de nuevo o contacta soporte.</p>
        </div>
      )}

      {/* Suscripción actual */}
      {subscription && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-8">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 mb-1">Plan actual</p>
              <p className="text-xl font-bold text-gray-900">{subscription.plan?.name || "Sin plan"}</p>
              {subscription.currentPeriodEnd && (
                <p className="text-sm text-gray-400 mt-1">
                  Renueva el {dayjs(subscription.currentPeriodEnd).format("D [de] MMMM YYYY")}
                </p>
              )}
              {subscription.status === "TRIAL" && subscription.trialEndsAt && (
                <p className="text-sm text-gray-400 mt-1">
                  Trial vence el {dayjs(subscription.trialEndsAt).format("D [de] MMMM YYYY")}
                </p>
              )}
            </div>
            {subStatus && (
              <span className={`px-3 py-1.5 rounded-full text-sm font-medium ${subStatus.color}`}>
                {subStatus.label}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Planes */}
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Elige tu plan</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {plans.map((plan: any) => {
          const Icon = PLAN_ICONS[plan.slug] || Zap;
          const isCurrentPlan = subscription?.planId === plan.id && subscription?.status === "ACTIVE";
          const features: string[] = plan.features || [];

          return (
            <div
              key={plan.id}
              className={`bg-white rounded-2xl shadow-sm border-2 p-6 cursor-pointer transition-all ${
                selectedPlan === plan.id
                  ? "border-brand-500 shadow-brand-100 shadow-lg"
                  : "border-gray-100 hover:border-brand-200"
              }`}
              onClick={() => setSelectedPlan(plan.id)}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${selectedPlan === plan.id ? "bg-brand-500" : "bg-gray-100"}`}>
                  <Icon size={20} className={selectedPlan === plan.id ? "text-white" : "text-gray-500"} />
                </div>
                <div>
                  <p className="font-bold text-gray-900">{plan.name}</p>
                  {isCurrentPlan && (
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Plan actual</span>
                  )}
                </div>
              </div>

              <div className="mb-4">
                <span className="text-3xl font-bold text-gray-900">
                  ${Number(plan.price).toLocaleString("es-CO")}
                </span>
                <span className="text-gray-400 text-sm"> COP/mes</span>
              </div>

              <div className="space-y-2">
                <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Incluye</p>
                {features.map((f: string, i: number) => (
                  <div key={i} className="flex items-center gap-2 text-sm text-gray-600">
                    <CheckCircle size={14} className="text-brand-500 shrink-0" />
                    {f}
                  </div>
                ))}
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <CheckCircle size={14} className="text-brand-500 shrink-0" />
                  Hasta {plan.maxStaff} estilistas
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <CheckCircle size={14} className="text-brand-500 shrink-0" />
                  Hasta {plan.maxServices} servicios
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {selectedPlan && (
        <div className="flex justify-center">
          <button
            onClick={() => setShowModal(true)}
            className="bg-brand-500 hover:bg-brand-600 text-white font-semibold px-8 py-3 rounded-xl transition-colors"
          >
            Continuar con el pago →
          </button>
        </div>
      )}

      {/* Modal de pago */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="font-bold text-gray-900 mb-1">Confirmar pago</h3>
            <p className="text-sm text-gray-400 mb-4">
              Plan: <strong>{plans.find((p: any) => p.id === selectedPlan)?.name}</strong> ·{" "}
              ${Number(plans.find((p: any) => p.id === selectedPlan)?.price || 0).toLocaleString("es-CO")} COP/mes
            </p>

            <div className="space-y-3 mb-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Tu correo electrónico</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="admin@tusalon.com"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-xs font-medium text-blue-900">🏦 Método de pago: Wompi</p>
                <p className="text-xs text-blue-700 mt-1">PSE • Tarjetas de débito/crédito • Nequi</p>
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={() => setShowModal(false)} className="flex-1 border border-gray-300 text-gray-600 py-2.5 rounded-xl text-sm">
                Cancelar
              </button>
              <button
                onClick={() => checkout.mutate()}
                disabled={!email || checkout.isPending}
                className="flex-1 bg-brand-500 hover:bg-brand-600 text-white py-2.5 rounded-xl text-sm font-semibold disabled:opacity-60"
              >
                {checkout.isPending ? "Procesando..." : "Ir al pago →"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
