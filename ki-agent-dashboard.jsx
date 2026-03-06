import { useState, useEffect, useRef } from "react";

const MOCK_PROJECTS = [
  { id: "1", name: "KI-Chatbot HR", status: "In Entwicklung", departments: ["HR", "IT"], lead: "David", openTopics: 2, openTasks: 2, blockedTasks: 0, nextMeeting: "2026-03-15" },
  { id: "2", name: "Marketing KI-Assistent", status: "In Entwicklung", departments: ["Marketing", "IT"], lead: "David", openTopics: 1, openTasks: 1, blockedTasks: 0, nextMeeting: "2026-03-18" },
  { id: "3", name: "Vertragsanalyse GF", status: "Planung", departments: ["GF", "IT"], lead: "David", openTopics: 1, openTasks: 0, blockedTasks: 0, nextMeeting: null },
  { id: "4", name: "Wissensmanagement Intern", status: "Planung", departments: ["Business", "IT", "HR"], lead: "David", openTopics: 0, openTasks: 0, blockedTasks: 0, nextMeeting: null },
  { id: "5", name: "Datenanalyse Dashboard", status: "In Entwicklung", departments: ["GF", "Business", "IT"], lead: "David", openTopics: 0, openTasks: 0, blockedTasks: 0, nextMeeting: "2026-03-20" },
];

const MOCK_TOPICS = [
  { id: "t1", title: "Datenschutzprüfung der Trainingsdaten", description: "Vor dem Go-Live des HR-Chatbots muss der Datenschutzbeauftragte die verwendeten Trainingsdaten auf DSGVO-Konformität prüfen.", project: "KI-Chatbot HR", type: "Anforderung", status: "Offen", priority: "Hoch", departments: ["HR"], meetingAgenda: true, source: "KI-Agent", createdAt: "2026-03-04" },
  { id: "t2", title: "Mehrsprachigkeit Französisch", description: "Der Marketing-Assistent soll neben Deutsch und Englisch auch französische Texte erstellen können.", project: "Marketing KI-Assistent", type: "Anforderung", status: "In Diskussion", priority: "Hoch", departments: ["Marketing"], meetingAgenda: true, source: "KI-Agent", createdAt: "2026-03-03" },
  { id: "t3", title: "Zugriffskonzept für Verträge", description: "Es muss definiert werden, welche Mitarbeiter Zugriff auf die KI-gestützte Vertragsanalyse erhalten.", project: "Vertragsanalyse GF", type: "Entscheidung", status: "Offen", priority: "Mittel", departments: ["GF"], meetingAgenda: true, source: "Manuell", createdAt: "2026-03-02" },
  { id: "t4", title: "Testphase mit HR abgestimmt", description: "Die Personalabteilung hat einem zweiwöchigen Pilottest mit 10 ausgewählten Mitarbeitern zugestimmt. Start: KW 14.", project: "KI-Chatbot HR", type: "Information", status: "Entschieden", priority: "Mittel", departments: ["HR", "IT"], meetingAgenda: false, source: "Meeting", createdAt: "2026-03-01" },
];

const MOCK_TASKS = [
  { id: "a1", title: "DSGVO-Checkliste erstellen", project: "KI-Chatbot HR", assignee: "David", status: "Offen", dueDate: "2026-03-20", source: "Meeting" },
  { id: "a2", title: "Französische Testprompts erstellen", project: "Marketing KI-Assistent", assignee: "David", status: "In Arbeit", dueDate: "2026-03-15", source: "KI-Agent" },
  { id: "a3", title: "Pilotgruppe zusammenstellen", project: "KI-Chatbot HR", assignee: "David", status: "Erledigt", dueDate: "2026-03-10", source: "Meeting" },
];

const statusColors = {
  "Planung": { bg: "#EEF2FF", text: "#4338CA", dot: "#6366F1" },
  "In Entwicklung": { bg: "#ECFDF5", text: "#065F46", dot: "#10B981" },
  "Testing": { bg: "#FFFBEB", text: "#92400E", dot: "#F59E0B" },
  "Live": { bg: "#F0FDF4", text: "#166534", dot: "#22C55E" },
  "Pausiert": { bg: "#F3F4F6", text: "#6B7280", dot: "#9CA3AF" },
};

