"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { Database, TopicType, TopicStatus, PriorityLevel, Department } from "@/lib/types/database";
import type { MeetingProcessResult } from "./meeting-upload";

interface SavedTopic {
  id: string;
  title: string;
}

interface MeetingResultsProps {
  result: MeetingProcessResult;
  projects: { id: string; name: string }[];
  rawText: string;
  onSaved: () => void;
  onDiscard: () => void;
}

export function MeetingResults({
  result,
  projects,
  rawText,
  onSaved,
  onDiscard,
}: MeetingResultsProps) {
  // ──── Editierbare State ────
  const [meetingTitel, setMeetingTitel] = useState(result.meeting.titel);
  const [meetingDatum, setMeetingDatum] = useState(result.meeting.datum ?? "");
  const [meetingProjekt, setMeetingProjekt] = useState(result.meeting.projekt ?? "");
  const [meetingTeilnehmer, setMeetingTeilnehmer] = useState(
    result.meeting.teilnehmer.join(", ")
  );

  const [themen, setThemen] = useState(result.themen);
  const [aufgaben, setAufgaben] = useState(result.aufgaben);
  const [aufgabenIsMine, setAufgabenIsMine] = useState<boolean[]>(
    result.aufgaben.map((a) => !a.zustaendig)
  );
  const [entscheidungen, setEntscheidungen] = useState(result.entscheidungen);
  const [offenePunkte, setOffenePunkte] = useState(result.offene_punkte);

  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedTopics, setSavedTopics] = useState<SavedTopic[]>([]);

  // ──── Item-Bearbeitung ────

  const updateThema = (idx: number, titel: string) => {
    setThemen((prev) => prev.map((t, i) => (i === idx ? { ...t, titel } : t)));
  };
  const removeThema = (idx: number) => {
    setThemen((prev) => prev.filter((_, i) => i !== idx));
  };

  const updateAufgabe = (idx: number, titel: string) => {
    setAufgaben((prev) => prev.map((a, i) => (i === idx ? { ...a, titel } : a)));
  };
  const toggleAufgabeIsMine = (idx: number) => {
    setAufgabenIsMine((prev) => prev.map((v, i) => (i === idx ? !v : v)));
  };
  const removeAufgabe = (idx: number) => {
    setAufgaben((prev) => prev.filter((_, i) => i !== idx));
    setAufgabenIsMine((prev) => prev.filter((_, i) => i !== idx));
  };

  const updateEntscheidung = (idx: number, titel: string) => {
    setEntscheidungen((prev) => prev.map((e, i) => (i === idx ? { ...e, titel } : e)));
  };
  const removeEntscheidung = (idx: number) => {
    setEntscheidungen((prev) => prev.filter((_, i) => i !== idx));
  };

  const updateOffenerPunkt = (idx: number, titel: string) => {
    setOffenePunkte((prev) => prev.map((o, i) => (i === idx ? { ...o, titel } : o)));
  };
  const removeOffenerPunkt = (idx: number) => {
    setOffenePunkte((prev) => prev.filter((_, i) => i !== idx));
  };

  // ──── Übernehmen: In Supabase speichern ────

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);
    let savedTopicsList: SavedTopic[] = [];

    try {
      const supabase = createClient();

      // Projekt-ID ermitteln
      let projectId: string | null = null;
      if (meetingProjekt) {
        const project = projects.find((p) => p.name === meetingProjekt);
        if (project) {
          projectId = project.id;
        } else {
          // Fallback: Supabase-Abfrage
          const { data } = await supabase
            .from("projects")
            .select("id")
            .eq("name", meetingProjekt)
            .returns<{ id: string }[]>()
            .single();
          projectId = data?.id ?? null;
        }
      }

      const teilnehmerArray = meetingTeilnehmer
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);

      // 1. Meeting-Protokoll speichern
      const protocolPayload: Database["public"]["Tables"]["meeting_protocols"]["Insert"] = {
        title: meetingTitel,
        meeting_date: meetingDatum || null,
        project_id: projectId,
        participants: teilnehmerArray,
        raw_text: rawText,
        status: "Verarbeitet",
        summary: result.zusammenfassung,
      };

      const { data: protocolData, error: protocolError } = await supabase
        .from("meeting_protocols")
        .insert(protocolPayload as never)
        .select("id")
        .single();

      if (protocolError) {
        setError("Fehler beim Speichern des Protokolls: " + protocolError.message);
        return;
      }

      const protocolId = (protocolData as any)?.id ?? null;

      // 2. Themen speichern
      const topicPayloads = themen.map((t) => ({
        title: t.titel,
        description: t.beschreibung,
        project_id: projectId,
        type: t.typ as TopicType,
        status: "Offen" as TopicStatus,
        priority: t.prioritaet as PriorityLevel,
        departments: t.fachabteilung as Department[],
        meeting_agenda: t.meeting_agenda,
        source: "Meeting" as const,
      }));

      // 3. Entscheidungen als Topics (Typ: Entscheidung, Status: Entschieden)
      const entscheidungPayloads = entscheidungen.map((e) => ({
        title: e.titel,
        description: e.beschreibung,
        project_id: projectId,
        type: "Entscheidung" as TopicType,
        status: "Entschieden" as TopicStatus,
        priority: "Mittel" as PriorityLevel,
        departments: [] as Department[],
        meeting_agenda: false,
        source: "Meeting" as const,
      }));

      // 4. Offene Punkte als Topics (Typ: Diskussionspunkt, meeting_agenda: true)
      const offenePunktePayloads = offenePunkte.map((o) => ({
        title: o.titel,
        description: o.beschreibung,
        project_id: projectId,
        type: "Diskussionspunkt" as TopicType,
        status: "Offen" as TopicStatus,
        priority: "Mittel" as PriorityLevel,
        departments: [] as Department[],
        meeting_agenda: true,
        source: "Meeting" as const,
      }));

      const allTopicPayloads = [
        ...topicPayloads,
        ...entscheidungPayloads,
        ...offenePunktePayloads,
      ];

      if (allTopicPayloads.length > 0) {
        const { data: topicData, error: topicError } = await supabase
          .from("topics")
          .insert(allTopicPayloads as never[])
          .select("id, title");

        if (topicError) {
          setError("Protokoll gespeichert, aber Fehler bei Themen: " + topicError.message);
          return;
        }

        if (topicData) {
          savedTopicsList = topicData as unknown as SavedTopic[];
          setSavedTopics(savedTopicsList);
        }
      }

      // 5. Aufgaben speichern
      if (aufgaben.length > 0) {
        const taskPayloads = aufgaben.map((a, idx) => ({
          title: a.titel,
          description: a.beschreibung,
          project_id: projectId,
          topic_id: null,
          assignee: a.zustaendig,
          status: "Offen" as const,
          due_date: a.faellig,
          source: "Meeting" as const,
          is_mine: aufgabenIsMine[idx] ?? false,
        }));

        const { error: taskError } = await supabase
          .from("tasks")
          .insert(taskPayloads as never[]);

        if (taskError) {
          setError("Protokoll + Themen gespeichert, aber Fehler bei Aufgaben: " + taskError.message);
          return;
        }
      }

      // 6. Activity Log
      if (protocolId) {
        await supabase.from("activity_log").insert({
          entity_type: "meeting_protocol",
          entity_id: protocolId,
          action: "erstellt",
          details: {
            title: meetingTitel,
            project: meetingProjekt || null,
            themen_count: allTopicPayloads.length,
            aufgaben_count: aufgaben.length,
          },
          source: "Meeting",
        } as never);
      }

      // If topics were saved, show links before resetting; otherwise proceed
      if (savedTopicsList.length === 0) {
        onSaved();
      }
    } catch (err) {
      setError("Unerwarteter Fehler beim Speichern.");
      console.error("Save error:", err);
    } finally {
      setIsSaving(false);
    }
  };

  // ──── Render ────

  const totalItems =
    themen.length + aufgaben.length + entscheidungen.length + offenePunkte.length;

  return (
    <div className="animate-in fade-in slide-in-from-bottom-2">
      <div className="mb-3 text-[12px] font-semibold uppercase tracking-wider text-slate-500">
        Misty Ergebnis &mdash; bitte pr&uuml;fen und bearbeiten
      </div>

      {/* Zusammenfassung */}
      <div className="mb-4 rounded-lg bg-indigo-50 p-4">
        <div className="mb-1 text-[11px] font-semibold uppercase text-indigo-400">
          Zusammenfassung
        </div>
        <div className="text-sm leading-relaxed text-indigo-900">
          {result.zusammenfassung}
        </div>
      </div>

      {/* Meeting-Metadaten */}
      <div className="mb-4 grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-[11px] font-semibold uppercase text-slate-400">
            Meeting-Titel
          </label>
          <input
            value={meetingTitel}
            onChange={(e) => setMeetingTitel(e.target.value)}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-1 block text-[11px] font-semibold uppercase text-slate-400">
            Datum
          </label>
          <input
            type="date"
            value={meetingDatum}
            onChange={(e) => setMeetingDatum(e.target.value)}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-1 block text-[11px] font-semibold uppercase text-slate-400">
            Projekt
          </label>
          <select
            value={meetingProjekt}
            onChange={(e) => setMeetingProjekt(e.target.value)}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
          >
            <option value="">Kein Projekt</option>
            {projects.map((p) => (
              <option key={p.id} value={p.name}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-[11px] font-semibold uppercase text-slate-400">
            Teilnehmer
          </label>
          <input
            value={meetingTeilnehmer}
            onChange={(e) => setMeetingTeilnehmer(e.target.value)}
            placeholder="Kommagetrennt"
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
          />
        </div>
      </div>

      {/* ──── Themen ──── */}
      {themen.length > 0 && (
        <Section title="Themen" count={themen.length} color="indigo">
          {themen.map((t, idx) => (
            <ItemRow
              key={idx}
              value={t.titel}
              onChange={(v) => updateThema(idx, v)}
              onRemove={() => removeThema(idx)}
              badge={t.typ}
              sub={t.beschreibung}
            />
          ))}
        </Section>
      )}

      {/* ──── Aufgaben ──── */}
      {aufgaben.length > 0 && (
        <Section title="Aufgaben" count={aufgaben.length} color="violet">
          {aufgaben.map((a, idx) => (
            <ItemRow
              key={idx}
              value={a.titel}
              onChange={(v) => updateAufgabe(idx, v)}
              onRemove={() => removeAufgabe(idx)}
              sub={
                [a.zustaendig, a.faellig ? `bis ${a.faellig}` : null]
                  .filter(Boolean)
                  .join(" — ") || undefined
              }
              isMine={aufgabenIsMine[idx]}
              onToggleIsMine={() => toggleAufgabeIsMine(idx)}
            />
          ))}
        </Section>
      )}

      {/* ──── Entscheidungen ──── */}
      {entscheidungen.length > 0 && (
        <Section title="Entscheidungen" count={entscheidungen.length} color="emerald">
          {entscheidungen.map((e, idx) => (
            <ItemRow
              key={idx}
              value={e.titel}
              onChange={(v) => updateEntscheidung(idx, v)}
              onRemove={() => removeEntscheidung(idx)}
              sub={e.beschreibung}
            />
          ))}
        </Section>
      )}

      {/* ──── Offene Punkte ──── */}
      {offenePunkte.length > 0 && (
        <Section title="Offene Punkte" count={offenePunkte.length} color="amber">
          {offenePunkte.map((o, idx) => (
            <ItemRow
              key={idx}
              value={o.titel}
              onChange={(v) => updateOffenerPunkt(idx, v)}
              onRemove={() => removeOffenerPunkt(idx)}
              sub={o.beschreibung}
            />
          ))}
        </Section>
      )}

      {/* Fehler */}
      {error && (
        <div className="mt-3 rounded-lg bg-red-50 px-4 py-2.5 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Gespeicherte Themen — Links zur Detailseite */}
      {savedTopics.length > 0 && (
        <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
          <div className="mb-2 text-[12px] font-semibold uppercase tracking-wider text-emerald-600">
            Erfolgreich gespeichert — erstellte Themen
          </div>
          <div className="space-y-1.5">
            {savedTopics.map((t) => (
              <Link
                key={t.id}
                href={`/topics/${t.id}`}
                className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-white px-3 py-2 text-[13px] font-medium text-indigo-600 transition-colors hover:bg-indigo-50"
              >
                <span className="text-emerald-500">&#10003;</span>
                {t.title}
                <span className="ml-auto text-[11px] text-slate-400">&rarr; Details</span>
              </Link>
            ))}
          </div>
          <button
            onClick={onSaved}
            className="mt-3 rounded-lg bg-emerald-500 px-5 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-emerald-600"
          >
            Fertig
          </button>
        </div>
      )}

      {/* Aktions-Buttons */}
      {savedTopics.length === 0 && (
        <div className="mt-4 flex gap-2">
          <button
            onClick={handleSave}
            disabled={isSaving || totalItems === 0}
            className="rounded-[10px] bg-emerald-500 px-6 py-2.5 text-[13px] font-semibold text-white transition-colors hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSaving ? "Speichere..." : `\u2713 \u00DCbernehmen (${totalItems} Eintr\u00E4ge)`}
          </button>
          <button
            onClick={onDiscard}
            className="rounded-[10px] border border-slate-200 bg-white px-6 py-2.5 text-[13px] font-semibold text-slate-500 transition-colors hover:bg-slate-50"
          >
            Verwerfen
          </button>
        </div>
      )}
    </div>
  );
}

// ──── Hilfskomponenten ────

function Section({
  title,
  count,
  color,
  children,
}: {
  title: string;
  count: number;
  color: string;
  children: React.ReactNode;
}) {
  const colorMap: Record<string, string> = {
    indigo: "border-indigo-200 bg-indigo-50/50",
    violet: "border-violet-200 bg-violet-50/50",
    emerald: "border-emerald-200 bg-emerald-50/50",
    amber: "border-amber-200 bg-amber-50/50",
  };

  const titleColorMap: Record<string, string> = {
    indigo: "text-indigo-600",
    violet: "text-violet-600",
    emerald: "text-emerald-600",
    amber: "text-amber-600",
  };

  return (
    <div className={`mb-3 rounded-xl border p-4 ${colorMap[color] ?? ""}`}>
      <div className={`mb-2.5 text-[12px] font-semibold uppercase tracking-wider ${titleColorMap[color] ?? "text-slate-500"}`}>
        {title} ({count})
      </div>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function ItemRow({
  value,
  onChange,
  onRemove,
  badge,
  sub,
  isMine,
  onToggleIsMine,
}: {
  value: string;
  onChange: (v: string) => void;
  onRemove: () => void;
  badge?: string;
  sub?: string;
  isMine?: boolean;
  onToggleIsMine?: () => void;
}) {
  return (
    <div className="flex items-start gap-2 rounded-lg border border-slate-200 bg-white p-3">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <input
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="flex-1 border-none bg-transparent text-[13px] font-semibold text-slate-900 focus:outline-none"
          />
          {badge && (
            <span className="shrink-0 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-500">
              {badge}
            </span>
          )}
        </div>
        {sub && (
          <div className="mt-0.5 text-[12px] text-slate-500">{sub}</div>
        )}
        {onToggleIsMine !== undefined && (
          <label className="mt-1.5 flex cursor-pointer items-center gap-1.5">
            <input
              type="checkbox"
              checked={isMine ?? false}
              onChange={onToggleIsMine}
              className="h-3.5 w-3.5 rounded border-slate-300 text-indigo-500 focus:ring-indigo-500"
            />
            <span className="text-[11px] font-medium text-slate-500">
              Meine Aufgabe
            </span>
          </label>
        )}
      </div>
      <button
        onClick={onRemove}
        className="shrink-0 rounded p-1 text-slate-300 transition-colors hover:bg-red-50 hover:text-red-500"
        title="Entfernen"
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path
            d="M3.5 3.5L10.5 10.5M10.5 3.5L3.5 10.5"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      </button>
    </div>
  );
}
