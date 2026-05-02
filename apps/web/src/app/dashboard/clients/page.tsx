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
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Clientes</h1>
            <p className="text-gray-500 mt-1">{clients.length} clientes registrados</p>
          </div>
          <div className="relative w-full sm:w-64">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar por nombre o teléfono..."
              className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
        {isLoading ? (
          <div className="p-8 text-center text-gray-400">Cargando...</div>
        ) : clients.length === 0 ? (
          <div className="p-12 text-center">
            <Users size={40} className="mx-auto text-gray-200 mb-3" />
            <p className="text-gray-400">No hay clientes aún</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {clients.map((c: any) => (
              <div key={c.id} className="px-4 py-4 flex items-center gap-3">
                {/* Avatar */}
                <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center shrink-0">
                  <span className="text-purple-600 font-semibold text-sm">
                    {(c.name || c.phone)?.[0]?.toUpperCase() ?? "?"}
                  </span>
                </div>

                {/* Nombre + teléfono */}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate">{c.name || "Sin nombre"}</p>
                </div>

                {/* Visitas */}
                <div className="text-center shrink-0">
                  <p className="text-sm font-bold text-gray-900">{c.totalVisits}</p>
                  <p className="text-xs text-gray-400">visitas</p>
                </div>

                {/* Última visita — oculta en móvil muy pequeño */}
                <div className="text-right shrink-0 hidden xs:block">
                  <p className="text-xs text-gray-400">
                    {c.lastVisit ? dayjs(c.lastVisit).format("D MMM YYYY") : "—"}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
