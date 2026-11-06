"use client";

import { AlertCircle, ArrowLeft, Check, CheckCircle2, Clock3, FileText, Headphones, MapPin, Phone, Send, ShieldCheck, Sparkles } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { HERO_CASES } from "@/data/seed";
import { useWorkbenchStore } from "@/lib/store";
import type { OutreachOutcome, WorkCase } from "@/lib/types";
import { AiBadge, EmptyState, PageHeader, ProvenanceChip } from "@/components/ui";

const OUTCOMES: OutreachOutcome[] = ["Connected", "Voicemail", "No answer", "Disconnected", "Wrong number"];
const CHECKLIST = ["Confirm identity and permission to speak", "Ask what changed since discharge or last contact", "Confirm current medication access", "Ask about barriers to appointments or services", "Agree on one next step and a follow-up time"];

export function OutreachWorkspace({ id, mode }: { id: string; mode: "outreach" | "documentation" }) {
  const member = HERO_CASES.find((patient) => patient.id === id);
  if (!member) return <UnknownWorkspace id={id} />;
  return <Workspace member={member} mode={mode} />;
}

function Workspace({ member, mode }: { member: WorkCase; mode: "outreach" | "documentation" }) {
  const [channel, setChannel] = useState(member.preferredChannel);
  const [selectedPhone, setSelectedPhone] = useState(member.phone);
  const [outcome, setOutcome] = useState<OutreachOutcome | "">("");
  const [contactNote, setContactNote] = useState("");
  const [goal, setGoal] = useState("");
  const [saveMessage, setSaveMessage] = useState("");
  const failedAttempts = useWorkbenchStore((state) => state.failedAttempts[member.id] ?? 0);
  const confirmedFields = useWorkbenchStore((state) => state.confirmedFields);
  const auditEntries = useWorkbenchStore((state) => state.auditEntries);
  const logContact = useWorkbenchStore((state) => state.logContact);
  const logDocumentation = useWorkbenchStore((state) => state.logDocumentation);
  const confirmField = useWorkbenchStore((state) => state.confirmField);
  const requiredFields = [
    { key: "identity", label: "Member identity", type: "Auto-filled from data" },
    { key: "trigger", label: "Recent event", type: "Auto-filled from data" },
    { key: "callNote", label: "Call note draft", type: "AI-drafted" },
    { key: "carePlan", label: "Care plan update draft", type: "AI-drafted" },
    { key: "goal", label: "Member-stated goal", type: "Nurse-entered" },
    { key: "outcome", label: "Contact outcome", type: "Empty and required" },
  ];
  const completed = requiredFields.filter((field) => {
    if (field.type === "Auto-filled from data" || field.type === "AI-drafted") return confirmedFields.includes(`${member.id}:${field.key}`);
    if (field.key === "goal") return goal.trim().length > 2;
    return Boolean(outcome);
  }).length;
  const remaining = requiredFields.length - completed;
  const alternativeRoute = member.id === "P3" || failedAttempts >= 2;

  const aiDraft = `Member outreach plan: Review the recent ${member.trigger.toLowerCase()} and confirm current needs directly with ${member.name}. Check the documented medication and follow-up questions. Confirm contact preferences and agree on a next step. This draft uses source facts only and needs nurse review.`;
  const carePlanDraft = `Follow-up task: Confirm ${member.program.toLowerCase()} needs, ask about barriers and coordinate the next step with the member's care team.`;

  function logAttempt() {
    if (!outcome) return;
    logContact(member.id, outcome, channel, contactNote);
    setSaveMessage(`Attempt logged as ${outcome}. Audit entry added for Maria Chen, RN.`);
    setContactNote("");
    setOutcome("");
  }

  function saveDocumentation() {
    if (remaining > 0) return;
    setSaveMessage("Documentation saved in this prototype. Confirmations are recorded in the audit log.");
    logDocumentation(member.id, "Documentation saved after all required fields were reviewed.");
  }

  return (
    <main className="page-content">
      <PageHeader
        eyebrow={mode === "outreach" ? `Outreach workspace · ${member.id}` : `Documentation workspace · ${member.id}`}
        title={`${member.name} · ${mode === "outreach" ? "Outreach plan" : "Call note"}`}
        description="A single workspace for a prepared conversation and source-grounded documentation. No calls or messages are sent."
        actions={<><Link href={`/member/${member.id}`} className="button button-secondary"><ArrowLeft size={13} />Member 360</Link><Link href={mode === "outreach" ? `/documentation/${member.id}` : `/outreach/${member.id}`} className="button button-primary">{mode === "outreach" ? <FileText size={13} /> : <Phone size={13} />}{mode === "outreach" ? "Open documentation" : "Open outreach"}</Link></>}
      />
      {member.protocolTrigger && <div className="notice notice-danger" role="alert"><ShieldCheck size={15} /><span><strong>Clinician escalation first.</strong> The note contains an unreviewed safety screening item. The prototype does not assess risk. Follow the plan&apos;s established clinical escalation process.</span></div>}
      {mode === "outreach" ? <div className="content-grid content-grid-2 section-spacer">
        <OutreachPanel member={member} channel={channel} setChannel={setChannel} selectedPhone={selectedPhone} setSelectedPhone={setSelectedPhone} outcome={outcome} setOutcome={setOutcome} contactNote={contactNote} setContactNote={setContactNote} logAttempt={logAttempt} failedAttempts={failedAttempts} alternativeRoute={alternativeRoute} />
        <DocumentationPanel member={member} requiredFields={requiredFields} confirmedFields={confirmedFields} confirmField={confirmField} completed={completed} remaining={remaining} aiDraft={aiDraft} carePlanDraft={carePlanDraft} goal={goal} setGoal={setGoal} outcome={outcome} setOutcome={setOutcome} saveDocumentation={saveDocumentation} saveMessage={saveMessage} auditEntries={auditEntries} />
      </div> : <div className="content-grid content-grid-2 section-spacer">
        <DocumentationPanel member={member} requiredFields={requiredFields} confirmedFields={confirmedFields} confirmField={confirmField} completed={completed} remaining={remaining} aiDraft={aiDraft} carePlanDraft={carePlanDraft} goal={goal} setGoal={setGoal} outcome={outcome} setOutcome={setOutcome} saveDocumentation={saveDocumentation} saveMessage={saveMessage} auditEntries={auditEntries} />
        <OutreachPanel member={member} channel={channel} setChannel={setChannel} selectedPhone={selectedPhone} setSelectedPhone={setSelectedPhone} outcome={outcome} setOutcome={setOutcome} contactNote={contactNote} setContactNote={setContactNote} logAttempt={logAttempt} failedAttempts={failedAttempts} alternativeRoute={alternativeRoute} />
      </div>}
      <div className="content-grid content-grid-2 section-spacer">
        <div className="notice"><ShieldCheck size={14} /><span>Every field shows whether it came from a source, an AI draft, the nurse, or is still required. AI drafts need explicit confirmation before saving.</span></div>
        <div className="notice"><Clock3 size={14} /><span>Contact preferences and barriers may be out of date. Confirm them with the member before use.</span></div>
      </div>
    </main>
  );
}

