-- ============================================================
-- KI-Agent Fachliche Projektdokumentation
-- Supabase Migration: Initiales Schema
-- ============================================================

-- Enum-Typen
CREATE TYPE project_status AS ENUM ('Planung', 'In Entwicklung', 'Testing', 'Live', 'Pausiert');
CREATE TYPE topic_type AS ENUM ('Anforderung', 'Entscheidung', 'Diskussionspunkt', 'Information');
CREATE TYPE topic_status AS ENUM ('Offen', 'In Diskussion', 'Entschieden', 'Umgesetzt', 'Verworfen');
CREATE TYPE priority_level AS ENUM ('Hoch', 'Mittel', 'Niedrig');
CREATE TYPE task_status AS ENUM ('Offen', 'In Arbeit', 'Erledigt', 'Blockiert');
CREATE TYPE source_type AS ENUM ('KI-Agent', 'Meeting', 'Manuell', 'GitHub');
CREATE TYPE protocol_status AS ENUM ('Roh', 'Verarbeitet', 'Review nötig');
CREATE TYPE department AS ENUM ('Business', 'Marketing', 'HR', 'GF', 'IT');

-- ============================================================
-- 1. PROJEKTE
-- ============================================================
CREATE TABLE projects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  status project_status DEFAULT 'Planung',
  departments department[] DEFAULT '{}',
  project_lead TEXT,
  github_repo TEXT,
  next_meeting DATE,
  start_date DATE,
  target_date DATE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 2. THEMEN
-- ============================================================
CREATE TABLE topics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  type topic_type DEFAULT 'Information',
  status topic_status DEFAULT 'Offen',
  priority priority_level DEFAULT 'Mittel',
  departments department[] DEFAULT '{}',
  meeting_agenda BOOLEAN DEFAULT false,
  source source_type DEFAULT 'Manuell',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 3. AUFGABEN
-- ============================================================
CREATE TABLE tasks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  topic_id UUID REFERENCES topics(id) ON DELETE SET NULL,
  assignee TEXT,
  status task_status DEFAULT 'Offen',
  due_date DATE,
  source source_type DEFAULT 'Manuell',
  github_issue_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 4. MEETING-PROTOKOLLE
