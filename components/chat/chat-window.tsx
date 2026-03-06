"use client";

import { useState, useRef, useEffect } from "react";

// ──── Typen ────

interface AusgefuehrteAktion {
  typ: string;
  titel?: string;
  erfolg: boolean;
  details?: string;
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  aktionen?: AusgefuehrteAktion[];
  timestamp: Date;
}

// ──── Icons ────

function SendIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="22" y1="2" x2="11" y2="13" />
      <polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  );
}

// ──── Aktions-Badge ────

function AktionBadge({ aktion }: { aktion: AusgefuehrteAktion }) {
  const icons: Record<string, string> = {
    task_create: "\u2713",
    reminder: "\u23F0",
    task_query: "\uD83D\uDCCB",
  };

  const labels: Record<string, string> = {
    task_create: "Aufgabe angelegt",
    reminder: "Erinnerung angelegt",
    task_query: "Abfrage",
  };

  if (!aktion.erfolg) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-1 text-[11px] font-semibold text-red-600">
        &#10007; Fehler: {aktion.details ?? "Unbekannt"}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
      {icons[aktion.typ] ?? "\u2713"} {labels[aktion.typ] ?? aktion.typ}
      {aktion.titel ? `: ${aktion.titel}` : ""}
    </span>
  );
}

// ──── Tipp-Animation ────

function TypingIndicator() {
  return (
    <div className="flex items-start gap-3">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 text-xs font-bold text-white">
        M
      </div>
      <div className="rounded-2xl rounded-tl-sm bg-white px-4 py-3 shadow-sm border border-slate-100">
        <div className="flex gap-1">
          <span className="h-2 w-2 rounded-full bg-slate-300 animate-bounce" style={{ animationDelay: "0ms" }} />
          <span className="h-2 w-2 rounded-full bg-slate-300 animate-bounce" style={{ animationDelay: "150ms" }} />
          <span className="h-2 w-2 rounded-full bg-slate-300 animate-bounce" style={{ animationDelay: "300ms" }} />
        </div>
      </div>
    </div>
  );
}

// ──── Haupt-Komponente ────

export function ChatWindow() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content:
        "Hallo! Ich bin Misty. Wie kann ich dir helfen?\n\nDu kannst mich z.B. fragen:\n- \"Was steht heute an?\"\n- \"Erstell eine Aufgabe: Angebot schreiben bis Freitag\"\n- \"Was ist offen im Projekt X?\"\n- \"Erinnere mich morgen an den Statusbericht\"",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  // Textarea auto-resize
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 120) + "px";
  }, [input]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput("");

    const newUserMsg: ChatMessage = {
      role: "user",
      content: userMessage,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, newUserMsg]);
    setIsLoading(true);

    try {
      // Conversation History aufbauen (ohne Willkommensnachricht)
      const history = messages
        .filter((_, i) => i > 0)
        .map((m) => ({ role: m.role, content: m.content }));

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMessage,
          conversation_history: history,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content:
              data.error ||
              "Entschuldigung, da ist etwas schiefgelaufen. Versuch es bitte nochmal.",
            timestamp: new Date(),
          },
        ]);
        return;
      }

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: data.antwort,
          aktionen: data.ausgefuehrte_aktionen,
          timestamp: new Date(),
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Netzwerkfehler. Bitte versuche es erneut.",
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsLoading(false);
      textareaRef.current?.focus();
    }
  };

  const formatTime = (date: Date) =>
    date.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });

  // ──── Render ────

  return (
    <div className="flex flex-1 flex-col bg-slate-50">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="mx-auto max-w-[700px] space-y-4">
          {messages.map((msg, idx) => (
            <div key={idx}>
              {msg.role === "assistant" ? (
                /* Misty */
                <div className="flex items-start gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 text-xs font-bold text-white">
                    M
                  </div>
                  <div className="max-w-[85%]">
                    <div className="rounded-2xl rounded-tl-sm bg-white px-4 py-3 shadow-sm border border-slate-100">
                      <div className="whitespace-pre-wrap text-sm leading-relaxed text-slate-800">
                        {msg.content}
                      </div>
                    </div>

                    {/* Aktionen */}
                    {msg.aktionen && msg.aktionen.length > 0 && (
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        {msg.aktionen.map((a, aIdx) => (
                          <AktionBadge key={aIdx} aktion={a} />
                        ))}
                      </div>
                    )}

                    <div className="mt-1 text-[10px] text-slate-400">
                      {formatTime(msg.timestamp)}
                    </div>
                  </div>
                </div>
              ) : (
                /* User */
                <div className="flex justify-end">
                  <div className="max-w-[85%]">
                    <div className="rounded-2xl rounded-tr-sm bg-gradient-to-br from-indigo-500 to-violet-500 px-4 py-3 shadow-sm">
                      <div className="whitespace-pre-wrap text-sm leading-relaxed text-white">
                        {msg.content}
                      </div>
                    </div>
                    <div className="mt-1 text-right text-[10px] text-slate-400">
                      {formatTime(msg.timestamp)}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}

          {isLoading && <TypingIndicator />}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input */}
      <div className="border-t border-slate-200 bg-white px-4 py-3">
        <div className="mx-auto flex max-w-[700px] gap-3">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Nachricht an Misty..."
            rows={1}
            className="flex-1 resize-none rounded-xl border border-slate-200 px-4 py-3 text-sm leading-relaxed text-slate-800 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none"
          />
          <button
            onClick={handleSend}
            disabled={isLoading || !input.trim()}
            className="flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 text-white transition-all hover:shadow-lg hover:shadow-indigo-500/25 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <SendIcon />
          </button>
        </div>
      </div>
    </div>
  );
}
