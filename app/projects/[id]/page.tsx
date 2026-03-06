import { createClient } from "@/lib/supabase/server";
import { Header } from "@/components/layout/header";
import { TechTranslator } from "@/components/projects/tech-translator";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  StatusBadge,
  DeptBadge,
  TopicStatusBadge,
  TaskStatusBadge,
  PriorityDot,
} from "@/components/ui/badge";
import type {
  Project,
  Topic,
  Task,
  ProjectStatus,
  TopicStatus,
  TaskStatus,
  PriorityLevel,
  Department,
} from "@/lib/types/database";

export const revalidate = 0;

const typeIcons: Record<string, string> = {
  Anforderung: "\u25C6",
  Entscheidung: "\u25B2",
  Diskussionspunkt: "\u25CF",
  Information: "\u25A0",
};

const taskDots: Record<string, string> = {
  Offen: "bg-blue-500",
  "In Arbeit": "bg-amber-500",
  Blockiert: "bg-red-500",
  Erledigt: "bg-emerald-500",
};

export default async function ProjectDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createClient();
  const { id } = await params;

  // Projekt laden
  const { data: project } = await supabase
    .from("projects")
    .select("*")
    .eq("id", id)
    .single();

  if (!project) notFound();

  const p = project as Project;

  // Themen + Aufgaben + Aktivitäten parallel laden
  const [topicsRes, tasksRes, activitiesRes] = await Promise.all([
    supabase
      .from("topics")
      .select("*")
      .eq("project_id", id)
      .order("created_at", { ascending: false }),
    supabase
      .from("tasks")
      .select("*, topics:topic_id(title)")
      .eq("project_id", id)
      .order("created_at", { ascending: false }),
    supabase
      .from("activity_log")
      .select("*")
      .eq("entity_type", "project")
      .eq("entity_id", id)
      .order("created_at", { ascending: false })
      .limit(10),
  ]);

  // Auch topic-bezogene Aktivitäten laden
  const topicIds = (topicsRes.data ?? []).map((t: any) => t.id);
  let topicActivities: any[] = [];
  if (topicIds.length > 0) {
    const { data } = await supabase
      .from("activity_log")
      .select("*")
      .eq("entity_type", "topic")
      .in("entity_id", topicIds)
      .order("created_at", { ascending: false })
      .limit(10);
    topicActivities = data ?? [];
  }

  const topics = (topicsRes.data ?? []) as Topic[];
  const tasks = (tasksRes.data ?? []) as (Task & { topics: { title: string } | null })[];
  const allActivities = [...(activitiesRes.data ?? []), ...topicActivities]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 15);

  // Statistiken
  const openTopics = topics.filter((t) => !["Umgesetzt", "Verworfen"].includes(t.status)).length;
  const openTasks = tasks.filter((t) => t.status === "Offen" || t.status === "In Arbeit").length;
  const blockedTasks = tasks.filter((t) => t.status === "Blockiert").length;
  const doneTasks = tasks.filter((t) => t.status === "Erledigt").length;
  const agendaTopics = topics.filter((t) => t.meeting_agenda).length;

  const formatDate = (d: string | null) => {
    if (!d) return null;
    return new Date(d).toLocaleDateString("de-DE", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  };

  const formatRelative = (d: string) => {
    const diff = Date.now() - new Date(d).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "gerade eben";
    if (mins < 60) return `vor ${mins} Min.`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `vor ${hours} Std.`;
    const days = Math.floor(hours / 24);
    return `vor ${days} Tag${days > 1 ? "en" : ""}`;
  };

  return (
    <>
      <Header />
      <main className="mx-auto max-w-[1200px] px-6 py-6">
        {/* Breadcrumb */}
        <div className="mb-4 flex items-center gap-2 text-[13px] text-slate-400">
          <Link href="/" className="hover:text-indigo-500 transition-colors">
            Dashboard
          </Link>
          <span>/</span>
          <span className="text-slate-700 font-medium">{p.name}</span>
        </div>

        {/* ──── Projekt-Header ──── */}
        <div className="mb-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-xl font-bold text-slate-900">{p.name}</h1>
                <StatusBadge status={p.status} />
              </div>
              {p.description && (
                <p className="text-[14px] leading-relaxed text-slate-500 mb-3">
                  {p.description}
                </p>
              )}
              <div className="flex flex-wrap gap-1.5">
                {p.departments.map((dept) => (
                  <DeptBadge key={dept} dept={dept as Department} />
                ))}
              </div>
            </div>

            {/* Meta-Infos rechts */}
            <div className="shrink-0 text-right text-[13px] text-slate-500 space-y-1">
              {p.project_lead && (
                <div>
                  Leitung: <span className="font-semibold text-slate-700">{p.project_lead}</span>
                </div>
              )}
              {p.start_date && <div>Start: {formatDate(p.start_date)}</div>}
              {p.target_date && <div>Ziel: {formatDate(p.target_date)}</div>}
              {p.next_meeting && (
                <div className="text-indigo-600 font-semibold">
                  Meeting: {formatDate(p.next_meeting)}
                </div>
              )}
            </div>
          </div>

          {/* Statistik-Leiste */}
          <div className="mt-5 flex gap-6 border-t border-slate-100 pt-4 text-[13px]">
            <div>
              <span className="text-lg font-bold text-slate-900">{openTopics}</span>
              <span className="ml-1 text-slate-500">offene Themen</span>
            </div>
            <div>
              <span className="text-lg font-bold text-slate-900">{openTasks}</span>
              <span className="ml-1 text-slate-500">offene Aufgaben</span>
            </div>
            {blockedTasks > 0 && (
              <div>
                <span className="text-lg font-bold text-red-600">{blockedTasks}</span>
                <span className="ml-1 text-red-500">blockiert</span>
              </div>
            )}
            <div>
              <span className="text-lg font-bold text-emerald-600">{doneTasks}</span>
              <span className="ml-1 text-slate-500">erledigt</span>
            </div>
            {agendaTopics > 0 && (
              <div className="ml-auto">
                <span className="text-lg font-bold text-indigo-600">{agendaTopics}</span>
                <span className="ml-1 text-slate-500">auf Agenda</span>
              </div>
            )}
          </div>
        </div>

        {/* ──── Tech-Übersetzer ──── */}
        <div className="mb-6">
          <TechTranslator projectId={id} projectName={p.name} />
        </div>

        {/* ──── Content Grid ──── */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Linke Spalte: Themen + Aufgaben */}
          <div className="lg:col-span-2 space-y-6">
            {/* Themen */}
            <div>
              <h2 className="mb-3 text-[15px] font-bold text-slate-900">
                Themen ({topics.length})
              </h2>
              <div className="space-y-2">
                {topics.map((topic) => (
                  <div
                    key={topic.id}
                    className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-2 min-w-0">
                        <span className="mt-0.5 text-indigo-400">
                          {typeIcons[topic.type] ?? ""}
                        </span>
                        <div className="min-w-0">
                          <h4 className="text-[14px] font-semibold text-slate-900 leading-snug">
                            {topic.title}
                          </h4>
                          {topic.description && (
                            <p className="mt-1 text-[13px] text-slate-500 line-clamp-2">
                              {topic.description}
                            </p>
                          )}
                          <div className="mt-2 flex items-center gap-2 text-[11px]">
                            <PriorityDot priority={topic.priority} />
                            <span className="text-slate-400">{topic.priority}</span>
                            <span className="text-slate-300">|</span>
                            <span className="text-slate-400">{topic.type}</span>
                            {topic.meeting_agenda && (
                              <>
                                <span className="text-slate-300">|</span>
                                <span className="font-semibold text-indigo-500">
                                  &#128197; Agenda
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      <TopicStatusBadge status={topic.status} />
                    </div>
                  </div>
                ))}
                {topics.length === 0 && (
                  <p className="py-8 text-center text-[13px] text-slate-400">
                    Noch keine Themen für dieses Projekt.
                  </p>
                )}
              </div>
            </div>

            {/* Aufgaben */}
            <div>
              <h2 className="mb-3 text-[15px] font-bold text-slate-900">
                Aufgaben ({tasks.length})
              </h2>
              <div className="space-y-2">
                {tasks.map((task) => {
                  const dueDate = task.due_date ? new Date(task.due_date) : null;
                  const overdue = dueDate && dueDate < new Date() && task.status !== "Erledigt";
                  return (
                    <div
                      key={task.id}
                      className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-sm"
                    >
                      <span
                        className={`inline-block h-2 w-2 shrink-0 rounded-full ${
                          taskDots[task.status] ?? "bg-slate-400"
                        }`}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-[14px] font-semibold leading-snug ${
                              task.status === "Erledigt"
                                ? "text-slate-400 line-through"
                                : "text-slate-900"
                            }`}
                          >
                            {task.title}
                          </span>
                          {task.topics?.title && (
                            <span className="hidden sm:inline truncate text-[11px] text-slate-400">
                              &rarr; {task.topics.title}
                            </span>
                          )}
                        </div>
                        <div className="mt-0.5 flex items-center gap-3 text-[12px] text-slate-400">
                          {task.assignee && (
                            <span className="font-medium text-slate-600">
                              {task.assignee}
                            </span>
                          )}
                          {dueDate && (
                            <span className={overdue ? "font-semibold text-red-600" : ""}>
                              {overdue ? "Überfällig: " : "Fällig: "}
                              {dueDate.toLocaleDateString("de-DE", {
                                day: "2-digit",
                                month: "2-digit",
                              })}
                            </span>
                          )}
                        </div>
                      </div>
                      <TaskStatusBadge status={task.status} />
                    </div>
                  );
                })}
                {tasks.length === 0 && (
                  <p className="py-8 text-center text-[13px] text-slate-400">
                    Noch keine Aufgaben für dieses Projekt.
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Rechte Spalte: Aktivitäten */}
          <div>
            <h2 className="mb-3 text-[15px] font-bold text-slate-900">Aktivitäten</h2>
            <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
              {allActivities.length > 0 ? (
                <div className="divide-y divide-slate-100">
                  {allActivities.map((act: any) => (
                    <div key={act.id} className="px-4 py-3">
                      <div className="text-[13px] text-slate-700">
                        <span className="font-semibold capitalize">{act.action}</span>
                        {act.details?.title && (
                          <span className="text-slate-500">
                            : {act.details.title}
                          </span>
                        )}
                      </div>
                      <div className="mt-0.5 flex items-center gap-2 text-[11px] text-slate-400">
                        <span>{formatRelative(act.created_at)}</span>
                        <span className="text-slate-300">|</span>
                        <span>{act.source}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="px-4 py-8 text-center text-[13px] text-slate-400">
                  Noch keine Aktivitäten.
                </p>
              )}
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
