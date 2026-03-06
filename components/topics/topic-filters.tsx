"use client";

import { useState, useMemo } from "react";
import type { TopicWithProject } from "@/app/topics/page";
import type { TopicType, TopicStatus, PriorityLevel } from "@/lib/types/database";

// ──── Style Mappings ────

const statusStyles: Record<string, string> = {
  Offen: "bg-blue-50 text-blue-700 border-blue-200",
  "In Diskussion": "bg-amber-50 text-amber-700 border-amber-200",
  Entschieden: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Umgesetzt: "bg-slate-100 text-slate-500 border-slate-200",
  Verworfen: "bg-red-50 text-red-600 border-red-200",
};

const priorityDots: Record<string, string> = {
  Hoch: "bg-red-500",
  Mittel: "bg-amber-500",
  Niedrig: "bg-slate-400",
};

const typeIcons: Record<string, string> = {
  Anforderung: "\u25C6",
  Entscheidung: "\u25B2",
  Diskussionspunkt: "\u25CF",
  Information: "\u25A0",
};

const deptBadge: Record<string, string> = {
  Business: "bg-violet-500/10 text-violet-600",
  Marketing: "bg-pink-500/10 text-pink-600",
  HR: "bg-orange-500/10 text-orange-600",
  GF: "bg-sky-500/10 text-sky-600",
  IT: "bg-indigo-500/10 text-indigo-600",
};

const sourceLabels: Record<string, { icon: string; style: string; label: string }> = {
  "KI-Agent": { icon: "\u2728", style: "text-violet-600", label: "Misty" },
  Meeting: { icon: "\uD83D\uDCC5", style: "text-blue-600", label: "Meeting" },
  Manuell: { icon: "\u270F\uFE0F", style: "text-slate-500", label: "Manuell" },
  GitHub: { icon: "\uD83D\uDD17", style: "text-slate-700", label: "GitHub" },
};

// ──── Filter-Optionen ────

const statusOptions: TopicStatus[] = [
  "Offen",
  "In Diskussion",
  "Entschieden",
  "Umgesetzt",
  "Verworfen",
];

const typeOptions: TopicType[] = [
  "Anforderung",
  "Entscheidung",
  "Diskussionspunkt",
  "Information",
];

const priorityOptions: PriorityLevel[] = ["Hoch", "Mittel", "Niedrig"];

// ──── Component ────

interface Props {
  topics: TopicWithProject[];
  projects: { id: string; name: string }[];
}

