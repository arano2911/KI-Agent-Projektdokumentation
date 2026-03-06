"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Task, RecurrenceType } from "@/lib/types/database";

interface Props {
  today: string;
  dueTodayTasks: Task[];
  overdueTasks: Task[];
  todoTasks: Task[];
}

const statusDot: Record<string, string> = {
  Offen: "bg-blue-500",
  "In Arbeit": "bg-amber-500",
  Blockiert: "bg-red-500",
  Erledigt: "bg-emerald-500",
};

const recurrenceLabels: Record<string, string> = {
  daily: "Täglich",
  weekly: "Wöchentlich",
  monthly: "Monatlich",
};

const weekdays = [
  { value: 1, label: "Montag" },
  { value: 2, label: "Dienstag" },
  { value: 3, label: "Mittwoch" },
  { value: 4, label: "Donnerstag" },
  { value: 5, label: "Freitag" },
  { value: 6, label: "Samstag" },
  { value: 7, label: "Sonntag" },
];

function RepeatIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className ?? "h-3.5 w-3.5"}
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
    <svg className={className ?? "h-3 w-3"} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11.5 1.5l3 3L5 14H2v-3z" />
      <path d="M9.5 3.5l3 3" />
    </svg>
  );
}

function formatWeekday(dateStr: string) {
  const date = new Date(dateStr + "T00:00:00");
  return date.toLocaleDateString("de-DE", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function daysOverdue(dueDateStr: string, today: string) {
  const due = new Date(dueDateStr + "T00:00:00");
  const now = new Date(today + "T00:00:00");
  return Math.floor((now.getTime() - due.getTime()) / (1000 * 60 * 60 * 24));
}

// ──── Inline Edit Component ────

interface InlineEditProps {
  task: Task;
  onSave: (id: string, updates: { title?: string; description?: string | null; due_date?: string | null }) => Promise<void>;
  onCancel: () => void;
}

function InlineEditForm({ task, onSave, onCancel }: InlineEditProps) {
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description ?? "");
  const [dueDate, setDueDate] = useState(task.due_date ?? "");
  const [saving, setSaving] = useState(false);
  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    titleRef.current?.focus();
    titleRef.current?.select();
  }, []);

  const handleSave = async () => {
    if (!title.trim() || saving) return;
    setSaving(true);
    await onSave(task.id, {
      title: title.trim(),
      description: description.trim() || null,
      due_date: dueDate || null,
    });
    setSaving(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSave();
    }
    if (e.key === "Escape") {
      onCancel();
    }
  };

  return (
    <div className="space-y-2 rounded-xl border border-indigo-200 bg-white p-3 shadow-sm">
      <input
        ref={titleRef}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={handleKeyDown}
        className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-[13px] font-semibold text-slate-900 focus:border-indigo-500 focus:outline-none"
        placeholder="Titel"
      />
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        onKeyDown={handleKeyDown}
        rows={2}
        className="w-full resize-none rounded-lg border border-slate-200 px-3 py-1.5 text-[12px] text-slate-600 focus:border-indigo-500 focus:outline-none"
        placeholder="Beschreibung (optional)"
      />
      <div className="flex items-center gap-2">
        <input
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          onKeyDown={handleKeyDown}
          className="h-7 rounded-lg border border-slate-200 px-2 text-[12px] text-slate-700 focus:border-indigo-500 focus:outline-none"
        />
        <div className="ml-auto flex gap-1.5">
          <button
            onClick={handleSave}
            disabled={saving || !title.trim()}
            className="rounded-lg bg-indigo-500 px-3 py-1 text-[11px] font-semibold text-white hover:bg-indigo-600 disabled:opacity-50"
          >
            {saving ? "…" : "Speichern"}
          </button>
          <button
            onClick={onCancel}
            className="rounded-lg border border-slate-200 px-3 py-1 text-[11px] font-semibold text-slate-500 hover:bg-slate-50"
          >
            Abbrechen
          </button>
        </div>
      </div>
    </div>
  );
}

// ──── Main Component ────

