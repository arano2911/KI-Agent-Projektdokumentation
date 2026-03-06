# KI-Agent Fachliche Projektdokumentation

## Projektziel
KI-Agent, der fachliche Projektdokumentation für die Zusammenarbeit mit Fachabteilungen übernimmt. Er schließt die Lücke zwischen technischer Entwicklung (GitHub, Claude Code) und der fachlichen Kommunikation mit Business, Marketing, HR, Geschäftsführung und IT.

## Kernfunktionen
1. **Themen + Aufgaben erfassen**: Per natürlicher Sprache Anforderungen, Entscheidungen, Diskussionspunkte und Aufgaben dokumentieren. Claude analysiert die Eingabe und erstellt strukturierte Einträge — Themen werden in `topics` gespeichert, erkannte Aufgaben zusätzlich in `tasks`.
2. **Meeting-Protokolle verarbeiten**: Rohprotokolle oder Transkripte einlesen, daraus Aufgaben, Entscheidungen und offene Punkte ableiten.
3. **GitHub-Sync**: Technische Fortschritte aus GitHub automatisch in fachlich verständliche Status-Updates übersetzen.
4. **Meeting-Agenda**: Automatisch alle offenen Diskussionspunkte für das nächste Meeting zusammenstellen.

## Aktueller Stand (März 2026)

### ✅ Fertig (Phase 1+2)
- Next.js 14 Projekt mit App Router, Build + Dev-Server laufen
- Supabase-Schema komplett (5 Tabellen, 2 Views, deutsche Enums, RLS offen für Prototyp)
- Dashboard: Projektübersicht via `v_project_dashboard` View + Letzte Aktivitäten
- KI-Agent: Freitext → Claude API → JSON-Preview → Supabase (Topics + Tasks)
- Themen-Seite: Vollständige Übersicht mit Filtern (Projekt, Status, Typ, Priorität, Suche)
- Aufgaben-Seite: Kanban-Board (4 Spalten) + Listenansicht mit Filtern
- Meeting-Agenda: Gruppiert nach Projekt, sortiert nach Priorität, via `v_meeting_agenda` View
- Demo-Daten für alle Tabellen eingespielt

### 🔲 Offen
- Projektkarten auf Dashboard klickbar → Projektdetailseite
- Meeting-Protokoll Upload + KI-Verarbeitung (Phase 4)
- GitHub-Webhook Integration (Phase 3)
- Supabase Auth einbauen (aktuell: offene RLS-Policies für Prototyp)
- n8n Automatisierung (Phase 4)
- Vercel Deployment

## Tech-Stack
- **Frontend**: Next.js 14 (App Router), React, Tailwind CSS
- **Backend/DB**: Supabase (PostgreSQL), RLS aktiv (offene Policies für Prototyp)
- **KI**: Claude API (claude-sonnet-4-20250514) für Textverarbeitung und Extraktion
- **Deployment**: Vercel (geplant)
- **Automatisierung**: n8n (Phase 4, geplant)

## Projektstruktur
```
├── app/
│   ├── layout.tsx              # Root Layout mit Supabase Provider
│   ├── page.tsx                # Dashboard (v_project_dashboard View)
│   ├── topics/page.tsx         # Themen-Übersicht mit Filtern
│   ├── tasks/page.tsx          # Aufgaben-Board (Kanban + Liste)
│   ├── agenda/page.tsx         # Meeting-Agenda (gruppiert nach Projekt)
│   └── api/
│       └── ai/process/route.ts # Claude API: Thema + Aufgaben aus Freitext
├── components/
│   ├── layout/header.tsx       # Navigation (Dashboard, Themen, Aufgaben, Meeting-Agenda)
│   ├── ai-input/ai-input.tsx   # KI-Agent Eingabefeld mit Preview + Übernehmen
│   ├── projects/
│   │   ├── project-card.tsx    # Projektkarte für Dashboard
│   │   └── recent-activity.tsx # Letzte Aktivitäten
│   ├── topics/
│   │   └── topic-filters.tsx   # Filter-Bar + Themenliste
│   ├── tasks/
│   │   └── task-board.tsx      # Kanban-Board + Listenansicht
│   └── agenda/
│       └── agenda-list.tsx     # Agenda gruppiert nach Projekt
├── lib/
│   ├── supabase/
│   │   ├── client.ts           # Browser-Client (createBrowserClient)
│   │   └── server.ts           # Server-Client (createServerClient)
│   └── types/
│       └── database.ts         # TypeScript Types (aus DB-Schema)
├── prompts/
│   └── topic-extraction.md     # System-Prompt für Claude API
└── .env.local                  # Supabase + Anthropic Keys
```

