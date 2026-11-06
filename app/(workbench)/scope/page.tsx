import { ArrowDown, ArrowRight, CheckCircle2, CircleOff, ShieldCheck, Sparkles } from "lucide-react";
import { PageHeader } from "@/components/ui";
import Link from "next/link";

const included = [
  ["Trusted member context", "Member summary, provenance, source dates, quality flags and missing-data states", "High", "High", "Human review", "Medium"],
  ["Transparent priority queue", "Illustrative weighted score, deadline pinning, verification flags and overrides", "High", "Medium", "High guardrail", "Medium"],
  ["Transition workflow", "Post-discharge contact, medication reconciliation and appointment follow-up", "High", "High", "Human review", "Medium"],
  ["Outreach and documentation", "Structured attempts, deterministic drafts and nurse confirmations", "High", "High", "Human approval", "Medium"],
  ["Impact and data annex", "Assumption model, metric definitions, dataset register and Excel export", "Medium", "High", "Low", "Low"],
];

const later = [
  ["Production integrations", "Connect validated plan, ADT, PBM, HIE, provider and UM systems after data agreements and testing."],
  ["Validated clinical models", "Develop only with clinical governance, representative data, prospective validation and monitoring."],
  ["Population health analytics", "Consider after the individual case workflow proves useful and data quality is understood."],
  ["Automated outreach", "Keep out until consent, opt-out, channel safety, escalation and audit requirements are established."],
  ["Enterprise identity and permissions", "Add production authentication, role-based access, tenant boundaries and formal audit storage before use with real data."],
];

const outOfScope = [
  ["Predictive ML models", "No validated clinical model or representative production dataset is included."],
  ["Autonomous clinical recommendations", "Clinical decisions remain with a licensed clinician. Rules surface evidence and questions only."],
  ["Automated outbound calling", "This prototype has no external API, call service or member consent workflow."],
  ["Population-health analytics", "The MVP focuses on Maria's individual post-discharge workflow, not broad cohort analysis."],
  ["Billing", "Billing does not address the core case-management decision."],
  ["EHR replacement", "The workbench is a coordination layer, not a system of record."],
];

export default function ScopePage() {
  return <main className="page-content">
    <PageHeader eyebrow="MVP decisions" title="Scope and sequencing" description="Build the smallest trusted workflow that helps Maria decide whom to work on, what needs verification, and what to do next." actions={<Link className="button button-secondary" href="/gallery"><Sparkles size={13} />Component gallery</Link>} />
    <div className="content-grid content-grid-2">
      <section className="card">
        <div className="section-header"><div><h2 className="section-title">In the MVP</h2><p className="section-description">Prioritized by impact, data readiness, clinical safety and build effort.</p></div><CheckCircle2 size={17} color="#15803D" /></div>
        <div className="table-wrap"><table className="data-table"><thead><tr><th>Capability</th><th>Why it is included</th><th>Impact</th><th>Readiness</th><th>Safety</th><th>Effort</th></tr></thead><tbody>{included.map(([capability, reason, impact, readiness, safety, effort]) => <tr key={capability}><td className="member-name">{capability}</td><td>{reason}</td><td>{impact}</td><td>{readiness}</td><td>{safety}</td><td>{effort}</td></tr>)}</tbody></table></div>
        <div className="notice section-spacer"><ShieldCheck size={14} /><span>Weights and thresholds are illustrative and require clinical validation. No score makes an autonomous clinical decision.</span></div>
      </section>
      <section className="card">
        <div className="section-header"><div><h2 className="section-title">Build sequence</h2><p className="section-description">Each layer depends on the one before it.</p></div><ArrowDown size={16} color="#5A6884" /></div>
        {[
          ["1", "Trusted context", "Show sources, event and received dates, missing data and conflicts."],
          ["2", "Prioritized queue", "Sort deadlines and expose illustrative score factors and verification tasks."],
          ["3", "Next actions", "Use auditable rules that point back to evidence and a human owner."],
          ["4", "Outreach and notes", "Reduce repeated entry with structured attempts and confirmed drafts."],
          ["5", "Pilot measurement", "Measure time and workflow outcomes before expanding scope."],
        ].map(([number, title, detail], index) => <div className="fact-row" key={number}><span className="avatar" style={{ width: 27, height: 27, borderRadius: 8 }}>{number}</span><div style={{ flex: 1 }}><div className="member-name">{title}</div><div className="member-meta">{detail}</div></div>{index < 4 && <ArrowRight size={13} color="#9aa3b8" />}</div>)}
      </section>
    </div>
    <section className="card section-spacer">
      <div className="section-header"><div><h2 className="section-title">Later, after pilot evidence</h2><p className="section-description">These need production partnerships, validation or governance that a static prototype cannot provide.</p></div></div>
      <div className="content-grid content-grid-3">{later.map(([title, detail]) => <article key={title} className="queue-expanded"><h3 className="section-title">{title}</h3><p className="section-description">{detail}</p></article>)}</div>
    </section>
    <section className="card section-spacer">
      <div className="section-header"><div><h2 className="section-title">Deliberately out of scope</h2><p className="section-description">These exclusions reduce clinical risk and keep the first workflow focused.</p></div><CircleOff size={17} color="#5A6884" /></div>
      <div className="content-grid content-grid-3">{outOfScope.map(([title, reason]) => <article key={title} className="notice"><CircleOff size={14} /><span><strong>{title}</strong><br />{reason}</span></article>)}</div>
    </section>
    <div className="notice notice-warning section-spacer"><ShieldCheck size={14} /><span>Not for clinical use. No real PHI. No live integrations, clinical decision-making, calling, or production authentication.</span></div>
  </main>;
}
