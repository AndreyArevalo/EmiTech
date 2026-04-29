// ─────────────────────────────────────────────────────────────────────────────
// lib/baileys-manager.ts
// Gestor de sesiones Baileys multi-tenant para EmiTech
//
// Cada tenant (salón) tiene su propia sesión de WhatsApp Web.
// Las sesiones se persisten en disco para sobrevivir reinicios del servidor.
//
// Truco clave: mantiene un mapa de opciones por conversación (phone)
// que traduce "1", "2", "3"... → IDs reales (ISO dates, "turno_manana", etc.)
// Esto permite que bot.service.ts funcione SIN cambios, ya que recibe
// los mismos IDs que recibiría de Meta cuando el usuario clickea un botón.
// ─────────────────────────────────────────────────────────────────────────────

import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
  WASocket,
} from "@whiskeysockets/baileys";
import { Boom } from "@hapi/boom";
import pino from "pino";
import path from "path";
import fs from "fs";
import { EventEmitter } from "events";
import { BotReply } from "./meta";
import { renderBotReply, extractOptions } from "./baileys-renderer";

// ─── Tipos ────────────────────────────────────────────────────────────────────
export type MessageHandler = (
  tenantId: string,
  phone: string,
  text: string,
  messageId: string
) => Promise<BotReply | null>;

interface TenantSession {
  socket: WASocket | null;
  qr: string | null;
  status: "connecting" | "qr" | "connected" | "disconnected" | "logged_out";
}

// Mapa de opciones: conversationKey → { "1": "2026-05-04", "2": "turno_manana", ... }
// Se usa para traducir respuestas numéricas a los IDs que espera bot.service.ts
type OptionsMap = Map<string, Map<string, string>>;

// ─── Logger silencioso para Baileys ──────────────────────────────────────────
const logger = pino({ level: "silent" }) as any;

// ─── Clase principal ──────────────────────────────────────────────────────────
class BaileysSessions extends EventEmitter {
  private sessions = new Map<string, TenantSession>();
  private optionsMap: OptionsMap = new Map(); // conversationKey → options
  private sessionsDir: string;
  private messageHandler: MessageHandler | null = null;

  constructor() {
    super();
    // Carpeta donde se guardan las sesiones (auth state) de cada salón
    this.sessionsDir = path.join(process.cwd(), "baileys-sessions");
    if (!fs.existsSync(this.sessionsDir)) {
      fs.mkdirSync(this.sessionsDir, { recursive: true });
    }
  }

  // ─── Handler de mensajes (lo setea whatsapp.routes.ts al iniciar) ──────────
  setMessageHandler(handler: MessageHandler) {
    this.messageHandler = handler;
  }

  // ─── Clave de conversación para el mapa de opciones ──────────────────────
  private convKey(tenantId: string, phone: string): string {
    return `${tenantId}:${phone}`;
  }

  // ─── Guardar opciones de la última respuesta del bot ─────────────────────
  // Si el bot respondió con una lista o botones, guardamos el mapeo
  // "número" → "id" para que la próxima respuesta del usuario funcione.
  private saveOptions(tenantId: string, phone: string, reply: BotReply) {
    const key = this.convKey(tenantId, phone);
    const opts = extractOptions(reply);
    if (opts.size > 0) {
      this.optionsMap.set(key, opts);
    } else {
      // Si el bot respondió con texto libre, limpiamos las opciones guardadas
      // para no confundir una "1" del texto con una opción de menú anterior
      this.optionsMap.delete(key);
    }
  }

  // ─── Traducir entrada del usuario (número → ID real) ─────────────────────
  // Ej: usuario escribe "2" → devuelve "turno_tarde"
  // Si no hay traducción, devuelve el texto tal cual
  private translateInput(tenantId: string, phone: string, text: string): string {
    const key = this.convKey(tenantId, phone);
    const opts = this.optionsMap.get(key);
    if (!opts) return text;

    const trimmed = text.trim();
    const translated = opts.get(trimmed);
    if (translated) {
      // Limpiar opciones después de usarlas (evita confusión en el siguiente paso)
      this.optionsMap.delete(key);
      return translated;
    }
    return text;
  }

  // ─── Inicializar sesión de un tenant ─────────────────────────────────────
  async initSession(tenantId: string): Promise<void> {
    const sessionDir = path.join(this.sessionsDir, tenantId);
    if (!fs.existsSync(sessionDir)) {
      fs.mkdirSync(sessionDir, { recursive: true });
    }

    const { state, saveCreds } = await useMultiFileAuthState(sessionDir);
    const { version } = await fetchLatestBaileysVersion();

    const session: TenantSession = {
      socket: null,
      qr: null,
      status: "connecting",
    };
    this.sessions.set(tenantId, session);

    const sock = makeWASocket({
      version,
      auth: {
        creds: state.creds,
        keys: makeCacheableSignalKeyStore(state.keys, logger),
      },
      logger,
      printQRInTerminal: false,
      browser: ["EmiTech", "Chrome", "1.0.0"],
      // Reducir consumo de recursos
      syncFullHistory: false,
      markOnlineOnConnect: false,
    });

    session.socket = sock;

    // Guardar credenciales cada vez que cambien
    sock.ev.on("creds.update", saveCreds);

    // ─── Manejo de conexión ──────────────────────────────────────────────
    sock.ev.on("connection.update", async (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        session.qr = qr;
        session.status = "qr";
        console.log(`[BAILEYS] 📱 QR disponible para tenant ${tenantId}`);
        this.emit("qr", tenantId, qr);
      }

      if (connection === "open") {
        session.qr = null;
        session.status = "connected";
        console.log(`[BAILEYS] ✅ Conectado — tenant ${tenantId}`);
        this.emit("connected", tenantId);
      }

      if (connection === "close") {
        const statusCode = (lastDisconnect?.error as Boom)?.output?.statusCode;
        const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
        session.status = shouldReconnect ? "disconnected" : "logged_out";

        if (shouldReconnect) {
          console.log(`[BAILEYS] 🔄 Reconectando tenant ${tenantId} en 5s...`);
          setTimeout(() => this.initSession(tenantId), 5000);
        } else {
          console.log(`[BAILEYS] 🚪 Sesión cerrada (logout) — tenant ${tenantId}`);
          // Borrar archivos de sesión para forzar nuevo QR la próxima vez
          try {
            fs.rmSync(sessionDir, { recursive: true, force: true });
          } catch {}
          this.sessions.delete(tenantId);
          this.emit("logged_out", tenantId);
        }
      }
    });

