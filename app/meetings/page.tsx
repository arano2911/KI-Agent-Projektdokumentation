import { createClient } from "@/lib/supabase/server";
import { Header } from "@/components/layout/header";
import { MeetingUpload } from "@/components/meetings/meeting-upload";
import type { MeetingProtocol, Project } from "@/lib/types/database";

export const revalidate = 0;

export default async function MeetingsPage() {
  const supabase = createClient();

  const [protocolsRes, projectsRes] = await Promise.all([
    supabase
      .from("meeting_protocols")
      .select("*, projects:project_id(name)")
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("projects")
      .select("id, name")
      .neq("status", "Pausiert")
      .returns<Pick<Project, "id" | "name">[]>(),
  ]);

  const protocols = (protocolsRes.data ?? []) as (MeetingProtocol & {
    projects: { name: string } | null;
  })[];
  const projects = projectsRes.data ?? [];

  return (
    <>
      <Header />
      <main className="mx-auto max-w-[1200px] px-6 py-6">
        {/* Upload + Verarbeitung */}
        <MeetingUpload projects={projects} />

        {/* Bisherige Protokolle */}
        <h2 className="mb-4 text-lg font-bold">Bisherige Protokolle</h2>
        {protocols.length === 0 ? (
          <p className="py-10 text-center text-sm text-slate-400">
            Noch keine Protokolle vorhanden.
          </p>
        ) : (
          <div className="space-y-3">
            {protocols.map((p) => (
              <div
                key={p.id}
                className="rounded-xl border border-slate-200 bg-white p-4"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-sm font-semibold text-slate-900">
                      {p.title}
                    </div>
                    {p.summary && (
                      <div className="mt-1 text-[13px] leading-relaxed text-slate-500">
                        {p.summary}
                      </div>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {p.projects?.name && (
                      <span className="rounded bg-indigo-50 px-2 py-0.5 text-[11px] font-semibold text-indigo-600">
                        {p.projects.name}
                      </span>
                    )}
                    <span
                      className={`rounded px-2 py-0.5 text-[11px] font-semibold ${
                        p.status === "Verarbeitet"
                          ? "bg-emerald-50 text-emerald-600"
                          : p.status === "Roh"
                            ? "bg-slate-100 text-slate-500"
                            : "bg-amber-50 text-amber-600"
                      }`}
                    >
                      {p.status}
                    </span>
                  </div>
                </div>
                <div className="mt-2 flex gap-4 text-[11px] text-slate-400">
                  {p.meeting_date && (
                    <span>
                      Meeting:{" "}
                      {new Date(p.meeting_date).toLocaleDateString("de-DE")}
                    </span>
                  )}
                  {p.participants.length > 0 && (
                    <span>Teilnehmer: {p.participants.join(", ")}</span>
                  )}
                  <span>
                    Erstellt:{" "}
                    {new Date(p.created_at).toLocaleDateString("de-DE")}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </>
  );
}
