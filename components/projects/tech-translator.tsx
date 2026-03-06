"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

interface TranslationResult {
  titel: string;
  beschreibung: string;
  kategorie: string;
  relevanz: string;
  projektName: string;
  projectId: string;
}

const kategorieStyles: Record<string, { icon: string; style: string }> = {
  Feature: { icon: "\u2728", style: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  Verbesserung: { icon: "\u2B06\uFE0F", style: "bg-blue-50 text-blue-700 border-blue-200" },
  Fehlerbehebung: { icon: "\uD83D\uDEE0\uFE0F", style: "bg-amber-50 text-amber-700 border-amber-200" },
  Infrastruktur: { icon: "\u2699\uFE0F", style: "bg-slate-50 text-slate-600 border-slate-200" },
  Meilenstein: { icon: "\uD83C\uDFC6", style: "bg-violet-50 text-violet-700 border-violet-200" },
};

const relevanzDots: Record<string, string> = {
  hoch: "bg-red-500",
  mittel: "bg-amber-500",
  niedrig: "bg-slate-400",
};

export function TechTranslator({ projectId, projectName }: { projectId: string; projectName: string }) {
  const [inputText, setInputText] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<TranslationResult | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  const handleTranslate = async () => {
    if (!inputText.trim() || isProcessing) return;

    setIsProcessing(true);
    setResult(null);
    setError(null);

    try {
      const res = await fetch("/api/ai/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          technicalText: inputText.trim(),
          projectId,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Fehler bei der Übersetzung.");
        return;
      }

      setResult(data);
    } catch {
      setError("Netzwerkfehler. Bitte erneut versuchen.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirm = async () => {
    if (!result) return;

    const supabase = createClient();

    // Als Topic speichern (Typ: Information, Source: GitHub)
    const { data: topicData, error: topicError } = await supabase
      .from("topics")
      .insert({
        title: result.titel,
        description: result.beschreibung,
        project_id: projectId,
        type: "Information",
        status: "Offen",
        priority: result.relevanz === "hoch" ? "Hoch" : result.relevanz === "mittel" ? "Mittel" : "Niedrig",
        departments: [],
        meeting_agenda: false,
        source: "GitHub",
      } as never)
      .select("id")
      .single();

    if (topicError) {
      setError("Fehler beim Speichern: " + topicError.message);
      return;
    }

    // Activity Log
    const topicId = (topicData as any)?.id;
    if (topicId) {
      await supabase.from("activity_log").insert({
        entity_type: "topic",
        entity_id: topicId,
        action: "tech_update",
        details: {
          title: result.titel,
          kategorie: result.kategorie,
          relevanz: result.relevanz,
          project: projectName,
        },
        source: "GitHub",
      } as never);
    }

    setResult(null);
    setInputText("");
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);
  };

  const handleDiscard = () => {
    setResult(null);
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      {/* Toggle-Header */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between px-5 py-4 text-left transition-colors hover:bg-slate-50"
      >
        <div className="flex items-center gap-2">
          <span className="text-[16px]">{"\uD83D\uDD04"}</span>
          <span className="text-[14px] font-semibold text-slate-900">
            Technisches Update übersetzen
          </span>
          {showSuccess && (
            <span className="text-[13px] font-semibold text-emerald-500">
              &#10003; Gespeichert
            </span>
          )}
        </div>
        <span className={`text-slate-400 transition-transform ${isOpen ? "rotate-180" : ""}`}>
          &#9660;
        </span>
      </button>

      {/* Content */}
      {isOpen && (
        <div className="border-t border-slate-100 px-5 pb-5 pt-4">
          <p className="mb-3 text-[13px] text-slate-500">
            Commit-Messages, PR-Beschreibungen oder Changelogs einfügen — Claude übersetzt sie in ein fachlich verständliches Update.
          </p>

          <div className="flex gap-3">
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleTranslate();
                }
              }}
              placeholder={`z.B. "feat: add PDF export for quarterly reports\nfix: handle empty dataset in chart rendering"`}
              className="h-20 flex-1 resize-none rounded-lg border border-slate-200 px-3 py-2.5 text-[13px] font-mono leading-relaxed text-slate-700 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none"
            />
            <button
              onClick={handleTranslate}
              disabled={isProcessing || !inputText.trim()}
              className="self-end whitespace-nowrap rounded-lg bg-gradient-to-br from-indigo-500 to-violet-500 px-5 py-2.5 text-[13px] font-semibold text-white transition-all hover:shadow-lg hover:shadow-indigo-500/25 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isProcessing ? "Übersetze\u2026" : "Übersetzen"}
            </button>
          </div>

          {/* Fehler */}
          {error && (
            <div className="mt-3 rounded-lg bg-red-50 px-4 py-2.5 text-[13px] text-red-700">
              {error}
            </div>
          )}

          {/* Preview */}
          {result && (
            <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
              <div className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Übersetzung — bitte prüfen
              </div>

              <div className="mb-3 flex items-start justify-between gap-3">
                <h4 className="text-[15px] font-bold text-slate-900">
                  {result.titel}
                </h4>
                <div className="flex shrink-0 items-center gap-2">
                  {/* Kategorie */}
                  {kategorieStyles[result.kategorie] && (
                    <span
                      className={`rounded-md border px-2.5 py-1 text-[11px] font-semibold ${kategorieStyles[result.kategorie].style}`}
                    >
                      {kategorieStyles[result.kategorie].icon} {result.kategorie}
                    </span>
                  )}
                  {/* Relevanz */}
                  <span className="flex items-center gap-1 text-[11px] text-slate-500">
                    <span
                      className={`inline-block h-1.5 w-1.5 rounded-full ${
                        relevanzDots[result.relevanz] ?? "bg-slate-400"
                      }`}
                    />
                    {result.relevanz}
                  </span>
                </div>
              </div>

              <p className="text-[14px] leading-relaxed text-slate-600">
                {result.beschreibung}
              </p>

              <div className="mt-4 flex gap-2">
                <button
                  onClick={handleConfirm}
                  className="rounded-lg bg-emerald-500 px-5 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-emerald-600"
                >
                  &#10003; Als Update speichern
                </button>
                <button
                  onClick={handleDiscard}
                  className="rounded-lg border border-slate-200 bg-white px-5 py-2 text-[13px] font-semibold text-slate-500 transition-colors hover:bg-slate-50"
                >
                  Verwerfen
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
