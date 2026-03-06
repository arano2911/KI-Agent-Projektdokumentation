"use client";

import { useState, useMemo } from "react";
import type { TaskWithRelations } from "@/app/tasks/page";
import type { TaskStatus } from "@/lib/types/database";

// ──── Spalten-Konfiguration ────

const columns: { status: TaskStatus; label: string; accent: string; dot: string }[] = [
  { status: "Offen", label: "Offen", accent: "border-t-blue-500", dot: "bg-blue-500" },
  { status: "In Arbeit", label: "In Arbeit", accent: "border-t-amber-500", dot: "bg-amber-500" },
  { status: "Blockiert", label: "Blockiert", accent: "border-t-red-500", dot: "bg-red-500" },
  { status: "Erledigt", label: "Erledigt", accent: "border-t-emerald-500", dot: "bg-emerald-500" },
];

const sourceBadge: Record<string, { icon: string; style: string }> = {
  "KI-Agent": { icon: "\u2728", style: "text-violet-600 bg-violet-50" },
  Meeting: { icon: "\uD83D\uDCC5", style: "text-blue-600 bg-blue-50" },
  Manuell: { icon: "\u270F\uFE0F", style: "text-slate-500 bg-slate-50" },
  GitHub: { icon: "\uD83D\uDD17", style: "text-slate-700 bg-slate-50" },
};

// ──── Component ────

interface Props {
  tasks: TaskWithRelations[];
  projects: { id: string; name: string }[];
}

export function TaskBoard({ tasks, projects }: Props) {
  const [filterProject, setFilterProject] = useState<string>("all");
  const [filterAssignee, setFilterAssignee] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"board" | "list">("board");

  // Eindeutige Assignees für Filter
  const assignees = useMemo(() => {
    const set = new Set(tasks.map((t) => t.assignee).filter(Boolean) as string[]);
    return Array.from(set).sort();
  }, [tasks]);

  const filtered = useMemo(() => {
    return tasks.filter((t) => {
      if (filterProject !== "all" && t.projects?.name !== filterProject) return false;
      if (filterAssignee !== "all" && t.assignee !== filterAssignee) return false;
      return true;
    });
  }, [tasks, filterProject, filterAssignee]);

  const tasksByStatus = useMemo(() => {
    const map: Record<string, TaskWithRelations[]> = {};
    for (const col of columns) map[col.status] = [];
    for (const t of filtered) {
      if (map[t.status]) map[t.status].push(t);
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

  return (
    <>
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

          {/* View Toggle */}
          <div className="ml-auto flex rounded-lg border border-slate-200">
            <button
              onClick={() => setViewMode("board")}
              className={`px-3 py-1.5 text-[12px] font-semibold transition-colors ${
                viewMode === "board"
                  ? "bg-indigo-500 text-white"
                  : "text-slate-500 hover:text-slate-700"
              } rounded-l-lg`}
            >
              Board
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`px-3 py-1.5 text-[12px] font-semibold transition-colors ${
                viewMode === "list"
                  ? "bg-indigo-500 text-white"
                  : "text-slate-500 hover:text-slate-700"
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
            <div key={col.status} className={`rounded-xl border border-t-[3px] border-slate-200 bg-slate-50/50 ${col.accent}`}>
              {/* Spalten-Header */}
              <div className="flex items-center gap-2 px-4 py-3">
                <span className={`inline-block h-2 w-2 rounded-full ${col.dot}`} />
                <span className="text-[13px] font-semibold text-slate-700">{col.label}</span>
                <span className="ml-auto rounded-full bg-slate-200 px-2 py-0.5 text-[11px] font-bold text-slate-600">
                  {tasksByStatus[col.status]?.length ?? 0}
                </span>
              </div>

              {/* Karten */}
              <div className="space-y-2 px-3 pb-3">
                {(tasksByStatus[col.status] ?? []).map((task) => {
                  const due = formatDate(task.due_date);
                  return (
                    <div
                      key={task.id}
                      className="rounded-lg border border-slate-200 bg-white p-3.5 shadow-sm transition-shadow hover:shadow-md"
                    >
                      <h4 className="text-[13px] font-semibold leading-snug text-slate-900">
                        {task.title}
                      </h4>

                      {task.description && (
                        <p className="mt-1 text-[12px] leading-relaxed text-slate-400 line-clamp-2">
                          {task.description}
                        </p>
                      )}

                      <div className="mt-2.5 flex flex-wrap items-center gap-2 text-[11px]">
                        {/* Projekt */}
                        {task.projects?.name && (
                          <span className="rounded bg-slate-100 px-1.5 py-0.5 font-medium text-slate-600">
                            {task.projects.name}
                          </span>
                        )}

                        {/* Thema */}
                        {task.topics?.title && (
                          <span className="truncate text-slate-400" title={task.topics.title}>
                            &rarr; {task.topics.title}
                          </span>
                        )}
                      </div>

                      <div className="mt-2 flex items-center justify-between text-[11px]">
                        {/* Assignee */}
                        {task.assignee && (
                          <span className="font-medium text-slate-600">
                            {task.assignee}
                          </span>
                        )}

                        <div className="flex items-center gap-2 ml-auto">
                          {/* Quelle */}
                          {task.source && sourceBadge[task.source] && (
                            <span className={`rounded px-1.5 py-0.5 ${sourceBadge[task.source].style}`}>
                              {sourceBadge[task.source].icon}
                            </span>
                          )}

                          {/* Due Date */}
                          {due && (
                            <span className={due.style}>
                              {due.text}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}

                {(tasksByStatus[col.status]?.length ?? 0) === 0 && (
                  <p className="py-6 text-center text-[12px] text-slate-400">
                    Keine Aufgaben
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
              </tr>
            </thead>
            <tbody>
              {filtered.map((task) => {
                const due = formatDate(task.due_date);
                const statusCol = columns.find((c) => c.status === task.status);
                return (
                  <tr key={task.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-900">{task.title}</div>
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
                      {due ? (
                        <span className={due.style}>{due.text}</span>
                      ) : (
                        <span className="text-slate-400">&mdash;</span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-slate-400">
                    {tasks.length === 0
                      ? "Noch keine Aufgaben vorhanden."
                      : "Keine Aufgaben für die gewählten Filter."}
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
