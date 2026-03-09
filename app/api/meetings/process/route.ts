import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import Anthropic from "@anthropic-ai/sdk";
import { readFile } from "fs/promises";
import path from "path";
import type { Database, Project } from "@/lib/types/database";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

// JSON aus Claude-Antwort extrahieren (```json Wrapper entfernen)
function extractJson(text: string): string {
  const fenced = text.match(/```(?:json)?\s*\n?([\s\S]*?)```/);
  if (fenced) return fenced[1].trim();

  const raw = text.match(/\{[\s\S]*\}/);
  if (raw) return raw[0].trim();

  return text.trim();
}

export async function POST(request: Request) {
  try {
    const { text } = await request.json();

    if (!text || typeof text !== "string" || !text.trim()) {
      return NextResponse.json(
        { error: "Protokolltext darf nicht leer sein." },
        { status: 400 }
      );
    }

    // 1. Aktive Projekte aus Supabase laden
    const supabase = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: projects } = await supabase
      .from("projects")
      .select("name, status, departments")
      .neq("status", "Pausiert")
      .returns<Pick<Project, "name" | "status" | "departments">[]>();

    const projektliste =
      projects && projects.length > 0
        ? projects
            .map(
              (p) =>
                `- ${p.name} (${p.status}) [${p.departments.join(", ")}]`
            )
            .join("\n")
        : "Keine aktiven Projekte vorhanden.";

    // 2. System-Prompt laden und Projektliste einsetzen
    const promptPath = path.join(
      process.cwd(),
      "prompts",
      "meeting-protocol.md"
    );
    const rawPrompt = await readFile(promptPath, "utf-8");
    const systemPrompt = rawPrompt.replace("{{PROJEKTLISTE}}", projektliste);

    // 3. Claude API aufrufen (mit Retry bei JSON-Fehler)
    const MAX_ATTEMPTS = 2;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      const response = await anthropic.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 3000,
        system: systemPrompt,
        messages: [{ role: "user", content: text }],
      });

      const textBlock = response.content.find((b) => b.type === "text");
      if (!textBlock || textBlock.type !== "text") {
        lastError = new Error("Keine Text-Antwort von Claude erhalten.");
        continue;
      }

      const cleaned = extractJson(textBlock.text);

      try {
        const parsed = JSON.parse(cleaned);

        // Validierung der erwarteten Felder
        if (!parsed.meeting || !parsed.zusammenfassung) {
          lastError = new Error("Unvollständige JSON-Antwort von Claude.");
          continue;
        }

        // Sicherstellen dass Arrays vorhanden sind
        if (!Array.isArray(parsed.themen)) parsed.themen = [];
        if (!Array.isArray(parsed.aufgaben)) parsed.aufgaben = [];
        if (!Array.isArray(parsed.entscheidungen)) parsed.entscheidungen = [];
        if (!Array.isArray(parsed.offene_punkte)) parsed.offene_punkte = [];

        // Arrays validieren
        parsed.themen = parsed.themen.filter(
          (t: any) => t && typeof t.titel === "string" && t.titel.trim()
        );
        parsed.aufgaben = parsed.aufgaben.filter(
          (a: any) => a && typeof a.titel === "string" && a.titel.trim()
        );
        parsed.entscheidungen = parsed.entscheidungen.filter(
          (e: any) => e && typeof e.titel === "string" && e.titel.trim()
        );
        parsed.offene_punkte = parsed.offene_punkte.filter(
          (o: any) => o && typeof o.titel === "string" && o.titel.trim()
        );

        return NextResponse.json(parsed);
      } catch {
        lastError = new Error(
          `Ungültiges JSON von Claude (Versuch ${attempt}): ${cleaned.slice(0, 200)}`
        );
      }
    }

    return NextResponse.json(
      {
        error: "Claude hat kein gültiges JSON zurückgegeben.",
        details: lastError?.message,
      },
      { status: 502 }
    );
  } catch (error) {
    console.error("Meeting process error:", error);
    return NextResponse.json(
      {
        error: "Interner Fehler bei der Protokoll-Verarbeitung.",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
