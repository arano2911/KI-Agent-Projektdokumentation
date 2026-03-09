"use client";

import { useState, useRef } from "react";
import { MeetingResults } from "./meeting-results";

interface MeetingUploadProps {
  projects: { id: string; name: string }[];
}

export interface MeetingProcessResult {
  meeting: {
    titel: string;
    datum: string | null;
    teilnehmer: string[];
    projekt: string | null;
  };
  zusammenfassung: string;
  themen: {
    titel: string;
    beschreibung: string;
    typ: string;
    prioritaet: string;
    fachabteilung: string[];
    meeting_agenda: boolean;
  }[];
  aufgaben: {
    titel: string;
    beschreibung: string | null;
    zustaendig: string | null;
    faellig: string | null;
  }[];
  entscheidungen: {
    titel: string;
    beschreibung: string;
  }[];
  offene_punkte: {
    titel: string;
    beschreibung: string;
  }[];
}

export function MeetingUpload({ projects }: MeetingUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [extractedText, setExtractedText] = useState("");
  const [freitext, setFreitext] = useState("");
  const [isExtracting, setIsExtracting] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<MeetingProcessResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ──── Datei-Upload ────

  const handleFileSelect = async (selectedFile: File) => {
    const name = selectedFile.name.toLowerCase();
    if (!name.endsWith(".docx") && !name.endsWith(".pdf")) {
      setError("Nur DOCX- und PDF-Dateien werden unterstützt.");
      return;
    }

    setFile(selectedFile);
    setError(null);
    setIsExtracting(true);

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);

      const res = await fetch("/api/meetings/extract", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Fehler beim Lesen der Datei.");
        setFile(null);
        return;
      }

      setExtractedText(data.text);
    } catch {
      setError("Netzwerkfehler beim Datei-Upload.");
      setFile(null);
    } finally {
      setIsExtracting(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) handleFileSelect(droppedFile);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) handleFileSelect(selectedFile);
  };

  // ──── Protokoll verarbeiten ────

  const handleProcess = async () => {
    const combinedText = [extractedText, freitext].filter(Boolean).join("\n\n---\n\n");
    if (!combinedText.trim() || isProcessing) return;

    setIsProcessing(true);
    setResult(null);
    setError(null);

    try {
      const res = await fetch("/api/meetings/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: combinedText }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Fehler bei der Verarbeitung.");
        return;
      }

      setResult(data);
    } catch {
      setError("Netzwerkfehler. Bitte erneut versuchen.");
    } finally {
      setIsProcessing(false);
    }
  };

  // ──── Reset nach Übernahme ────

  const handleSaved = () => {
    setResult(null);
    setFile(null);
    setExtractedText("");
    setFreitext("");
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);
  };

  const handleDiscard = () => {
    setResult(null);
  };

  const hasInput = extractedText.trim() || freitext.trim();

  // ──── Render ────

  return (
    <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      {/* Header */}
      <div className="mb-4 flex items-center gap-2">
        <span
          className={`inline-block h-2 w-2 rounded-full ${
            isProcessing || isExtracting
              ? "animate-pulse bg-amber-500"
              : "bg-emerald-500"
          }`}
        />
        <span className="text-[13px] font-semibold uppercase tracking-wide text-slate-500">
          Misty — Protokoll-Analyse
        </span>
        {showSuccess && (
          <span className="ml-auto text-[13px] font-semibold text-emerald-500">
            &#10003; Erfolgreich gespeichert
          </span>
        )}
      </div>

      {/* Ergebnis-Preview */}
      {result ? (
        <MeetingResults
          result={result}
          projects={projects}
          rawText={[extractedText, freitext].filter(Boolean).join("\n\n")}
          onSaved={handleSaved}
          onDiscard={handleDiscard}
        />
      ) : (
        <>
          {/* Drag & Drop Zone */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragOver(true);
            }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`mb-4 cursor-pointer rounded-xl border-2 border-dashed p-6 text-center transition-colors ${
              isDragOver
                ? "border-indigo-400 bg-indigo-50"
                : file
                  ? "border-emerald-300 bg-emerald-50"
                  : "border-slate-200 bg-slate-50 hover:border-slate-300"
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".docx,.pdf"
              onChange={handleFileInput}
              className="hidden"
            />
            {isExtracting ? (
              <div className="text-sm text-amber-600">
                Datei wird gelesen...
              </div>
            ) : file ? (
              <div>
                <div className="text-sm font-semibold text-emerald-700">
                  {file.name}
                </div>
                <div className="mt-1 text-[12px] text-emerald-600">
                  {extractedText.length.toLocaleString("de-DE")} Zeichen
                  extrahiert
                </div>
              </div>
            ) : (
              <div>
                <div className="text-sm font-semibold text-slate-500">
                  DOCX oder PDF hierher ziehen
                </div>
                <div className="mt-1 text-[12px] text-slate-400">
                  oder klicken zum Auswählen
                </div>
              </div>
            )}
          </div>

          {/* Extrahierter Text Vorschau */}
          {extractedText && (
            <div className="mb-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Extrahierter Text
              </div>
              <div className="max-h-40 overflow-y-auto text-[13px] leading-relaxed text-slate-600 whitespace-pre-wrap">
                {extractedText.slice(0, 2000)}
                {extractedText.length > 2000 && (
                  <span className="text-slate-400">
                    {" "}
                    ... ({extractedText.length.toLocaleString("de-DE")} Zeichen
                    gesamt)
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Freitext-Eingabe */}
          <div className="mb-4">
            <textarea
              value={freitext}
              onChange={(e) => setFreitext(e.target.value)}
              placeholder="Optional: Zusätzliche Notizen oder Protokoll-Text direkt eingeben..."
              className="h-24 w-full resize-none rounded-xl border border-slate-200 px-4 py-3 text-sm leading-relaxed text-slate-800 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none"
            />
          </div>

          {/* Verarbeiten-Button */}
          <button
            onClick={handleProcess}
            disabled={!hasInput || isProcessing}
            className="rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 px-7 py-3 text-sm font-semibold text-white transition-all hover:shadow-lg hover:shadow-indigo-500/25 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isProcessing ? "Misty analysiert..." : "Protokoll verarbeiten"}
          </button>
        </>
      )}

      {/* Fehlermeldung */}
      {error && (
        <div className="mt-3 rounded-lg bg-red-50 px-4 py-2.5 text-sm text-red-700">
          {error}
        </div>
      )}
    </div>
  );
}
