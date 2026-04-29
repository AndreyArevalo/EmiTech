"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { tenantApi, whatsappApi } from "@/lib/api";
import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { Save, Store, Bot, Clock, Smartphone, KeyRound, Eye, EyeOff, RefreshCw, Unlink, CheckCircle2, Loader2 } from "lucide-react";

const DAYS = ["Domingo","Lunes","Martes","Miércoles","Jueves","Viernes","Sábado"];

export default function SettingsPage() {
  const qc = useQueryClient();
  const { data: tenant, isLoading } = useQuery({ queryKey: ["tenant-me"], queryFn: tenantApi.me });

  const [salonForm, setSalonForm] = useState({ name: "", phone: "", address: "", city: "" });
  const [botForm, setBotForm] = useState({
    welcomeMessage: "", closedMessage: "", confirmMessage: "",
    reminderMessage: "", isOpen: true, requiresConfirm: true, reminderHoursBefore: 2,
  });
  const [slotMins, setSlotMins] = useState(30);
  const [pwForm, setPwForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [showPw, setShowPw] = useState(false);
  const [hoursForm, setHoursForm] = useState(
    DAYS.map((_, i) => ({ dayOfWeek: i, openTime: "08:00", closeTime: "18:00", isOpen: i >= 1 && i <= 5, slotMins: 30, breakStart: "", breakEnd: "" }))
  );

  useEffect(() => {
    if (!tenant) return;
    setSalonForm({ name: tenant.name || "", phone: tenant.phone || "", address: tenant.address || "", city: tenant.city || "" });
    if (tenant.botConfig) {
      setBotForm({ welcomeMessage: tenant.botConfig.welcomeMessage, closedMessage: tenant.botConfig.closedMessage,
        confirmMessage: tenant.botConfig.confirmMessage, reminderMessage: tenant.botConfig.reminderMessage,
        isOpen: tenant.botConfig.isOpen, requiresConfirm: tenant.botConfig.requiresConfirm,
        reminderHoursBefore: tenant.botConfig.reminderHoursBefore });
    }
    if (tenant.workingHours?.length) {
      const filled = DAYS.map((_, i) => {
        const wh = tenant.workingHours.find((h: any) => h.dayOfWeek === i && !h.staffId);
        return wh
          ? { dayOfWeek: i, openTime: wh.openTime, closeTime: wh.closeTime, isOpen: wh.isOpen, slotMins: wh.slotMins || 30, breakStart: wh.breakStart || "", breakEnd: wh.breakEnd || "" }
          : { dayOfWeek: i, openTime: "08:00", closeTime: "18:00", isOpen: i >= 1 && i <= 5, slotMins: 30, breakStart: "", breakEnd: "" };
      });
      const firstSlot = filled.find(d => d.slotMins)?.slotMins ?? 30;
      setSlotMins(firstSlot);
      setHoursForm(filled);
    }
  }, [tenant]);

  const saveSalon = useMutation({ mutationFn: () => tenantApi.update(salonForm), onSuccess: () => { qc.invalidateQueries({ queryKey: ["tenant-me"] }); toast.success("Datos guardados"); } });
  const saveBot = useMutation({ mutationFn: () => tenantApi.updateBotConfig(botForm), onSuccess: () => { qc.invalidateQueries({ queryKey: ["tenant-me"] }); toast.success("Bot configurado"); } });
  const changePassword = useMutation({
    mutationFn: () => {
      if (pwForm.newPassword !== pwForm.confirmPassword) {
        throw new Error("Las contraseñas nuevas no coinciden");
      }
      return tenantApi.changePassword({ currentPassword: pwForm.currentPassword, newPassword: pwForm.newPassword });
    },
    onSuccess: () => {
      toast.success("Contraseña actualizada ✅");
      setPwForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
    },
    onError: (err: any) => toast.error(err.response?.data?.error || err.message || "Error al cambiar contraseña"),
  });

  const saveHours = useMutation({
    mutationFn: () => tenantApi.updateWorkingHours(hoursForm.map(h => ({
      ...h,
      slotMins,
      breakStart: h.breakStart || null,
      breakEnd: h.breakEnd || null,
    }))),
    onSuccess: () => toast.success("Horarios guardados"),
  });

  if (isLoading) return <div className="text-gray-400 p-8">Cargando configuración...</div>;

  return (
    <div className="max-w-2xl overflow-hidden">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Configuración</h1>
        <p className="text-gray-500 mt-1">Personaliza tu salón y el comportamiento del bot</p>
      </div>

      <div className="space-y-6">
        {/* Salón */}
        <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-6">
          <div className="flex items-center gap-2 mb-4">
            <Store size={18} className="text-brand-500" />
            <h2 className="font-semibold text-gray-900">Datos del salón</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[["Nombre del salón","name","text"],["Teléfono admin","phone","tel"],["Dirección","address","text"],["Ciudad","city","text"]].map(([label, key, type]) => (
              <div key={key} className={key === "address" || key === "city" ? "sm:col-span-2" : ""}>
                <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
                <input type={type} value={(salonForm as any)[key]} onChange={e => setSalonForm(f => ({ ...f, [key]: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
                {key === "phone" && (
                  <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                    📲 Recibirás una notificación por WhatsApp cada vez que llegue una cita nueva. Para confirmarla responde <span className="font-mono bg-gray-100 px-1 rounded">confirmar_ID</span> y para rechazarla <span className="font-mono bg-gray-100 px-1 rounded">rechazar_ID</span> — el ID aparece en el mensaje. También puedes gestionarlo desde el panel en Citas. (Formato internacional: +573001234567)
                  </p>
                )}
              </div>
            ))}
          </div>
          <button onClick={() => saveSalon.mutate()} disabled={saveSalon.isPending}
            className="mt-4 flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-60">
            <Save size={14} /> {saveSalon.isPending ? "Guardando..." : "Guardar"}
          </button>
        </section>

        {/* Horarios */}
        <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-6">
          <div className="flex items-center gap-2 mb-4">
            <Clock size={18} className="text-brand-500" />
            <h2 className="font-semibold text-gray-900">Horarios de atención</h2>
          </div>
          <div className="flex items-center gap-3 mb-4 p-3 bg-gray-50 rounded-xl">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900">Duración mínima del slot</p>
              <p className="text-xs text-gray-500 hidden sm:block">Granularidad del calendario</p>
            </div>
            <select value={slotMins} onChange={e => setSlotMins(Number(e.target.value))}
              className="shrink-0 border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500">
              <option value={15}>15 min</option>
              <option value={20}>20 min</option>
              <option value={30}>30 min</option>
              <option value={45}>45 min</option>
              <option value={60}>60 min</option>
            </select>
          </div>
          <div className="space-y-2">
            {hoursForm.map((h, i) => (
              <div key={i} className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                {/* Fila: checkbox + día + horario (en desktop en línea, en mobile apilado) */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                  <label className="flex items-center gap-2 cursor-pointer shrink-0">
                    <input type="checkbox" checked={h.isOpen}
                      onChange={e => setHoursForm(f => f.map((d, idx) => idx === i ? { ...d, isOpen: e.target.checked } : d))}
                      className="w-4 h-4 accent-purple-500" />
                    <span className="text-sm font-semibold text-gray-700 w-20">{DAYS[i]}</span>
                  </label>
                  {h.isOpen ? (
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <input type="time" value={h.openTime}
                        onChange={e => setHoursForm(f => f.map((d, idx) => idx === i ? { ...d, openTime: e.target.value } : d))}
                        className="flex-1 min-w-0 border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 bg-white" />
                      <span className="text-gray-400 text-sm shrink-0">–</span>
                      <input type="time" value={h.closeTime}
                        onChange={e => setHoursForm(f => f.map((d, idx) => idx === i ? { ...d, closeTime: e.target.value } : d))}
                        className="flex-1 min-w-0 border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 bg-white" />
                    </div>
                  ) : (
                    <span className="text-sm text-gray-400 italic">Cerrado</span>
                  )}
                </div>
                {/* Fila descanso */}
                {h.isOpen && (
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-xs text-gray-400 shrink-0">☕ Descanso</span>
                    <input type="time" value={h.breakStart || ""}
                      onChange={e => setHoursForm(f => f.map((d, idx) => idx === i ? { ...d, breakStart: e.target.value } : d))}
                      className="flex-1 min-w-0 border border-gray-100 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-purple-400 bg-white text-gray-600" />
                    <span className="text-gray-300 text-xs shrink-0">–</span>
                    <input type="time" value={h.breakEnd || ""}
                      onChange={e => setHoursForm(f => f.map((d, idx) => idx === i ? { ...d, breakEnd: e.target.value } : d))}
                      className="flex-1 min-w-0 border border-gray-100 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-purple-400 bg-white text-gray-600" />
                    {(h.breakStart || h.breakEnd) && (
                      <button onClick={() => setHoursForm(f => f.map((d, idx) => idx === i ? { ...d, breakStart: "", breakEnd: "" } : d))}
                        className="text-xs text-red-400 hover:text-red-600 shrink-0">✕</button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
          <button onClick={() => saveHours.mutate()} disabled={saveHours.isPending}
            className="mt-4 flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-60">
            <Save size={14} /> {saveHours.isPending ? "Guardando..." : "Guardar horarios"}
          </button>
        </section>

        {/* Bot */}
        <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-6">
          <div className="flex items-center gap-2 mb-4">
            <Bot size={18} className="text-brand-500" />
            <h2 className="font-semibold text-gray-900">Configuración del bot</h2>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
              <div>
                <p className="text-sm font-medium text-gray-900">Bot activo</p>
                <p className="text-xs text-gray-500">El bot responde automáticamente a los clientes</p>
              </div>
              <button onClick={() => setBotForm(f => ({ ...f, isOpen: !f.isOpen }))}
                className={`relative w-11 h-6 rounded-full transition-colors ${botForm.isOpen ? "bg-brand-500" : "bg-gray-300"}`}>
                <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${botForm.isOpen ? "translate-x-5" : ""}`} />
              </button>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
              <div>
                <p className="text-sm font-medium text-gray-900">Requiere confirmación manual</p>
                <p className="text-xs text-gray-500">El admin confirma cada cita antes de que quede activa</p>
              </div>
              <button onClick={() => setBotForm(f => ({ ...f, requiresConfirm: !f.requiresConfirm }))}
                className={`relative w-11 h-6 rounded-full transition-colors ${botForm.requiresConfirm ? "bg-brand-500" : "bg-gray-300"}`}>
                <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${botForm.requiresConfirm ? "translate-x-5" : ""}`} />
              </button>
            </div>
            {[["Mensaje de bienvenida","welcomeMessage"],["Mensaje de bot cerrado","closedMessage"],["Mensaje de confirmación","confirmMessage"]].map(([label, key]) => (
              <div key={key}>
                <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
                <textarea value={(botForm as any)[key]} onChange={e => setBotForm(f => ({ ...f, [key]: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm h-16 resize-none focus:outline-none focus:ring-2 focus:ring-brand-500" />
              </div>
            ))}
          </div>
          <button onClick={() => saveBot.mutate()} disabled={saveBot.isPending}
            className="mt-4 flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-60">
            <Save size={14} /> {saveBot.isPending ? "Guardando..." : "Guardar configuración"}
          </button>
        </section>

        {/* WhatsApp — Conexión QR (Baileys) */}
        {tenant && <WhatsAppQRSection tenantId={tenant.id} />}

        {/* Cambiar contraseña */}
        <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-6">
          <div className="flex items-center gap-2 mb-4">
            <KeyRound size={18} className="text-brand-500" />
            <h2 className="font-semibold text-gray-900">Cambiar contraseña</h2>
          </div>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Contraseña actual</label>
              <div className="relative">
                <input
                  type={showPw ? "text" : "password"}
                  value={pwForm.currentPassword}
                  onChange={e => setPwForm(f => ({ ...f, currentPassword: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  placeholder="Tu contraseña actual"
                />
                <button type="button" onClick={() => setShowPw(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Nueva contraseña</label>
              <input
                type={showPw ? "text" : "password"}
                value={pwForm.newPassword}
                onChange={e => setPwForm(f => ({ ...f, newPassword: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                placeholder="Mínimo 8 caracteres"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Confirmar nueva contraseña</label>
              <input
                type={showPw ? "text" : "password"}
                value={pwForm.confirmPassword}
                onChange={e => setPwForm(f => ({ ...f, confirmPassword: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                placeholder="Repite la nueva contraseña"
              />
            </div>
            {pwForm.newPassword && pwForm.confirmPassword && pwForm.newPassword !== pwForm.confirmPassword && (
              <p className="text-xs text-red-500">Las contraseñas no coinciden</p>
            )}
          </div>
          <button
            onClick={() => changePassword.mutate()}
            disabled={
              changePassword.isPending ||
              !pwForm.currentPassword ||
              pwForm.newPassword.length < 8 ||
              pwForm.newPassword !== pwForm.confirmPassword
            }
            className="mt-4 flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-60">
            <KeyRound size={14} /> {changePassword.isPending ? "Guardando..." : "Cambiar contraseña"}
          </button>
        </section>
      </div>
    </div>
  );
}

// ─── Componente: Conexión WhatsApp por QR ─────────────────────────────────────
function WhatsAppQRSection({ tenantId }: { tenantId: string }) {
  const qc = useQueryClient();

  // Consulta el estado/QR cada 3 segundos mientras no esté conectado
  const { data, isLoading } = useQuery({
    queryKey: ["wa-qr", tenantId],
    queryFn: () => whatsappApi.qr(tenantId),
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === "connected" ? false : 3000;
    },
  });

  const disconnect = useMutation({
    mutationFn: () => whatsappApi.disconnect(tenantId),
    onSuccess: () => {
      toast.success("WhatsApp desconectado");
      qc.invalidateQueries({ queryKey: ["wa-qr", tenantId] });
    },
    onError: () => toast.error("Error al desconectar"),
  });

  const status: string = data?.status ?? "not_initialized";
  const qrImage: string | null = data?.qrImage ?? null;
  const connected = status === "connected";

  return (
    <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-6">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <Smartphone size={18} className="text-green-500" />
          <h2 className="font-semibold text-gray-900">Conexión WhatsApp</h2>
        </div>
        {/* Badge de estado */}
        {connected ? (
          <span className="flex items-center gap-1.5 text-xs font-medium text-green-600 bg-green-50 px-2.5 py-1 rounded-full">
            <CheckCircle2 size={12} /> Conectado
          </span>
        ) : status === "qr" ? (
          <span className="flex items-center gap-1.5 text-xs font-medium text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full">
            <Loader2 size={12} className="animate-spin" /> Esperando escaneo
          </span>
        ) : (
          <span className="flex items-center gap-1.5 text-xs font-medium text-gray-400 bg-gray-50 px-2.5 py-1 rounded-full">
            <Loader2 size={12} className={status === "connecting" ? "animate-spin" : ""} />
            {status === "connecting" ? "Conectando..." : "Desconectado"}
          </span>
        )}
      </div>
      <p className="text-xs text-gray-400 mb-5">
        Conecta el número de WhatsApp de tu salón escaneando el código QR con la app.
      </p>

      {/* Conectado */}
      {connected && (
        <div className="flex flex-col items-center gap-4 py-4">
          <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center">
            <CheckCircle2 size={36} className="text-green-500" />
          </div>
          <div className="text-center">
            <p className="font-medium text-gray-900">¡WhatsApp conectado!</p>
            <p className="text-sm text-gray-400 mt-1">El bot ya está activo y recibiendo mensajes.</p>
          </div>
          <button
            onClick={() => disconnect.mutate()}
            disabled={disconnect.isPending}
            className="flex items-center gap-2 border border-red-200 text-red-500 hover:bg-red-50 px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-60"
          >
            <Unlink size={14} />
            {disconnect.isPending ? "Desconectando..." : "Desconectar número"}
          </button>
        </div>
      )}

      {/* Mostrando QR */}
      {!connected && status === "qr" && qrImage && (
        <div className="flex flex-col items-center gap-4">
          <div className="border-2 border-gray-100 rounded-2xl p-3 bg-white shadow-sm">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qrImage} alt="QR WhatsApp" className="w-56 h-56" />
          </div>
          <div className="text-center max-w-xs">
            <p className="text-sm font-medium text-gray-700">Escanea con WhatsApp</p>
            <p className="text-xs text-gray-400 mt-1">
              Abre WhatsApp → Dispositivos vinculados → Vincular dispositivo → Escanea este código
            </p>
          </div>
          <p className="text-xs text-gray-300 flex items-center gap-1">
            <RefreshCw size={10} /> Actualizando automáticamente...
          </p>
        </div>
      )}

      {/* Cargando / conectando */}
      {!connected && status !== "qr" && (
        <div className="flex flex-col items-center gap-3 py-6 text-gray-400">
          <Loader2 size={32} className={`${status === "connecting" || status === "not_initialized" ? "animate-spin" : ""} text-gray-300`} />
          <p className="text-sm">
            {isLoading || status === "connecting" || status === "not_initialized"
              ? "Iniciando sesión, el QR aparecerá en unos segundos..."
              : "Sin conexión. El QR aparecerá pronto."}
          </p>
        </div>
      )}
    </section>
  );
}
