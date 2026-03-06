import { createClient } from "@/lib/supabase/server";
import { Header } from "@/components/layout/header";
import { TopicFilters } from "@/components/topics/topic-filters";
import type { Topic, Department, TopicType, TopicStatus, PriorityLevel } from "@/lib/types/database";

export const revalidate = 0;

export interface TopicWithProject extends Topic {
  projects: { name: string } | null;
}

export default async function TopicsPage() {
  const supabase = createClient();

  // Topics mit Projektname laden
  const { data: topics } = await supabase
    .from("topics")
    .select("*, projects:project_id(name)")
    .order("created_at", { ascending: false });

  // Projekte für Filter-Dropdown
  const { data: projects } = await supabase
    .from("projects")
    .select("id, name")
    .order("name");

  const allTopics = (topics ?? []) as TopicWithProject[];
  const projectList = (projects ?? []) as { id: string; name: string }[];

  return (
    <>
      <Header />
      <main className="mx-auto max-w-[1200px] px-6 py-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-900">Themen</h1>
            <p className="mt-0.5 text-[13px] text-slate-500">
              {allTopics.length} Themen erfasst
            </p>
          </div>
        </div>

        <TopicFilters topics={allTopics} projects={projectList} />
      </main>
    </>
  );
}