## Datenmodell
5 Haupttabellen + 2 Views in Supabase:

### Tabellen
- **projects**: KI-Projekte (Status: Planung/In Entwicklung/Testing/Live/Pausiert)
- **topics**: Fachliche Themen (Typ: Anforderung/Entscheidung/Diskussionspunkt/Information)
- **tasks**: Aufgaben mit Zuständigen und Deadlines (Status: Offen/In Arbeit/Erledigt/Blockiert)
- **meeting_protocols**: Roh- und verarbeitete Protokolle
- **activity_log**: Audit-Trail (entity_type, entity_id, action, details, source)

### Views
- **v_project_dashboard**: Projekte mit Zählern (offene_themen, offene_aufgaben, blockierte_aufgaben, letzte_aktivitaet)
- **v_meeting_agenda**: Topics mit meeting_agenda=true, angereichert mit Projektinfo

### Enums (deutsche Werte!)
- project_status: Planung, In Entwicklung, Testing, Live, Pausiert
- topic_type: Anforderung, Entscheidung, Diskussionspunkt, Information
- topic_status: Offen, In Diskussion, Entschieden, Umgesetzt, Verworfen
- priority_level: Hoch, Mittel, Niedrig
- task_status: Offen, In Arbeit, Erledigt, Blockiert
- source_type: KI-Agent, Meeting, Manuell, GitHub
- department: Business, Marketing, HR, GF, IT

## Claude API Integration
API-Aufrufe laufen über Next.js API Routes (server-side), API-Key bleibt serverseitig.

### Themen + Aufgaben erfassen (POST /api/ai/process)
- Input: Freitext-Nachricht
- Kontext: Aktive Projektliste wird dynamisch aus Supabase geladen
- Output: JSON mit Thema + optionalem Aufgaben-Array
- System-Prompt: `prompts/topic-extraction.md`
- Retry-Logik: Bis zu 2 Versuche bei ungültigem JSON
- JSON-Extraktion: Erkennt ```json Blöcke und rohes JSON

### Flow im Frontend (ai-input.tsx)
1. User tippt Freitext → "Erfassen" klickt
2. POST an /api/ai/process → Claude extrahiert strukturiertes JSON
3. Preview-Card zeigt Ergebnis (Thema + Aufgaben)
4. "Übernehmen" → Insert in topics + tasks + activity_log
5. Erfolgsmeldung + Reset

## Environment Variables
```
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
ANTHROPIC_API_KEY=sk-ant-...
```

## RLS-Status
Aktuell: Offene `allow_all` Policies auf allen Tabellen + Views (Prototyp).
Geplant: `auth.role() = 'authenticated'` sobald Supabase Auth eingebaut wird.
GRANT ALL für `anon`-Rolle ist gesetzt.

## Coding-Konventionen
- TypeScript strict mode
- Tailwind CSS für Styling (keine CSS Modules)
- Server Components für Datenladen, Client Components für Interaktion
- Supabase: `createClient()` aus `lib/supabase/server.ts` (Server) bzw. `lib/supabase/client.ts` (Client)
- Fehlerbehandlung: Alle Claude API Calls mit try/catch, Retry bei ungültigem JSON
- Deutsche UI-Texte und Enum-Werte, englische Variablen/Funktionsnamen
- Komponenten-Struktur: Seite in `app/*/page.tsx` (Server), Interaktions-Logik in `components/*/` (Client)
