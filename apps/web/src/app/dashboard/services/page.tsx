"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { servicesApi } from "@/lib/api";
import { useState } from "react";
import { Plus, Pencil, Trash2, Scissors } from "lucide-react";
import toast from "react-hot-toast";

type ServiceForm = { name: string; description: string; duration: number; price: number; emoji: string };
const EMPTY: ServiceForm = { name: "", description: "", duration: 60, price: 0, emoji: "💅" };

export default function ServicesPage() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<ServiceForm>(EMPTY);
  const [editId, setEditId] = useState<string | null>(null);

  const { data: services = [] } = useQuery({ queryKey: ["services"], queryFn: servicesApi.list });

  const save = useMutation({
    mutationFn: (data: ServiceForm) => editId ? servicesApi.update(editId, data) : servicesApi.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["services"] }); setShowForm(false); setForm(EMPTY); setEditId(null); toast.success("Servicio guardado"); },
    onError: () => toast.error("Error al guardar"),
  });
  const remove = useMutation({
    mutationFn: servicesApi.delete,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["services"] }); toast.success("Servicio eliminado"); },
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Servicios</h1>
          <p className="text-gray-500 mt-1">Los servicios que ofrece tu salón en WhatsApp</p>
        </div>
        <button onClick={() => { setForm(EMPTY); setEditId(null); setShowForm(true); }}
          className="flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors">
          <Plus size={16} /> Nuevo servicio
        </button>
      </div>

      <div className="grid gap-4">
        {services.map((s: any) => (
          <div key={s.id} className="bg-white rounded-2xl px-6 py-4 shadow-sm border border-gray-100 flex items-center gap-4">
            <span className="text-3xl">{s.emoji || "💅"}</span>
            <div className="flex-1">
              <p className="font-semibold text-gray-900">{s.name}</p>
              <p className="text-sm text-gray-500">{s.duration} min · ${Number(s.price).toLocaleString("es-CO")} COP</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => { setForm({ name: s.name, description: s.description || "", duration: s.duration, price: Number(s.price), emoji: s.emoji || "💅" }); setEditId(s.id); setShowForm(true); }}
                className="p-2 rounded-lg text-gray-400 hover:bg-gray-50 hover:text-gray-600">
                <Pencil size={16} />
              </button>
              <button onClick={() => remove.mutate(s.id)} className="p-2 rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-500">
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))}
        {services.length === 0 && (
          <div className="bg-white rounded-2xl p-12 text-center border border-dashed border-gray-200">
            <Scissors size={40} className="mx-auto text-gray-200 mb-3" />
            <p className="text-gray-400">Aún no tienes servicios. ¡Crea el primero!</p>
          </div>
        )}
      </div>

      {/* Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="font-bold text-gray-900 mb-4">{editId ? "Editar" : "Nuevo"} servicio</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Nombre del servicio</label>
                <input placeholder="Ej: Corte de cabello" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Emoji</label>
                  <input placeholder="💅" value={form.emoji} onChange={e => setForm(f => ({ ...f, emoji: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-brand-500" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Duración (min)</label>
                  <input type="number" min={5} placeholder="60" value={form.duration} onChange={e => setForm(f => ({ ...f, duration: +e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Precio (COP)</label>
                  <input type="number" min={0} placeholder="50000" value={form.price} onChange={e => setForm(f => ({ ...f, price: +e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Descripción <span className="normal-case font-normal text-gray-400">(opcional)</span></label>
                <textarea placeholder="Describe brevemente el servicio..." value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm h-20 resize-none focus:outline-none focus:ring-2 focus:ring-brand-500" />
              </div>
            </div>
            <div className="flex gap-3 mt-4">
              <button onClick={() => setShowForm(false)} className="flex-1 border border-gray-300 text-gray-600 py-2 rounded-lg text-sm">Cancelar</button>
              <button onClick={() => save.mutate(form)} disabled={save.isPending}
                className="flex-1 bg-brand-500 hover:bg-brand-600 text-white py-2 rounded-lg text-sm font-medium disabled:opacity-60">
                {save.isPending ? "Guardando..." : "Guardar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
