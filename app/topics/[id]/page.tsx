import { createClient } from "@/lib/supabase/server";
import { Header } from "@/components/layout/header";
import { TopicDetail } from "@/components/topics/topic-detail";
import { notFound } from "next/navigation";
import type { TopicWithProject, TaskWithProject } from "@/lib/types/database";

export const revalidate = 0;

export default async function TopicDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createClient();
  const { id } = await params;

  // Topic mit Projektinfos laden
  // .limit(1) + [0] statt .single() — .single() erzeugt PGRST116 mit embedded joins
  const { data: topics, error } = await supabase
    .from("topics")
    .select("*, projects:project_id(id, name)")
    .eq("id", id)
    .limit(1);

  const topic = topics?.[0] ?? null;

  if (error || !topic) {
    notFound();
  }

  // Zugeordnete Tasks laden (über topic_id)
  const { data: tasks } = await supabase
    .from("tasks")
    .select("*, projects:project_id(name)")
    .eq("topic_id", id)
    .order("created_at", { ascending: false });

  // Projekte für Dropdown
  const { data: projects } = await supabase
    .from("projects")
    .select("id, name")
    .order("name");

  return (
    <>
      <Header />
      <main className="mx-auto max-w-[1200px] px-6 py-6">
        <TopicDetail
          topic={topic as TopicWithProject}
          tasks={(tasks ?? []) as TaskWithProject[]}
          projects={(projects ?? []) as { id: string; name: string }[]}
        />
      </main>
    </>
  );
}
