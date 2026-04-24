"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import {
  LayoutDashboard, Calendar, Users, Scissors, UserCheck,
  MessageSquare, Settings, LogOut, CreditCard, ShieldCheck,
} from "lucide-react";
import { clsx } from "clsx";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/dashboard/appointments", label: "Citas", icon: Calendar },
  { href: "/dashboard/clients", label: "Clientes", icon: Users },
  { href: "/dashboard/services", label: "Servicios", icon: Scissors },
  { href: "/dashboard/staff", label: "Equipo", icon: UserCheck },
  { href: "/dashboard/whatsapp", label: "WhatsApp", icon: MessageSquare },
  { href: "/dashboard/billing", label: "Planes y pago", icon: CreditCard },
  { href: "/dashboard/settings", label: "Configuración", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  const user = typeof window !== "undefined"
    ? JSON.parse(localStorage.getItem("emitech_user") || "{}")
    : {};
  const isSuperAdmin = user?.role === "SUPERADMIN";

  function handleLogout() {
    localStorage.removeItem("emitech_token");
    localStorage.removeItem("emitech_user");
    window.location.href = "/login";
  }

  return (
    <aside className="w-64 bg-white border-r border-gray-200 flex flex-col min-h-screen fixed left-0 top-0 z-30">
      {/* Logo */}
      <div className="p-5 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <Image
            src="/perfilemi.png"
            alt="EmiTech"
            width={36}
            height={36}
            className="rounded-full"
            style={{ border: "1.5px solid rgba(155,109,255,0.4)" }}
          />
          <div>
            <p className="font-extrabold leading-none" style={{ color: "#1a1a2e", fontSize: "1.05rem" }}>
              Emi<span style={{ color: "#9b6dff" }}>Tech</span>
            </p>
            <p className="text-xs text-gray-400 mt-0.5">Panel Admin</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-4 space-y-1">
        {NAV_ITEMS.map((item) => {
          const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all",
                active
                  ? "bg-purple-50 text-purple-700"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              )}
            >
              <item.icon size={18} className={active ? "text-purple-600" : ""} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* SuperAdmin */}
      {isSuperAdmin && (
        <div className="px-4 pb-2">
          <div className="border-t border-gray-100 pt-3">
            <Link
              href="/dashboard/admin"
              className={clsx(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all",
                pathname.startsWith("/dashboard/admin")
                  ? "bg-fuchsia-50 text-fuchsia-700"
                  : "text-fuchsia-600 hover:bg-fuchsia-50"
              )}
            >
              <ShieldCheck size={18} />
              SuperAdmin
            </Link>
          </div>
        </div>
      )}

      {/* Logout */}
      <div className="p-4 border-t border-gray-100">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-500 hover:bg-red-50 hover:text-red-600 w-full transition-all"
        >
          <LogOut size={18} />
          Cerrar sesión
        </button>
      </div>
    </aside>
  );
}
