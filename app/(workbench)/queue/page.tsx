"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { AlertTriangle, ArrowDownWideNarrow, ArrowUpRight, CalendarClock, ChevronDown, ChevronUp, Clock3, Filter, RotateCcw, Search, ShieldCheck, SlidersHorizontal, Sparkles, Timer, X } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { HERO_CASES } from "@/data/seed";
import { BACKGROUND_CASES } from "@/data/seed";
import { deriveCaseFacts, getActionRule, getQueueMetrics, scorePriority } from "@/lib/engines";
import { useWorkbenchStore } from "@/lib/store";
import type { PriorityBand, QueueCase } from "@/lib/types";
import { ConfidenceBadge, EmptyState, PageHeader, PriorityBadge } from "@/components/ui";

const REASONS = ["New clinical information", "Deadline changed", "Data correction", "Member preference", "Other"];
const CASES: QueueCase[] = [...HERO_CASES, ...BACKGROUND_CASES];

export default function QueuePage() {
  const [query, setQuery] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("All priorities");
  const [programFilter, setProgramFilter] = useState("All programs");
  const [triggerFilter, setTriggerFilter] = useState("All triggers");
  const [deadlineFilter, setDeadlineFilter] = useState("Any deadline");
  const [unreachableOnly, setUnreachableOnly] = useState(false);
  const [sortBy, setSortBy] = useState("Priority score");
  const [savedView, setSavedView] = useState("All cases");
  const [customView, setCustomView] = useState<{ query: string; priority: string; program: string; trigger: string; deadline: string; unreachable: boolean } | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>("P1");
  const [overrideCase, setOverrideCase] = useState<QueueCase | null>(null);
  const [detailCase, setDetailCase] = useState<QueueCase | null>(null);
  const [overrideReason, setOverrideReason] = useState(REASONS[0]);
  const [overrideBand, setOverrideBand] = useState<PriorityBand>("High");
  const [overrideNote, setOverrideNote] = useState("");
  const [formError, setFormError] = useState("");
  const overrides = useWorkbenchStore((state) => state.priorityOverrides);
  const auditEntries = useWorkbenchStore((state) => state.auditEntries);
  const setPriorityOverride = useWorkbenchStore((state) => state.setPriorityOverride);

  const programs = useMemo(() => Array.from(new Set(CASES.map((member) => member.program))).sort(), []);
  const caseAssessments = useMemo(() => new Map(CASES.map((member) => [member.id, {
    priority: scorePriority(member),
    facts: deriveCaseFacts(member),
  }])), []);
  const metrics = useMemo(() => getQueueMetrics(CASES), []);
  const filteredCases = useMemo(() => {
    const filtered = CASES.filter((member) => {
      const { priority, facts } = caseAssessments.get(member.id)!;
      const matchesQuery = `${member.name} ${member.id} ${member.program} ${member.primaryCondition}`.toLowerCase().includes(query.toLowerCase());
      const matchesPriority = priorityFilter === "All priorities" || (overrides[member.id]?.band ?? priority.band) === priorityFilter;
      const matchesProgram = programFilter === "All programs" || member.program === programFilter;
      const matchesTrigger = triggerFilter === "All triggers" || member.trigger === triggerFilter;
      const matchesDeadline = deadlineFilter === "Any deadline" || (deadlineFilter === "Inside 24 hours" ? facts.deadlineHours <= 24 : facts.deadlineHours > 24);
      const matchesUnreachable = !unreachableOnly || facts.failedOutreachAttempts > 0;
      const matchesSaved = savedView === "Time-sensitive" ? facts.deadlineHours <= 24 : savedView === "Needs verification" ? priority.verifyFirst : true;
      return matchesQuery && matchesPriority && matchesProgram && matchesTrigger && matchesDeadline && matchesUnreachable && matchesSaved;
    });
    return filtered.sort((a, b) => {
      const aFacts = caseAssessments.get(a.id)!.facts;
      const bFacts = caseAssessments.get(b.id)!.facts;
      const aDeadline = aFacts.deadlineHours <= 24 ? 0 : 1;
      const bDeadline = bFacts.deadlineHours <= 24 ? 0 : 1;
      if (aDeadline !== bDeadline) return aDeadline - bDeadline;
      const scoreA = caseAssessments.get(a.id)!.priority.score;
      const scoreB = caseAssessments.get(b.id)!.priority.score;
      return sortBy === "Closest deadline" ? aFacts.deadlineHours - bFacts.deadlineHours : scoreB - scoreA;
    });
  }, [query, priorityFilter, programFilter, triggerFilter, deadlineFilter, unreachableOnly, sortBy, savedView, overrides, caseAssessments]);
  const firstDetailedCase = filteredCases.find((member) => member.isHero) ?? HERO_CASES[0];

  function saveOverride() {
    if (!overrideCase) return;
    if (overrideNote.trim().length < 8) {
      setFormError("Add a short reason with at least 8 characters.");
      return;
    }
    setPriorityOverride(overrideCase.id, overrideBand, `${overrideReason}: ${overrideNote.trim()}`);
    setFormError("");
    setOverrideNote("");
    setOverrideCase(null);
  }

  function saveCurrentView() {
    setCustomView({ query, priority: priorityFilter, program: programFilter, trigger: triggerFilter, deadline: deadlineFilter, unreachable: unreachableOnly });
  }

  function applyCustomView() {
    if (!customView) return;
    setQuery(customView.query);
    setPriorityFilter(customView.priority);
    setProgramFilter(customView.program);
    setTriggerFilter(customView.trigger);
    setDeadlineFilter(customView.deadline);
    setUnreachableOnly(customView.unreachable);
    setSavedView("All cases");
  }

  return (
    <main className="page-content">
      <PageHeader
        eyebrow="Monday, November 9 · Transitions of care"
        title="Good morning, Maria"
        description="A prioritized view of synthetic work items. Scores and thresholds are illustrative and require clinical validation."
        actions={<><span className="button button-secondary"><CalendarClock size={13} />Review estimate · {Math.floor(metrics.estimatedReviewMinutes / 60)}h {metrics.estimatedReviewMinutes % 60}m</span><Link className="button button-primary" href={`/outreach/${firstDetailedCase.id}`}><Sparkles size={13} />Start first detailed case</Link></>}
      />

      <section className="stat-grid" aria-label="Today's work counts">
        <Stat icon={<ArrowDownWideNarrow size={15} />} value={metrics.newDischarges} label="New discharges · 72h" />
        <Stat icon={<CalendarClock size={15} />} value={metrics.dueToday} label="Due in 24h" />
        <Stat icon={<Clock3 size={15} />} value={metrics.overdue} label="Overdue follow-ups" warning />
        <Stat icon={<RotateCcw size={15} />} value={metrics.unreachable} label="Unreachable" warning />
        <Stat icon={<ShieldCheck size={15} />} value={metrics.critical} label="Critical review" critical />
      </section>

      <div className="content-grid content-grid-2 section-spacer">
        <div className="notice"><Timer size={15} /><span><strong>Modeled review load: {Math.floor(metrics.estimatedReviewMinutes / 60)}h {metrics.estimatedReviewMinutes % 60}m</strong><br />{metrics.totalCases} cases · {metrics.newAlerts} alerts in the last 24 hours · {metrics.dueBeforeNoon} due within four hours. Estimate uses illustrative review times by priority band.</span></div>
        <div className="notice notice-warning"><Clock3 size={15} /><span><strong>Review time-sensitive items</strong><br />The queue ranks cases using event, gap, confidence, and due-time facts. Verify source records before acting.</span></div>
      </div>

      <section className="card section-spacer">
        <div className="section-header">
          <div><h2 className="section-title">Your work queue <span className="badge badge-neutral">{filteredCases.length} cases</span></h2><p className="section-description">Deadline cases are pinned, then ranked by the illustrative priority score.</p></div>
          <button className="button button-secondary" onClick={customView ? applyCustomView : saveCurrentView}><SlidersHorizontal size={13} />{customView ? "Apply saved view" : "Save current view"}</button>
        </div>
        <div className="tabs-list" role="group" aria-label="Saved queue filters">
          {["All cases", "Time-sensitive", "Needs verification"].map((view) => <button key={view} className="tab-trigger" type="button" aria-pressed={savedView === view} onClick={() => setSavedView(view)}>{view}</button>)}
          {customView && <button className="tab-trigger" type="button" aria-pressed="false" onClick={applyCustomView}>My saved view</button>}
        </div>
        <div className="content-grid content-grid-3 section-spacer">
          <label className="field"><span className="field-label">Search caseload</span><div style={{ position: "relative" }}><Search size={14} style={{ position: "absolute", top: 11, left: 10, color: "#7b8799" }} /><input className="input" style={{ paddingLeft: 31 }} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Name, ID or condition" /></div></label>
          <label className="field"><span className="field-label">Priority</span><select className="select" value={priorityFilter} onChange={(event) => setPriorityFilter(event.target.value)}><option>All priorities</option><option>Critical</option><option>High</option><option>Medium</option><option>Low</option></select></label>
          <label className="field"><span className="field-label">Program</span><select className="select" value={programFilter} onChange={(event) => setProgramFilter(event.target.value)}><option>All programs</option>{programs.map((program) => <option key={program}>{program}</option>)}</select></label>
        </div>
        <div className="content-grid content-grid-3 section-spacer" style={{ marginTop: 10 }}>
          <label className="field"><span className="field-label">Trigger type</span><select className="select" value={triggerFilter} onChange={(event) => setTriggerFilter(event.target.value)}><option>All triggers</option>{Array.from(new Set(CASES.map((member) => member.trigger))).sort().map((trigger) => <option key={trigger}>{trigger}</option>)}</select></label>
          <label className="field"><span className="field-label">Contact deadline</span><select className="select" value={deadlineFilter} onChange={(event) => setDeadlineFilter(event.target.value)}><option>Any deadline</option><option>Inside 24 hours</option><option>More than 24 hours</option></select></label>
          <label className="field"><span className="field-label">Sort order</span><select className="select" value={sortBy} onChange={(event) => setSortBy(event.target.value)}><option>Priority score</option><option>Closest deadline</option></select></label>
        </div>
        <div className="content-grid content-grid-3 section-spacer" style={{ marginTop: 10 }}>
          <label className="notice" style={{ alignItems: "center", cursor: "pointer" }}><input type="checkbox" checked={unreachableOnly} onChange={(event) => setUnreachableOnly(event.target.checked)} /><span>Show unreachable cases</span></label>
          <div className="notice" style={{ alignItems: "center" }}><Filter size={13} /><span>Deadline inside 24 hours stays pinned above the selected sort.</span></div>
          <div className="notice notice-warning" style={{ alignItems: "center" }}><AlertTriangle size={14} /><span>Verify first is a task flag, not a lower-priority band.</span></div>
        </div>

        {filteredCases.length === 0 ?         <div className="section-spacer"><EmptyState title="No cases match these filters" description="Clear or change a filter to see cases in Maria's queue." action={<button className="button button-secondary" onClick={() => { setQuery(""); setPriorityFilter("All priorities"); setProgramFilter("All programs"); setTriggerFilter("All triggers"); setDeadlineFilter("Any deadline"); setUnreachableOnly(false); setSavedView("All cases"); }}>Clear filters</button>} /></div> : (
          <div className="table-wrap section-spacer">
            <table className="data-table">
              <thead><tr><th>Rank</th><th>Member</th><th>Priority</th><th>Why now</th><th>Next action</th><th>Confidence</th><th>Last contact</th><th aria-label="Expand row" /></tr></thead>
              <tbody>
                {filteredCases.map((member, index) => {
                  const result = caseAssessments.get(member.id)!.priority;
                  const facts = caseAssessments.get(member.id)!.facts;
                  const band = (overrides[member.id]?.band as PriorityBand | undefined) ?? result.band;
                  const action = getActionRule(result.topActionId);
                  const expanded = expandedId === member.id;
                  return (
                    <FragmentRow key={member.id}>
                      <tr>
                        <td><span className="table-rank">#{String(index + 1).padStart(2, "0")}</span>{facts.deadlineHours <= 24 && <div className="member-meta" style={{ color: "#8c470f" }}>{facts.deadlineHours < 0 ? "Overdue" : "Due soon"}</div>}</td>
                        <td>{member.isHero
                          ? <Link href={`/member/${member.id}`} className="member-name">{member.name}</Link>
                          : <button type="button" className="member-name case-link-button" onClick={() => setDetailCase(member)}>{member.name}</button>}
                          <div className="member-meta">{member.age} · {member.plan} · {member.program}</div>
                        </td>
                        <td><PriorityBadge band={band} /><div className="score-number">{result.score}<span style={{ fontSize: 12, color: "#728096" }}>/100</span></div><div className="score-meter"><div className="score-meter-fill" style={{ width: `${result.score}%` }} /></div>{overrides[member.id] && <div className="member-meta">Overridden</div>}</td>
                        <td><div className="reason-text">{result.whyNow}</div><div className="member-meta">{member.trigger} · {formatAge(facts.triggerAgeHours)} · {formatDeadline(facts.deadlineHours)}</div></td>
                        <td>{member.isHero
                          ? <Link className="button button-primary" href={`/outreach/${member.id}`}><span>{action?.action ?? "Review case"}</span><ArrowUpRight size={12} /></Link>
                          : <button className="button button-primary" type="button" onClick={() => setDetailCase(member)}><span>{action?.action ?? "Review case"}</span><ArrowUpRight size={12} /></button>}
                          <div className="member-meta">Rule {result.topActionId}</div>{result.verificationTaskId && <span className="member-meta" style={{ display: "block", color: "#85420d" }}>Verify first · Rule {result.verificationTaskId}</span>}</td>
                        <td><ConfidenceBadge score={result.factors.confidence} reasons={"confidenceNotes" in member ? member.confidenceNotes : member.dataQualityFlags.length ? member.dataQualityFlags : ["Background case; verify source records before clinical action."]} />{result.verifyFirst && <div className="member-meta" style={{ color: "#85420d" }}>Verify first task</div>}</td>
                        <td><span>{member.lastContact}</span><div className="member-meta">{member.trigger}</div></td>
                        <td><button className="icon-button" aria-label={expanded ? `Collapse ${member.name}` : `Expand ${member.name}`} aria-expanded={expanded} onClick={() => setExpandedId(expanded ? null : member.id)}>{expanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}</button></td>
                      </tr>
                      {expanded && <tr><td colSpan={8}><div className="queue-expanded">
                        <div className="section-header"><div><h3 className="section-title">Why this case is ranked here</h3><p className="section-description">Illustrative score: weighted factors are visible and do not replace nurse judgment.</p></div>
                          {member.isHero && <button className="button button-secondary" onClick={() => { setOverrideCase(member); setOverrideReason(REASONS[0]); setOverrideBand((overrides[member.id]?.band as PriorityBand | undefined) ?? result.band); }}>Change priority</button>}
                        </div>
                        <div className="factor-grid">
                          {Object.entries(result.factors).map(([factor, value]) => <div key={factor}><div className="factor-label">{factor === "events" ? "Recent events" : factor === "gaps" ? "Open gaps" : factor === "time" ? "Time sensitivity" : factor === "confidence" ? "Data confidence" : "Clinical urgency"} · {factor === "clinical" ? "35%" : factor === "events" ? "25%" : factor === "gaps" ? "20%" : factor === "time" ? "15%" : "5%"}</div><div className="factor-value">{value}/100</div></div>)}
                        </div>
                        {"protocolTrigger" in member && member.protocolTrigger && <div className="notice notice-danger section-spacer"><ShieldCheck size={14} /><span><strong>Protocol escalation</strong> · {member.protocolTrigger}</span></div>}
                        {result.verifyFirst && <div className="notice notice-warning section-spacer"><ShieldCheck size={14} /><span><strong>Verify first</strong> · Low data confidence adds a verification task and cannot make this case appear low priority.</span></div>}
                        {"confidenceNotes" in member && <ul style={{ margin: "14px 0 0", paddingLeft: 17, color: "#53627a", fontSize: 12 }}>{member.confidenceNotes.map((note) => <li key={note} style={{ marginBottom: 4 }}>{note}</li>)}</ul>}
                        {overrides[member.id] && <div className="callout section-spacer"><strong>Priority override</strong> · Original score {result.score} retained. {overrides[member.id].reason}</div>}
                        {auditEntries.filter((entry) => entry.patientId === member.id).map((entry) => <div className="member-meta section-spacer" key={entry.id}>Audit · {entry.kind} by {entry.by} at {entry.at}: {entry.detail}</div>)}
                        {!member.isHero && <div className="member-meta section-spacer">Lightweight synthetic case summary. This row can be reviewed here; a full Member 360 record is not supplied.</div>}
                      </div></td></tr>}
                    </FragmentRow>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
      <div className="content-grid content-grid-2 section-spacer">
        <div className="notice"><ShieldCheck size={14} /><span>Risk and timing thresholds are illustrative. A nurse must review source facts before clinical action.</span></div>
        <div className="notice"><Sparkles size={14} /><span>Five detailed synthetic cases plus 43 lightweight cases are shown to represent a 48-case load.</span></div>
      </div>

      <Dialog.Root open={Boolean(overrideCase)} onOpenChange={(open) => { if (!open) { setOverrideCase(null); setFormError(""); } }}>
        <Dialog.Portal>
          <Dialog.Overlay className="overlay" />
          <Dialog.Content className="dialog" aria-describedby="override-description">
            <div className="section-header"><div><Dialog.Title className="dialog-title">Change priority</Dialog.Title><Dialog.Description id="override-description" className="dialog-description">The original score stays unchanged. Add a reason to create an audit entry.</Dialog.Description></div><Dialog.Close asChild><button className="icon-button" aria-label="Close dialog"><X size={15} /></button></Dialog.Close></div>
            <div className="notice"><ShieldCheck size={14} /><span>{overrideCase?.name} · Current derived score {overrideCase ? scorePriority(overrideCase).score : ""}/100</span></div>
            <label className="field section-spacer"><span className="field-label">New priority band</span><select className="select" value={overrideBand} onChange={(event) => setOverrideBand(event.target.value as PriorityBand)}>{["Critical", "High", "Medium", "Low"].map((band) => <option key={band}>{band}</option>)}</select></label>
            <label className="field section-spacer"><span className="field-label">Reason</span><select className="select" value={overrideReason} onChange={(event) => setOverrideReason(event.target.value)}>{REASONS.map((reason) => <option key={reason}>{reason}</option>)}</select></label>
            <label className="field section-spacer"><span className="field-label">What changed?</span><textarea className="textarea" value={overrideNote} onChange={(event) => setOverrideNote(event.target.value)} placeholder="Add brief context for the audit log." /></label>
            {formError && <p role="alert" className="member-meta" style={{ color: "#a71919" }}>{formError}</p>}
            <div className="dialog-actions"><button className="button button-secondary" onClick={() => setOverrideCase(null)}>Cancel</button><button className="button button-primary" onClick={saveOverride}>Save override</button></div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
      <Dialog.Root open={Boolean(detailCase)} onOpenChange={(open) => { if (!open) setDetailCase(null); }}>
        <Dialog.Portal>
          <Dialog.Overlay className="overlay" />
          <Dialog.Content className="dialog" aria-describedby="case-detail-description">
            {detailCase && (() => {
              const details = caseAssessments.get(detailCase.id)!;
              return <>
                <div className="section-header"><div><Dialog.Title className="dialog-title">{detailCase.name} · {detailCase.id}</Dialog.Title><Dialog.Description id="case-detail-description" className="dialog-description">Lightweight synthetic queue record. No detailed clinical record is supplied for this case.</Dialog.Description></div><Dialog.Close asChild><button className="icon-button" aria-label="Close case details"><X size={15} /></button></Dialog.Close></div>
                <div className="notice"><ShieldCheck size={14} /><span><strong>{detailCase.program}</strong><br />{detailCase.primaryCondition} · {detailCase.plan} · age {detailCase.age}</span></div>
                <div className="fact-row"><span className="fact-label">Trigger</span><span className="fact-value">{detailCase.trigger}</span></div>
                <div className="fact-row"><span className="fact-label">Next action</span><span className="fact-value">{getActionRule(details.priority.topActionId)?.action}</span></div>
                <div className="fact-row"><span className="fact-label">Why now</span><span className="fact-value">{details.priority.whyNow}</span></div>
                <div className="fact-row"><span className="fact-label">Trigger age</span><span className="fact-value">{formatAge(details.facts.triggerAgeHours)}</span></div>
                <div className="fact-row"><span className="fact-label">Contact target</span><span className="fact-value">{formatDeadline(details.facts.deadlineHours)}</span></div>
                <div className="fact-row"><span className="fact-label">Recorded open gaps</span><span className="fact-value">{"riskSignals" in detailCase ? detailCase.riskSignals.length : detailCase.attention.length}</span></div>
                <div className="fact-row"><span className="fact-label">Recorded failed attempts</span><span className="fact-value">{"failedAttemptCount" in detailCase ? detailCase.failedAttemptCount : detailCase.contacts.filter((entry) => ["No answer", "Voicemail", "Disconnected", "Wrong number"].includes(entry.outcome)).length}</span></div>
                <div className="notice notice-warning section-spacer"><span>Confirm identity, current facts, contact permission, and source availability before any action. This record is a queue summary, not a patient chart.</span></div>
              </>;
            })()}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </main>
  );
}

function Stat({ icon, value, label, warning, critical }: { icon: React.ReactNode; value: string | number; label: string; warning?: boolean; critical?: boolean }) {
  return <div className="stat-card"><div className={`stat-icon ${critical ? "stat-icon-critical" : warning ? "stat-icon-warning" : ""}`}>{icon}</div><div><div className="stat-value">{value}</div><div className="stat-label">{label}</div></div></div>;
}

function FragmentRow({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

function formatAge(hours: number) {
  return hours < 24 ? `${Math.floor(hours)}h ago` : `${Math.floor(hours / 24)}d ago`;
}

function formatDeadline(hours: number) {
  if (hours < 0) return `${Math.abs(Math.floor(hours))}h overdue`;
  if (hours < 24) return `Due in ${Math.floor(hours)}h`;
  return `Due in ${Math.floor(hours / 24)}d`;
}
