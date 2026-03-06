"use client";

import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { TaskWithRelations } from "@/app/tasks/page";
import type { TaskStatus, RecurrenceType } from "@/lib/types/database";

// ──── Spalten-Konfiguration ────

const columns: { status: TaskStatus; label: string; accent: string; dot: string }[] = [
  { status: "Offen", label: "Offen", accent: "border-t-blue-500", dot: "bg-blue-500" },
  { status: "In Arbeit", label: "In Arbeit", accent: "border-t-amber-500", dot: "bg-amber-500" },
  { status: "Blockiert", label: "Blockiert", accent: "border-t-red-500", dot: "bg-red-500" },
  { status: "Erledigt", label: "Erledigt", accent: "border-t-emerald-500", dot: "bg-emerald-500" },
];

const allStatuses: TaskStatus[] = ["Offen", "In Arbeit", "Blockiert", "Erledigt"];
const allRecurrences: { value: RecurrenceType | ""; label: string }[] = [
  { value: "", label: "Keine" },
  { value: "daily", label: "Täglich" },
  { value: "weekly", label: "Wöchentlich" },
  { value: "monthly", label: "Monatlich" },
];

const sourceBadge: Record<string, { icon: string; style: string }> = {
  "KI-Agent": { icon: "\u2728", style: "text-violet-600 bg-violet-50" },
  Meeting: { icon: "\uD83D\uDCC5", style: "text-blue-600 bg-blue-50" },
  Manuell: { icon: "\u270F\uFE0F", style: "text-slate-500 bg-slate-50" },
  GitHub: { icon: "\uD83D\uDD17", style: "text-slate-700 bg-slate-50" },
};

const recurrenceLabels: Record<string, string> = {
  daily: "Täglich",
  weekly: "Wöchentlich",
  monthly: "Monatlich",
};

function RepeatIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className ?? "h-3 w-3"}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M11.5 1.5l2 2-2 2" />
      <path d="M2.5 8V6.5a2 2 0 012-2h9.5" />
      <path d="M4.5 14.5l-2-2 2-2" />
      <path d="M13.5 8v1.5a2 2 0 01-2 2H2" />
    </svg>
  );
}

function PencilIcon({ className }: { className?: string }) {
  return (
    <svg className={className ?? "h-3.5 w-3.5"} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11.5 1.5l3 3L5 14H2v-3z" />
      <path d="M9.5 3.5l3 3" />
    </svg>
  );
}

// ──── Edit Modal ────

interface EditForm {
  title: string;
  description: string;
  status: TaskStatus;
  due_date: string;
  assignee: string;
  is_mine: boolean;
  recurrence: RecurrenceType | "";
}

