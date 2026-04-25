"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import toast from "react-hot-toast";
import Image from "next/image";
import Link from "next/link";
import { Eye, EyeOff, ArrowLeft } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.post("/api/auth/login", { email, password });
      localStorage.setItem("emitech_token", res.data.token);
      localStorage.setItem("emitech_user", JSON.stringify(res.data.user));
      router.push("/dashboard");
    } catch {
      toast.error("Correo o contraseña incorrectos");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center relative overflow-hidden"
      style={{ background: "#07070f", fontFamily: "Inter, sans-serif" }}
    >
      {/* Glow de fondo */}
      <div
        style={{
          position: "absolute",
          top: "-200px",
          left: "50%",
          transform: "translateX(-50%)",
          width: "700px",
          height: "500px",
          background: "radial-gradient(ellipse, rgba(124,77,255,0.2) 0%, transparent 70%)",
          pointerEvents: "none",
        }}
      />

      {/* Botón volver */}
      <Link
        href="/"
        className="absolute top-6 left-6 flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors"
        style={{ textDecoration: "none" }}
      >
        <ArrowLeft size={16} />
        Volver
      </Link>

      {/* Card */}
      <div
        className="relative w-full max-w-md mx-4 rounded-2xl p-8"
        style={{
          background: "rgba(255,255,255,0.03)",
          border: "1px solid rgba(155,109,255,0.2)",
          backdropFilter: "blur(20px)",
        }}
      >
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <Image
            src="/perfilemi.png"
            alt="EmiTech"
            width={80}
            height={80}
            className="rounded-full mb-4"
            style={{ border: "2px solid rgba(155,109,255,0.4)" }}
          />
          <h1 className="text-2xl font-bold" style={{ color: "#f0ecff", letterSpacing: "-0.5px" }}>
            Emi<span style={{ color: "#9b6dff" }}>Tech</span>
          </h1>
          <p className="text-sm mt-1" style={{ color: "#9490b0" }}>Panel de administración</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email */}
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: "#c4a0ff" }}>
              Correo electrónico
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@tusalon.com"
              required
              style={{
                width: "100%",
                padding: "11px 16px",
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(155,109,255,0.2)",
                borderRadius: "10px",
                color: "#f0ecff",
                fontSize: "0.9rem",
                outline: "none",
                boxSizing: "border-box",
              }}
              onFocus={e => (e.target.style.borderColor = "#9b6dff")}
              onBlur={e => (e.target.style.borderColor = "rgba(155,109,255,0.2)")}
            />
          </div>

          {/* Contraseña */}
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: "#c4a0ff" }}>
              Contraseña
            </label>
            <div style={{ position: "relative" }}>
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                style={{
                  width: "100%",
                  padding: "11px 44px 11px 16px",
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(155,109,255,0.2)",
                  borderRadius: "10px",
                  color: "#f0ecff",
                  fontSize: "0.9rem",
                  outline: "none",
                  boxSizing: "border-box",
                }}
                onFocus={e => (e.target.style.borderColor = "#9b6dff")}
                onBlur={e => (e.target.style.borderColor = "rgba(155,109,255,0.2)")}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: "absolute",
                  right: "12px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "#9490b0",
                  padding: "4px",
                  display: "flex",
                  alignItems: "center",
                }}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* Botón */}
          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              padding: "13px",
              background: loading
                ? "rgba(155,109,255,0.5)"
                : "linear-gradient(135deg, #9b6dff, #7c4dff)",
              border: "none",
              borderRadius: "10px",
              color: "#fff",
              fontSize: "0.95rem",
              fontWeight: 700,
              cursor: loading ? "not-allowed" : "pointer",
              marginTop: "8px",
              boxShadow: "0 4px 20px rgba(124,77,255,0.35)",
              transition: "opacity 0.2s",
            }}
          >
            {loading ? "Ingresando..." : "Ingresar al panel"}
          </button>
        </form>

        <p className="text-center text-xs mt-6" style={{ color: "#9490b0" }}>
          EmiTech © {new Date().getFullYear()} — Automatización para salones de belleza
        </p>
        <p className="text-center text-xs mt-1" style={{ color: "rgba(148,144,176,0.5)" }}>
          Desarrollado por Andrey Arévalo
        </p>
      </div>
    </div>
  );
}
