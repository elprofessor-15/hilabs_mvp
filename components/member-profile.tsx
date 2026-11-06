"use client";

import * as Tabs from "@radix-ui/react-tabs";
import {
  AlertCircle, ArrowLeft, ArrowRight, CalendarCheck, CheckCircle2, CircleHelp,
  ClipboardList, FileQuestion, Phone, ShieldAlert,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { DATASETS } from "@/data/datasets";
import { HERO_CASES } from "@/data/seed";
import { SCENARIO_NOW } from "@/config/workbench";
import { calculateFillGap, getActionRule, getFreshness, scorePriority } from "@/lib/engines";
import { useWorkbenchStore } from "@/lib/store";
import { formatDate } from "@/lib/utils";
import type { DatasetId, WorkCase } from "@/lib/types";
import { ConfidenceBadge, DataStateNotice, EmptyState, PageHeader, PriorityBadge, ProvenanceChip } from "@/components/ui";

const TABS = ["Overview", "Medications", "Utilisation", "Labs and vitals", "SDOH and barriers", "Care plan", "Contact history", "Data sources"] as const;
type MemberTab = (typeof TABS)[number];

export function MemberProfile({ id }: { id: string }) {
  const member = HERO_CASES.find((patient) => patient.id === id);
  if (!member) return <UnknownMember id={id} />;
  return <MemberDetails member={member} />;
}

function MemberDetails({ member }: { member: WorkCase }) {
  const [activeTab, setActiveTab] = useState<MemberTab>("Overview");
  const [conflictNote, setConflictNote] = useState("");
  const conflict = useWorkbenchStore((state) => state.conflictDecisions[member.id]);
  const decideConflict = useWorkbenchStore((state) => state.decideConflict);
  const result = scorePriority(member.priorityFactors, member.protocolTrigger, member.primaryActionId);
  const confidence = { score: member.priorityFactors.confidence, reasons: member.confidenceNotes };
  const medicationConflict = member.medications.length > 1 && (member.id === "P1" || member.id === "P5");
  const fillGaps = member.medications.filter((item) => item.daysSupply !== undefined).map((item) => ({
    medication: item.medication,
    gapDays: calculateFillGap(item.eventDate, item.daysSupply ?? 0, SCENARIO_NOW),
  }));
  const actionItems = useMemo(() => member.attention.slice(0, 3), [member]);

  function recordConflict(decision: string) {
    if (conflictNote.trim().length < 8) return;
    decideConflict(member.id, `${decision}. ${conflictNote.trim()}`);
    setConflictNote("");
  }

  return (
    <main className="page-content">
      <PageHeader
        eyebrow={`Member 360 · ${member.id} · ${member.program}`}
        title={member.name}
        description="A source-aware member picture. Verify conflicting or missing data before treating it as current."
        actions={<><Link href="/queue" className="button button-secondary"><ArrowLeft size={13} />Back to queue</Link><Link href={`/outreach/${member.id}`} className="button button-primary"><Phone size={13} />Open outreach</Link></>}
      />

      <section className="card">
        <div className="content-grid content-grid-2">
          <div>
            <div className="section-header"><div><h2 className="section-title">Member identity</h2><p className="section-description">Confirm identity and preferences before outreach.</p></div><ConfidenceBadge score={confidence.score} reasons={confidence.reasons} /></div>
            <div className="content-grid content-grid-2">
              <IdentityFact member={member} datasetId="eligibility" label="Age and plan" value={`${member.age} · ${member.plan}`} />
              <IdentityFact member={member} datasetId="riskGaps" label="Primary program" value={member.program} />
              <IdentityFact member={member} datasetId="careTeam" label="Primary care provider" value={member.pcp} />
              <IdentityFact member={member} datasetId="eligibility" label="Language" value={member.language} />
              <IdentityFact member={member} datasetId="caregiver" label="Caregiver" value={member.caregiver} />
              <IdentityFact member={member} datasetId="contacts" label="Preferred channel" value={member.preferredChannel} />
              <IdentityFact member={member} datasetId="contacts" label="Best time to call" value={member.bestTime} />
              <IdentityFact member={member} datasetId="sdoh" label="Address on file" value={member.address} />
            </div>
          </div>
          <div>
            <div className="section-header"><div><h2 className="section-title">Priority and next step</h2><p className="section-description">Rule-based and auditable. Not an autonomous clinical recommendation.</p></div><PriorityBadge band={result.band} /></div>
            <div className="notice"><CircleHelp size={15} /><span><strong>Why now</strong><br />{member.whyNow}</span></div>
            {result.verifyFirst && <div className="notice notice-warning section-spacer"><ShieldAlert size={14} /><span><strong>Verify first</strong> · Data confidence is low. A verification task is added and the case cannot be ranked as low priority because of missing data.</span></div>}
            <div className="notice section-spacer"><ClipboardList size={15} /><span><strong>Top action · Rule {result.topActionId}</strong><br />{getActionRule(result.topActionId)?.action}<EvidenceChips member={member} actionId={result.topActionId} /></span></div>
            <div className="member-meta section-spacer">Score {result.score}/100 · weights are illustrative and require clinical validation.</div>
          </div>
        </div>
      </section>

      {member.protocolTrigger && <div className="notice notice-danger section-spacer" role="alert"><ShieldAlert size={15} /><span><strong>Clinician escalation required</strong><br />{member.protocolTrigger} This screen is a workflow flag only and does not provide a risk assessment.</span></div>}

      <section className="card section-spacer">
        <div className="section-header"><div><h2 className="section-title">What happened · last 30 days</h2><p className="section-description">Event date is when it happened. Received date is when the workbench received it.</p></div><div style={{ display: "grid", justifyItems: "end", gap: 5 }}><ConfidenceBadge score={confidence.score} reasons={confidence.reasons} /><span className="badge badge-neutral">{member.events.length} events</span></div></div>
        {member.events.length === 0 ? <EmptyState title="No events found" description="No source events are available for this period. Missing information is not a negative finding." /> : (
          <div className="timeline" aria-label="Recent member events">
            {[...member.events].sort((a, b) => a.eventDate.localeCompare(b.eventDate)).map((event) => (
              <article className="timeline-item" key={event.id}>
                <div className="timeline-dot" />
                <div className="timeline-item-title">{event.title}</div>
                <div className="timeline-date">Event {formatDate(event.eventDate)} · received {formatDate(event.receivedDate)}</div>
                <div className="timeline-detail">{event.detail}</div>
                <div className="timeline-detail"><ProvenanceChip source={event.source} eventDate={event.eventDate} receivedDate={event.receivedDate} datasetId={event.datasetId} qualityFlags={event.qualityFlags} /></div>
              </article>
            ))}
          </div>
        )}
      </section>

      <div className="content-grid content-grid-2 section-spacer">
        <section className="card">
          <div className="section-header"><div><h2 className="section-title">Needs attention</h2><p className="section-description">Evidence and a review action for each item.</p></div><AlertCircle size={16} color="#5A6884" /></div>
          <div style={{ display: "grid", gap: 9 }}>
            {member.attention.map((item) => {
              const action = getActionRule(item.actionId);
              return <div key={item.label} className={`notice ${item.severity === "Critical" ? "notice-danger" : item.severity === "High" ? "notice-warning" : ""}`}>
                <AlertCircle size={14} />
                <div style={{ flex: 1 }}><div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 6 }}><strong>{item.label}</strong><PriorityBadge band={item.severity} /></div><div style={{ marginTop: 4 }}>{item.evidence}</div>                <div className="member-meta">Suggested review · Rule {item.actionId}: {action?.action}</div><EvidenceChips member={member} actionId={item.actionId} /></div>
              </div>;
            })}
          </div>
        </section>
        <section className="card">
          <div className="section-header"><div><h2 className="section-title">Next best actions</h2><p className="section-description">Transparent rules, with evidence links and owner.</p></div><CalendarCheck size={16} color="#5A6884" /></div>
          <div style={{ display: "grid", gap: 8 }}>
            {actionItems.map((item, index) => {
              const action = getActionRule(item.actionId);
              return <div className="fact-row" key={item.actionId}><div style={{ minWidth: 0 }}><div className="member-name">0{index + 1} · {action?.action}</div><div className="member-meta">Rule {item.actionId} · Owner: Maria Chen, RN</div><div className="member-meta">{action?.rationale}</div><EvidenceChips member={member} actionId={item.actionId} /></div><span className="badge badge-neutral">Today</span></div>;
            })}
          </div>
          <Link className="button button-secondary section-spacer" href={`/outreach/${member.id}`}>Open outreach planner <ArrowRight size={13} /></Link>
        </section>
      </div>

      <section className="card section-spacer">
        <Tabs.Root value={activeTab} onValueChange={(value) => setActiveTab(value as MemberTab)}>
          <div className="section-header"><div><h2 className="section-title">Member details</h2><p className="section-description">Every source-specific view keeps dates and quality flags visible.</p></div><ConfidenceBadge score={confidence.score} reasons={confidence.reasons} /></div>
          <Tabs.List className="tabs-list" aria-label="Member detail sections">
            {TABS.map((tab) => <Tabs.Trigger key={tab} className="tab-trigger" value={tab}>{tab}</Tabs.Trigger>)}
          </Tabs.List>
          {TABS.map((tab) => <Tabs.Content key={tab} value={tab} className="section-spacer">
            {tab === "Overview" && <OverviewPanel member={member} />}
            {tab === "Medications" && <MedicationPanel member={member} fillGaps={fillGaps} conflict={conflict} note={conflictNote} setNote={setConflictNote} onDecision={recordConflict} conflictEnabled={medicationConflict} />}
            {tab === "Utilisation" && <RecordPanel member={member} datasets={["adt", "claims", "utilization", "homeHealth"]} />}
            {tab === "Labs and vitals" && <RecordPanel member={member} datasets={["labs"]} />}
            {tab === "SDOH and barriers" && <RecordPanel member={member} datasets={["sdoh", "caregiver"]} />}
            {tab === "Care plan" && <CarePlanPanel member={member} />}
            {tab === "Contact history" && <ContactPanel member={member} />}
            {tab === "Data sources" && <RecordPanel member={member} datasets={Array.from(new Set(member.dataRecords.map((record) => record.datasetId)))} />}
          </Tabs.Content>)}
        </Tabs.Root>
      </section>
      <div className="section-spacer"><DataStateNotice /></div>
    </main>
  );
}

