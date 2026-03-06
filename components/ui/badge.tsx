import type { ProjectStatus, TopicStatus, TaskStatus, Department, PriorityLevel } from "@/lib/types/database";

// ──── Status-Badge ────

const statusStyles: Record<ProjectStatus, string> = {
  Planung: "bg-indigo-50 text-indigo-700",
  "In Entwicklung": "bg-emerald-50 text-emerald-800",
  Testing: "bg-amber-50 text-amber-800",
  Live: "bg-green-50 text-green-800",
  Pausiert: "bg-gray-100 text-gray-500",
};

export function StatusBadge({ status }: { status: ProjectStatus }) {
  return (
    <span
      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusStyles[status] ?? "bg-gray-100 text-gray-600"}`}
    >
      {status}
    </span>
  );
}

// ──── Topic-Status-Badge ────

const topicStatusStyles: Record<TopicStatus, string> = {
  Offen: "bg-amber-100 text-amber-800",
  "In Diskussion": "bg-blue-100 text-blue-800",
  Entschieden: "bg-emerald-100 text-emerald-800",
  Umgesetzt: "bg-indigo-100 text-indigo-800",
  Verworfen: "bg-gray-100 text-gray-500",
};

export function TopicStatusBadge({ status }: { status: TopicStatus }) {
  return (
    <span
      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${topicStatusStyles[status] ?? "bg-gray-100 text-gray-600"}`}
    >
      {status}
    </span>
  );
}

// ──── Task-Status-Badge ────

const taskStatusStyles: Record<TaskStatus, string> = {
  Offen: "bg-amber-100 text-amber-800",
  "In Arbeit": "bg-blue-100 text-blue-800",
  Erledigt: "bg-emerald-100 text-emerald-800",
  Blockiert: "bg-red-100 text-red-900",
};

export function TaskStatusBadge({ status }: { status: TaskStatus }) {
  return (
    <span
      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${taskStatusStyles[status] ?? "bg-gray-100 text-gray-600"}`}
    >
      {status}
    </span>
  );
}

// ──── Department-Badge ────

const deptStyles: Record<Department, string> = {
  Business: "bg-violet-500/10 text-violet-600",
  Marketing: "bg-pink-500/10 text-pink-600",
  HR: "bg-orange-500/10 text-orange-600",
  GF: "bg-sky-500/10 text-sky-600",
  IT: "bg-indigo-500/10 text-indigo-600",
};

export function DeptBadge({ dept }: { dept: Department }) {
  return (
    <span
      className={`inline-block rounded px-2 py-0.5 text-[11px] font-semibold ${deptStyles[dept] ?? "bg-gray-100 text-gray-600"}`}
    >
      {dept}
    </span>
  );
}

// ──── Priority-Dot ────

const priorityColors: Record<PriorityLevel, string> = {
  Hoch: "bg-red-500",
  Mittel: "bg-amber-500",
  Niedrig: "bg-gray-400",
};

export function PriorityDot({ priority }: { priority: PriorityLevel }) {
  return (
    <span
      className={`inline-block h-2 w-2 rounded-full ${priorityColors[priority] ?? "bg-gray-400"}`}
    />
  );
}
