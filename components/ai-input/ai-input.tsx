"use client";

import { useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Database, Department, TopicType, PriorityLevel } from "@/lib/types/database";

// ──── Typen für Claude-Ergebnis ────

interface AiTask {
  titel: string;
  beschreibung: string | null;
  zustaendig: string | null;
  faellig: string | null;
}

interface AiResult {
  projekt: string | null;
  titel: string;
  beschreibung: string;
  typ: TopicType;
  prioritaet: PriorityLevel;
  fachabteilung: Department[];
  meeting_agenda: boolean;
  aufgaben: AiTask[];
}

// ──── Style-Mappings ────

const typeIcons: Record<string, string> = {
  Anforderung: "\u25C6",
  Entscheidung: "\u25B2",
  Diskussionspunkt: "\u25CF",
  Information: "\u25A0",
};

const priorityColors: Record<string, string> = {
  Hoch: "bg-red-500",
  Mittel: "bg-amber-500",
  Niedrig: "bg-gray-400",
};

const deptColors: Record<string, string> = {
  Business: "bg-violet-500/10 text-violet-600",
  Marketing: "bg-pink-500/10 text-pink-600",
  HR: "bg-orange-500/10 text-orange-600",
  GF: "bg-sky-500/10 text-sky-600",
  IT: "bg-indigo-500/10 text-indigo-600",
};

