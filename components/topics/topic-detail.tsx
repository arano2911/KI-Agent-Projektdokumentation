"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { TopicWithProject, TaskWithProject } from "@/lib/types/database";
import type {
  TopicType,
  TopicStatus,
  PriorityLevel,
  Department,
  SourceType,
  TaskStatus,
} from "@/lib/types/database";

// ──── Style Mappings ────

const statusStyles: Record<string, string> = {
  Offen: "bg-blue-50 text-blue-700 border-blue-200",
  "In Diskussion": "bg-amber-50 text-amber-700 border-amber-200",
  Entschieden: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Umgesetzt: "bg-slate-100 text-slate-500 border-slate-200",
  Verworfen: "bg-red-50 text-red-600 border-red-200",
};

const typeStyles: Record<string, { icon: string; bg: string }> = {
  Anforderung: { icon: "\u25C6", bg: "bg-indigo-50 text-indigo-600 border-indigo-200" },
  Entscheidung: { icon: "\u25B2", bg: "bg-emerald-50 text-emerald-600 border-emerald-200" },
  Diskussionspunkt: { icon: "\u25CF", bg: "bg-amber-50 text-amber-600 border-amber-200" },
  Information: { icon: "\u25A0", bg: "bg-sky-50 text-sky-600 border-sky-200" },
};

const priorityDots: Record<string, string> = {
  Hoch: "bg-red-500",
  Mittel: "bg-amber-500",
  Niedrig: "bg-slate-400",
};

const deptBadge: Record<string, string> = {
  Business: "bg-violet-500/10 text-violet-600",
  Marketing: "bg-pink-500/10 text-pink-600",
  HR: "bg-orange-500/10 text-orange-600",
  GF: "bg-sky-500/10 text-sky-600",
  IT: "bg-indigo-500/10 text-indigo-600",
};

const taskStatusDot: Record<string, string> = {
  Offen: "bg-blue-500",
  "In Arbeit": "bg-amber-500",
  Blockiert: "bg-red-500",
  Erledigt: "bg-emerald-500",
};

const sourceLabels: Record<string, string> = {
  "KI-Agent": "Misty",
  Meeting: "Meeting",
  Manuell: "Manuell",
  GitHub: "GitHub",
};

// ──── Enum-Optionen ────

const topicStatusOptions: TopicStatus[] = [
  "Offen",
  "In Diskussion",
  "Entschieden",
  "Umgesetzt",
  "Verworfen",
];

const topicTypeOptions: TopicType[] = [
  "Anforderung",
  "Entscheidung",
  "Diskussionspunkt",
  "Information",
];

const priorityOptions: PriorityLevel[] = ["Hoch", "Mittel", "Niedrig"];

const departmentOptions: Department[] = ["Business", "Marketing", "HR", "GF", "IT"];

// ──── Inline Edit Hook ────

function useInlineEdit<T>(
  initial: T,
  onSave: (value: T) => Promise<void>
) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(initial);
  const [saving, setSaving] = useState(false);

  const start = () => {
    setValue(initial);
    setEditing(true);
  };

  const cancel = () => {
    setValue(initial);
    setEditing(false);
  };

  const save = async () => {
    setSaving(true);
    await onSave(value);
    setSaving(false);
    setEditing(false);
  };

  return { editing, value, setValue, saving, start, cancel, save };
}

// ──── Component ────

interface Props {
  topic: TopicWithProject;
  tasks: TaskWithProject[];
  projects: { id: string; name: string }[];
}

