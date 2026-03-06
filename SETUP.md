# Setup-Anleitung: KI-Agent Projektdokumentation

## Voraussetzungen
- Node.js 18+ installiert
- Claude Code installiert
- Supabase-Account (supabase.com)
- Anthropic API-Key (console.anthropic.com)

---

## Schritt 1: Supabase-Projekt erstellen

1. Gehe zu **supabase.com** → Dashboard → "New Project"
2. Name: `ki-agent-doku` (oder ähnlich)
3. Passwort: Sicheres Passwort generieren und notieren
4. Region: **EU West (Frankfurt)** ← wichtig für DSGVO
5. Warte bis das Projekt bereit ist (~2 Minuten)

## Schritt 2: Datenbank-Schema einspielen

1. Im Supabase-Dashboard: **SQL Editor** (linke Sidebar)
2. "New Query" klicken
3. Den kompletten Inhalt von `supabase-schema.sql` einfügen
4. "Run" klicken
5. Prüfen: Unter **Table Editor** sollten jetzt 5 Tabellen erscheinen (projects, topics, tasks, meeting_protocols, activity_log) mit Demo-Daten

## Schritt 3: Supabase-Credentials holen

Im Supabase-Dashboard → **Settings** → **API**:
- `Project URL` → das wird NEXT_PUBLIC_SUPABASE_URL
- `anon public` Key → das wird NEXT_PUBLIC_SUPABASE_ANON_KEY
- `service_role` Key → das wird SUPABASE_SERVICE_ROLE_KEY (nur server-side!)

## Schritt 4: Next.js-Projekt aufsetzen

Öffne Claude Code im Projektordner und gib folgende Anweisung:

```
Erstelle ein Next.js 14 Projekt (App Router) mit TypeScript und Tailwind CSS.
Installiere zusätzlich: @supabase/supabase-js, @supabase/ssr, @anthropic-ai/sdk.
Erstelle eine .env.local mit Platzhaltern für:
- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY  
- SUPABASE_SERVICE_ROLE_KEY
- ANTHROPIC_API_KEY
Lies die CLAUDE.md für den vollständigen Projektkontext.
```

## Schritt 5: .env.local befüllen

Trage die echten Werte aus Schritt 3 ein und deinen Anthropic API-Key:

```
NEXT_PUBLIC_SUPABASE_URL=https://dein-projekt.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
ANTHROPIC_API_KEY=sk-ant-api03-...
```

## Schritt 6: Frontend bauen lassen

Ab hier übernimmt Claude Code. Gib ihm schrittweise Aufgaben:

### 6a: Supabase-Client + Types
```
Erstelle den Supabase Browser- und Server-Client in lib/supabase/.
Generiere TypeScript-Types aus dem Datenbankschema (siehe supabase/migrations/001_initial_schema.sql).
```

### 6b: Dashboard-Seite
```
Baue die Dashboard-Seite (app/page.tsx) als Projektübersicht.
Lade die Projekte aus Supabase mit der View v_project_dashboard.
Zeige pro Projekt: Name, Status, Abteilungen, offene Themen/Aufgaben, nächstes Meeting.
Design: Clean, professionell, deutsche UI-Texte.
```

### 6c: KI-Agent Input
```
Baue die KI-Agent Eingabekomponente (components/ai-input/).
Textfeld mit Submit-Button, POST an /api/ai/process.
Zeige das Ergebnis als Preview-Card mit Übernehmen/Verwerfen-Buttons.
Bei Übernahme: Eintrag in Supabase topics-Tabelle erstellen.
```

### 6d: API Route für Claude
```
Baue die API Route app/api/ai/process/route.ts.
Sie soll: 
1. Aktive Projekte aus Supabase laden
2. Den System-Prompt aus prompts/topic-extraction.md laden
3. Die Claude API aufrufen (claude-sonnet-4-20250514)
4. Das JSON-Ergebnis parsen und zurückgeben
5. Fehlerbehandlung für ungültiges JSON von Claude
```

### 6e: Themen-, Aufgaben- und Agenda-Seiten
```
Baue die Seiten für Themen (app/topics/page.tsx), 
Aufgaben (app/tasks/page.tsx) und Meeting-Agenda (app/agenda/page.tsx).
Themen: Filterbar nach Projekt und Abteilung.
Aufgaben: Tabellenansicht mit Status-Badges.
Agenda: Nur Themen mit meeting_agenda=true und Status Offen/In Diskussion.
```

---

## Ordnerstruktur nach Setup

```
C:\Users\d.endres\KI-Agent-Projektdokumentation\
├── CLAUDE.md                          ← Projektkontext für Claude Code
├── supabase-schema.sql                ← DB-Schema (bereits eingespielt)
├── system-prompt-themenerfassung.md   ← System-Prompt für Claude API
├── ki-agent-dashboard.jsx             ← Prototyp (Referenz)
├── phase1-setup-guide.docx            ← Setup-Doku
├── ki-agent-architektur.docx          ← Architektur-Doku
│
├── app/                               ← Next.js App (wird von Claude Code erstellt)
│   ├── layout.tsx
│   ├── page.tsx
│   ├── topics/
│   ├── tasks/
│   ├── agenda/
│   └── api/ai/process/
├── components/
├── lib/
├── prompts/
│   └── topic-extraction.md
├── .env.local                         ← Credentials (NICHT committen!)
├── .gitignore
├── package.json
└── tsconfig.json
```

---

## Git & GitHub

Sobald das Projekt läuft:

```bash
git init
git add .
git commit -m "Initial: KI-Agent Projektdokumentation"
git remote add origin https://github.com/DEIN-USERNAME/ki-agent-projektdoku.git
git push -u origin main
```

**Wichtig**: .env.local steht in .gitignore → Credentials werden nicht gepusht.
