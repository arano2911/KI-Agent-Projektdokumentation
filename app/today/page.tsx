import { createClient } from "@/lib/supabase/server";
import { Header } from "@/components/layout/header";
import { TodayDashboard } from "@/components/today/today-dashboard";
import type { Task } from "@/lib/types/database";

export const revalidate = 0;

export default async function TodayPage() {
  const supabase = createClient();
  const today = new Date().toISOString().split("T")[0];

  // Alle relevanten Tasks laden: heute fällig, überfällig, heutige To-Dos
  const { data: tasks } = await supabase
    .from("tasks")
    .select("*")
    .or(`due_date.eq.${today},and(due_date.lt.${today},status.neq.Erledigt),and(is_todo.eq.true,due_date.eq.${today})`)
    .order("due_date", { ascending: true });

  const allTasks = (tasks ?? []) as Task[];

  const dueTodayTasks = allTasks.filter(
    (t) => t.due_date === today && !t.is_todo && t.status !== "Erledigt"
  );
  const overdueTasks = allTasks.filter(
    (t) => t.due_date !== null && t.due_date < today && t.status !== "Erledigt"
  );
  const todoTasks = allTasks.filter(
    (t) => t.is_todo && t.due_date === today
  );

  return (
    <>
      <Header />
      <main className="mx-auto max-w-[800px] px-6 py-6">
        <TodayDashboard
          today={today}
          dueTodayTasks={dueTodayTasks}
          overdueTasks={overdueTasks}
          todoTasks={todoTasks}
        />
      </main>
    </>
  );
}
