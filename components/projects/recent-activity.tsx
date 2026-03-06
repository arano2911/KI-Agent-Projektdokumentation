import { TopicStatusBadge, PriorityDot } from "@/components/ui/badge";
import type { Topic } from "@/lib/types/database";

interface RecentTopic extends Topic {
  projects: { name: string } | null;
}

export function RecentActivity({ topics }: { topics: RecentTopic[] }) {
  if (topics.length === 0) {
    return (
      <p className="py-10 text-center text-sm text-slate-400">
        Noch keine Aktivitäten vorhanden.
      </p>
    );
  }

  return (
    <div className="overflow-hidden rounded-[14px] border border-slate-200 bg-white">
      {topics.map((topic, i) => (
        <div
          key={topic.id}
          className={`flex items-center gap-3 px-5 py-3.5 ${
            i < topics.length - 1 ? "border-b border-slate-50" : ""
          }`}
        >
          {/* Source Icon */}
          <div
            className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-sm ${
              topic.source === "KI-Agent"
                ? "bg-gradient-to-br from-indigo-500 to-violet-500 font-bold text-white"
                : "bg-slate-100 text-slate-500"
            }`}
          >
            {topic.source === "KI-Agent"
              ? "M"
              : topic.source === "Meeting"
                ? "M"
                : "\u270E"}
          </div>

          {/* Text */}
          <div className="min-w-0 flex-1">
            <div className="truncate text-[13px] font-semibold">
              {topic.title}
            </div>
            <div className="text-xs text-slate-400">
              {topic.projects?.name ?? "Nicht zugeordnet"} &middot;{" "}
              {new Date(topic.created_at).toLocaleDateString("de-DE")}
            </div>
          </div>

          {/* Rechts: Priorität + Status */}
          <div className="flex flex-shrink-0 items-center gap-2">
            <PriorityDot priority={topic.priority} />
            <TopicStatusBadge status={topic.status} />
          </div>
        </div>
      ))}
    </div>
  );
}
