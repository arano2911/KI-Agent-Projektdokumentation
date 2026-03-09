import { createClient } from "@/lib/supabase/server";
import { Header } from "@/components/layout/header";
import { AgendaList } from "@/components/agenda/agenda-list";

export const revalidate = 0;

export interface AgendaItem {
  topic_id: string;
  thema: string;
  beschreibung: string | null;
  typ: string;
  prioritaet: string;
  abteilungen: string[];
  projekt: string | null;
  next_meeting: string | null;
}

export default async function AgendaPage() {
  const supabase = createClient();

  const { data: agendaItems } = await supabase
    .from("v_meeting_agenda" as never)
    .select("*")
    .returns<AgendaItem[]>();

  // Alle Topics mit meeting_agenda=true (Fallback falls View leer)
  const { data: allAgendaTopics } = await supabase
    .from("topics")
    .select("*, projects:project_id(name, next_meeting)")
    .eq("meeting_agenda", true)
    .order("priority", { ascending: true });

  const items = (agendaItems ?? []) as AgendaItem[];
  const fallbackTopics = (allAgendaTopics ?? []) as any[];

  return (
    <>
      <Header />
      <main className="mx-auto max-w-[1200px] px-6 py-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-900">Meeting-Agenda</h1>
            <p className="mt-0.5 text-[13px] text-slate-500">
              Themen die für Meetings vorgemerkt sind
            </p>
          </div>
        </div>

        <AgendaList items={items} fallbackTopics={fallbackTopics} />
      </main>
    </>
  );
}
