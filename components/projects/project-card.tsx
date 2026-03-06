import Link from "next/link";
import { StatusBadge, DeptBadge } from "@/components/ui/badge";
import type { ProjectDashboard } from "@/lib/types/database";

export function ProjectCard({ project }: { project: ProjectDashboard }) {
  const meetingDate = project.next_meeting
    ? new Date(project.next_meeting).toLocaleDateString("de-DE", {
        day: "2-digit",
        month: "2-digit",
      })
    : null;

  return (
    <Link
      href={`/projects/${project.id}`}
      className="group rounded-[14px] border border-slate-200 bg-white p-5 shadow-sm transition-all hover:border-indigo-400 hover:shadow-md hover:shadow-indigo-500/10"
    >
      {/* Kopfzeile: Name + Status */}
      <div className="mb-3 flex items-start justify-between gap-2">
        <h3 className="text-[15px] font-bold leading-snug">{project.name}</h3>
        <StatusBadge status={project.status} />
      </div>

      {/* Abteilungen */}
      <div className="mb-3.5 flex flex-wrap gap-1">
        {project.departments.map((dept) => (
          <DeptBadge key={dept} dept={dept} />
        ))}
      </div>

      {/* Kennzahlen */}
      <div className="flex items-center gap-5 text-[13px] text-slate-500">
        <div>
          <span className="font-semibold text-slate-800">
            {project.offene_themen}
          </span>{" "}
          Themen
        </div>
        <div>
          <span className="font-semibold text-slate-800">
            {project.offene_aufgaben}
          </span>{" "}
          Aufgaben
        </div>
        {project.blockierte_aufgaben > 0 && (
          <div className="text-red-600">
            <span className="font-semibold">{project.blockierte_aufgaben}</span>{" "}
            blockiert
          </div>
        )}
        {meetingDate && (
          <div className="ml-auto text-xs">Meeting: {meetingDate}</div>
        )}
      </div>
    </Link>
  );
}