function TaskEditModal({
  task,
  onSave,
  onDelete,
  onClose,
}: {
  task: TaskWithRelations;
  onSave: (id: string, updates: Partial<EditForm>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onClose: () => void;
}) {
  const [form, setForm] = useState<EditForm>({
    title: task.title,
    description: task.description ?? "",
    status: task.status,
    due_date: task.due_date ?? "",
    assignee: task.assignee ?? "",
    is_mine: task.is_mine,
    recurrence: task.recurrence ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    titleRef.current?.focus();
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [onClose]);

  const handleSave = async () => {
    if (!form.title.trim() || saving) return;
    setSaving(true);
    await onSave(task.id, {
      title: form.title.trim(),
      description: form.description.trim() || "",
      status: form.status,
      due_date: form.due_date || "",
      assignee: form.assignee.trim() || "",
      is_mine: form.is_mine,
      recurrence: form.recurrence || "",
    });
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    setSaving(true);
    await onDelete(task.id);
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div
        className="mx-4 w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-5 flex items-center justify-between">
          <h3 className="text-[15px] font-bold text-slate-900">Aufgabe bearbeiten</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-lg leading-none">&times;</button>
        </div>

        <div className="space-y-4">
          {/* Titel */}
          <div>
            <label className="mb-1 block text-[11px] font-semibold uppercase text-slate-400">Titel</label>
            <input
              ref={titleRef}
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              className="h-9 w-full rounded-lg border border-slate-200 px-3 text-[13px] text-slate-800 focus:border-indigo-500 focus:outline-none"
            />
          </div>

          {/* Beschreibung */}
          <div>
            <label className="mb-1 block text-[11px] font-semibold uppercase text-slate-400">Beschreibung</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              rows={3}
              className="w-full resize-none rounded-lg border border-slate-200 px-3 py-2 text-[13px] text-slate-800 focus:border-indigo-500 focus:outline-none"
            />
          </div>

          {/* Status + Due Date */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-[11px] font-semibold uppercase text-slate-400">Status</label>
              <select
                value={form.status}
                onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as TaskStatus }))}
                className="h-9 w-full rounded-lg border border-slate-200 px-3 text-[13px] text-slate-700 focus:border-indigo-500 focus:outline-none"
              >
                {allStatuses.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-semibold uppercase text-slate-400">Fällig</label>
              <input
                type="date"
                value={form.due_date}
                onChange={(e) => setForm((f) => ({ ...f, due_date: e.target.value }))}
                className="h-9 w-full rounded-lg border border-slate-200 px-3 text-[13px] text-slate-700 focus:border-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Zuständig + Meine Aufgabe */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-[11px] font-semibold uppercase text-slate-400">Zuständig</label>
              <input
                value={form.assignee}
                onChange={(e) => setForm((f) => ({ ...f, assignee: e.target.value }))}
                className="h-9 w-full rounded-lg border border-slate-200 px-3 text-[13px] text-slate-800 focus:border-indigo-500 focus:outline-none"
                placeholder="Person/Team"
              />
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-semibold uppercase text-slate-400">Wiederholung</label>
              <select
                value={form.recurrence}
                onChange={(e) => setForm((f) => ({ ...f, recurrence: e.target.value as RecurrenceType | "" }))}
                className="h-9 w-full rounded-lg border border-slate-200 px-3 text-[13px] text-slate-700 focus:border-indigo-500 focus:outline-none"
              >
                {allRecurrences.map((r) => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Meine Aufgabe Toggle */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.is_mine}
              onChange={(e) => setForm((f) => ({ ...f, is_mine: e.target.checked }))}
              className="h-4 w-4 rounded border-slate-300 text-indigo-500 focus:ring-indigo-500"
            />
            <span className="text-[13px] text-slate-700">Meine Aufgabe</span>
          </label>
        </div>

        {/* Actions */}
        <div className="mt-6 flex items-center gap-2">
          <button
            onClick={handleSave}
            disabled={saving || !form.title.trim()}
            className="rounded-lg bg-indigo-500 px-5 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-indigo-600 disabled:opacity-50"
          >
            {saving ? "Speichern…" : "Speichern"}
          </button>
          <button
            onClick={onClose}
            className="rounded-lg border border-slate-200 px-5 py-2 text-[13px] font-semibold text-slate-500 transition-colors hover:bg-slate-50"
          >
            Abbrechen
          </button>
          <button
            onClick={handleDelete}
            disabled={saving}
            className={`ml-auto rounded-lg px-4 py-2 text-[13px] font-semibold transition-colors ${
              confirmDelete
                ? "bg-red-500 text-white hover:bg-red-600"
                : "text-red-500 hover:bg-red-50"
            }`}
          >
            {confirmDelete ? "Wirklich löschen?" : "Löschen"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ──── Main Component ────

interface Props {
  tasks: TaskWithRelations[];
  projects: { id: string; name: string }[];
}

export function TaskBoard({ tasks: initialTasks, projects }: Props) {
  const [tasks, setTasks] = useState(initialTasks);
  const [filterProject, setFilterProject] = useState<string>("all");
  const [filterAssignee, setFilterAssignee] = useState<string>("all");
  const [filterMineOnly, setFilterMineOnly] = useState(true);
  const [viewMode, setViewMode] = useState<"board" | "list">("board");

  // Drag & Drop State
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<TaskStatus | null>(null);

  // Edit Modal State
  const [editingTask, setEditingTask] = useState<TaskWithRelations | null>(null);

  const router = useRouter();

  // Eindeutige Assignees für Filter
  const assignees = useMemo(() => {
    const set = new Set(tasks.map((t) => t.assignee).filter(Boolean) as string[]);
    return Array.from(set).sort();
  }, [tasks]);

  const filtered = useMemo(() => {
    return tasks.filter((t) => {
      if (filterProject !== "all" && t.projects?.name !== filterProject) return false;
      if (filterAssignee !== "all" && t.assignee !== filterAssignee) return false;
      if (filterMineOnly && !t.is_mine) return false;
      return true;
    });
  }, [tasks, filterProject, filterAssignee, filterMineOnly]);

  const tasksByStatus = useMemo(() => {
    const map: Record<string, TaskWithRelations[]> = {};
    for (const col of columns) map[col.status] = [];
    for (const t of filtered) {
      if (map[t.status]) map[t.status].push(t);
    }
    const todayStr = new Date().toISOString().split("T")[0];
    for (const col of columns) {
      map[col.status].sort((a, b) => {
        const aOverdue = a.due_date && a.due_date < todayStr ? 1 : 0;
        const bOverdue = b.due_date && b.due_date < todayStr ? 1 : 0;
        if (aOverdue !== bOverdue) return bOverdue - aOverdue;
        if (a.due_date && b.due_date) return a.due_date.localeCompare(b.due_date);
        if (a.due_date) return -1;
        if (b.due_date) return 1;
        return 0;
      });
    }
    return map;
  }, [filtered]);

  const formatDate = (d: string | null) => {
    if (!d) return null;
    const date = new Date(d);
    const now = new Date();
    const diffDays = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    const formatted = date.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" });
    if (diffDays < 0) return { text: formatted, style: "text-red-600 font-semibold" };
    if (diffDays <= 3) return { text: formatted, style: "text-amber-600 font-semibold" };
    return { text: formatted, style: "text-slate-400" };
  };

  // ──── Edit Handlers ────

  const handleEditSave = useCallback(async (id: string, updates: Partial<EditForm>) => {
    const payload: Record<string, unknown> = {};
    if (updates.title !== undefined) payload.title = updates.title;
    if (updates.description !== undefined) payload.description = updates.description || null;
    if (updates.status !== undefined) payload.status = updates.status;
    if (updates.due_date !== undefined) payload.due_date = updates.due_date || null;
    if (updates.assignee !== undefined) payload.assignee = updates.assignee || null;
    if (updates.is_mine !== undefined) payload.is_mine = updates.is_mine;
    if (updates.recurrence !== undefined) payload.recurrence = updates.recurrence || null;

    // Optimistic update
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, ...payload } as TaskWithRelations : t))
    );
    setEditingTask(null);

    const supabase = createClient();
    const { error } = await supabase
      .from("tasks")
      .update(payload as never)
      .eq("id", id);

    if (error) {
      // Rollback — reload from server
      router.refresh();
    }
  }, [router]);

  const handleEditDelete = useCallback(async (id: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
    setEditingTask(null);

    const supabase = createClient();
    const { error } = await supabase.from("tasks").delete().eq("id", id);

    if (error) {
      router.refresh();
    }
  }, [router]);

  // ──── Drag & Drop Handlers ────

  const handleDragStart = useCallback((e: React.DragEvent, taskId: string) => {
    setDraggedTaskId(taskId);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", taskId);
    if (e.currentTarget instanceof HTMLElement) {
      requestAnimationFrame(() => {
        (e.currentTarget as HTMLElement).style.opacity = "0.4";
      });
    }
  }, []);

  const handleDragEnd = useCallback((e: React.DragEvent) => {
    setDraggedTaskId(null);
    setDragOverColumn(null);
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = "1";
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, status: TaskStatus) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverColumn(status);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOverColumn(null);
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent, targetStatus: TaskStatus) => {
    e.preventDefault();
    setDragOverColumn(null);

    const taskId = e.dataTransfer.getData("text/plain");
    if (!taskId) return;

    const task = tasks.find((t) => t.id === taskId);
    if (!task || task.status === targetStatus) {
      setDraggedTaskId(null);
      return;
    }

    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status: targetStatus } : t))
    );
    setDraggedTaskId(null);

    const supabase = createClient();
    const { error } = await supabase
      .from("tasks")
      .update({ status: targetStatus } as never)
      .eq("id", taskId);

    if (error) {
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, status: task.status } : t))
      );
    }
  }, [tasks]);

  return (
    <>
      {/* Edit Modal */}
      {editingTask && (
        <TaskEditModal
          task={editingTask}
          onSave={handleEditSave}
          onDelete={handleEditDelete}
          onClose={() => setEditingTask(null)}
        />
      )}

      {/* ──── Filter-Bar ──── */}
      <div className="mb-5 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={filterProject}
            onChange={(e) => setFilterProject(e.target.value)}
            className="h-9 rounded-lg border border-slate-200 px-3 text-[13px] text-slate-700 focus:border-indigo-500 focus:outline-none"
          >
            <option value="all">Alle Projekte</option>
            {projects.map((p) => (
              <option key={p.id} value={p.name}>{p.name}</option>
            ))}
          </select>

          <select
            value={filterAssignee}
            onChange={(e) => setFilterAssignee(e.target.value)}
            className="h-9 rounded-lg border border-slate-200 px-3 text-[13px] text-slate-700 focus:border-indigo-500 focus:outline-none"
          >
            <option value="all">Alle Zuständigen</option>
            {assignees.map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>

          <button
            onClick={() => setFilterMineOnly((v) => !v)}
            className={`h-9 rounded-lg border px-3 text-[13px] font-semibold transition-colors ${
              filterMineOnly
                ? "border-indigo-300 bg-indigo-50 text-indigo-600"
                : "border-slate-200 text-slate-500 hover:text-slate-700"
            }`}
          >
            {filterMineOnly ? "\u2713 Nur meine" : "Alle Aufgaben"}
          </button>

          <div className="ml-auto flex rounded-lg border border-slate-200">
            <button
              onClick={() => setViewMode("board")}
              className={`px-3 py-1.5 text-[12px] font-semibold transition-colors ${
                viewMode === "board" ? "bg-indigo-500 text-white" : "text-slate-500 hover:text-slate-700"
              } rounded-l-lg`}
            >
              Board
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`px-3 py-1.5 text-[12px] font-semibold transition-colors ${
                viewMode === "list" ? "bg-indigo-500 text-white" : "text-slate-500 hover:text-slate-700"
              } rounded-r-lg`}
            >
              Liste
            </button>
          </div>
        </div>
      </div>

      {/* ──── Board View ──── */}
      {viewMode === "board" && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          {columns.map((col) => (
            <div
              key={col.status}
              onDragOver={(e) => handleDragOver(e, col.status)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, col.status)}
              className={`rounded-xl border border-t-[3px] border-slate-200 bg-slate-50/50 transition-colors ${col.accent} ${
                dragOverColumn === col.status ? "bg-indigo-50/70 border-indigo-300 ring-2 ring-indigo-200" : ""
              }`}
            >
              <div className="flex items-center gap-2 px-4 py-3">
                <span className={`inline-block h-2 w-2 rounded-full ${col.dot}`} />
                <span className="text-[13px] font-semibold text-slate-700">{col.label}</span>
                <span className="ml-auto rounded-full bg-slate-200 px-2 py-0.5 text-[11px] font-bold text-slate-600">
                  {tasksByStatus[col.status]?.length ?? 0}
                </span>
              </div>

              <div className="space-y-2 px-3 pb-3 min-h-[60px]">
                {(tasksByStatus[col.status] ?? []).map((task) => {
                  const due = formatDate(task.due_date);
                  const muted = !filterMineOnly && !task.is_mine;
                  const isOverdue = due && task.due_date && task.due_date < new Date().toISOString().split("T")[0] && task.status !== "Erledigt";
                  const isDragging = draggedTaskId === task.id;
                  return (
                    <div
                      key={task.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, task.id)}
                      onDragEnd={handleDragEnd}
                      className={`group cursor-grab rounded-lg border p-3.5 shadow-sm transition-all hover:shadow-md active:cursor-grabbing ${
                        isDragging
                          ? "opacity-40"
                          : isOverdue
                            ? "border-red-300 bg-red-50/50 border-l-[3px] border-l-red-500"
                            : muted
                              ? "border-slate-200 bg-slate-50 opacity-50"
                              : "border-slate-200 bg-white"
                      }`}
                    >
                      <div className="flex items-start gap-1.5">
                        <h4 className="flex-1 text-[13px] font-semibold leading-snug text-slate-900">
                          {task.title}
                        </h4>
                        {task.recurrence && (
                          <span className="mt-0.5 flex shrink-0 items-center gap-0.5 rounded bg-indigo-50 px-1 py-0.5 text-[10px] font-medium text-indigo-500" title={recurrenceLabels[task.recurrence]}>
                            <RepeatIcon className="h-2.5 w-2.5" />
                            {recurrenceLabels[task.recurrence]}
                          </span>
                        )}
                        {/* Edit Button */}
                        <button
                          onClick={(e) => { e.stopPropagation(); setEditingTask(task); }}
                          className="mt-0.5 shrink-0 rounded p-0.5 text-slate-300 opacity-0 transition-all hover:bg-slate-100 hover:text-slate-600 group-hover:opacity-100"
                          title="Bearbeiten"
                        >
                          <PencilIcon className="h-3 w-3" />
                        </button>
                      </div>

                      {task.description && (
                        <p className="mt-1 text-[12px] leading-relaxed text-slate-400 line-clamp-2">
                          {task.description}
                        </p>
                      )}

                      <div className="mt-2.5 flex flex-wrap items-center gap-2 text-[11px]">
                        {task.projects?.name && (
                          <span className="rounded bg-slate-100 px-1.5 py-0.5 font-medium text-slate-600">
                            {task.projects.name}
                          </span>
                        )}
                        {task.topics?.title && (
                          <span className="truncate text-slate-400" title={task.topics.title}>
                            &rarr; {task.topics.title}
                          </span>
                        )}
                      </div>

                      <div className="mt-2 flex items-center justify-between text-[11px]">
                        {task.assignee && (
                          <span className="font-medium text-slate-600">{task.assignee}</span>
                        )}
                        <div className="flex items-center gap-2 ml-auto">
                          {task.source && sourceBadge[task.source] && (
                            <span className={`rounded px-1.5 py-0.5 ${sourceBadge[task.source].style}`}>
                              {sourceBadge[task.source].icon}
                            </span>
                          )}
                          {due && <span className={due.style}>{due.text}</span>}
                        </div>
                      </div>
                    </div>
                  );
                })}

                {(tasksByStatus[col.status]?.length ?? 0) === 0 && (
                  <p className="py-6 text-center text-[12px] text-slate-400">
                    {dragOverColumn === col.status ? "Hier ablegen" : "Keine Aufgaben"}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ──── List View ──── */}
      {viewMode === "list" && (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Aufgabe</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Projekt</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Zuständig</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Status</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Fällig</th>
                <th className="w-10 px-2 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((task) => {
                const due = formatDate(task.due_date);
                const statusCol = columns.find((c) => c.status === task.status);
                const muted = !filterMineOnly && !task.is_mine;
                return (
                  <tr key={task.id} className={`group border-b border-slate-100 transition-colors ${muted ? "opacity-50" : "hover:bg-slate-50"}`}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-slate-900">{task.title}</span>
                        {task.recurrence && (
                          <span className="flex items-center gap-0.5 rounded bg-indigo-50 px-1 py-0.5 text-[10px] font-medium text-indigo-500" title={recurrenceLabels[task.recurrence]}>
                            <RepeatIcon className="h-2.5 w-2.5" />
                            {recurrenceLabels[task.recurrence]}
                          </span>
                        )}
                      </div>
                      {task.topics?.title && (
                        <div className="mt-0.5 text-[12px] text-slate-400">
                          &rarr; {task.topics.title}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {task.projects?.name ?? <span className="text-slate-400">&mdash;</span>}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {task.assignee ?? <span className="text-slate-400">&mdash;</span>}
                    </td>
                    <td className="px-4 py-3">
                      <span className="flex items-center gap-1.5">
                        <span className={`inline-block h-1.5 w-1.5 rounded-full ${statusCol?.dot ?? "bg-slate-400"}`} />
                        {task.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {due ? <span className={due.style}>{due.text}</span> : <span className="text-slate-400">&mdash;</span>}
                    </td>
                    <td className="px-2 py-3">
                      <button
                        onClick={() => setEditingTask(task)}
                        className="rounded p-1 text-slate-300 opacity-0 transition-all hover:bg-slate-100 hover:text-slate-600 group-hover:opacity-100"
                        title="Bearbeiten"
                      >
                        <PencilIcon className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-slate-400">
                    {tasks.length === 0 ? "Noch keine Aufgaben vorhanden." : "Keine Aufgaben für die gewählten Filter."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
