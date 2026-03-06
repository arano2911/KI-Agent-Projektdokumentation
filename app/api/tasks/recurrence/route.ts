import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { Database, Task } from "@/lib/types/database";

function getNextDueDate(dueDate: string, recurrence: string, recurrenceDay: number | null): string {
  const date = new Date(dueDate + "T00:00:00");
  switch (recurrence) {
    case "daily":
      date.setDate(date.getDate() + 1);
      break;
    case "weekly":
      if (recurrenceDay !== null) {
        // recurrence_day: 1=Montag ... 7=Sonntag (ISO weekday)
        const jsDay = recurrenceDay === 7 ? 0 : recurrenceDay; // JS: 0=So, 1=Mo...
        date.setDate(date.getDate() + 1); // mindestens einen Tag weiter
        while (date.getDay() !== jsDay) {
          date.setDate(date.getDate() + 1);
        }
      } else {
        date.setDate(date.getDate() + 7);
      }
      break;
    case "monthly":
      if (recurrenceDay !== null) {
        // Nächster Monat, gewählter Tag
        date.setMonth(date.getMonth() + 1);
        const maxDay = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
        date.setDate(Math.min(recurrenceDay, maxDay));
      } else {
        date.setMonth(date.getMonth() + 1);
      }
      break;
  }
  return date.toISOString().split("T")[0];
}

export async function POST() {
  try {
    const supabase = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const today = new Date().toISOString().split("T")[0];

    // Alle erledigten Tasks mit Wiederholung und due_date < heute
    const { data: recurringTasks, error } = await supabase
      .from("tasks")
      .select("*")
      .not("recurrence", "is", null)
      .eq("status", "Erledigt")
      .lt("due_date", today);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    let created = 0;

    for (const task of (recurringTasks ?? []) as Task[]) {
      const nextDate = getNextDueDate(task.due_date!, task.recurrence!, task.recurrence_day);

      // Prüfen: recurrence_end überschritten?
      if (task.recurrence_end && nextDate > task.recurrence_end) {
        continue;
      }

      // Prüfen: existiert bereits eine offene Kopie für das neue Datum?
      const { data: existing } = await supabase
        .from("tasks")
        .select("id")
        .eq("title", task.title)
        .eq("due_date", nextDate)
        .neq("status", "Erledigt")
        .limit(1);

      if (existing && existing.length > 0) {
        continue;
      }

      // Neue Instanz erstellen
      const { error: insertError } = await supabase.from("tasks").insert({
        title: task.title,
        description: task.description,
        project_id: task.project_id,
        topic_id: task.topic_id,
        assignee: task.assignee,
        status: "Offen",
        due_date: nextDate,
        recurrence: task.recurrence,
        recurrence_day: task.recurrence_day,
        recurrence_end: task.recurrence_end,
        is_todo: task.is_todo,
        source: task.source,
        is_mine: task.is_mine,
      } as never);

      if (!insertError) {
        created++;
      }
    }

    return NextResponse.json({ processed: (recurringTasks ?? []).length, created });
  } catch {
    return NextResponse.json(
      { error: "Interner Fehler bei Wiederholungs-Prüfung." },
      { status: 500 }
    );
  }
}
