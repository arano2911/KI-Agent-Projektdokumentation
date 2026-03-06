import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import Anthropic from "@anthropic-ai/sdk";
import { readFile } from "fs/promises";
import path from "path";
import type { Database } from "@/lib/types/database";

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

export async function POST(request: Request) {
  try {
    const { technicalText, projectId } = await request.json();

    if (!technicalText || typeof technicalText !== "string" || !technicalText.trim()) {
      return NextResponse.json(
        { error: "Technischer Text darf nicht leer sein." },
        { status: 400 }
      );
    }

    if (!projectId) {
      return NextResponse.json(
        { error: "Projekt-ID fehlt." },
        { status: 400 }
      );
    }

    // 1. Projektkontext aus Supabase laden
    const supabase = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: project } = await supabase
      .from("projects")
      .select("name, description, status, departments")
      .eq("id", projectId)
      .returns<{ name: string; description: string | null; status: string; departments: string[] }[]>()
      .single();

    if (!project) {
      return NextResponse.json(
        { error: "Projekt nicht gefunden." },
        { status: 404 }
      );
    }

    const projektkontext = [
      `Projekt: ${project.name}`,
      `Beschreibung: ${project.description ?? "Keine Beschreibung"}`,
      `Status: ${project.status}`,
      `Abteilungen: ${(project.departments as string[]).join(", ")}`,
    ].join("\n");

    // 2. System-Prompt laden
    const promptPath = path.join(
      process.cwd(),
      "prompts",
      "tech-translation.md"
    );
    const rawPrompt = await readFile(promptPath, "utf-8");
    const systemPrompt = rawPrompt.replace("{{PROJEKTKONTEXT}}", projektkontext);

    // 3. Claude API aufrufen
    const MAX_ATTEMPTS = 2;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      const response = await anthropic.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1000,
        system: systemPrompt,
        messages: [{ role: "user", content: technicalText }],
      });

      const textBlock = response.content.find((b) => b.type === "text");
      if (!textBlock || textBlock.type !== "text") {
        lastError = new Error("Keine Text-Antwort von Claude erhalten.");
        continue;
      }

      const cleaned = extractJson(textBlock.text);

      try {
        const parsed = JSON.parse(cleaned);

        if (!parsed.titel || !parsed.beschreibung) {
          lastError = new Error("Unvollständige JSON-Antwort von Claude.");
          continue;
        }

        return NextResponse.json({
          ...parsed,
          projektName: project.name,
          projectId,
        });
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
    console.error("Tech translation error:", error);
    return NextResponse.json(
      {
        error: "Interner Fehler bei der Übersetzung.",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