function IdentityFact({ member, datasetId, label, value }: { member: WorkCase; datasetId: DatasetId; label: string; value: string }) {
  const record = member.dataRecords.find((item) => item.datasetId === datasetId) ?? member.dataRecords[0];
  return <div className="fact-row"><div><div className="fact-label">{label}</div><ProvenanceChip source={record.source} eventDate={record.eventDate} receivedDate={record.receivedDate} datasetId={record.datasetId} qualityFlags={record.qualityFlags} /></div><span className="fact-value">{value}</span></div>;
}

const ACTION_DATASETS: Record<string, DatasetId[]> = {
  A01: ["adt", "contacts"], A02: ["pharmacy", "contacts", "sdoh"], A03: ["contacts", "adt"],
  A04: ["clinical", "riskGaps"], A05: ["utilization", "homeHealth"], A06: ["clinical", "pharmacy", "hie"],
  A07: ["adt", "appointments"], A08: ["contacts", "careTeam"], A09: ["sdoh", "appointments"],
  A10: ["caregiver", "contacts"], A11: ["claims", "adt"], A12: ["clinical", "labs"],
  A13: ["appointments", "claims"], A14: ["utilization"], A15: ["eligibility", "clinical"],
  A16: ["eligibility", "contacts"],
};

function EvidenceChips({ member, actionId }: { member: WorkCase; actionId: string }) {
  return <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 8px", marginTop: 6 }}>
    {(ACTION_DATASETS[actionId] ?? []).map((datasetId) => {
      const record = member.dataRecords.find((item) => item.datasetId === datasetId);
      return record ? <ProvenanceChip key={datasetId} source={record.source} eventDate={record.eventDate} receivedDate={record.receivedDate} datasetId={datasetId} qualityFlags={record.qualityFlags} /> : null;
    })}
  </div>;
}