export function TopicDetail({ topic: initialTopic, tasks: initialTasks, projects }: Props) {
  const router = useRouter();
  const [topic, setTopic] = useState(initialTopic);
  const [tasks, setTasks] = useState(initialTasks);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // ──── Update-Helper ────

  const updateField = useCallback(
    async (updates: Record<string, unknown>) => {
      // Optimistic
      setTopic((prev) => ({ ...prev, ...updates } as TopicWithProject));

      const supabase = createClient();
      const { error } = await supabase
        .from("topics")
        .update(updates as never)
        .eq("id", topic.id);

      if (error) {
        router.refresh();
      }
    },
    [topic.id, router]
  );

  // ──── Inline Edits ────

  const titleEdit = useInlineEdit(topic.title, async (v) => {
    if (v.trim()) await updateField({ title: v.trim() });
  });

  const descEdit = useInlineEdit(topic.description ?? "", async (v) => {
    await updateField({ description: v.trim() || null });
  });

  // ──── Task Status Toggle ────

  const toggleTaskDone = useCallback(
    async (taskId: string, currentStatus: TaskStatus) => {
      const newStatus: TaskStatus =
        currentStatus === "Erledigt" ? "Offen" : "Erledigt";

      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t))
      );

      const supabase = createClient();
      const { error } = await supabase
        .from("tasks")
        .update({ status: newStatus } as never)
        .eq("id", taskId);

      if (error) {
        setTasks((prev) =>
          prev.map((t) =>
            t.id === taskId ? { ...t, status: currentStatus } : t
          )
        );
      }
    },
    []
  );

  // ──── Delete ────

  const handleDelete = async () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    setDeleting(true);
    const supabase = createClient();
    await supabase.from("topics").delete().eq("id", topic.id);
    router.push("/topics");
    router.refresh();
  };

  // ──── Render ────

  return (
    <div>
      {/* Zurück-Link */}
      <Link
        href="/topics"
        className="mb-4 inline-flex items-center gap-1.5 text-[13px] font-medium text-slate-400 transition-colors hover:text-slate-600"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M10 12L6 8l4-4" />
        </svg>
        Alle Themen
      </Link>

      {/* ════════════════════════════════════════════════════
          a) Header-Bereich
         ════════════════════════════════════════════════════ */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        {/* Titel */}
        <div className="mb-4">
          {titleEdit.editing ? (
            <div className="flex items-center gap-2">
              <input
                autoFocus
                value={titleEdit.value}
                onChange={(e) => titleEdit.setValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") titleEdit.save();
                  if (e.key === "Escape") titleEdit.cancel();
                }}
                className="flex-1 rounded-lg border border-indigo-300 px-3 py-2 text-lg font-bold text-slate-900 focus:outline-none"
              />
              <button
                onClick={titleEdit.save}
                disabled={titleEdit.saving || !titleEdit.value.trim()}
                className="rounded-lg bg-indigo-500 px-4 py-2 text-[13px] font-semibold text-white hover:bg-indigo-600 disabled:opacity-50"
              >
                {titleEdit.saving ? "..." : "Speichern"}
              </button>
              <button
                onClick={titleEdit.cancel}
                className="rounded-lg border border-slate-200 px-4 py-2 text-[13px] font-semibold text-slate-500 hover:bg-slate-50"
              >
                Abbrechen
              </button>
            </div>
          ) : (
            <h1
              onClick={titleEdit.start}
              className="cursor-pointer rounded-lg px-1 py-0.5 text-xl font-bold text-slate-900 transition-colors hover:bg-slate-50"
              title="Klicken zum Bearbeiten"
            >
              {topic.title}
            </h1>
          )}
        </div>

        {/* Badges-Zeile */}
        <div className="mb-4 flex flex-wrap items-center gap-2">
          {/* Status */}
          <select
            value={topic.status}
            onChange={(e) => updateField({ status: e.target.value })}
            className={`rounded-md border px-2.5 py-1 text-[12px] font-semibold focus:outline-none ${
              statusStyles[topic.status] ?? "bg-slate-100 text-slate-600 border-slate-200"
            }`}
          >
            {topicStatusOptions.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>

          {/* Typ */}
          <select
            value={topic.type}
            onChange={(e) => updateField({ type: e.target.value })}
            className={`rounded-md border px-2.5 py-1 text-[12px] font-semibold focus:outline-none ${
              typeStyles[topic.type]?.bg ?? "bg-slate-100 text-slate-600 border-slate-200"
            }`}
          >
            {topicTypeOptions.map((t) => (
              <option key={t} value={t}>
                {typeStyles[t]?.icon ?? ""} {t}
              </option>
            ))}
          </select>

          {/* Priorität */}
          <select
            value={topic.priority}
            onChange={(e) => updateField({ priority: e.target.value })}
            className="rounded-md border border-slate-200 bg-white px-2.5 py-1 text-[12px] font-semibold text-slate-700 focus:outline-none"
          >
            {priorityOptions.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>

          {/* Meeting-Agenda Toggle */}
          <button
            onClick={() => updateField({ meeting_agenda: !topic.meeting_agenda })}
            className={`rounded-md border px-2.5 py-1 text-[12px] font-semibold transition-colors ${
              topic.meeting_agenda
                ? "border-indigo-200 bg-indigo-50 text-indigo-600"
                : "border-slate-200 text-slate-400 hover:text-slate-600"
            }`}
          >
            {topic.meeting_agenda ? "\u2713 Agenda" : "Agenda"}
          </button>
        </div>

        {/* Meta-Infos */}
        <div className="grid grid-cols-2 gap-4 text-[13px] sm:grid-cols-4">
          {/* Projekt */}
          <div>
            <div className="mb-1 text-[11px] font-semibold uppercase text-slate-400">
              Projekt
            </div>
            <select
              value={topic.project_id ?? ""}
              onChange={(e) =>
                updateField({ project_id: e.target.value || null })
              }
              className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-[13px] text-slate-700 focus:border-indigo-500 focus:outline-none"
            >
              <option value="">Kein Projekt</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Fachabteilungen */}
          <div>
            <div className="mb-1 text-[11px] font-semibold uppercase text-slate-400">
              Fachabteilung
            </div>
            <div className="flex flex-wrap gap-1">
              {departmentOptions.map((dept) => {
                const active = topic.departments?.includes(dept);
                return (
                  <button
                    key={dept}
                    onClick={() => {
                      const next = active
                        ? (topic.departments ?? []).filter((d) => d !== dept)
                        : [...(topic.departments ?? []), dept];
                      updateField({ departments: next });
                    }}
                    className={`rounded px-2 py-0.5 text-[11px] font-semibold transition-colors ${
                      active
                        ? deptBadge[dept] ?? "bg-slate-100 text-slate-600"
                        : "bg-slate-50 text-slate-300 hover:text-slate-500"
                    }`}
                  >
                    {dept}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Quelle */}
          <div>
            <div className="mb-1 text-[11px] font-semibold uppercase text-slate-400">
              Quelle
            </div>
            <span className="text-slate-600">
              {sourceLabels[topic.source] ?? topic.source}
            </span>
          </div>

          {/* Erstellt am */}
          <div>
            <div className="mb-1 text-[11px] font-semibold uppercase text-slate-400">
              Erstellt am
            </div>
            <span className="text-slate-600">
              {new Date(topic.created_at).toLocaleDateString("de-DE", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </div>
        </div>
      </div>

      {/* ════════════════════════════════════════════════════
          b) Beschreibung
         ════════════════════════════════════════════════════ */}
      <div className="mt-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
          Beschreibung
        </div>

        {descEdit.editing ? (
          <div>
            <textarea
              autoFocus
              value={descEdit.value}
              onChange={(e) => descEdit.setValue(e.target.value)}
              rows={5}
              className="w-full resize-none rounded-lg border border-indigo-300 px-3 py-2 text-[14px] leading-relaxed text-slate-700 focus:outline-none"
            />
            <div className="mt-2 flex gap-2">
              <button
                onClick={descEdit.save}
                disabled={descEdit.saving}
                className="rounded-lg bg-indigo-500 px-4 py-1.5 text-[13px] font-semibold text-white hover:bg-indigo-600 disabled:opacity-50"
              >
                {descEdit.saving ? "..." : "Speichern"}
              </button>
              <button
                onClick={descEdit.cancel}
                className="rounded-lg border border-slate-200 px-4 py-1.5 text-[13px] font-semibold text-slate-500 hover:bg-slate-50"
              >
                Abbrechen
              </button>
            </div>
          </div>
        ) : (
          <div
            onClick={descEdit.start}
            className="cursor-pointer rounded-lg px-1 py-1 text-[14px] leading-relaxed text-slate-600 transition-colors hover:bg-slate-50"
            title="Klicken zum Bearbeiten"
          >
            {topic.description || (
              <span className="italic text-slate-400">
                Keine Beschreibung. Klicken zum Hinzufügen.
              </span>
            )}
          </div>
        )}
      </div>

      {/* ════════════════════════════════════════════════════
          c) Zugeordnete Aufgaben
         ════════════════════════════════════════════════════ */}
      <div className="mt-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Zugeordnete Aufgaben ({tasks.length})
          </div>
          <Link
            href="/tasks"
            className="text-[12px] font-medium text-indigo-500 hover:text-indigo-600"
          >
            Zum Task-Board &rarr;
          </Link>
        </div>

        {tasks.length > 0 ? (
          <div className="space-y-2">
            {tasks.map((task) => {
              const isDone = task.status === "Erledigt";
              const isOverdue =
                task.due_date &&
                task.due_date < new Date().toISOString().split("T")[0] &&
                !isDone;

              return (
                <div
                  key={task.id}
                  className={`flex items-center gap-3 rounded-lg border p-3.5 transition-colors ${
                    isDone
                      ? "border-slate-100 bg-slate-50"
                      : isOverdue
                        ? "border-red-200 bg-red-50/50"
                        : "border-slate-200 bg-white"
                  }`}
                >
                  {/* Checkbox */}
                  <button
                    onClick={() => toggleTaskDone(task.id, task.status)}
                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 transition-colors ${
                      isDone
                        ? "border-emerald-500 bg-emerald-500 text-white"
                        : "border-slate-300 hover:border-indigo-400"
                    }`}
                  >
                    {isDone && (
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                        <path
                          d="M2.5 6L5 8.5L9.5 3.5"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    )}
                  </button>

                  {/* Task Info */}
                  <div className="min-w-0 flex-1">
                    <div
                      className={`text-[13px] font-semibold leading-snug ${
                        isDone
                          ? "text-slate-400 line-through"
                          : "text-slate-900"
                      }`}
                    >
                      {task.title}
                    </div>
                    {task.description && (
                      <p className="mt-0.5 text-[12px] text-slate-400 line-clamp-1">
                        {task.description}
                      </p>
                    )}
                  </div>

                  {/* Meta */}
                  <div className="flex shrink-0 items-center gap-3 text-[11px]">
                    {task.assignee && (
                      <span className="font-medium text-slate-600">
                        {task.assignee}
                      </span>
                    )}

                    <span className="flex items-center gap-1 text-slate-500">
                      <span
                        className={`inline-block h-1.5 w-1.5 rounded-full ${
                          taskStatusDot[task.status] ?? "bg-slate-400"
                        }`}
                      />
                      {task.status}
                    </span>

                    {task.due_date && (
                      <span
                        className={`font-medium ${
                          isOverdue ? "text-red-600" : "text-slate-400"
                        }`}
                      >
                        {new Date(task.due_date).toLocaleDateString("de-DE", {
                          day: "2-digit",
                          month: "2-digit",
                        })}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-slate-200 py-8 text-center">
            <p className="text-[13px] text-slate-400">
              Keine Aufgaben zugeordnet.
            </p>
          </div>
        )}
      </div>

      {/* ════════════════════════════════════════════════════
          d) Aktionen (Löschen)
         ════════════════════════════════════════════════════ */}
      <div className="mt-4 flex items-center justify-end gap-2">
        {confirmDelete && (
          <span className="mr-2 text-[13px] text-red-600">
            Thema und zugeordnete Aufgaben werden gelöscht.
          </span>
        )}
        <button
          onClick={() => {
            setConfirmDelete(false);
            router.push("/topics");
          }}
          className="rounded-lg border border-slate-200 px-5 py-2 text-[13px] font-semibold text-slate-500 transition-colors hover:bg-slate-50"
        >
          Zurück
        </button>
        <button
          onClick={handleDelete}
          disabled={deleting}
          className={`rounded-lg px-5 py-2 text-[13px] font-semibold transition-colors ${
            confirmDelete
              ? "bg-red-500 text-white hover:bg-red-600"
              : "text-red-500 hover:bg-red-50"
          } disabled:opacity-50`}
        >
          {deleting
            ? "Lösche..."
            : confirmDelete
              ? "Endgültig löschen"
              : "Thema löschen"}
        </button>
      </div>
    </div>
  );
}
