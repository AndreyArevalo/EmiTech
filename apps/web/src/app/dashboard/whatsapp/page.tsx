"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { whatsappApi } from "@/lib/api";
import { useState } from "react";
import { Send, Bot, MessageSquare, ArrowLeft } from "lucide-react";
import toast from "react-hot-toast";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import "dayjs/locale/es";
dayjs.extend(relativeTime);
dayjs.locale("es");

export default function WhatsAppPage() {
  const qc = useQueryClient();
  const [selectedConvId, setSelectedConvId] = useState<string | null>(null);
  const [msgText, setMsgText] = useState("");

  const { data: convs = [] } = useQuery({
    queryKey: ["conversations"],
    queryFn: whatsappApi.conversations,
    refetchInterval: 10_000,
  });

  const { data: messages = [] } = useQuery({
    queryKey: ["messages", selectedConvId],
    queryFn: () => whatsappApi.messages(selectedConvId!),
    enabled: !!selectedConvId,
    refetchInterval: 5_000,
  });

  const sendMsg = useMutation({
    mutationFn: () => whatsappApi.send(selectedConvId!, msgText),
    onSuccess: () => {
      setMsgText("");
      qc.invalidateQueries({ queryKey: ["messages", selectedConvId] });
    },
    onError: () => toast.error("Error al enviar"),
  });

  const toggleHuman = useMutation({
    mutationFn: ({ id, val }: { id: string; val: boolean }) => whatsappApi.setHumanMode(id, val),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["conversations"] }),
  });

  const selectedConv = convs.find((c: any) => c.id === selectedConvId);

  function selectConv(id: string) {
    setSelectedConvId(id);
    setMsgText("");
  }

  function goBack() {
    setSelectedConvId(null);
  }

  // ── Lista de conversaciones ──────────────────────────────────────────────────
  const ConvList = (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-gray-100">
        <p className="text-sm font-medium text-gray-500">{convs.length} conversaciones</p>
      </div>
      <div className="flex-1 overflow-y-auto">
        {convs.length === 0 && (
          <div className="p-8 text-center text-gray-400">
            <MessageSquare size={32} className="mx-auto mb-2 opacity-30" />
            <p className="text-sm">Sin conversaciones aún</p>
          </div>
        )}
        {convs.map((conv: any) => (
          <button
            key={conv.id}
            onClick={() => selectConv(conv.id)}
            className={`w-full text-left px-4 py-3 border-b border-gray-50 hover:bg-gray-50 transition-colors ${
              selectedConvId === conv.id ? "bg-purple-50 border-l-2 border-l-purple-500" : ""
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <p className="font-medium text-sm text-gray-900 truncate">
                {conv.client?.name || conv.phone}
              </p>
              <span className="text-xs text-gray-400 shrink-0 ml-2">{dayjs(conv.updatedAt).fromNow()}</span>
            </div>
            <div className="flex items-center gap-1.5">
              {conv.humanMode && (
                <span className="text-xs bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded-full font-medium shrink-0">
                  Manual
                </span>
              )}
              <p className="text-xs text-gray-400 truncate">{conv.messages?.[0]?.content || "Sin mensajes"}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );

  // ── Panel de chat ────────────────────────────────────────────────────────────
  const ChatPanel = (
    <div className="flex-1 flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-3">
        {/* Botón volver — solo en móvil */}
        <button
          onClick={goBack}
          className="md:hidden p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 transition-colors shrink-0"
        >
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-900 truncate">
            {selectedConv?.client?.name || selectedConv?.phone}
          </p>
          <p className="text-xs text-gray-400 truncate">{selectedConv?.phone} · Paso: {selectedConv?.step}</p>
        </div>
        <button
          onClick={() => toggleHuman.mutate({ id: selectedConvId!, val: !selectedConv?.humanMode })}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors shrink-0 ${
            selectedConv?.humanMode
              ? "bg-orange-100 text-orange-600 hover:bg-orange-200"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          {selectedConv?.humanMode ? "🧑 Manual" : "🤖 Bot"}
        </button>
      </div>

      {/* Mensajes */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((msg: any) => (
          <div key={msg.id} className={`flex ${msg.direction === "OUT" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm ${
              msg.direction === "OUT"
                ? "bg-purple-600 text-white rounded-br-sm"
                : "bg-gray-100 text-gray-900 rounded-bl-sm"
            }`}>
              <p className="whitespace-pre-wrap">{msg.content}</p>
              <p className={`text-xs mt-1 ${msg.direction === "OUT" ? "text-purple-200" : "text-gray-400"}`}>
                {dayjs(msg.createdAt).format("HH:mm")}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Input */}
      <div className="p-3 border-t border-gray-100">
        <div className="flex gap-2">
          <input
            value={msgText}
            onChange={e => setMsgText(e.target.value)}
            onKeyDown={e => e.key === "Enter" && !e.shiftKey && msgText.trim() && sendMsg.mutate()}
            placeholder="Escribe un mensaje..."
            className="flex-1 border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
          <button
            onClick={() => sendMsg.mutate()}
            disabled={!msgText.trim() || sendMsg.isPending}
            className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2.5 rounded-xl transition-colors disabled:opacity-50"
          >
            <Send size={16} />
          </button>
        </div>
        {!selectedConv?.humanMode && (
          <p className="text-xs text-gray-400 mt-2 flex items-center gap-1">
            <Bot size={12} /> El bot está respondiendo. Activa modo manual para tomar el control.
          </p>
        )}
      </div>
    </div>
  );

  const EmptyState = (
    <div className="flex-1 hidden md:flex items-center justify-center text-gray-300">
      <div className="text-center">
        <MessageSquare size={48} className="mx-auto mb-3" />
        <p>Selecciona una conversación</p>
      </div>
    </div>
  );

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">WhatsApp</h1>
        <p className="text-gray-500 mt-1">Conversaciones y mensajes de tus clientes</p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"
        style={{ height: "calc(100vh - 200px)" }}>

        {/* DESKTOP: lista + chat lado a lado */}
        <div className="hidden md:flex h-full">
          <div className="w-80 border-r border-gray-100 flex-shrink-0">
            {ConvList}
          </div>
          {selectedConvId ? ChatPanel : EmptyState}
        </div>

        {/* MÓVIL: lista O chat (uno a la vez) */}
        <div className="md:hidden h-full flex flex-col">
          {!selectedConvId ? ConvList : ChatPanel}
        </div>
      </div>
    </div>
  );
}