function OverviewPanel({ member }: { member: WorkCase }) {
  return <div className="content-grid content-grid-2">
    <div><h3 className="section-title">Case snapshot</h3><div className="fact-row"><span className="fact-label">Trigger</span><span className="fact-value">{member.trigger} · {formatDate(member.triggerDate)}</span></div><div className="fact-row"><span className="fact-label">Contact target</span><span className="fact-value">{member.deadlineHours <= 24 ? `${member.deadlineHours} hours remaining` : "Review today"}</span></div><div className="fact-row"><span className="fact-label">Last contact</span><span className="fact-value">{member.lastContact}</span></div><div className="fact-row"><span className="fact-label">Care team</span><span className="fact-value">{member.pcp}</span></div></div>
    <div><h3 className="section-title">Source confidence</h3><p className="section-description">Confidence is based on visible quality flags, not clinical certainty.</p>{member.confidenceNotes.map((note) => <div className="fact-row" key={note}><span className="fact-label">{note}</span><FileQuestion size={13} color="#8c98b0" /></div>)}</div>
  </div>;
}

function MedicationPanel({ member, fillGaps, conflict, note, setNote, onDecision, conflictEnabled }: {
  member: WorkCase;
  fillGaps: { medication: string; gapDays: number }[];
  conflict?: string;
  note: string;
  setNote: (value: string) => void;
  onDecision: (decision: string) => void;
  conflictEnabled: boolean;
}) {
  return <div>
    <div className="notice"><CircleHelp size={14} /><span>A prescription is not a fill. A fill does not confirm that a member took a medication. Verify the current list with the member and care team.</span></div>
    <div className="table-wrap section-spacer"><table className="data-table"><thead><tr><th>Medication</th><th>Source and status</th><th>Record</th><th>Event date</th><th>Received</th><th>Fill gap</th></tr></thead><tbody>
      {member.medications.map((medication, index) => {
        const gap = fillGaps.find((item) => item.medication === medication.medication);
        return <tr key={`${medication.source}-${index}`}><td className="member-name">{medication.medication}</td><td>{medication.status}<div className="member-meta">{medication.source}</div></td><td>{medication.dose}<div className="member-meta">{medication.qualityFlags.join("; ") || "No quality flags recorded"}</div></td><td>{formatDate(medication.eventDate)}</td><td>{formatDate(medication.receivedDate)}</td><td>{gap ? <span className={`badge ${gap.gapDays > 0 ? "badge-aging" : "badge-fresh"}`}>{gap.gapDays > 0 ? `${gap.gapDays} days past expected runout` : "No fill gap by dates"}</span> : "Not calculated"}</td></tr>;
      })}
    </tbody></table></div>
    {conflictEnabled && <div className="notice notice-warning section-spacer"><AlertCircle size={15} /><div style={{ flex: 1 }}><strong>Medication conflict. Sources are not reconciled.</strong><p style={{ margin: "5px 0" }}>Hospital CCD, pharmacy feed and HIE show different records. The data does not establish which list is current. Confirm directly with the member and care team.</p><div className="content-grid content-grid-3"><div className="queue-expanded"><strong>Prescribed</strong><div className="member-meta">{member.medications.find((item) => item.status === "Prescribed")?.dose ?? "Not available"}</div></div><div className="queue-expanded"><strong>Dispensed</strong><div className="member-meta">{member.medications.find((item) => item.status === "Dispensed")?.dose ?? "Not available"}</div></div><div className="queue-expanded"><strong>Reported</strong><div className="member-meta">{member.medications.find((item) => item.status === "Reported")?.dose ?? "Not available"}</div></div></div>
      {conflict ? <div className="callout section-spacer"><CheckCircle2 size={13} /> Decision recorded: {conflict}</div> : <><label className="field section-spacer"><span className="field-label">Reason or member confirmation</span><textarea className="textarea" value={note} onChange={(event) => setNote(event.target.value)} placeholder="Record what was confirmed and how." /></label><div className="page-actions section-spacer"><button className="button button-primary" disabled={note.trim().length < 8} onClick={() => onDecision("Confirmed")}>Confirm</button><button className="button button-secondary" disabled={note.trim().length < 8} onClick={() => onDecision("Rejected")}>Reject</button><button className="button button-secondary" disabled={note.trim().length < 8} onClick={() => onDecision("Marked for follow-up")}>Mark for follow-up</button></div><div className="member-meta">A reason is required. Decision will be logged with Maria Chen, RN and the current time.</div></>}</div></div>}
  </div>;
}

