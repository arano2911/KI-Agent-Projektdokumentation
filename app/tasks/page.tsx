import { createClient } from "@/lib/supabase/server";
import { Header } from "@/components/layout/header";
import { TaskBoard } from "@/components/tasks/task-board";
import type { Task } from "@/lib/types/database";

export const revalidate = 0;

export interface TaskWithRelations extends Task {
  projects: { name: string } | null;
  topics: { title: string } | null;
}

export default async function TasksPage() {
  const supabase = createClient();

  const { data: tasks } = await supabase
    .from("tasks")
    .select("*, projects:project_id(name), topics:topic_id(title)")
    .order("created_at", { ascending: false });

  const { data: projects } = await supabase
    .from("projects")
    .select("id, name")
    .order("name");

  const allTasks = (tasks ?? []) as TaskWithRelations[];
  const projectList = (projects ?? []) as { id: string; name: string }[];

  return (
    <>
      <Header />
      <main className="mx-auto max-w-[1200px] px-6 py-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-900">Aufgaben</h1>
            <p className="mt-0.5 text-[13px] text-slate-500">
              {allTasks.length} Aufgaben insgesamt
            </p>
          </div>
        </div>

        <TaskBoard tasks={allTasks} projects={projectList} />
      </main>
    </>
  );
}