function OutreachPanel({ member, channel, setChannel, selectedPhone, setSelectedPhone, outcome, setOutcome, contactNote, setContactNote, logAttempt, failedAttempts, alternativeRoute }: {
  member: WorkCase;
  channel: string;
  setChannel: (value: string) => void;
  selectedPhone: string;
  setSelectedPhone: (value: string) => void;
  outcome: OutreachOutcome | "";
  setOutcome: (value: OutreachOutcome | "") => void;
  contactNote: string;
  setContactNote: (value: string) => void;
  logAttempt: () => void;
  failedAttempts: number;
  alternativeRoute: boolean;
}) {
  const [checkedItems, setCheckedItems] = useState<string[]>([]);
  return <section className="card">
    <div className="section-header"><div><h2 className="section-title">Outreach planner</h2><p className="section-description">Verify the number and route before making contact.</p></div><Phone size={17} color="#5A6884" /></div>
    <div className="notice"><Phone size={14} /><span><strong>Recommended channel: {member.preferredChannel}</strong><br />{member.language} · {member.bestTime}. Preferences are sourced and should be reconfirmed.</span></div>
    <h3 className="section-title section-spacer">Contact routes</h3>
    <div className="content-grid" style={{ gap: 7, marginTop: 6 }}>
      <ContactRoute title="Plan number" value={member.phone} note={member.id === "P2" ? "Disconnected in last outreach log" : "Plan record · verify before call"} score={member.id === "P2" ? "18% validity" : "72% validity"} selected={selectedPhone === member.phone} onSelect={() => setSelectedPhone(member.phone)} invalid={member.id === "P2"} />
      {member.alternatePhone && <ContactRoute title="Alternate number" value={member.alternatePhone} note={member.id === "P2" ? "Newer number from PCP portal · verify identity" : "Alternate number · owner not yet confirmed"} score={member.id === "P2" ? "68% validity" : "42% validity"} selected={selectedPhone === member.alternatePhone} onSelect={() => setSelectedPhone(member.alternatePhone ?? "")} />}
      {member.id === "P3" && <ContactRoute title="Former employer" value="(555) 010-2277" note="Reported by prior contact attempt" score="0% validity" selected={selectedPhone === "(555) 010-2277"} onSelect={() => setSelectedPhone("(555) 010-2277")} invalid />}
    </div>
    {member.id === "P3" && <div className="notice notice-warning section-spacer"><MapPin size={14} /><span>ED registration lists a newer shelter address than the plan. Confirm permission and the safe contact route through the ED social worker.</span></div>}
    <div className="field-row section-spacer">
      <label className="field"><span className="field-label">Outreach channel</span><select className="select" value={channel} onChange={(event) => setChannel(event.target.value)}>{["Phone", "Text", "Caregiver", "PCP office", "Pharmacy", "Community health worker", "ED social worker"].map((item) => <option key={item}>{item}</option>)}</select></label>
      <label className="field"><span className="field-label">Number or route</span><select className="select" value={selectedPhone} onChange={(event) => setSelectedPhone(event.target.value)}><option>{member.phone}</option>{member.alternatePhone && <option>{member.alternatePhone}</option>}{member.id === "P3" && <option>(555) 010-2277</option>}</select></label>
    </div>
    {alternativeRoute && <div className="notice notice-warning section-spacer"><AlertCircle size={14} /><span><strong>Alternative route proposed.</strong> {member.id === "P3" ? "Nine prior attempts did not connect. Confirm a safe route through the ED social worker or shelter and request a community health worker visit." : `${failedAttempts} recent failed attempts are recorded in this session. Use a verified caregiver, PCP office, pharmacy or text route instead of repeating calls.`}</span></div>}
    <div className="section-spacer">
      <div className="section-header"><div><h3 className="section-title">Contact history</h3><p className="section-description">Outcomes are shown per attempt.</p></div><span className="badge badge-neutral">{member.contacts.length} prior records</span></div>
      {member.contacts.map((entry, index) => <div className="fact-row" key={`${entry.date}-${index}`}><div><div className="member-name">{entry.date} · {entry.channel}</div><div className="member-meta">{entry.detail}</div></div><span className={`badge ${entry.outcome === "Connected" ? "badge-fresh" : "badge-aging"}`}>{entry.outcome}</span></div>)}
      {failedAttempts > 0 && <div className="fact-row"><span>Attempts logged in this session</span><span className="badge badge-aging">{failedAttempts} failed</span></div>}
    </div>
    <div className="field-row section-spacer">
      <label className="field"><span className="field-label">Attempt outcome</span><select className="select" value={outcome} onChange={(event) => setOutcome(event.target.value as OutreachOutcome | "")}><option value="">Select an outcome</option>{OUTCOMES.map((item) => <option key={item}>{item}</option>)}</select></label>
      <label className="field"><span className="field-label">Brief note</span><input className="input" value={contactNote} onChange={(event) => setContactNote(event.target.value)} placeholder="What happened?" /></label>
    </div>
    <button className="button button-primary section-spacer" disabled={!outcome} onClick={logAttempt}><Send size={13} />Log attempt</button>
    <div className="notice section-spacer"><Headphones size={14} /><span><strong>Call assist</strong> · Confirm identity, ask about the member&apos;s immediate needs, verify medications and agree on a next step. This is a checklist, not clinical advice.</span></div>
    <div style={{ display: "grid", gap: 6, marginTop: 10 }}>
      {CHECKLIST.map((item) => <label key={item} className="fact-row" style={{ cursor: "pointer", justifyContent: "flex-start" }}><input type="checkbox" checked={checkedItems.includes(item)} onChange={() => setCheckedItems((current) => current.includes(item) ? current.filter((value) => value !== item) : [...current, item])} />{item}</label>)}
    </div>
  </section>;
}