export function AiInput() {
  const [inputText, setInputText] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [aiResult, setAiResult] = useState<AiResult | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // ──── Submit an API ────

  const handleSubmit = async () => {
    if (!inputText.trim() || isProcessing) return;

    setIsProcessing(true);
    setAiResult(null);
    setError(null);

    try {
      const res = await fetch("/api/ai/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: inputText.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Fehler bei der Verarbeitung.");
        return;
      }

      // Sicherstellen dass aufgaben immer ein Array ist
      if (!Array.isArray(data.aufgaben)) {
        data.aufgaben = [];
      }

      setAiResult(data);
    } catch {
      setError("Netzwerkfehler. Bitte erneut versuchen.");
    } finally {
      setIsProcessing(false);
    }
  };

  // ──── Übernehmen: In Supabase speichern ────

  const handleConfirm = async () => {
    if (!aiResult) return;

    const supabase = createClient();

    // Projekt-ID ermitteln, falls zugeordnet
    let projectId: string | null = null;
    if (aiResult.projekt) {
      const { data } = await supabase
        .from("projects")
        .select("id")
        .eq("name", aiResult.projekt)
        .returns<{ id: string }[]>()
        .single();
      projectId = data?.id ?? null;
    }

    // 1. Topic speichern
    const topicPayload: Database["public"]["Tables"]["topics"]["Insert"] = {
      title: aiResult.titel,
      description: aiResult.beschreibung,
      project_id: projectId,
      type: aiResult.typ,
      status: "Offen",
      priority: aiResult.prioritaet,
      departments: aiResult.fachabteilung,
      meeting_agenda: aiResult.meeting_agenda,
      source: "KI-Agent",
    };
    const { data: topicData, error: topicError } = await supabase
      .from("topics")
      .insert(topicPayload as never)
      .select("id")
      .single();

    if (topicError) {
      setError("Fehler beim Speichern des Themas: " + topicError.message);
      return;
    }

    const topicId = (topicData as any)?.id ?? null;

    // 2. Aufgaben speichern (falls vorhanden)
    if (aiResult.aufgaben.length > 0) {
      const taskPayloads = aiResult.aufgaben.map((a) => ({
        title: a.titel,
        description: a.beschreibung,
        project_id: projectId,
        topic_id: topicId,
        assignee: a.zustaendig,
        status: "Offen" as const,
        due_date: a.faellig,
        source: "KI-Agent" as const,
      }));

      const { error: taskError } = await supabase
        .from("tasks")
        .insert(taskPayloads as never[]);

      if (taskError) {
        setError("Thema gespeichert, aber Fehler bei Aufgaben: " + taskError.message);
        return;
      }
    }

    // 3. Activity Log
    if (topicId) {
      await supabase.from("activity_log").insert({
        entity_type: "topic",
        entity_id: topicId,
        action: "erstellt",
        details: {
          title: aiResult.titel,
          project: aiResult.projekt,
          tasks_count: aiResult.aufgaben.length,
        },
        source: "KI-Agent",
      } as never);
    }

    setAiResult(null);
    setInputText("");
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);
  };

  // ──── Verwerfen ────

  const handleDiscard = () => {
    setAiResult(null);
    textareaRef.current?.focus();
  };

  // ──── Render ────

  return (
    <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      {/* Header-Zeile */}
      <div className="mb-4 flex items-center gap-2">
        <span
          className={`inline-block h-2 w-2 rounded-full ${
            isProcessing ? "animate-pulse bg-amber-500" : "bg-emerald-500"
          }`}
        />
        <span className="text-[13px] font-semibold uppercase tracking-wide text-slate-500">
          KI-Agent
        </span>
        {showSuccess && (
          <span className="ml-auto text-[13px] font-semibold text-emerald-500 animate-in fade-in">
            &#10003; Erfolgreich angelegt
          </span>
        )}
      </div>

      {/* Eingabezeile */}
      <div className="flex gap-3">
        <textarea
          ref={textareaRef}
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSubmit();
            }
          }}
          placeholder='z.B. "Für den HR-Chatbot müssen wir noch klären, ob die Mitarbeiter den Bot auch für Urlaubsanträge nutzen können. Daniel soll bis Freitag einen Termin mit HR machen."'
          className="h-14 flex-1 resize-none rounded-xl border border-slate-200 px-4 py-3.5 text-sm leading-relaxed text-slate-800 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none"
        />
        <button
          onClick={handleSubmit}
          disabled={isProcessing || !inputText.trim()}
          className="whitespace-nowrap rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 px-7 py-3.5 text-sm font-semibold text-white transition-all hover:shadow-lg hover:shadow-indigo-500/25 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isProcessing ? "Verarbeite\u2026" : "Erfassen"}
        </button>
      </div>

      {/* Fehlermeldung */}
      {error && (
        <div className="mt-3 rounded-lg bg-red-50 px-4 py-2.5 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* ──── Preview-Card ──── */}
      {aiResult && (
        <div className="mt-4 animate-in fade-in slide-in-from-bottom-2 rounded-xl border border-slate-200 bg-slate-50 p-5">
          <div className="mb-3 text-[12px] font-semibold uppercase tracking-wider text-slate-500">
            Claude Ergebnis &mdash; bitte pr&uuml;fen
          </div>

          <div className="grid grid-cols-2 gap-x-6 gap-y-3">
            {/* Projekt */}
            <div>
              <div className="mb-0.5 text-[11px] font-semibold uppercase text-slate-400">
                Projekt
              </div>
              <div className="text-sm font-semibold">
                {aiResult.projekt ?? (
                  <span className="text-amber-600">
                    &#9888; Nicht zugeordnet
                  </span>
                )}
              </div>
            </div>

            {/* Typ */}
            <div>
              <div className="mb-0.5 text-[11px] font-semibold uppercase text-slate-400">
                Typ
              </div>
              <div className="text-sm">
                {typeIcons[aiResult.typ] ?? ""} {aiResult.typ}
              </div>
            </div>

            {/* Titel */}
            <div className="col-span-2">
              <div className="mb-0.5 text-[11px] font-semibold uppercase text-slate-400">
                Titel
              </div>
              <div className="text-sm font-semibold">{aiResult.titel}</div>
            </div>

            {/* Beschreibung */}
            <div className="col-span-2">
              <div className="mb-0.5 text-[11px] font-semibold uppercase text-slate-400">
                Beschreibung
              </div>
              <div className="text-sm leading-relaxed text-slate-600">
                {aiResult.beschreibung}
              </div>
            </div>

            {/* Priorität */}
            <div>
              <div className="mb-0.5 text-[11px] font-semibold uppercase text-slate-400">
                Priorit&auml;t
              </div>
              <div className="flex items-center gap-1.5">
                <span
                  className={`inline-block h-2 w-2 rounded-full ${
                    priorityColors[aiResult.prioritaet] ?? "bg-gray-400"
                  }`}
                />
                <span className="text-sm">{aiResult.prioritaet}</span>
              </div>
            </div>

            {/* Meeting-Agenda */}
            <div>
              <div className="mb-0.5 text-[11px] font-semibold uppercase text-slate-400">
                Meeting-Agenda
              </div>
              <div className="text-sm">
                {aiResult.meeting_agenda ? "\u2713 Ja" : "Nein"}
              </div>
            </div>

            {/* Abteilungen */}
            <div className="col-span-2">
              <div className="mb-1 text-[11px] font-semibold uppercase text-slate-400">
                Abteilungen
              </div>
              <div className="flex flex-wrap gap-1">
                {aiResult.fachabteilung.map((dept) => (
                  <span
                    key={dept}
                    className={`inline-block rounded px-2 py-0.5 text-[11px] font-semibold ${
                      deptColors[dept] ?? "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {dept}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* ──── Aufgaben-Preview ──── */}
          {aiResult.aufgaben.length > 0 && (
            <div className="mt-4 border-t border-slate-200 pt-4">
              <div className="mb-2.5 text-[12px] font-semibold uppercase tracking-wider text-slate-500">
                Erkannte Aufgaben ({aiResult.aufgaben.length})
              </div>
              <div className="space-y-2">
                {aiResult.aufgaben.map((task, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-3 rounded-lg border border-slate-200 bg-white p-3"
                  >
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-indigo-100 text-[10px] font-bold text-indigo-600">
                      {idx + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="text-[13px] font-semibold text-slate-900">
                        {task.titel}
                      </div>
                      {task.beschreibung && (
                        <div className="mt-0.5 text-[12px] text-slate-500">
                          {task.beschreibung}
                        </div>
                      )}
                      <div className="mt-1.5 flex flex-wrap gap-3 text-[11px] text-slate-400">
                        {task.zustaendig && (
                          <span>
                            <span className="font-semibold text-slate-600">
                              {task.zustaendig}
                            </span>
                          </span>
                        )}
                        {task.faellig && (
                          <span>
                            Fällig:{" "}
                            <span className="font-semibold text-slate-600">
                              {new Date(task.faellig).toLocaleDateString("de-DE")}
                            </span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Aktions-Buttons */}
          <div className="mt-4 flex gap-2">
            <button
              onClick={handleConfirm}
              className="rounded-[10px] bg-emerald-500 px-6 py-2.5 text-[13px] font-semibold text-white transition-colors hover:bg-emerald-600"
            >
              &#10003; &Uuml;bernehmen
              {aiResult.aufgaben.length > 0 && (
                <span className="ml-1 text-emerald-200">
                  (+ {aiResult.aufgaben.length} Aufgabe{aiResult.aufgaben.length > 1 ? "n" : ""})
                </span>
              )}
            </button>
            <button
              onClick={handleDiscard}
              className="rounded-[10px] border border-slate-200 bg-white px-6 py-2.5 text-[13px] font-semibold text-slate-500 transition-colors hover:bg-slate-50"
            >
              Verwerfen
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