export function TopicFilters({ topics, projects }: Props) {
  const [filterProject, setFilterProject] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterType, setFilterType] = useState<string>("all");
  const [filterPriority, setFilterPriority] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const filtered = useMemo(() => {
    return topics.filter((t) => {
      if (filterProject !== "all" && t.projects?.name !== filterProject)
        return false;
      if (filterStatus !== "all" && t.status !== filterStatus) return false;
      if (filterType !== "all" && t.type !== filterType) return false;
      if (filterPriority !== "all" && t.priority !== filterPriority)
        return false;
      if (
        searchQuery.trim() &&
        !t.title.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !(t.description ?? "").toLowerCase().includes(searchQuery.toLowerCase())
      )
        return false;
      return true;
    });
  }, [topics, filterProject, filterStatus, filterType, filterPriority, searchQuery]);

  const activeFilterCount = [filterProject, filterStatus, filterType, filterPriority].filter(
    (f) => f !== "all"
  ).length + (searchQuery.trim() ? 1 : 0);

  const clearFilters = () => {
    setFilterProject("all");
    setFilterStatus("all");
    setFilterType("all");
    setFilterPriority("all");
    setSearchQuery("");
  };

  return (
    <>
      {/* ──── Filter-Bar ──── */}
      <div className="mb-5 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          {/* Suche */}
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Themen durchsuchen..."
            className="h-9 w-56 rounded-lg border border-slate-200 px-3 text-[13px] placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none"
          />

          {/* Projekt */}
          <select
            value={filterProject}
            onChange={(e) => setFilterProject(e.target.value)}
            className="h-9 rounded-lg border border-slate-200 px-3 text-[13px] text-slate-700 focus:border-indigo-500 focus:outline-none"
          >
            <option value="all">Alle Projekte</option>
            {projects.map((p) => (
              <option key={p.id} value={p.name}>
                {p.name}
              </option>
            ))}
          </select>

          {/* Status */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="h-9 rounded-lg border border-slate-200 px-3 text-[13px] text-slate-700 focus:border-indigo-500 focus:outline-none"
          >
            <option value="all">Alle Status</option>
            {statusOptions.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>

          {/* Typ */}
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="h-9 rounded-lg border border-slate-200 px-3 text-[13px] text-slate-700 focus:border-indigo-500 focus:outline-none"
          >
            <option value="all">Alle Typen</option>
            {typeOptions.map((t) => (
              <option key={t} value={t}>
                {typeIcons[t]} {t}
              </option>
            ))}
          </select>

          {/* Priorität */}
          <select
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}
            className="h-9 rounded-lg border border-slate-200 px-3 text-[13px] text-slate-700 focus:border-indigo-500 focus:outline-none"
          >
            <option value="all">Alle Prioritäten</option>
            {priorityOptions.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>

          {/* Reset */}
          {activeFilterCount > 0 && (
            <button
              onClick={clearFilters}
              className="h-9 rounded-lg border border-slate-200 px-3 text-[13px] font-medium text-slate-500 transition-colors hover:bg-slate-50"
            >
              Filter zurücksetzen ({activeFilterCount})
            </button>
          )}

          {/* Ergebnis-Count */}
          <span className="ml-auto text-[13px] text-slate-400">
            {filtered.length} von {topics.length}
          </span>
        </div>
      </div>

      {/* ──── Themen-Liste ──── */}
      <div className="space-y-3">
        {filtered.map((topic) => (
          <div
            key={topic.id}
            className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
          >
            {/* Obere Zeile: Typ-Icon, Titel, Badges */}
            <div className="mb-2 flex items-start justify-between gap-4">
              <div className="flex items-start gap-2.5 min-w-0">
                <span className="mt-0.5 text-indigo-400" title={topic.type}>
                  {typeIcons[topic.type] ?? ""}
                </span>
                <div className="min-w-0">
                  <h3 className="text-[15px] font-semibold text-slate-900 leading-snug">
                    {topic.title}
                  </h3>
                  {topic.description && (
                    <p className="mt-1 text-[13px] leading-relaxed text-slate-500 line-clamp-2">
                      {topic.description}
                    </p>
                  )}
                </div>
              </div>

              {/* Status-Badge */}
              <span
                className={`shrink-0 rounded-md border px-2.5 py-1 text-[11px] font-semibold ${
                  statusStyles[topic.status] ?? "bg-slate-100 text-slate-600 border-slate-200"
                }`}
              >
                {topic.status}
              </span>
            </div>

            {/* Untere Zeile: Meta-Infos */}
            <div className="mt-3 flex flex-wrap items-center gap-3 text-[12px]">
              {/* Priorität */}
              <span className="flex items-center gap-1 text-slate-500">
                <span
                  className={`inline-block h-1.5 w-1.5 rounded-full ${
                    priorityDots[topic.priority] ?? "bg-slate-400"
                  }`}
                />
                {topic.priority}
              </span>

              {/* Projekt */}
              {topic.projects?.name && (
                <span className="rounded bg-slate-100 px-2 py-0.5 font-medium text-slate-600">
                  {topic.projects.name}
                </span>
              )}

              {/* Abteilungen */}
              {topic.departments?.map((dept) => (
                <span
                  key={dept}
                  className={`rounded px-2 py-0.5 font-semibold ${
                    deptBadge[dept] ?? "bg-slate-100 text-slate-600"
                  }`}
                >
                  {dept}
                </span>
              ))}

              {/* Quelle */}
              {topic.source && sourceLabels[topic.source] && (
                <span
                  className={`flex items-center gap-1 ${sourceLabels[topic.source].style}`}
                >
                  {sourceLabels[topic.source].icon}
                  {sourceLabels[topic.source].label}
                </span>
              )}

              {/* Meeting-Agenda Flag */}
              {topic.meeting_agenda && (
                <span className="flex items-center gap-1 font-semibold text-indigo-500">
                  &#128197; Agenda
                </span>
              )}

              {/* Datum */}
              <span className="ml-auto text-slate-400">
                {new Date(topic.created_at).toLocaleDateString("de-DE", {
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                })}
              </span>
            </div>
          </div>
        ))}

        {/* Leer-Zustand */}
        {filtered.length === 0 && (
          <div className="rounded-xl border border-dashed border-slate-300 py-16 text-center">
            <p className="text-sm text-slate-400">
              {topics.length === 0
                ? "Noch keine Themen erfasst. Nutze Misty auf dem Dashboard."
                : "Keine Themen für die gewählten Filter gefunden."}
            </p>
          </div>
        )}
      </div>
    </>
  );
}