function RecordPanel({ member, datasets }: { member: WorkCase; datasets: DatasetId[] }) {
  const rows = member.dataRecords.filter((record) => datasets.includes(record.datasetId));
  if (!rows.length) return <EmptyState title="No records in this view" description="The source did not provide a record. Confirm with the member or provider before interpreting this as a negative finding." />;
  return <div className="table-wrap"><table className="data-table"><thead><tr><th>Dataset</th><th>Source</th><th>Summary</th><th>Event date</th><th>Received date</th><th>Freshness</th><th>Quality</th></tr></thead><tbody>{rows.map((row, index) => {
    const definition = DATASETS.find((dataset) => dataset.id === row.datasetId);
    const freshness = getFreshness(row.eventDate, row.datasetId, SCENARIO_NOW);
    return <tr key={`${row.datasetId}-${index}`}><td>{definition?.name ?? row.datasetId}</td><td>{row.source}</td><td>{row.summary}</td><td>{formatDate(row.eventDate)}</td><td>{formatDate(row.receivedDate)}</td><td><span className={`badge badge-${freshness.state.toLowerCase()}`}>{freshness.state} · {freshness.ageDays}d</span></td><td>{row.qualityFlags.join("; ") || "No flags"}</td></tr>;
  })}</tbody></table></div>;
}