const priorityColors = { "Hoch": "#EF4444", "Mittel": "#F59E0B", "Niedrig": "#6B7280" };
const typeIcons = { "Anforderung": "◆", "Entscheidung": "▲", "Diskussionspunkt": "●", "Information": "■" };
const topicStatusColors = {
  "Offen": { bg: "#FEF3C7", text: "#92400E" },
  "In Diskussion": { bg: "#DBEAFE", text: "#1E40AF" },
  "Entschieden": { bg: "#D1FAE5", text: "#065F46" },
  "Umgesetzt": { bg: "#E0E7FF", text: "#3730A3" },
  "Verworfen": { bg: "#F3F4F6", text: "#6B7280" },
};
const taskStatusColors = {
  "Offen": { bg: "#FEF3C7", text: "#92400E" },
  "In Arbeit": { bg: "#DBEAFE", text: "#1E40AF" },
  "Erledigt": { bg: "#D1FAE5", text: "#065F46" },
  "Blockiert": { bg: "#FEE2E2", text: "#991B1B" },
};

const Badge = ({ children, bg, text: textColor }) => (
  <span style={{ display: "inline-block", padding: "2px 10px", borderRadius: 999, fontSize: 12, fontWeight: 600, background: bg, color: textColor, letterSpacing: 0.2 }}>{children}</span>
);

const DeptBadge = ({ dept }) => {
  const colors = { Business: "#8B5CF6", Marketing: "#EC4899", HR: "#F97316", GF: "#0EA5E9", IT: "#6366F1" };
  return <span style={{ display: "inline-block", padding: "2px 8px", borderRadius: 4, fontSize: 11, fontWeight: 600, background: (colors[dept] || "#6B7280") + "18", color: colors[dept] || "#6B7280", marginRight: 4 }}>{dept}</span>;
};

// ──── AI Processing Simulation ────
const simulateAI = (text) => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const lower = text.toLowerCase();
      let project = null;
      if (lower.includes("hr") || lower.includes("chatbot")) project = "KI-Chatbot HR";
      else if (lower.includes("marketing") || lower.includes("text")) project = "Marketing KI-Assistent";
      else if (lower.includes("vertrag") || lower.includes("gf")) project = "Vertragsanalyse GF";
      else if (lower.includes("wissen") || lower.includes("datenbank")) project = "Wissensmanagement Intern";
      else if (lower.includes("daten") || lower.includes("dashboard") || lower.includes("report")) project = "Datenanalyse Dashboard";

      const isMeeting = lower.includes("meeting") || lower.includes("besprechen") || lower.includes("diskutieren") || lower.includes("klären") || lower.includes("austausch");
      const isHigh = lower.includes("dringend") || lower.includes("eilt") || lower.includes("hohe prio") || lower.includes("wichtig") || lower.includes("blockiert");

      let type = "Information";
      if (lower.includes("anforderung") || lower.includes("muss") || lower.includes("braucht") || lower.includes("soll")) type = "Anforderung";
      else if (lower.includes("entscheid") || lower.includes("klären") || lower.includes("ob")) type = "Entscheidung";
      else if (lower.includes("diskut") || lower.includes("besprechen")) type = "Diskussionspunkt";

      const depts = [];
      if (lower.includes("hr") || lower.includes("personal")) depts.push("HR");
      if (lower.includes("marketing")) depts.push("Marketing");
      if (lower.includes("gf") || lower.includes("geschäftsführ")) depts.push("GF");
      if (lower.includes("business") || lower.includes("fachbereich")) depts.push("Business");
      if (depts.length === 0) depts.push("IT");

      resolve({
        projekt: project,
        titel: text.length > 60 ? text.substring(0, 57) + "..." : text,
        beschreibung: `Aus der Eingabe wurde folgendes Thema abgeleitet: ${text}`,
        typ: type,
        prioritaet: isHigh ? "Hoch" : "Mittel",
        fachabteilung: depts,
        meeting_agenda: isMeeting,
      });
    }, 1800);
  });
};

