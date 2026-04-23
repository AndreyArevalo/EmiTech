"use client";
import { useQuery } from "@tanstack/react-query";
import { clientsApi } from "@/lib/api";
import { useState } from "react";
import { Search, Users } from "lucide-react";
import dayjs from "dayjs";

export default function ClientsPage() {
  const [search, setSearch] = useState("");
  const { data: clients = [], isLoading } = useQuery({
    queryKey: ["clients", search],
    queryFn: () => clientsApi.list(search || undefined),
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Clientes</h1>
          <p className="text-gray-500 mt-1">{clients.length} clientes registrados</p>
        </div>
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por nombre o teléfono..."
            className="pl-9 pr-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 w-64" />
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
        {isLoading ? <div className="p-8 text-center text-gray-400">Cargando...</div>
          : clients.length === 0 ? (
            <div className="p-12 text-center">
              <Users size={40} className="mx-auto text-gray-200 mb-3" />
              <p className="text-gray-400">No hay clientes aún</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              <div className="px-6 py-3 grid grid-cols-5 text-xs font-medium text-gray-400 uppercase tracking-wide">
                <span className="col-span-2">Cliente</span>
                <span>Teléfono</span>
                <span className="text-center">Visitas</span>
                <span>Última visita</span>
              </div>
              {clients.map((c: any) => (
                <div key={c.id} className="px-6 py-4 grid grid-cols-5 items-center hover:bg-gray-50 transition-colors">
                  <div className="col-span-2 flex items-center gap-3">
                    <div className="w-9 h-9 bg-brand-100 rounded-full flex items-center justify-center">
                      <span className="text-brand-600 font-medium text-sm">{(c.name || c.phone)?.[0]?.toUpperCase()}</span>
                    </div>
                    <p className="font-medium text-gray-900">{c.name || "Sin nombre"}</p>
                  </div>
                  <p className="text-sm text-gray-600">{c.phone}</p>
                  <p className="text-center text-sm font-medium text-gray-900">{c.totalVisits}</p>
                  <p className="text-sm text-gray-400">{c.lastVisit ? dayjs(c.lastVisit).format("D MMM YYYY") : "—"}</p>
                </div>
              ))}
            </div>
          )}
      </div>
    </div>
  );
}
