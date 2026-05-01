// ─────────────────────────────────────────────────────────────────────────────
// lib/api.ts — Cliente HTTP centralizado
// ─────────────────────────────────────────────────────────────────────────────
import axios from "axios";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export const api = axios.create({
  baseURL: API_URL,
  headers: { "Content-Type": "application/json" },
});

// Inyectar token desde sessionStorage
api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("emitech_token");
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response?.status === 401 && typeof window !== "undefined") {
      localStorage.removeItem("emitech_token");
      window.location.href = "/login";
    }
    return Promise.reject(err);
  }
);

// ─── API helpers ──────────────────────────────────────────────────────────────
export const appointmentsApi = {
  list: (params?: any) => api.get("/api/appointments", { params }).then(r => r.data),
  getSlots: (params: any) => api.get("/api/appointments/slots", { params }).then(r => r.data),
  create: (data: any) => api.post("/api/appointments", data).then(r => r.data),
  updateStatus: (id: string, status: string) => api.patch(`/api/appointments/${id}/status`, { status }).then(r => r.data),
  delete: (id: string) => api.delete(`/api/appointments/${id}`).then(r => r.data),
};

export const servicesApi = {
  list: () => api.get("/api/services").then(r => r.data),
  create: (data: any) => api.post("/api/services", data).then(r => r.data),
  update: (id: string, data: any) => api.put(`/api/services/${id}`, data).then(r => r.data),
  delete: (id: string) => api.delete(`/api/services/${id}`).then(r => r.data),
};

export const staffApi = {
  list: () => api.get("/api/staff").then(r => r.data),
  create: (data: any) => api.post("/api/staff", data).then(r => r.data),
  delete: (id: string) => api.delete(`/api/staff/${id}`).then(r => r.data),
  getHours: (id: string) => api.get(`/api/staff/${id}/hours`).then(r => r.data),
  saveHours: (id: string, data: any[]) => api.put(`/api/staff/${id}/hours`, data).then(r => r.data),
};

export const clientsApi = {
  list: (search?: string) => api.get("/api/clients", { params: { search } }).then(r => r.data),
  get: (id: string) => api.get(`/api/clients/${id}`).then(r => r.data),
};

export const dashboardApi = {
  stats: () => api.get("/api/dashboard/stats").then(r => r.data),
};

export const tenantApi = {
  me: () => api.get("/api/tenants/me").then(r => r.data),
  update: (data: any) => api.put("/api/tenants/me", data).then(r => r.data),
  updateBotConfig: (data: any) => api.put("/api/tenants/me/bot-config", data).then(r => r.data),
  updateWorkingHours: (data: any) => api.put("/api/tenants/me/working-hours", data).then(r => r.data),
  updateWhatsapp: (data: any) => api.put("/api/tenants/me/whatsapp", data).then(r => r.data),
  changePassword: (data: { currentPassword: string; newPassword: string }) =>
    api.post("/api/auth/change-password", data).then(r => r.data),
};

export const whatsappApi = {
  conversations: () => api.get("/api/whatsapp/conversations").then(r => r.data),
  messages: (id: string) => api.get(`/api/whatsapp/conversations/${id}/messages`).then(r => r.data),
  send: (id: string, text: string) => api.post(`/api/whatsapp/conversations/${id}/send`, { text }).then(r => r.data),
  setHumanMode: (id: string, humanMode: boolean) => api.patch(`/api/whatsapp/conversations/${id}/human-mode`, { humanMode }).then(r => r.data),
  // Baileys: conexión QR
  qr: (tenantId: string) => api.get(`/api/whatsapp/qr/${tenantId}`).then(r => r.data),
  status: (tenantId: string) => api.get(`/api/whatsapp/status/${tenantId}`).then(r => r.data),
  disconnect: (tenantId: string) => api.delete(`/api/whatsapp/session/${tenantId}`).then(r => r.data),
};