    // ─── Recepción de mensajes ───────────────────────────────────────────
    sock.ev.on("messages.upsert", async ({ messages, type }) => {
      console.log(`[BAILEYS] 📨 messages.upsert type="${type}" count=${messages.length} tenant=${tenantId}`);

      // Aceptar "notify" y "append" para mayor compatibilidad
      if (type !== "notify" && type !== "append") return;

      for (const msg of messages) {
        // Ignorar mensajes propios y sin contenido
        if (!msg.message || msg.key.fromMe) continue;

        const jid = msg.key.remoteJid || "";
        console.log(`[BAILEYS] 📩 Mensaje de ${jid} — tipo msg: ${Object.keys(msg.message)[0]}`);

        // Aceptar @s.whatsapp.net (número clásico) y @lid (nuevo formato privacidad de WA)
        // Ignorar grupos (@g.us), broadcasts (status@broadcast) y otros
        const isIndividual = jid.endsWith("@s.whatsapp.net") || jid.endsWith("@lid");
        if (!isIndividual || jid === "status@broadcast") continue;

        // Extraer identificador limpio (número o LID)
        const phone = jid.split("@")[0];
        const messageId = msg.key.id || "";

        // Extraer texto del mensaje
        let rawText = "";
        const m = msg.message;
        if (m.conversation) {
          rawText = m.conversation;
        } else if (m.extendedTextMessage?.text) {
          rawText = m.extendedTextMessage.text;
        } else if (m.imageMessage?.caption) {
          rawText = m.imageMessage.caption;
        } else {
          console.log(`[BAILEYS] ⏭️ Mensaje no-texto ignorado de ${phone}`);
          continue;
        }

        console.log(`[BAILEYS] 💬 Texto recibido de ${phone}: "${rawText}"`);

        // Traducir número → ID antes de pasarlo al bot
        const text = this.translateInput(tenantId, phone, rawText);

        if (!this.messageHandler) {
          console.warn(`[BAILEYS] ⚠️ Sin messageHandler registrado para tenant ${tenantId}`);
          continue;
        }

        try {
          const botReply = await this.messageHandler(tenantId, phone, text, messageId);

          if (botReply) {
            // Guardar opciones para la próxima respuesta
            this.saveOptions(tenantId, phone, botReply);

            // Convertir BotReply a texto y enviar
            const textToSend = renderBotReply(botReply);
            if (textToSend) {
              console.log(`[BAILEYS] 📤 Enviando respuesta a ${phone}`);
              await sock.sendMessage(jid, { text: textToSend });
            }
          }
        } catch (err: any) {
          console.error(`[BAILEYS] ❌ Error procesando mensaje de ${phone}:`, err.message, err.stack);
        }
      }
    });
  }

  // ─── API pública ──────────────────────────────────────────────────────────

  /** Estado de conexión de un tenant */
  getStatus(tenantId: string): { status: string; qr: string | null } {
    const session = this.sessions.get(tenantId);
    if (!session) return { status: "not_initialized", qr: null };
    return { status: session.status, qr: session.qr };
  }

  /** Enviar texto a un número desde la sesión del tenant */
  async sendText(tenantId: string, phone: string, text: string): Promise<void> {
    const session = this.sessions.get(tenantId);
    if (!session?.socket || session.status !== "connected") {
      console.warn(`[BAILEYS] sendText: tenant ${tenantId} no conectado, descartando mensaje`);
      return; // No lanzar error — recordatorios/notificaciones no deben romper el servidor
    }
    const jid = `${phone.replace(/\D/g, "")}@s.whatsapp.net`;
    await session.socket.sendMessage(jid, { text });
  }

  /** Verificar si un tenant está conectado */
  isConnected(tenantId: string): boolean {
    return this.sessions.get(tenantId)?.status === "connected";
  }

  /** Lista de tenantIds con sesión inicializada */
  getInitializedTenants(): string[] {
    return [...this.sessions.keys()];
  }

  /** Listar carpetas de sesión existentes en disco */
  getPersistedTenantIds(): string[] {
    try {
      return fs
        .readdirSync(this.sessionsDir)
        .filter((f) =>
          fs.statSync(path.join(this.sessionsDir, f)).isDirectory()
        );
    } catch {
      return [];
    }
  }

  /** Eliminar sesión de un tenant (cuando cancela el servicio) */
  async removeSession(tenantId: string): Promise<void> {
    const session = this.sessions.get(tenantId);
    if (session?.socket) {
      try {
        await session.socket.logout();
      } catch {}
    }
    this.sessions.delete(tenantId);
    const sessionDir = path.join(this.sessionsDir, tenantId);
    try {
      fs.rmSync(sessionDir, { recursive: true, force: true });
    } catch {}
    console.log(`[BAILEYS] 🗑️ Sesión eliminada — tenant ${tenantId}`);
  }
}

// ─── Singleton exportado ──────────────────────────────────────────────────────
export const baileysSessions = new BaileysSessions();