function ContactRoute({ title, value, note, score, selected, onSelect, invalid = false }: { title: string; value: string; note: string; score: string; selected: boolean; onSelect: () => void; invalid?: boolean }) {
  return <button type="button" className={`fact-row ${selected ? "callout" : ""}`} onClick={onSelect} style={{ width: "100%", textAlign: "left", cursor: "pointer" }}>
    <span className="avatar" style={{ width: 28, height: 28 }}><Phone size={12} /></span>
    <span style={{ flex: 1 }}><span className="member-name">{title} · {value}</span><span className="member-meta" style={{ display: "block" }}>{note}</span></span>
    <span className={`badge ${invalid ? "badge-stale" : selected ? "badge-blue" : "badge-neutral"}`}>{invalid ? "Invalid" : score}</span>
  </button>;
}

function DocumentationPanel({ member, requiredFields, confirmedFields, confirmField, completed, remaining, aiDraft, carePlanDraft, goal, setGoal, outcome, setOutcome, saveDocumentation, saveMessage, auditEntries }: {
  member: WorkCase;
  requiredFields: { key: string; label: string; type: string }[];
  confirmedFields: string[];
  confirmField: (patientId: string, field: string) => void;
  completed: number;
  remaining: number;
  aiDraft: string;
  carePlanDraft: string;
  goal: string;
  setGoal: (value: string) => void;
  outcome: OutreachOutcome | "";
  setOutcome: (value: OutreachOutcome | "") => void;
  saveDocumentation: () => void;
  saveMessage: string;
  auditEntries: { id: string; patientId: string; kind: string; detail: string; by: string; at: string }[];
}) {
  const [noteDraft, setNoteDraft] = useState(aiDraft);
  const [planDraft, setPlanDraft] = useState(carePlanDraft);
  const isConfirmed = (key: string) => confirmedFields.includes(`${member.id}:${key}`);
  return <section className="card">
    <div className="section-header"><div><h2 className="section-title">Documentation</h2><p className="section-description">Source fields are confirmed by the nurse. AI drafts require review before saving.</p></div><FileText size={17} color="#5A6884" /></div>
    <div className="content-grid content-grid-2">
      <div className="card card-tight"><div className="metric-number">{remaining}</div><div className="metric-label">fields remaining</div><div className="progress-track section-spacer"><div className="progress-fill progress-fill-success" style={{ width: `${completed / requiredFields.length * 100}%` }} /></div><div className="member-meta">{completed} of {requiredFields.length} complete</div></div>
      <div className="card card-tight"><div className="member-name">Auto-filled fields</div><div className="member-meta">Review every sourced item</div><div className="member-meta section-spacer">Owner: Maria Chen, RN</div></div>
    </div>
    <div className="section-spacer" style={{ display: "grid", gap: 11 }}>
      <SourcedField member={member} label="Member identity" source="Plan enrollment" value={`${member.name}, ${member.age} · ${member.plan}`} confirmed={isConfirmed("identity")} onConfirm={() => confirmField(member.id, "identity")} />
      <SourcedField member={member} label="Recent event" source={member.events[0]?.source ?? "Member record"} value={`${member.trigger} · ${member.triggerDate}`} confirmed={isConfirmed("trigger")} onConfirm={() => confirmField(member.id, "trigger")} />
      <div className="callout">
        <div className="section-header"><div><AiBadge /><div className="member-name" style={{ marginTop: 7 }}>Call note draft</div></div>{isConfirmed("callNote") && <span className="badge badge-fresh"><CheckCircle2 size={11} />Confirmed</span>}</div>
        <textarea className="textarea" value={noteDraft} onChange={(event) => setNoteDraft(event.target.value)} aria-label="AI drafted call note" />
        <div className="member-meta" style={{ display: "flex", gap: 5, alignItems: "center", marginTop: 7 }}><Sparkles size={11} color="#7034EA" />Why was this drafted? Uses the current trigger, source dates and documented follow-up gaps. No external model or API is used.</div>
        <button className="button button-secondary section-spacer" disabled={isConfirmed("callNote")} onClick={() => confirmField(member.id, "callNote")}>{isConfirmed("callNote") ? <><Check size={13} />Draft confirmed</> : "Review and confirm draft"}</button>
      </div>
      <div className="callout">
        <div className="section-header"><div><AiBadge /><div className="member-name" style={{ marginTop: 7 }}>Care plan update draft</div></div>{isConfirmed("carePlan") && <span className="badge badge-fresh"><CheckCircle2 size={11} />Confirmed</span>}</div>
        <textarea className="textarea" value={planDraft} onChange={(event) => setPlanDraft(event.target.value)} aria-label="AI drafted care plan update" />
        <div className="member-meta" style={{ marginTop: 7 }}>Why was this drafted? Uses the program name and open actions shown above.</div>
        <button className="button button-secondary section-spacer" disabled={isConfirmed("carePlan")} onClick={() => confirmField(member.id, "carePlan")}>{isConfirmed("carePlan") ? "Draft confirmed" : "Review and confirm draft"}</button>
      </div>
      <label className="field"><span className="field-label">Member-stated goal · Nurse-entered</span><textarea className="textarea" value={goal} onChange={(event) => setGoal(event.target.value)} placeholder="Enter the goal in the member's words." /></label>
      <label className="field"><span className="field-label">Contact outcome · Empty and required</span><select className="select" value={outcome} onChange={(event) => setOutcome(event.target.value as OutreachOutcome | "")}><option value="">Select an outcome</option>{OUTCOMES.map((item) => <option key={item}>{item}</option>)}</select></label>
      <div className="notice"><ShieldCheck size={14} /><span>AI-drafted fields cannot be saved until reviewed and confirmed. Confirmation is logged with nurse and scenario time.</span></div>
      <div className="page-actions"><button className="button button-primary" disabled={remaining > 0} onClick={saveDocumentation}><Check size={13} />Save note</button><span className="member-meta">{remaining ? `${remaining} required or unconfirmed fields remain.` : "All required fields are confirmed."}</span></div>
      {saveMessage && <div className="notice" role="status"><CheckCircle2 size={14} />{saveMessage}</div>}
      {auditEntries.filter((entry) => entry.patientId === member.id).slice(0, 4).map((entry) => <div className="member-meta" key={entry.id}>Audit · {entry.kind} · {entry.by} · {entry.at} · {entry.detail}</div>)}
    </div>
  </section>;
}