export function TodayDashboard({ today, dueTodayTasks, overdueTasks, todoTasks }: Props) {
  const [dueToday, setDueToday] = useState<Task[]>(dueTodayTasks);
  const [overdue, setOverdue] = useState<Task[]>(overdueTasks);
  const [todos, setTodos] = useState<Task[]>(todoTasks);
  const [newTodo, setNewTodo] = useState("");
  const [newTodoRecurrence, setNewTodoRecurrence] = useState<RecurrenceType | null>(null);
  const [newTodoRecurrenceDay, setNewTodoRecurrenceDay] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  // Beim Laden: Wiederholungs-Engine triggern
  useEffect(() => {
    let cancelled = false;
    async function triggerRecurrence() {
      try {
        const res = await fetch("/api/tasks/recurrence", { method: "POST" });
        const data = await res.json();
        if (!cancelled && data.created > 0) {
          router.refresh();
        }
      } catch {
        // Silently ignore
      }
    }
    triggerRecurrence();
    return () => { cancelled = true; };
  }, [router]);

  // ──── Inline Edit Save ────

  const handleInlineSave = useCallback(async (id: string, updates: { title?: string; description?: string | null; due_date?: string | null }) => {
    const payload: Record<string, unknown> = {};
    if (updates.title !== undefined) payload.title = updates.title;
    if (updates.description !== undefined) payload.description = updates.description;
    if (updates.due_date !== undefined) payload.due_date = updates.due_date;

    // Optimistic update across all three lists
    const updater = (prev: Task[]) =>
      prev.map((t) => (t.id === id ? { ...t, ...payload } as Task : t));
    setDueToday(updater);
    setOverdue(updater);
    setTodos(updater);
    setEditingId(null);

    const supabase = createClient();
    const { error } = await supabase
      .from("tasks")
      .update(payload as never)
      .eq("id", id);

    if (error) {
      router.refresh();
    }
  }, [router]);

  // Neues To-Do anlegen
  const handleAddTodo = async () => {
    const text = newTodo.trim();
    if (!text || saving) return;

    setSaving(true);
    const supabase = createClient();

    const { data, error } = await supabase
      .from("tasks")
      .insert({
        title: text,
        status: "Offen",
        due_date: today,
        is_todo: true,
        is_mine: true,
        source: "Manuell",
        recurrence: newTodoRecurrence,
        recurrence_day: newTodoRecurrence === "weekly" || newTodoRecurrence === "monthly" ? newTodoRecurrenceDay : null,
      } as never)
      .select("*")
      .single();

    if (!error && data) {
      setTodos((prev) => [...prev, data as Task]);
      setNewTodo("");
      setNewTodoRecurrence(null);
      setNewTodoRecurrenceDay(null);
      inputRef.current?.focus();
    }

    setSaving(false);
  };

  // To-Do abhaken
  const handleToggleTodo = async (taskId: string) => {
    const task = todos.find((t) => t.id === taskId);
    if (!task) return;

    const newStatus = task.status === "Erledigt" ? "Offen" : "Erledigt";
    const supabase = createClient();

    const { error } = await supabase
      .from("tasks")
      .update({ status: newStatus } as never)
      .eq("id", taskId);

    if (!error) {
      setTodos((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, status: newStatus as Task["status"] } : t))
      );
    }
  };

  // Wiederholungs-Toggle durchschalten
  const cycleRecurrence = () => {
    const cycle: (RecurrenceType | null)[] = [null, "daily", "weekly", "monthly"];
    const idx = cycle.indexOf(newTodoRecurrence);
    const next = cycle[(idx + 1) % cycle.length];
    setNewTodoRecurrence(next);
    setNewTodoRecurrenceDay(null);
  };

  const openTodos = todos.filter((t) => t.status !== "Erledigt");
  const doneTodos = todos.filter((t) => t.status === "Erledigt");

  // Find task across all lists for inline editing
  const findTask = (id: string): Task | undefined =>
    dueToday.find((t) => t.id === id) ?? overdue.find((t) => t.id === id) ?? todos.find((t) => t.id === id);

  return (
    <div>
      {/* Tages-Header */}
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-bold text-slate-900">Heute</h1>
        <p className="mt-1 text-[15px] text-slate-500">{formatWeekday(today)}</p>
      </div>

      {/* ── Überfällig ── */}
      {overdue.length > 0 && (
        <section className="mb-6">
          <div className="mb-3 flex items-center gap-2">
            <span className="inline-block h-2 w-2 rounded-full bg-red-500" />
            <h2 className="text-[15px] font-bold text-red-700">
              Überfällig ({overdue.length})
            </h2>
          </div>
          <div className="space-y-2">
            {overdue.map((task) => {
              const days = daysOverdue(task.due_date!, today);
              if (editingId === task.id) {
                return (
                  <InlineEditForm
                    key={task.id}
                    task={task}
                    onSave={handleInlineSave}
                    onCancel={() => setEditingId(null)}
                  />
                );
              }
              return (
                <div
                  key={task.id}
                  className="group flex items-center justify-between rounded-xl border border-red-200 bg-red-50 px-4 py-3"
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    {task.recurrence && (
                      <RepeatIcon className="h-3.5 w-3.5 shrink-0 text-red-400" />
                    )}
                    <div className="min-w-0 flex-1">
                      <button
                        onClick={() => setEditingId(task.id)}
                        className="text-left text-[13px] font-semibold text-slate-900 hover:text-indigo-600 transition-colors"
                      >
                        {task.title}
                      </button>
                      {task.assignee && (
                        <div className="mt-0.5 text-[11px] text-slate-500">{task.assignee}</div>
                      )}
                    </div>
                    <button
                      onClick={() => setEditingId(task.id)}
                      className="shrink-0 rounded p-1 text-red-300 opacity-0 transition-all hover:bg-red-100 hover:text-red-600 group-hover:opacity-100"
                      title="Bearbeiten"
                    >
                      <PencilIcon className="h-3 w-3" />
                    </button>
                  </div>
                  <span className="shrink-0 ml-2 rounded bg-red-100 px-2 py-0.5 text-[11px] font-semibold text-red-700">
                    {days} {days === 1 ? "Tag" : "Tage"} überfällig
                  </span>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ── Heute fällig ── */}
      <section className="mb-6">
        <div className="mb-3 flex items-center gap-2">
          <span className="inline-block h-2 w-2 rounded-full bg-amber-500" />
          <h2 className="text-[15px] font-bold text-slate-700">
            Heute fällig ({dueToday.length})
          </h2>
        </div>
        {dueToday.length === 0 ? (
          <p className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-6 text-center text-[13px] text-slate-400">
            Keine Aufgaben für heute.
          </p>
        ) : (
          <div className="space-y-2">
            {dueToday.map((task) => {
              if (editingId === task.id) {
                return (
                  <InlineEditForm
                    key={task.id}
                    task={task}
                    onSave={handleInlineSave}
                    onCancel={() => setEditingId(null)}
                  />
                );
              }
              return (
                <div
                  key={task.id}
                  className="group flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm"
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    {task.recurrence && (
                      <RepeatIcon className="h-3.5 w-3.5 shrink-0 text-indigo-400" />
                    )}
                    <div className="min-w-0 flex-1">
                      <button
                        onClick={() => setEditingId(task.id)}
                        className="text-left text-[13px] font-semibold text-slate-900 hover:text-indigo-600 transition-colors"
                      >
                        {task.title}
                      </button>
                      <div className="mt-0.5 flex items-center gap-2 text-[11px] text-slate-500">
                        {task.assignee && <span>{task.assignee}</span>}
                        {task.recurrence && (
                          <span className="text-indigo-500">{recurrenceLabels[task.recurrence]}</span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => setEditingId(task.id)}
                      className="shrink-0 rounded p-1 text-slate-300 opacity-0 transition-all hover:bg-slate-100 hover:text-slate-600 group-hover:opacity-100"
                      title="Bearbeiten"
                    >
                      <PencilIcon className="h-3 w-3" />
                    </button>
                  </div>
                  <span className="flex items-center gap-1.5 text-[11px] ml-2">
                    <span className={`inline-block h-1.5 w-1.5 rounded-full ${statusDot[task.status] ?? "bg-slate-400"}`} />
                    <span className="text-slate-500">{task.status}</span>
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ── Meine To-Dos ── */}
      <section>
        <div className="mb-3 flex items-center gap-2">
          <span className="inline-block h-2 w-2 rounded-full bg-indigo-500" />
          <h2 className="text-[15px] font-bold text-slate-700">Meine To-Dos</h2>
        </div>

        {/* Quick-Add */}
        <div className="mb-3 flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={newTodo}
            onChange={(e) => setNewTodo(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleAddTodo();
              }
            }}
            placeholder="Was steht heute an?"
            className="h-10 flex-1 rounded-xl border border-slate-200 px-4 text-[13px] text-slate-800 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none"
          />
          <button
            type="button"
            onClick={cycleRecurrence}
            title={newTodoRecurrence ? recurrenceLabels[newTodoRecurrence] : "Keine Wiederholung"}
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border transition-colors ${
              newTodoRecurrence
                ? "border-indigo-300 bg-indigo-50 text-indigo-600"
                : "border-slate-200 text-slate-400 hover:text-slate-600"
            }`}
          >
            <RepeatIcon className="h-4 w-4" />
          </button>
          <button
            onClick={handleAddTodo}
            disabled={saving || !newTodo.trim()}
            className="h-10 rounded-xl bg-indigo-500 px-5 text-[13px] font-semibold text-white transition-colors hover:bg-indigo-600 disabled:opacity-50"
          >
            {saving ? "…" : "Hinzufügen"}
          </button>
        </div>

        {/* Recurrence-Hinweis + Tag-Auswahl */}
        {newTodoRecurrence && (
          <div className="mb-3 flex items-center gap-2 text-[11px] text-indigo-500">
            <RepeatIcon className="h-3 w-3" />
            <span>{recurrenceLabels[newTodoRecurrence]}</span>
            {newTodoRecurrence === "weekly" && (
              <select
                value={newTodoRecurrenceDay ?? ""}
                onChange={(e) => setNewTodoRecurrenceDay(e.target.value ? Number(e.target.value) : null)}
                className="h-7 rounded-lg border border-indigo-200 bg-indigo-50 px-2 text-[11px] text-indigo-600 focus:border-indigo-400 focus:outline-none"
              >
                <option value="">Gleicher Wochentag</option>
                {weekdays.map((d) => (
                  <option key={d.value} value={d.value}>{d.label}</option>
                ))}
              </select>
            )}
            {newTodoRecurrence === "monthly" && (
              <select
                value={newTodoRecurrenceDay ?? ""}
                onChange={(e) => setNewTodoRecurrenceDay(e.target.value ? Number(e.target.value) : null)}
                className="h-7 rounded-lg border border-indigo-200 bg-indigo-50 px-2 text-[11px] text-indigo-600 focus:border-indigo-400 focus:outline-none"
              >
                <option value="">Gleicher Tag</option>
                {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                  <option key={d} value={d}>{d}.</option>
                ))}
              </select>
            )}
          </div>
        )}

        {/* Offene To-Dos */}
        <div className="space-y-1.5">
          {openTodos.map((todo) => {
            if (editingId === todo.id) {
              return (
                <InlineEditForm
                  key={todo.id}
                  task={todo}
                  onSave={handleInlineSave}
                  onCancel={() => setEditingId(null)}
                />
              );
            }
            return (
              <div
                key={todo.id}
                className="group flex cursor-pointer items-center gap-3 rounded-lg border border-slate-200 bg-white px-4 py-2.5 transition-colors hover:bg-slate-50"
              >
                <input
                  type="checkbox"
                  checked={false}
                  onChange={() => handleToggleTodo(todo.id)}
                  className="h-4 w-4 shrink-0 rounded border-slate-300 text-indigo-500 focus:ring-indigo-500"
                />
                <button
                  onClick={() => setEditingId(todo.id)}
                  className="flex-1 text-left text-[13px] text-slate-800 hover:text-indigo-600 transition-colors"
                >
                  {todo.title}
                </button>
                {todo.recurrence && (
                  <span className="flex items-center gap-1 text-[11px] text-indigo-400" title={recurrenceLabels[todo.recurrence]}>
                    <RepeatIcon className="h-3 w-3" />
                    <span>{recurrenceLabels[todo.recurrence]}</span>
                  </span>
                )}
                <button
                  onClick={() => setEditingId(todo.id)}
                  className="shrink-0 rounded p-1 text-slate-300 opacity-0 transition-all hover:bg-slate-100 hover:text-slate-600 group-hover:opacity-100"
                  title="Bearbeiten"
                >
                  <PencilIcon className="h-3 w-3" />
                </button>
              </div>
            );
          })}
        </div>

        {/* Erledigte To-Dos */}
        {doneTodos.length > 0 && (
          <div className="mt-3 space-y-1.5">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Erledigt ({doneTodos.length})
            </div>
            {doneTodos.map((todo) => (
              <label
                key={todo.id}
                className="flex cursor-pointer items-center gap-3 rounded-lg border border-slate-100 bg-slate-50 px-4 py-2.5"
              >
                <input
                  type="checkbox"
                  checked={true}
                  onChange={() => handleToggleTodo(todo.id)}
                  className="h-4 w-4 rounded border-slate-300 text-emerald-500 focus:ring-emerald-500"
                />
                <span className="flex-1 text-[13px] text-slate-400 line-through">{todo.title}</span>
                {todo.recurrence && (
                  <RepeatIcon className="h-3 w-3 text-slate-300" />
                )}
              </label>
            ))}
          </div>
        )}

        {openTodos.length === 0 && doneTodos.length === 0 && (
          <p className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-6 text-center text-[13px] text-slate-400">
            Noch keine To-Dos für heute. Einfach oben eintippen!
          </p>
        )}
      </section>
    </div>
  );
}