// ──── Main App ────
export default function App() {
  const [view, setView] = useState("dashboard");
  const [inputText, setInputText] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [aiResult, setAiResult] = useState(null);
  const [topics, setTopics] = useState(MOCK_TOPICS);
  const [tasks] = useState(MOCK_TASKS);
  const [showSuccess, setShowSuccess] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);
  const [filterDept, setFilterDept] = useState(null);
  const inputRef = useRef(null);

  const handleSubmit = async () => {
    if (!inputText.trim() || isProcessing) return;
    setIsProcessing(true);
    setAiResult(null);
    const result = await simulateAI(inputText);
    setAiResult(result);
    setIsProcessing(false);
  };

  const handleConfirm = () => {
    if (!aiResult) return;
    const newTopic = {
      id: "t" + (topics.length + 1),
      title: aiResult.titel,
      description: aiResult.beschreibung,
      project: aiResult.projekt || "Nicht zugeordnet",
      type: aiResult.typ,
      status: "Offen",
      priority: aiResult.prioritaet,
      departments: aiResult.fachabteilung,
      meetingAgenda: aiResult.meeting_agenda,
      source: "KI-Agent",
      createdAt: new Date().toISOString().split("T")[0],
    };
    setTopics([newTopic, ...topics]);
    setAiResult(null);
    setInputText("");
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);
  };

  const filteredTopics = topics.filter(t => {
    if (selectedProject && t.project !== selectedProject) return false;
    if (filterDept && !t.departments.includes(filterDept)) return false;
    return true;
  });

  const agendaTopics = topics.filter(t => t.meetingAgenda && (t.status === "Offen" || t.status === "In Diskussion"));

  return (
    <div style={{ fontFamily: "'IBM Plex Sans', -apple-system, sans-serif", background: "#F8FAFC", minHeight: "100vh", color: "#1E293B" }}>
      <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap" rel="stylesheet" />

      {/* ──── Header ──── */}
      <div style={{ background: "linear-gradient(135deg, #0F172A 0%, #1E293B 100%)", padding: "0", borderBottom: "1px solid #334155" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "16px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: "linear-gradient(135deg, #6366F1, #8B5CF6)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, color: "white", fontWeight: 700 }}>K</div>
            <div>
              <div style={{ color: "#F1F5F9", fontSize: 16, fontWeight: 700, letterSpacing: -0.3 }}>KI-Agent</div>
              <div style={{ color: "#64748B", fontSize: 11, fontWeight: 500 }}>Fachliche Projektdokumentation</div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 4 }}>
            {[
              { key: "dashboard", label: "Dashboard" },
              { key: "topics", label: "Themen" },
              { key: "tasks", label: "Aufgaben" },
              { key: "agenda", label: "Meeting-Agenda" },
            ].map(tab => (
              <button key={tab.key} onClick={() => { setView(tab.key); setSelectedProject(null); setFilterDept(null); }}
                style={{ padding: "8px 16px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600, fontFamily: "inherit",
                  background: view === tab.key ? "rgba(99,102,241,0.2)" : "transparent",
                  color: view === tab.key ? "#A5B4FC" : "#94A3B8",
                  transition: "all 0.15s" }}>
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "24px" }}>

        {/* ──── KI-Agent Input ──── */}
        <div style={{ background: "white", borderRadius: 16, border: "1px solid #E2E8F0", padding: 24, marginBottom: 24, boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: isProcessing ? "#F59E0B" : "#10B981", animation: isProcessing ? "pulse 1.5s infinite" : "none" }} />
            <span style={{ fontSize: 13, fontWeight: 600, color: "#64748B", letterSpacing: 0.5, textTransform: "uppercase" }}>KI-Agent</span>
            {showSuccess && <span style={{ marginLeft: "auto", fontSize: 13, color: "#10B981", fontWeight: 600, animation: "fadeIn 0.3s" }}>✓ Thema erfolgreich angelegt</span>}
          </div>
          <div style={{ display: "flex", gap: 12 }}>
            <textarea ref={inputRef} value={inputText} onChange={e => setInputText(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSubmit(); } }}
              placeholder='z.B. "Für den HR-Chatbot müssen wir noch klären, ob die Mitarbeiter den Bot auch für Urlaubsanträge nutzen können. Bitte fürs nächste Meeting mit HR vormerken."'
              style={{ flex: 1, padding: "14px 16px", borderRadius: 12, border: "1px solid #E2E8F0", fontSize: 14, fontFamily: "inherit", resize: "none", height: 56, lineHeight: 1.5, color: "#1E293B", outline: "none", transition: "border-color 0.15s" }}
              onFocus={e => e.target.style.borderColor = "#6366F1"}
              onBlur={e => e.target.style.borderColor = "#E2E8F0"} />
            <button onClick={handleSubmit} disabled={isProcessing || !inputText.trim()}
              style={{ padding: "14px 28px", borderRadius: 12, border: "none", background: isProcessing ? "#94A3B8" : "linear-gradient(135deg, #6366F1, #8B5CF6)", color: "white", fontSize: 14, fontWeight: 600, cursor: isProcessing ? "wait" : "pointer", fontFamily: "inherit", whiteSpace: "nowrap", transition: "all 0.15s", opacity: !inputText.trim() ? 0.5 : 1 }}>
              {isProcessing ? "Verarbeite..." : "Erfassen"}
            </button>
          </div>

          {/* AI Result Preview */}
          {aiResult && (
            <div style={{ marginTop: 16, padding: 20, borderRadius: 12, background: "#F8FAFC", border: "1px solid #E2E8F0", animation: "fadeIn 0.3s" }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: "#64748B", marginBottom: 12, textTransform: "uppercase", letterSpacing: 0.5 }}>Claude Ergebnis — bitte prüfen</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px 24px" }}>
                <div>
                  <div style={{ fontSize: 11, color: "#94A3B8", fontWeight: 600, marginBottom: 2 }}>PROJEKT</div>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{aiResult.projekt || "⚠ Nicht zugeordnet"}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: "#94A3B8", fontWeight: 600, marginBottom: 2 }}>TYP</div>
                  <div style={{ fontSize: 14 }}>{typeIcons[aiResult.typ]} {aiResult.typ}</div>
                </div>
                <div style={{ gridColumn: "1 / -1" }}>
                  <div style={{ fontSize: 11, color: "#94A3B8", fontWeight: 600, marginBottom: 2 }}>TITEL</div>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{aiResult.titel}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: "#94A3B8", fontWeight: 600, marginBottom: 2 }}>PRIORITÄT</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: priorityColors[aiResult.prioritaet] }} />
                    <span style={{ fontSize: 14 }}>{aiResult.prioritaet}</span>
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: "#94A3B8", fontWeight: 600, marginBottom: 2 }}>MEETING-AGENDA</div>
                  <div style={{ fontSize: 14 }}>{aiResult.meeting_agenda ? "✓ Ja" : "Nein"}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: "#94A3B8", fontWeight: 600, marginBottom: 2 }}>ABTEILUNGEN</div>
                  <div>{aiResult.fachabteilung.map(d => <DeptBadge key={d} dept={d} />)}</div>
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
                <button onClick={handleConfirm}
                  style={{ padding: "10px 24px", borderRadius: 10, border: "none", background: "#10B981", color: "white", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
                  ✓ Übernehmen
                </button>
                <button onClick={() => { setAiResult(null); inputRef.current?.focus(); }}
                  style={{ padding: "10px 24px", borderRadius: 10, border: "1px solid #E2E8F0", background: "white", color: "#64748B", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
                  Verwerfen
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ──── DASHBOARD VIEW ──── */}
        {view === "dashboard" && (
          <>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>Projekte</h2>
              <span style={{ fontSize: 13, color: "#64748B" }}>{MOCK_PROJECTS.filter(p => p.status !== "Pausiert").length} aktiv</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340, 1fr))", gap: 16, marginBottom: 32 }}>
              {MOCK_PROJECTS.map(proj => {
                const sc = statusColors[proj.status] || statusColors["Planung"];
                return (
                  <div key={proj.id} onClick={() => { setSelectedProject(proj.name); setView("topics"); }}
                    style={{ background: "white", borderRadius: 14, border: "1px solid #E2E8F0", padding: 20, cursor: "pointer", transition: "all 0.15s", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = "#6366F1"; e.currentTarget.style.boxShadow = "0 4px 12px rgba(99,102,241,0.1)"; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = "#E2E8F0"; e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.04)"; }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                      <div style={{ fontSize: 15, fontWeight: 700 }}>{proj.name}</div>
                      <Badge bg={sc.bg} text={sc.text}>{proj.status}</Badge>
                    </div>
                    <div style={{ display: "flex", gap: 4, marginBottom: 14, flexWrap: "wrap" }}>
                      {proj.departments.map(d => <DeptBadge key={d} dept={d} />)}
                    </div>
                    <div style={{ display: "flex", gap: 20, fontSize: 13, color: "#64748B" }}>
                      <div><span style={{ fontWeight: 600, color: "#1E293B" }}>{proj.openTopics}</span> Themen</div>
                      <div><span style={{ fontWeight: 600, color: "#1E293B" }}>{proj.openTasks}</span> Aufgaben</div>
                      {proj.nextMeeting && <div style={{ marginLeft: "auto", fontSize: 12 }}>Meeting: {new Date(proj.nextMeeting).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" })}</div>}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Recent Activity */}
            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>Letzte Aktivitäten</h2>
            <div style={{ background: "white", borderRadius: 14, border: "1px solid #E2E8F0", overflow: "hidden" }}>
              {topics.slice(0, 4).map((t, i) => (
                <div key={t.id} style={{ padding: "14px 20px", borderBottom: i < 3 ? "1px solid #F1F5F9" : "none", display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: t.source === "KI-Agent" ? "linear-gradient(135deg, #6366F1, #8B5CF6)" : "#F1F5F9", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, color: t.source === "KI-Agent" ? "white" : "#64748B", flexShrink: 0 }}>
                    {t.source === "KI-Agent" ? "K" : t.source === "Meeting" ? "M" : "✎"}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.title}</div>
                    <div style={{ fontSize: 12, color: "#94A3B8" }}>{t.project} · {t.createdAt}</div>
                  </div>
                  <div style={{ display: "flex", gap: 6, alignItems: "center", flexShrink: 0 }}>
                    <div style={{ width: 6, height: 6, borderRadius: "50%", background: priorityColors[t.priority] }} />
                    <Badge bg={topicStatusColors[t.status].bg} text={topicStatusColors[t.status].text}>{t.status}</Badge>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* ──── TOPICS VIEW ──── */}
        {view === "topics" && (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>Themen</h2>
              {selectedProject && (
                <Badge bg="#EEF2FF" text="#4338CA">{selectedProject}
                  <span onClick={e => { e.stopPropagation(); setSelectedProject(null); }} style={{ marginLeft: 6, cursor: "pointer", opacity: 0.6 }}>×</span>
                </Badge>
              )}
              <div style={{ marginLeft: "auto", display: "flex", gap: 4 }}>
                {["Business", "Marketing", "HR", "GF", "IT"].map(d => (
                  <button key={d} onClick={() => setFilterDept(filterDept === d ? null : d)}
                    style={{ padding: "4px 12px", borderRadius: 6, border: filterDept === d ? "1px solid #6366F1" : "1px solid #E2E8F0", background: filterDept === d ? "#EEF2FF" : "white", color: filterDept === d ? "#4338CA" : "#64748B", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
                    {d}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {filteredTopics.map(t => (
                <div key={t.id} style={{ background: "white", borderRadius: 12, border: "1px solid #E2E8F0", padding: "16px 20px", transition: "all 0.15s" }}>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                    <div style={{ width: 28, height: 28, borderRadius: 8, background: "#F8FAFC", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, color: "#6366F1", fontWeight: 600, flexShrink: 0, marginTop: 2 }}>
                      {typeIcons[t.type]}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                        <span style={{ fontSize: 14, fontWeight: 700 }}>{t.title}</span>
                        {t.meetingAgenda && <span style={{ fontSize: 11, padding: "1px 6px", borderRadius: 4, background: "#FEF3C7", color: "#92400E", fontWeight: 600 }}>📋 Agenda</span>}
                      </div>
                      <div style={{ fontSize: 13, color: "#64748B", lineHeight: 1.5, marginBottom: 8 }}>{t.description}</div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                        <span style={{ fontSize: 12, color: "#94A3B8" }}>{t.project}</span>
                        <span style={{ color: "#E2E8F0" }}>·</span>
                        {t.departments.map(d => <DeptBadge key={d} dept={d} />)}
                        <span style={{ color: "#E2E8F0" }}>·</span>
                        <span style={{ fontSize: 12, color: "#94A3B8" }}>{t.source}</span>
                      </div>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6, flexShrink: 0 }}>
                      <Badge bg={topicStatusColors[t.status].bg} text={topicStatusColors[t.status].text}>{t.status}</Badge>
                      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        <div style={{ width: 8, height: 8, borderRadius: "50%", background: priorityColors[t.priority] }} />
                        <span style={{ fontSize: 12, color: "#94A3B8" }}>{t.priority}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              {filteredTopics.length === 0 && (
                <div style={{ textAlign: "center", padding: 40, color: "#94A3B8", fontSize: 14 }}>Keine Themen für diesen Filter gefunden.</div>
              )}
            </div>
          </>
        )}

        {/* ──── TASKS VIEW ──── */}
        {view === "tasks" && (
          <>
            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>Aufgaben</h2>
            <div style={{ background: "white", borderRadius: 14, border: "1px solid #E2E8F0", overflow: "hidden" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 180px 100px 100px 90px", padding: "10px 20px", background: "#F8FAFC", borderBottom: "1px solid #E2E8F0", fontSize: 11, fontWeight: 600, color: "#94A3B8", textTransform: "uppercase", letterSpacing: 0.5 }}>
                <div>Aufgabe</div><div>Projekt</div><div>Verantwortlich</div><div>Fällig</div><div>Status</div>
              </div>
              {tasks.map((t, i) => (
                <div key={t.id} style={{ display: "grid", gridTemplateColumns: "1fr 180px 100px 100px 90px", padding: "14px 20px", borderBottom: i < tasks.length - 1 ? "1px solid #F1F5F9" : "none", alignItems: "center", fontSize: 13 }}>
                  <div style={{ fontWeight: 600 }}>{t.title}</div>
                  <div style={{ color: "#64748B" }}>{t.project}</div>
                  <div style={{ color: "#64748B" }}>{t.assignee}</div>
                  <div style={{ color: "#64748B" }}>{new Date(t.dueDate).toLocaleDateString("de-DE")}</div>
                  <Badge bg={taskStatusColors[t.status].bg} text={taskStatusColors[t.status].text}>{t.status}</Badge>
                </div>
              ))}
            </div>
          </>
        )}

        {/* ──── AGENDA VIEW ──── */}
        {view === "agenda" && (
          <>
            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>Meeting-Agenda</h2>
            <p style={{ fontSize: 13, color: "#64748B", marginBottom: 20, marginTop: 0 }}>Alle Themen, die im nächsten Meeting besprochen werden sollen.</p>
            {agendaTopics.length === 0 ? (
              <div style={{ textAlign: "center", padding: 40, color: "#94A3B8", fontSize: 14 }}>Keine offenen Agendapunkte.</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {agendaTopics.map((t, i) => (
                  <div key={t.id} style={{ background: "white", borderRadius: 14, border: "1px solid #E2E8F0", padding: 20, borderLeft: `4px solid ${priorityColors[t.priority]}` }}>
                    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 8 }}>
                      <div>
                        <span style={{ fontSize: 12, fontWeight: 700, color: "#94A3B8", marginRight: 8 }}>#{i + 1}</span>
                        <span style={{ fontSize: 15, fontWeight: 700 }}>{t.title}</span>
                      </div>
                      <div style={{ display: "flex", gap: 6 }}>
                        <Badge bg={topicStatusColors[t.status].bg} text={topicStatusColors[t.status].text}>{t.status}</Badge>
                        <Badge bg={t.type === "Entscheidung" ? "#FEE2E2" : t.type === "Anforderung" ? "#DBEAFE" : "#F3F4F6"} text={t.type === "Entscheidung" ? "#991B1B" : t.type === "Anforderung" ? "#1E40AF" : "#374151"}>{t.type}</Badge>
                      </div>
                    </div>
                    <div style={{ fontSize: 13, color: "#64748B", lineHeight: 1.6, marginBottom: 10 }}>{t.description}</div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 12, color: "#94A3B8" }}>{t.project}</span>
                      <span style={{ color: "#E2E8F0" }}>·</span>
                      {t.departments.map(d => <DeptBadge key={d} dept={d} />)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      <style>{`
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        textarea::placeholder { color: #94A3B8; }
        * { box-sizing: border-box; }
      `}</style>
    </div>
  );
}