function SourcedField({ member, label, source, value, confirmed, onConfirm }: { member: WorkCase; label: string; source: string; value: string; confirmed: boolean; onConfirm: () => void }) {
  const record = member.dataRecords.find((item) => item.datasetId === "eligibility") ?? member.dataRecords[0];
  return <div className="card card-tight"><div className="section-header"><div><span className="badge badge-blue">{label} · Auto-filled from data</span><div className="member-name" style={{ marginTop: 6 }}>{value}</div><ProvenanceChip source={source} eventDate={record.eventDate} receivedDate={record.receivedDate} datasetId={record.datasetId} qualityFlags={record.qualityFlags} /></div><button className="button button-secondary" disabled={confirmed} onClick={onConfirm}>{confirmed ? <><Check size={12} />Confirmed</> : "Confirm field"}</button></div></div>;
}

function UnknownWorkspace({ id }: { id: string }) {
  return <main className="page-content"><PageHeader eyebrow="Case management" title="Detailed workspace not available" description={`${id} is a lightweight background case. Full outreach and documentation examples are available for the five scenario members.`} actions={<Link className="button button-secondary" href="/queue"><ArrowLeft size={13} />Back to queue</Link>} /><EmptyState title="No detailed workspace for this member" description="No outreach or clinical details are generated for background cases." /></main>;
}
