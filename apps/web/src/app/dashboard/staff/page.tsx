"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { staffApi } from "@/lib/api";
import { useState } from "react";
import { Plus, Trash2, UserCheck } from "lucide-react";
import toast from "react-hot-toast";

export default function StaffPage() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "" });

  const { data: staff = [] } = useQuery({ queryKey: ["staff"], queryFn: staffApi.list });

  const create = useMutation({
    mutationFn: () => staffApi.create(form),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["staff"] }); setShowForm(false); setForm({ name: "", phone: "" }); toast.success("Empleada agregada"); },
  });
  const remove = useMutation({
    mutationFn: staffApi.delete,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["staff"] }); toast.success("Empleada eliminada"); },
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Equipo</h1>
          <p className="text-gray-500 mt-1">Estilistas y empleadas del salón</p>
        </div>
        <button onClick={() => setShowForm(true)}
          className="flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors">
          <Plus size={16} /> Agregar empleada
        </button>
      </div>

      <div className="grid gap-4">
        {staff.map((s: any) => (
          <div key={s.id} className="bg-white rounded-2xl px-6 py-4 shadow-sm border border-gray-100 flex items-center gap-4">
            <div className="w-10 h-10 bg-brand-100 rounded-full flex items-center justify-center">
              <span className="text-brand-600 font-semibold">{s.name[0]}</span>
            </div>
            <div className="flex-1">
              <p className="font-semibold text-gray-900">{s.name}</p>
              {s.phone && <p className="text-sm text-gray-400">{s.phone}</p>}
              {s.staffServices?.length > 0 && (
                <p className="text-xs text-gray-400 mt-0.5">{s.staffServices.map((ss: any) => ss.service.name).join(", ")}</p>
              )}
            </div>
            <button onClick={() => remove.mutate(s.id)} className="p-2 rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors">
              <Trash2 size={16} />
            </button>
          </div>
        ))}
        {staff.length === 0 && (
          <div className="bg-white rounded-2xl p-12 text-center border border-dashed border-gray-200">
            <UserCheck size={40} className="mx-auto text-gray-200 mb-3" />
            <p className="text-gray-400">Agrega las estilistas de tu salón</p>
          </div>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <h3 className="font-bold text-gray-900 mb-4">Nueva empleada</h3>
            <div className="space-y-3">
              <input placeholder="Nombre completo" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
              <input placeholder="Teléfono (opcional)" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
            </div>
            <div className="flex gap-3 mt-4">
              <button onClick={() => setShowForm(false)} className="flex-1 border border-gray-300 text-gray-600 py-2 rounded-lg text-sm">Cancelar</button>
              <button onClick={() => create.mutate()} disabled={!form.name || create.isPending}
                className="flex-1 bg-brand-500 hover:bg-brand-600 text-white py-2 rounded-lg text-sm font-medium disabled:opacity-60">
                {create.isPending ? "Guardando..." : "Guardar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