function CarePlanPanel({ member }: { member: WorkCase }) {
  return <div className="content-grid content-grid-2"><div><h3 className="section-title">Goals to confirm</h3>{member.attention.slice(0, 3).map((item) => <div className="fact-row" key={item.label}><span>{item.label}</span><span className="badge badge-neutral">Needs nurse review</span></div>)}</div><div><h3 className="section-title">Missing information</h3><div className="notice notice-warning section-spacer"><FileQuestion size={14} /><span>{member.id === "P1" ? "No discharge summary received. Requested Nov 8." : "No current care-plan update found in the synthetic records. Confirm with the member before documenting."}</span></div></div></div>;
}

function ContactPanel({ member }: { member: WorkCase }) {
  return <div className="table-wrap"><table className="data-table"><thead><tr><th>Date</th><th>Channel</th><th>Outcome</th><th>Detail</th></tr></thead><tbody>{member.contacts.map((contact, index) => <tr key={`${contact.date}-${index}`}><td>{contact.date}</td><td>{contact.channel}</td><td><span className={`badge ${contact.outcome === "Connected" ? "badge-fresh" : "badge-aging"}`}>{contact.outcome}</span></td><td>{contact.detail}</td></tr>)}</tbody></table></div>;
}

function UnknownMember({ id }: { id: string }) {
  return <main className="page-content"><PageHeader eyebrow="Member 360" title="Detailed record not available" description={`${id} is a lightweight background case. The prototype includes full Member 360 records for five scenario members.`} actions={<Link className="button button-secondary" href="/queue"><ArrowLeft size={13} />Back to queue</Link>} /><EmptyState title="No detailed record for this member" description="Background cases are included for caseload context only. No clinical data is fabricated on this screen." /></main>;
}