-- ============================================================
CREATE TABLE meeting_protocols (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  meeting_date DATE,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  participants TEXT[] DEFAULT '{}',
  raw_text TEXT,
  status protocol_status DEFAULT 'Roh',
  summary TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 5. AKTIVITÄTSLOG (für Audit-Trail)
-- ============================================================
CREATE TABLE activity_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  entity_type TEXT NOT NULL, -- 'project', 'topic', 'task', 'protocol'
  entity_id UUID NOT NULL,
  action TEXT NOT NULL, -- 'created', 'updated', 'status_changed'
  details JSONB DEFAULT '{}',
  source source_type DEFAULT 'Manuell',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX idx_topics_project ON topics(project_id);
CREATE INDEX idx_topics_status ON topics(status);
CREATE INDEX idx_topics_meeting_agenda ON topics(meeting_agenda) WHERE meeting_agenda = true;
CREATE INDEX idx_tasks_project ON tasks(project_id);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_assignee ON tasks(assignee);
CREATE INDEX idx_protocols_project ON meeting_protocols(project_id);
CREATE INDEX idx_protocols_status ON meeting_protocols(status);
CREATE INDEX idx_activity_entity ON activity_log(entity_type, entity_id);

-- ============================================================
-- AUTO-UPDATE updated_at
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER projects_updated_at BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER topics_updated_at BEFORE UPDATE ON topics
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER tasks_updated_at BEFORE UPDATE ON tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER protocols_updated_at BEFORE UPDATE ON meeting_protocols
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- VIEWS für Fachabteilungen
-- ============================================================

-- Offene Meeting-Agenda: Alles, was besprochen werden muss
CREATE VIEW v_meeting_agenda AS
SELECT
  t.title AS thema,
  t.description AS beschreibung,
  t.type AS typ,
  t.priority AS prioritaet,
  t.departments AS abteilungen,
  p.name AS projekt,
  p.next_meeting
FROM topics t
LEFT JOIN projects p ON t.project_id = p.id
WHERE t.meeting_agenda = true
  AND t.status IN ('Offen', 'In Diskussion')
ORDER BY
  CASE t.priority WHEN 'Hoch' THEN 1 WHEN 'Mittel' THEN 2 ELSE 3 END,
  p.next_meeting ASC NULLS LAST;

-- Projekt-Dashboard: Übersicht pro Projekt
CREATE VIEW v_project_dashboard AS
SELECT
  p.id,
  p.name,
  p.status,
  p.departments,
  p.next_meeting,
  COUNT(DISTINCT t.id) FILTER (WHERE t.status NOT IN ('Umgesetzt', 'Verworfen')) AS offene_themen,
  COUNT(DISTINCT tk.id) FILTER (WHERE tk.status IN ('Offen', 'In Arbeit')) AS offene_aufgaben,
  COUNT(DISTINCT tk.id) FILTER (WHERE tk.status = 'Blockiert') AS blockierte_aufgaben,
  MAX(t.created_at) AS letzte_aktivitaet
FROM projects p
LEFT JOIN topics t ON t.project_id = p.id
LEFT JOIN tasks tk ON tk.project_id = p.id
WHERE p.status != 'Pausiert'
GROUP BY p.id, p.name, p.status, p.departments, p.next_meeting
ORDER BY
  CASE p.status WHEN 'In Entwicklung' THEN 1 WHEN 'Testing' THEN 2 WHEN 'Planung' THEN 3 ELSE 4 END;

-- ============================================================
-- ROW LEVEL SECURITY (RLS) — Basis-Setup
-- ============================================================
-- Für den Anfang: Alles offen für authentifizierte User.
-- Kann später pro Abteilung eingeschränkt werden.

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE meeting_protocols ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;

-- Policies: Authentifizierte User dürfen alles
CREATE POLICY "Authenticated users full access" ON projects
  FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users full access" ON topics
  FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users full access" ON tasks
  FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users full access" ON meeting_protocols
  FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users full access" ON activity_log
  FOR ALL USING (auth.role() = 'authenticated');

-- ============================================================
-- DEMO-DATEN (optional, zum Testen)
-- ============================================================
INSERT INTO projects (name, description, status, departments, project_lead, start_date) VALUES
  ('KI-Chatbot HR', 'Automatisierter FAQ-Bot für häufige HR-Anfragen wie Urlaubsanträge, Krankmeldungen und Benefits-Fragen.', 'In Entwicklung', '{HR, IT}', 'David', '2026-01-15'),
  ('Marketing KI-Assistent', 'KI-gestützter Assistent für die Erstellung und Optimierung von Marketing-Texten in mehreren Sprachen.', 'In Entwicklung', '{Marketing, IT}', 'David', '2026-02-01'),
  ('Vertragsanalyse GF', 'Automatisierte Analyse und Zusammenfassung von Verträgen für die Geschäftsführung.', 'Planung', '{GF, IT}', 'David', '2026-03-01'),
  ('Wissensmanagement Intern', 'Unternehmensweite Wissensdatenbank mit KI-gestützter Suche und Antwortgenerierung.', 'Planung', '{Business, IT, HR}', 'David', NULL),
  ('Datenanalyse Dashboard', 'KI-gestützte Auswertung von Geschäftsdaten mit automatisierten Berichten.', 'In Entwicklung', '{GF, Business, IT}', 'David', '2026-01-20');

INSERT INTO topics (title, description, project_id, type, status, priority, departments, meeting_agenda, source) VALUES
  ('Datenschutzprüfung der Trainingsdaten', 'Vor dem Go-Live des HR-Chatbots muss der Datenschutzbeauftragte die verwendeten Trainingsdaten auf DSGVO-Konformität prüfen. Insbesondere betrifft dies personenbezogene Daten in den FAQ-Antworten.', (SELECT id FROM projects WHERE name = 'KI-Chatbot HR'), 'Anforderung', 'Offen', 'Hoch', '{HR}', true, 'KI-Agent'),
  ('Mehrsprachigkeit Französisch', 'Der Marketing-Assistent soll neben Deutsch und Englisch auch französische Texte erstellen können. Dies wird für die geplante Kampagne im französischsprachigen Markt benötigt.', (SELECT id FROM projects WHERE name = 'Marketing KI-Assistent'), 'Anforderung', 'In Diskussion', 'Hoch', '{Marketing}', true, 'KI-Agent'),
  ('Zugriffskonzept für Verträge', 'Es muss definiert werden, welche Mitarbeiter Zugriff auf die KI-gestützte Vertragsanalyse erhalten. Die Geschäftsführung schlägt eine Beschränkung auf Abteilungsleiter-Ebene vor.', (SELECT id FROM projects WHERE name = 'Vertragsanalyse GF'), 'Entscheidung', 'Offen', 'Mittel', '{GF}', true, 'Manuell'),
  ('Testphase mit HR abgestimmt', 'Die Personalabteilung hat einem zweiwöchigen Pilottest mit 10 ausgewählten Mitarbeitern zugestimmt. Start: KW 14.', (SELECT id FROM projects WHERE name = 'KI-Chatbot HR'), 'Information', 'Entschieden', 'Mittel', '{HR, IT}', false, 'Meeting');

INSERT INTO tasks (title, description, project_id, assignee, status, due_date, source) VALUES
  ('DSGVO-Checkliste erstellen', 'Checkliste mit allen datenschutzrelevanten Punkten für den HR-Chatbot erstellen und mit dem DSB abstimmen.', (SELECT id FROM projects WHERE name = 'KI-Chatbot HR'), 'David', 'Offen', '2026-03-20', 'Meeting'),
  ('Französische Testprompts erstellen', '20 Beispiel-Prompts auf Französisch vorbereiten, um die Qualität der französischen Textgenerierung zu testen.', (SELECT id FROM projects WHERE name = 'Marketing KI-Assistent'), 'David', 'In Arbeit', '2026-03-15', 'KI-Agent'),
  ('Pilotgruppe zusammenstellen', '10 Mitarbeiter aus verschiedenen HR-Bereichen für den Pilottest des Chatbots auswählen und briefen.', (SELECT id FROM projects WHERE name = 'KI-Chatbot HR'), 'David', 'Erledigt', '2026-03-10', 'Meeting');
