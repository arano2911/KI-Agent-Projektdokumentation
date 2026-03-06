"use client";

import { useMemo } from "react";
import type { AgendaItem } from "@/app/agenda/page";

// ──── Style Mappings ────

const priorityOrder: Record<string, number> = { Hoch: 0, Mittel: 1, Niedrig: 2 };

const priorityStyles: Record<string, { dot: string; text: string }> = {
  Hoch: { dot: "bg-red-500", text: "text-red-700" },
  Mittel: { dot: "bg-amber-500", text: "text-amber-700" },
  Niedrig: { dot: "bg-slate-400", text: "text-slate-500" },
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

// ──── Component ────

interface Props {
  items: AgendaItem[];
  fallbackTopics: any[];
}

export function AgendaList({ items, fallbackTopics }: Props) {
  // Gruppiert nach Projekt
  const grouped = useMemo(() => {
    const map = new Map<string, { meeting: string | null; items: AgendaItem[] }>();

    const source = items.length > 0 ? items : fallbackTopics.map((t) => ({
      thema: t.title,
      beschreibung: t.description,
      typ: t.type,
      prioritaet: t.priority,
      abteilungen: t.departments ?? [],
      projekt: t.projects?.name ?? null,
      next_meeting: t.projects?.next_meeting ?? null,
    }));

    for (const item of source) {
      const key = item.projekt ?? "Nicht zugeordnet";
      if (!map.has(key)) {
        map.set(key, { meeting: item.next_meeting, items: [] });
      }
      map.get(key)!.items.push(item);
    }

    // Sortiere items pro Gruppe nach Priorität
    for (const group of map.values()) {
      group.items.sort(
        (a, b) => (priorityOrder[a.prioritaet] ?? 9) - (priorityOrder[b.prioritaet] ?? 9)
      );
    }

    return map;
  }, [items, fallbackTopics]);

  const totalCount = Array.from(grouped.values()).reduce((s, g) => s + g.items.length, 0);

  if (totalCount === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 py-16 text-center">
        <p className="text-sm text-slate-400">
          Keine Themen für die Meeting-Agenda vorgemerkt.
        </p>
        <p className="mt-1 text-[12px] text-slate-400">
          Erfasse Themen über Misty und markiere sie für die Agenda.
        </p>
      </div>
    );
  }

  const formatMeeting = (d: string | null) => {
    if (!d) return null;
    const date = new Date(d);
    return date.toLocaleDateString("de-DE", {
      weekday: "long",
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  };

  return (
    <div className="space-y-6">
      {Array.from(grouped.entries()).map(([projektName, group]) => (
        <div
          key={projektName}
          className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden"
        >
          {/* Projekt-Header */}
          <div className="border-b border-slate-200 bg-slate-50 px-5 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-[15px] font-bold text-slate-900">
                  {projektName}
                </h3>
                {group.meeting && (
                  <p className="mt-0.5 text-[12px] text-slate-500">
                    Nächstes Meeting: {formatMeeting(group.meeting)}
                  </p>
                )}
              </div>
              <span className="rounded-full bg-indigo-100 px-2.5 py-1 text-[11px] font-bold text-indigo-700">
                {group.items.length} {group.items.length === 1 ? "Punkt" : "Punkte"}
              </span>
            </div>
          </div>

          {/* Agenda Items */}
          <div className="divide-y divide-slate-100">
            {group.items.map((item, idx) => {
              const prio = priorityStyles[item.prioritaet] ?? priorityStyles.Niedrig;
              return (
                <div key={idx} className="flex items-start gap-4 px-5 py-4 hover:bg-slate-50 transition-colors">
                  {/* Nummer */}
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[11px] font-bold text-slate-500">
                    {idx + 1}
                  </span>

                  {/* Content */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start gap-2">
                      <span className="mt-0.5 text-indigo-400" title={item.typ}>
                        {typeIcons[item.typ] ?? ""}
                      </span>
                      <div className="min-w-0">
                        <h4 className="text-[14px] font-semibold text-slate-900 leading-snug">
                          {item.thema}
                        </h4>
                        {item.beschreibung && (
                          <p className="mt-1 text-[13px] leading-relaxed text-slate-500">
                            {item.beschreibung}
                          </p>
                        )}

                        {/* Meta */}
                        <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px]">
                          <span className="flex items-center gap-1">
                            <span className={`inline-block h-1.5 w-1.5 rounded-full ${prio.dot}`} />
                            <span className={prio.text}>{item.prioritaet}</span>
                          </span>

                          <span className="text-slate-400">{item.typ}</span>

                          {item.abteilungen?.map((dept) => (
                            <span
                              key={dept}
                              className={`rounded px-1.5 py-0.5 font-semibold ${
                                deptBadge[dept] ?? "bg-slate-100 text-slate-600"
                              }`}
                            >
                              {dept}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {/* Gesamt-Zusammenfassung */}
      <div className="text-center text-[13px] text-slate-400">
        {totalCount} Agenda-{totalCount === 1 ? "Punkt" : "Punkte"} in{" "}
        {grouped.size} {grouped.size === 1 ? "Projekt" : "Projekten"}
      </div>
    </div>
  );
}
