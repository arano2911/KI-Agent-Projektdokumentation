import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import Anthropic from "@anthropic-ai/sdk";
import { readFile } from "fs/promises";
import path from "path";
import type { Database, Project, Task } from "@/lib/types/database";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

function extractJson(text: string): string {
  const fenced = text.match(/```(?:json)?\s*\n?([\s\S]*?)```/);
  if (fenced) return fenced[1].trim();
  const raw = text.match(/\{[\s\S]*\}/);
  if (raw) return raw[0].trim();
  return text.trim();
}

interface ChatAction {
  typ: "task_create" | "task_query" | "reminder";
  titel?: string;
  beschreibung?: string | null;
  due_date?: string | null;
  projekt?: string | null;
  prioritaet?: string;
}

interface ChatResult {
  antwort: string;
  aktionen: ChatAction[];
}

interface ConversationMessage {
  role: "user" | "assistant";
  content: string;
}

export async function POST(request: Request) {
  try {
    const { message, conversation_history } = await request.json();

    if (!message || typeof message !== "string" || !message.trim()) {
      return NextResponse.json(
        { error: "Nachricht darf nicht leer sein." },
        { status: 400 }
      );
    }

    const supabase = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const today = new Date().toISOString().split("T")[0];

    // ──── Kontext aus Supabase laden ────

    const [projectsRes, projectIdsRes, todayTasksRes, openTasksRes] =
      await Promise.all([
        supabase
          .from("projects")
          .select("name, status, departments")
          .neq("status", "Pausiert")
          .returns<Pick<Project, "name" | "status" | "departments">[]>(),
        supabase
          .from("projects")
          .select("id, name")
          .returns<{ id: string; name: string }[]>(),
        supabase
          .from("tasks")
          .select("title, status, due_date, assignee, project_id, is_todo")
          .or(
            `due_date.eq.${today},and(due_date.lt.${today},status.neq.Erledigt)`
          )
          .order("due_date", { ascending: true })
          .returns<
            Pick<
              Task,
              | "title"
              | "status"
              | "due_date"
              | "assignee"
              | "project_id"
              | "is_todo"
            >[]
          >(),
        supabase
          .from("tasks")
          .select("title, status, due_date, assignee, project_id")
          .neq("status", "Erledigt")
          .order("due_date", { ascending: true })
          .limit(50)
          .returns<
            Pick<
              Task,
              "title" | "status" | "due_date" | "assignee" | "project_id"
            >[]
          >(),
      ]);

    // Projekt-ID → Name Mapping
    const projectMap = new Map<string, string>();
    for (const p of projectIdsRes.data ?? []) {
      projectMap.set(p.id, p.name);
    }

    // ──── Kontext formatieren ────

    const projekteListe =
      (projectsRes.data ?? []).length > 0
        ? (projectsRes.data ?? [])
            .map(
              (p) =>
                `- ${p.name} (${p.status}) [${p.departments.join(", ")}]`
            )
            .join("\n")
        : "Keine aktiven Projekte.";

    const heutigeTasks =
      (todayTasksRes.data ?? [])
        .map((t) => {
          const proj = t.project_id
            ? projectMap.get(t.project_id) ?? "Ohne Projekt"
            : "Ohne Projekt";
          const overdue =
            t.due_date && t.due_date < today ? " [ÜBERFÄLLIG]" : "";
          return `- ${t.title} | ${t.status} | Fällig: ${t.due_date ?? "–"} | ${proj} | ${t.assignee ?? "–"}${overdue}`;
        })
        .join("\n") || "Keine heutigen oder überfälligen Aufgaben.";

    const offeneTasks =
      (openTasksRes.data ?? [])
        .map((t) => {
          const proj = t.project_id
            ? projectMap.get(t.project_id) ?? "Ohne Projekt"
            : "Ohne Projekt";
          return `- ${t.title} | ${t.status} | Fällig: ${t.due_date ?? "–"} | ${proj} | ${t.assignee ?? "–"}`;
        })
        .join("\n") || "Keine offenen Aufgaben.";

    // ──── System-Prompt laden ────

    const promptPath = path.join(process.cwd(), "prompts", "chat.md");
    const rawPrompt = await readFile(promptPath, "utf-8");
    const systemPrompt = rawPrompt
      .replace("{{PROJEKTE}}", projekteListe)
      .replace("{{HEUTIGE_TASKS}}", heutigeTasks)
      .replace("{{OFFENE_TASKS}}", offeneTasks)
      .replaceAll("{{HEUTE}}", today);

    // ──── Messages aufbauen ────

    const messages: Anthropic.MessageParam[] = [];

    if (Array.isArray(conversation_history)) {
      for (const msg of conversation_history as ConversationMessage[]) {
        if (msg.role === "user" || msg.role === "assistant") {
          messages.push({ role: msg.role, content: msg.content });
        }
      }
    }

    messages.push({ role: "user", content: message });

    // ──── Claude API aufrufen ────

    const MAX_ATTEMPTS = 2;
    let lastError: Error | null = null;
    let parsed: ChatResult | null = null;

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      const response = await anthropic.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 2000,
        system: systemPrompt,
        messages,
      });

      const textBlock = response.content.find((b) => b.type === "text");
      if (!textBlock || textBlock.type !== "text") {
        lastError = new Error("Keine Text-Antwort von Claude erhalten.");
        continue;
      }

      const cleaned = extractJson(textBlock.text);

      try {
        const result = JSON.parse(cleaned);
        if (!result.antwort) {
          lastError = new Error("Unvollständige JSON-Antwort.");
          continue;
        }
        if (!Array.isArray(result.aktionen)) {
          result.aktionen = [];
        }
        parsed = result;
        break;
      } catch {
        lastError = new Error(
          `Ungültiges JSON (Versuch ${attempt}): ${cleaned.slice(0, 200)}`
        );
      }
    }

    if (!parsed) {
      return NextResponse.json(
        {
          error: "Claude hat kein gültiges JSON zurückgegeben.",
          details: lastError?.message,
        },
        { status: 502 }
      );
    }

    // ──── Aktionen ausführen ────

    const ausgefuehrteAktionen: {
      typ: string;
      titel?: string;
      erfolg: boolean;
      details?: string;
    }[] = [];

    for (const aktion of parsed.aktionen) {
      if (aktion.typ === "task_create" || aktion.typ === "reminder") {
        // Projekt-ID ermitteln
        let projectId: string | null = null;
        if (aktion.projekt) {
          const match = (projectIdsRes.data ?? []).find(
            (p) => p.name === aktion.projekt
          );
          projectId = match?.id ?? null;
        }

        const { data: insertedTask, error: insertError } = await supabase
          .from("tasks")
          .insert({
            title: aktion.titel ?? "Ohne Titel",
            description: aktion.beschreibung ?? null,
            project_id: projectId,
            status: "Offen",
            due_date: aktion.due_date ?? null,
            is_mine: true,
            is_todo: aktion.typ === "reminder",
            source: "KI-Agent",
            assignee: null,
          } as never)
          .select("id")
          .single();

        if (insertError) {
          ausgefuehrteAktionen.push({
            typ: aktion.typ,
            titel: aktion.titel,
            erfolg: false,
            details: insertError.message,
          });
        } else {
          ausgefuehrteAktionen.push({
            typ: aktion.typ,
            titel: aktion.titel,
            erfolg: true,
          });

          // Activity Log
          if (insertedTask) {
            await supabase.from("activity_log").insert({
              entity_type: "task",
              entity_id: (insertedTask as Record<string, string>).id,
              action: "erstellt",
              details: {
                title: aktion.titel,
                via: "Misty Chat",
              },
              source: "KI-Agent",
            } as never);
          }
        }
      } else if (aktion.typ === "task_query") {
        ausgefuehrteAktionen.push({
          typ: "task_query",
          titel: aktion.beschreibung ?? "Abfrage",
          erfolg: true,
        });
      }
    }

    return NextResponse.json({
      antwort: parsed.antwort,
      ausgefuehrte_aktionen: ausgefuehrteAktionen,
    });
  } catch (error) {
    console.error("Chat API error:", error);
    return NextResponse.json(
      {
        error: "Interner Fehler bei der Chat-Verarbeitung.",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
