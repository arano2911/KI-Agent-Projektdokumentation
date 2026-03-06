import { createClient } from "@/lib/supabase/server";
import { Header } from "@/components/layout/header";
import { AiInput } from "@/components/ai-input/ai-input";
import { ProjectCard } from "@/components/projects/project-card";
import { RecentActivity } from "@/components/projects/recent-activity";
import type { ProjectDashboard, Topic } from "@/lib/types/database";

export const revalidate = 0;

export default async function DashboardPage() {
  const supabase = createClient();

  const [projectsRes, topicsRes] = await Promise.all([
    supabase
      .from("v_project_dashboard" as never)
      .select("*")
      .returns<ProjectDashboard[]>(),
    supabase
      .from("topics")
      .select("*, projects:project_id(name)")
      .order("created_at", { ascending: false })
      .limit(4),
  ]);

  const projects: ProjectDashboard[] = projectsRes.data ?? [];
  const recentTopics = (topicsRes.data ?? []) as (Topic & {
    projects: { name: string } | null;
  })[];

  return (
    <>
      <Header />
      <main className="mx-auto max-w-[1200px] px-6 py-6">
        {/* Misty Eingabe */}
        <AiInput />

        {/* Projekte */}
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold">Projekte</h2>
          <span className="text-[13px] text-slate-500">
            {projects.length} aktiv
          </span>
        </div>

        <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
          {projects.length === 0 && (
            <p className="col-span-full py-10 text-center text-sm text-slate-400">
              Keine aktiven Projekte gefunden.
            </p>
          )}
        </div>

        {/* Letzte Aktivitäten */}
        <h2 className="mb-4 text-lg font-bold">Letzte Aktivitäten</h2>
        <RecentActivity topics={recentTopics} />
      </main>
    </>
  );
}
