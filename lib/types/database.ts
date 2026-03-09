// ============================================================
// TypeScript Types — generiert aus supabase-schema.sql
// ============================================================

// Enum-Typen
export type ProjectStatus = "Planung" | "In Entwicklung" | "Testing" | "Live" | "Pausiert";
export type TopicType = "Anforderung" | "Entscheidung" | "Diskussionspunkt" | "Information";
export type TopicStatus = "Offen" | "In Diskussion" | "Entschieden" | "Umgesetzt" | "Verworfen";
export type PriorityLevel = "Hoch" | "Mittel" | "Niedrig";
export type TaskStatus = "Offen" | "In Arbeit" | "Erledigt" | "Blockiert";
export type SourceType = "KI-Agent" | "Meeting" | "Manuell" | "GitHub";
export type ProtocolStatus = "Roh" | "Verarbeitet" | "Review nötig";
export type Department = "Business" | "Marketing" | "HR" | "GF" | "IT";

// Tabellenzeilen
export interface Project {
  id: string;
  name: string;
  description: string | null;
  status: ProjectStatus;
  departments: Department[];
  project_lead: string | null;
  github_repo: string | null;
  next_meeting: string | null;
  start_date: string | null;
  target_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface Topic {
  id: string;
  title: string;
  description: string | null;
  project_id: string | null;
  type: TopicType;
  status: TopicStatus;
  priority: PriorityLevel;
  departments: Department[];
  meeting_agenda: boolean;
  source: SourceType;
  created_at: string;
  updated_at: string;
}

export type RecurrenceType = "daily" | "weekly" | "monthly";

export interface Task {
  id: string;
  title: string;
  description: string | null;
  project_id: string | null;
  topic_id: string | null;
  assignee: string | null;
  status: TaskStatus;
  due_date: string | null;
  recurrence: RecurrenceType | null;
  recurrence_day: number | null;
  recurrence_end: string | null;
  is_todo: boolean;
  source: SourceType;
  is_mine: boolean;
  github_issue_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface MeetingProtocol {
  id: string;
  title: string;
  meeting_date: string | null;
  project_id: string | null;
  participants: string[];
  raw_text: string | null;
  status: ProtocolStatus;
  summary: string | null;
  created_at: string;
  updated_at: string;
}

export interface ActivityLog {
  id: string;
  entity_type: string;
  entity_id: string;
  action: string;
  details: Record<string, unknown>;
  source: SourceType;
  created_at: string;
}

// View: v_project_dashboard
export interface ProjectDashboard {
  id: string;
  name: string;
  status: ProjectStatus;
  departments: Department[];
  next_meeting: string | null;
  offene_themen: number;
  offene_aufgaben: number;
  blockierte_aufgaben: number;
  letzte_aktivitaet: string | null;
}

// Erweiterte Types für Detail-Seiten
export interface TopicWithProject extends Topic {
  projects: { id: string; name: string } | null;
}

export interface TaskWithProject extends Task {
  projects: { name: string } | null;
}

// Supabase Database Type (für typisierte Queries)
export interface Database {
  public: {
    Tables: {
      projects: {
        Row: Project;
        Insert: Omit<Project, "id" | "created_at" | "updated_at"> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<Project, "id" | "created_at" | "updated_at">>;
        Relationships: [
          {
            foreignKeyName: "";
            columns: [];
            isOneToOne: false;
            referencedRelation: "";
            referencedColumns: [];
          },
        ];
      };
      topics: {
        Row: Topic;
        Insert: Omit<Topic, "id" | "created_at" | "updated_at"> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<Topic, "id" | "created_at" | "updated_at">>;
        Relationships: [
          {
            foreignKeyName: "topics_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
        ];
      };
      tasks: {
        Row: Task;
        Insert: Omit<Task, "id" | "created_at" | "updated_at"> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<Task, "id" | "created_at" | "updated_at">>;
        Relationships: [
          {
            foreignKeyName: "tasks_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tasks_topic_id_fkey";
            columns: ["topic_id"];
            isOneToOne: false;
            referencedRelation: "topics";
            referencedColumns: ["id"];
          },
        ];
      };
      meeting_protocols: {
        Row: MeetingProtocol;
        Insert: Omit<MeetingProtocol, "id" | "created_at" | "updated_at"> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<MeetingProtocol, "id" | "created_at" | "updated_at">>;
        Relationships: [
          {
            foreignKeyName: "meeting_protocols_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
        ];
      };
      activity_log: {
        Row: ActivityLog;
        Insert: Omit<ActivityLog, "id" | "created_at"> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Omit<ActivityLog, "id" | "created_at">>;
        Relationships: [];
      };
    };
    Views: {
      v_project_dashboard: {
        Row: ProjectDashboard;
        Relationships: [];
      };
      v_meeting_agenda: {
        Row: {
          topic_id: string;
          thema: string;
          beschreibung: string | null;
          typ: TopicType;
          prioritaet: PriorityLevel;
          abteilungen: Department[];
          projekt: string | null;
          next_meeting: string | null;
        };
        Relationships: [];
      };
    };
    Functions: Record<string, never>;
    Enums: {
      project_status: ProjectStatus;
      topic_type: TopicType;
      topic_status: TopicStatus;
      priority_level: PriorityLevel;
      task_status: TaskStatus;
      source_type: SourceType;
      protocol_status: ProtocolStatus;
      department: Department;
    };
  };
}
