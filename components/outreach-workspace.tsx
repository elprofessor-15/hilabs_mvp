"use client";

import { AlertCircle, ArrowLeft, Check, CheckCircle2, Clock3, FileText, Headphones, MapPin, Phone, Send, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { HERO_CASES } from "@/data/seed";
import { formatDate } from "@/lib/utils";
import { getActionRule, scorePriority } from "@/lib/engines";
import { useWorkbenchStore } from "@/lib/store";
import type { OutreachOutcome, WorkCase } from "@/lib/types";
import type { SavedDocumentation } from "@/lib/store";
import { RecordDraftBadge, EmptyState, PageHeader, ProvenanceChip } from "@/components/ui";

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
  const savedDocumentation = useWorkbenchStore((state) => state.savedDocumentation[member.id]);
  const saveDocumentationRecord = useWorkbenchStore((state) => state.saveDocumentation);
  const confirmField = useWorkbenchStore((state) => state.confirmField);
  useEffect(() => {
    if (!savedDocumentation) return;
    setGoal(savedDocumentation.memberGoal);
    if (OUTCOMES.includes(savedDocumentation.contactOutcome as OutreachOutcome)) {
      setOutcome(savedDocumentation.contactOutcome as OutreachOutcome);
    }
  }, [savedDocumentation]);
  const drafts = createRecordDrafts(member);
  const requiredFields = [
    { key: "identity", label: "Member identity", type: "Auto-filled from data" },
    { key: "trigger", label: "Recent event", type: "Auto-filled from data" },
    { key: "callNote", label: "Call note draft", type: "Auto-drafted from records" },
    { key: "carePlan", label: "Care plan update draft", type: "Auto-drafted from records" },
    { key: "goal", label: "Member-stated goal", type: "Nurse-entered" },
    { key: "outcome", label: "Contact outcome", type: "Empty and required" },
  ];
  const completed = requiredFields.filter((field) => {
    if (field.type === "Auto-filled from data" || field.type === "Auto-drafted from records") return confirmedFields.includes(`${member.id}:${field.key}`);
    if (field.key === "goal") return goal.trim().length > 2;
    return Boolean(outcome);
  }).length;
  const remaining = requiredFields.length - completed;
  const failedSourceAttempts = member.contacts.filter((entry) => ["No answer", "Voicemail", "Disconnected", "Wrong number"].includes(entry.outcome)).length;
  const primaryNumberInvalid = member.dataRecords.some((record) => record.datasetId === "contacts" && record.qualityFlags.some((flag) => /primary number invalid/i.test(flag)));
  const alternativeRoute = failedAttempts + failedSourceAttempts >= 2 || primaryNumberInvalid;

  function logAttempt() {
    if (!outcome) return;
    logContact(member.id, outcome, channel, contactNote);
    setSaveMessage(`Attempt logged as ${outcome}. Audit entry added for Maria Chen, RN.`);
    setContactNote("");
    setOutcome("");
  }

  function saveDocumentation(documentation: Omit<SavedDocumentation, "savedAt">) {
    if (remaining > 0) return;
    saveDocumentationRecord(member.id, documentation);
    setSaveMessage("Documentation saved to this browser session. It is not sent to an external system.");
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
        <DocumentationPanel member={member} requiredFields={requiredFields} confirmedFields={confirmedFields} confirmField={confirmField} completed={completed} remaining={remaining} callNoteDraft={drafts.callNote} carePlanDraft={drafts.carePlan} citations={drafts.citations} goal={goal} setGoal={setGoal} outcome={outcome} setOutcome={setOutcome} saveDocumentation={saveDocumentation} savedDocumentation={savedDocumentation} saveMessage={saveMessage} auditEntries={auditEntries} />
      </div> : <div className="content-grid content-grid-2 section-spacer">
        <DocumentationPanel member={member} requiredFields={requiredFields} confirmedFields={confirmedFields} confirmField={confirmField} completed={completed} remaining={remaining} callNoteDraft={drafts.callNote} carePlanDraft={drafts.carePlan} citations={drafts.citations} goal={goal} setGoal={setGoal} outcome={outcome} setOutcome={setOutcome} saveDocumentation={saveDocumentation} savedDocumentation={savedDocumentation} saveMessage={saveMessage} auditEntries={auditEntries} />
        <OutreachPanel member={member} channel={channel} setChannel={setChannel} selectedPhone={selectedPhone} setSelectedPhone={setSelectedPhone} outcome={outcome} setOutcome={setOutcome} contactNote={contactNote} setContactNote={setContactNote} logAttempt={logAttempt} failedAttempts={failedAttempts} alternativeRoute={alternativeRoute} />
      </div>}
      <div className="content-grid content-grid-2 section-spacer">
        <div className="notice"><ShieldCheck size={14} /><span>Record-derived drafts use visible citations and require nurse confirmation. No call, message, or external service is invoked.</span></div>
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
  const primaryInvalid = member.dataRecords.some((record) => record.datasetId === "contacts" && record.qualityFlags.some((flag) => /primary number invalid/i.test(flag)));
  const wrongNumberRecord = member.contacts.find((entry) => entry.outcome === "Wrong number");
  const partnerRoute = member.events.find((event) => /social worker|community health worker/i.test(`${event.title} ${event.detail}`));
  return <section className="card">
    <div className="section-header"><div><h2 className="section-title">Outreach planner</h2><p className="section-description">Verify the number and route before making contact.</p></div><Phone size={17} color="#5A6884" /></div>
    <div className="notice"><Phone size={14} /><span><strong>Recommended channel: {member.preferredChannel}</strong><br />{member.language} · {member.bestTime}. Preferences are sourced and should be reconfirmed.</span></div>
    <h3 className="section-title section-spacer">Contact routes</h3>
    <div className="content-grid" style={{ gap: 7, marginTop: 6 }}>
      <ContactRoute title="Plan number" value={member.phone} note={primaryInvalid ? "Source contact record marks this number invalid; verify before use" : "Plan record · verify before call"} status={primaryInvalid ? "Invalid" : "Unverified"} selected={selectedPhone === member.phone} onSelect={() => setSelectedPhone(member.phone)} invalid={primaryInvalid} />
      {member.alternatePhone && <ContactRoute title="Alternate number" value={member.alternatePhone} note="Alternate number · ownership and permission are not confirmed" status="Unverified" selected={selectedPhone === member.alternatePhone} onSelect={() => setSelectedPhone(member.alternatePhone ?? "")} />}
    </div>
    {partnerRoute && <div className="notice notice-warning section-spacer"><MapPin size={14} /><span>{partnerRoute.detail} Confirm permission and a safe contact route before using it.</span></div>}
    {wrongNumberRecord && <div className="notice notice-warning section-spacer"><AlertCircle size={14} /><span>A prior contact record is marked wrong number: {wrongNumberRecord.detail} Do not retry that route.</span></div>}
    <div className="field-row section-spacer">
      <label className="field"><span className="field-label">Outreach channel</span><select className="select" value={channel} onChange={(event) => setChannel(event.target.value)}>{["Phone", "Text", "Caregiver", "PCP office", "Pharmacy", "Community health worker", "ED social worker"].map((item) => <option key={item}>{item}</option>)}</select></label>
      <label className="field"><span className="field-label">Number or route</span><select className="select" value={selectedPhone} onChange={(event) => setSelectedPhone(event.target.value)}><option>{member.phone}</option>{member.alternatePhone && <option>{member.alternatePhone}</option>}</select></label>
    </div>
    {alternativeRoute && <div className="notice notice-warning section-spacer"><AlertCircle size={14} /><span><strong>Alternative route needs review.</strong> {failedAttempts + member.contacts.filter((entry) => ["No answer", "Voicemail", "Disconnected", "Wrong number"].includes(entry.outcome)).length} failed or invalid attempts are recorded across source history and this session. Verify identity, permission, and route ownership before another attempt.</span></div>}
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

function ContactRoute({ title, value, note, status, selected, onSelect, invalid = false }: { title: string; value: string; note: string; status: string; selected: boolean; onSelect: () => void; invalid?: boolean }) {
  return <button type="button" className={`fact-row ${selected ? "callout" : ""}`} onClick={onSelect} style={{ width: "100%", textAlign: "left", cursor: "pointer" }}>
    <span className="avatar" style={{ width: 28, height: 28 }}><Phone size={12} /></span>
    <span style={{ flex: 1 }}><span className="member-name">{title} · {value}</span><span className="member-meta" style={{ display: "block" }}>{note}</span></span>
    <span className={`badge ${invalid ? "badge-stale" : selected ? "badge-blue" : "badge-neutral"}`}>{status}</span>
  </button>;
}

interface DraftCitation {
  id: number;
  source: string;
  eventDate: string;
  receivedDate: string;
  summary: string;
}

function createRecordDrafts(member: WorkCase) {
  const recentEvent = [...member.events].sort((a, b) => b.eventDate.localeCompare(a.eventDate))[0];
  const medication = member.medications[0];
  const contactRecord = member.dataRecords.find((record) => record.datasetId === "contacts") ?? member.dataRecords[0];
  const medicationRecord = member.dataRecords.find((record) => record.datasetId === "pharmacy" || record.datasetId === "clinical" || record.datasetId === "hie") ?? member.dataRecords[0];
  const eventCitation: DraftCitation = recentEvent
    ? { id: 1, source: recentEvent.source, eventDate: recentEvent.eventDate, receivedDate: recentEvent.receivedDate, summary: recentEvent.title }
    : { id: 1, source: "Trigger record", eventDate: member.triggerAt, receivedDate: member.triggerAt, summary: member.trigger };
  const medicationCitation: DraftCitation = {
    id: 2,
    source: medicationRecord.source,
    eventDate: medicationRecord.eventDate,
    receivedDate: medicationRecord.receivedDate,
    summary: medicationRecord.summary,
  };
  const contactCitation: DraftCitation = {
    id: 3,
    source: contactRecord.source,
    eventDate: contactRecord.eventDate,
    receivedDate: contactRecord.receivedDate,
    summary: contactRecord.summary,
  };
  const identityRecord = member.dataRecords.find((record) => record.datasetId === "eligibility") ?? member.dataRecords[0];
  const identityCitation: DraftCitation = {
    id: 4,
    source: identityRecord.source,
    eventDate: identityRecord.eventDate,
    receivedDate: identityRecord.receivedDate,
    summary: identityRecord.summary,
  };
  const action = getActionRule(scorePriority(member).topActionId);
  const citations = [eventCitation, medicationCitation, contactCitation, identityCitation];
  return {
    citations,
    callNote: [
      "Pre-contact planning note: no encounter outcome is recorded in this draft. [1]",
      `Review the ${eventCitation.summary} source item with the member and confirm current needs before coordinating care. [1]`,
      `A medication source lists ${medication?.medication ?? "no medication detail"} (${medication?.dose ?? "status not recorded"}). Confirm current use and access with the member and care team. [2]`,
      `The record lists ${member.preferredChannel} as a preferred channel and ${member.bestTime} as the best time. Reconfirm both before use. [3]`,
      `Proposed nurse action: ${action?.action ?? "review the source records with the member"}. [1][2]`,
    ].join("\n"),
    carePlan: [
      `Proposed follow-up task: Confirm current ${member.program} support needs and member priorities. [1][4]`,
      "After contact, document only the member-confirmed plan, responsible owner, and follow-up date. [3]",
    ].join("\n"),
  };
}

function hasCitedSentences(text: string) {
  const lines = text.split(/\n+/).map((line) => line.trim()).filter(Boolean);
  return lines.length > 0 && lines.every((line) => /(?:\[\d+\])+$/.test(line));
}

function CitationList({ citations }: { citations: DraftCitation[] }) {
  return <div className="section-spacer" aria-label="Draft source citations">
    <div className="field-label">Source citations</div>
    {citations.map((citation) => <div className="member-meta" key={citation.id}>
      [{citation.id}] {citation.source} · event {formatDate(citation.eventDate)} · received {formatDate(citation.receivedDate)} · {citation.summary}
    </div>)}
  </div>;
}

function DocumentationPanel({ member, requiredFields, confirmedFields, confirmField, completed, remaining, callNoteDraft, carePlanDraft, citations, goal, setGoal, outcome, setOutcome, saveDocumentation, savedDocumentation, saveMessage, auditEntries }: {
  member: WorkCase;
  requiredFields: { key: string; label: string; type: string }[];
  confirmedFields: string[];
  confirmField: (patientId: string, field: string) => void;
  completed: number;
  remaining: number;
  callNoteDraft: string;
  carePlanDraft: string;
  citations: DraftCitation[];
  goal: string;
  setGoal: (value: string) => void;
  outcome: OutreachOutcome | "";
  setOutcome: (value: OutreachOutcome | "") => void;
  saveDocumentation: (documentation: Omit<SavedDocumentation, "savedAt">) => void;
  savedDocumentation?: SavedDocumentation;
  saveMessage: string;
  auditEntries: { id: string; patientId: string; kind: string; detail: string; by: string; at: string }[];
}) {
  const [noteDraft, setNoteDraft] = useState(savedDocumentation?.callNote ?? callNoteDraft);
  const [planDraft, setPlanDraft] = useState(savedDocumentation?.carePlan ?? carePlanDraft);
  useEffect(() => {
    if (!savedDocumentation) return;
    setNoteDraft(savedDocumentation.callNote);
    setPlanDraft(savedDocumentation.carePlan);
  }, [savedDocumentation]);
  const isConfirmed = (key: string) => confirmedFields.includes(`${member.id}:${key}`);
  const noteCitationError = !hasCitedSentences(noteDraft);
  const planCitationError = !hasCitedSentences(planDraft);
  return <section className="card">
    <div className="section-header"><div><h2 className="section-title">Documentation</h2><p className="section-description">Record-derived fields are reviewed and confirmed by the nurse before saving.</p></div><FileText size={17} color="#5A6884" /></div>
    <div className="content-grid content-grid-2">
      <div className="card card-tight"><div className="metric-number">{remaining}</div><div className="metric-label">fields remaining</div><div className="progress-track section-spacer"><div className="progress-fill progress-fill-success" style={{ width: `${completed / requiredFields.length * 100}%` }} /></div><div className="member-meta">{completed} of {requiredFields.length} complete</div></div>
      <div className="card card-tight"><div className="member-name">Auto-filled fields</div><div className="member-meta">Review every sourced item</div><div className="member-meta section-spacer">Owner: Maria Chen, RN</div></div>
    </div>
    <div className="section-spacer" style={{ display: "grid", gap: 11 }}>
      <SourcedField member={member} label="Member identity" source="Plan enrollment" value={`${member.name}, ${member.age} · ${member.plan}`} confirmed={isConfirmed("identity")} onConfirm={() => confirmField(member.id, "identity")} />
      <SourcedField member={member} label="Recent event" source={member.events[0]?.source ?? "Member record"} value={`${member.trigger} · ${formatDate(member.triggerAt)}`} confirmed={isConfirmed("trigger")} onConfirm={() => confirmField(member.id, "trigger")} />
      <div className="callout">
        <div className="section-header"><div><RecordDraftBadge /><div className="member-name" style={{ marginTop: 7 }}>Call note draft</div></div>{isConfirmed("callNote") && <span className="badge badge-fresh"><CheckCircle2 size={11} />Confirmed</span>}</div>
        <textarea className="textarea" value={noteDraft} onChange={(event) => setNoteDraft(event.target.value)} aria-label="Record-derived call note draft" disabled={isConfirmed("callNote")} />
        <CitationList citations={citations} />
        {noteCitationError && <div className="notice notice-warning section-spacer" role="alert">Every draft line must end with at least one source citation such as [1].</div>}
        <button className="button button-secondary section-spacer" disabled={isConfirmed("callNote") || noteCitationError} onClick={() => confirmField(member.id, "callNote")}>{isConfirmed("callNote") ? <><Check size={13} />Draft confirmed</> : "Review and confirm draft"}</button>
      </div>
      <div className="callout">
        <div className="section-header"><div><RecordDraftBadge /><div className="member-name" style={{ marginTop: 7 }}>Care plan update draft</div></div>{isConfirmed("carePlan") && <span className="badge badge-fresh"><CheckCircle2 size={11} />Confirmed</span>}</div>
        <textarea className="textarea" value={planDraft} onChange={(event) => setPlanDraft(event.target.value)} aria-label="Record-derived care plan draft" disabled={isConfirmed("carePlan")} />
        <CitationList citations={citations} />
        {planCitationError && <div className="notice notice-warning section-spacer" role="alert">Every draft line must end with at least one source citation such as [1].</div>}
        <button className="button button-secondary section-spacer" disabled={isConfirmed("carePlan") || planCitationError} onClick={() => confirmField(member.id, "carePlan")}>{isConfirmed("carePlan") ? "Draft confirmed" : "Review and confirm draft"}</button>
      </div>
      <label className="field"><span className="field-label">Member-stated goal · Nurse-entered</span><textarea className="textarea" value={goal} onChange={(event) => setGoal(event.target.value)} placeholder="Enter the goal in the member's words." /></label>
      <label className="field"><span className="field-label">Contact outcome · Empty and required</span><select className="select" value={outcome} onChange={(event) => setOutcome(event.target.value as OutreachOutcome | "")}><option value="">Select an outcome</option>{OUTCOMES.map((item) => <option key={item}>{item}</option>)}</select></label>
      <div className="notice"><ShieldCheck size={14} /><span>Record-derived fields cannot be saved until reviewed, cited, and confirmed by the nurse.</span></div>
      <div className="page-actions"><button className="button button-primary" disabled={remaining > 0} onClick={() => saveDocumentation({ callNote: noteDraft, carePlan: planDraft, memberGoal: goal.trim(), contactOutcome: outcome })}><Check size={13} />Save note</button><span className="member-meta">{remaining ? `${remaining} required or unconfirmed fields remain.` : "All required fields are confirmed."}</span></div>
      {savedDocumentation && <div className="member-meta">Latest saved version in this browser session · {savedDocumentation.savedAt}</div>}
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
