"use client";

import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Info, SlidersHorizontal, Target, TrendingDown } from "lucide-react";
import { PageHeader } from "@/components/ui";

const metrics = [
  ["Chart-prep time per case", "18 min", "10 min", "Timed sample of chart review"],
  ["Systems opened per case", "6 to 7", "2 to 3", "Observed clicks or screen changes"],
  ["Documentation time per contact", "12 min", "7 min", "Time from contact end to signed note"],
  ["Outreach connect rate", "32%", "40%", "Connected attempts / eligible attempts"],
  ["Time to first post-discharge contact", "34 h", "24 h", "ADT event to first completed contact"],
  ["7-day follow-up completion", "58%", "70%", "Eligible discharges with visit in seven days"],
  ["Active cases per manager", "48", "52", "Caseload count with quality guardrails"],
  ["Nurse override rate", "Not measured", "Track, no target", "Overrides / prioritization recommendations"],
  ["Recommendation acceptance rate", "Not measured", "Track, no target", "Accepted actions / reviewed actions"],
];

const risks = [
  ["Stale or wrong data", "Show event and received dates, source flags and a nurse verification step."],
  ["Alert fatigue", "Show a ranked queue with explicit reasons and saved filters."],
  ["Clinician trust", "Expose score factors, evidence, data confidence and audit history."],
  ["Wrong patient match", "Display identity and source match flags before action."],
  ["AI errors", "Label deterministic drafts, show source facts and require nurse confirmation."],
];

export default function ImpactPage() {
  const [huntMinutes, setHuntMinutes] = useState(18);
  const [systems, setSystems] = useState(7);
  const [documentation, setDocumentation] = useState(12);
  const [failedAttempts, setFailedAttempts] = useState(2);
  const model = useMemo(() => {
    const currentPrep = huntMinutes * 6;
    const workbenchPrep = Math.round(currentPrep * 0.4);
    const currentDocumentation = documentation * 8;
    const workbenchDocumentation = Math.round(currentDocumentation * 0.6);
    const currentOutreachFriction = failedAttempts * 6;
    const workbenchOutreachFriction = Math.max(0, currentOutreachFriction * 0.5);
    return [
      { day: "Current workflow", directCare: 264, dataHunt: currentPrep, documentation: currentDocumentation, outreachFriction: currentOutreachFriction },
      { day: "With workbench", directCare: 264, dataHunt: workbenchPrep, documentation: workbenchDocumentation, outreachFriction: workbenchOutreachFriction },
    ];
  }, [huntMinutes, documentation, failedAttempts]);
  const recovered = useMemo(() => {
    const current = model[0].dataHunt + model[0].documentation + model[0].outreachFriction;
    const withWorkbench = model[1].dataHunt + model[1].documentation + model[1].outreachFriction;
    return Math.max(0, Math.round((current - withWorkbench) / 60 * 10) / 10);
  }, [model]);

  return <main className="page-content">
    <PageHeader eyebrow="Pilot measurement" title="Measure what changes for Maria" description="An assumption-led view of time and operational outcomes. Every baseline is illustrative and must be validated in a pilot." />
    <div className="content-grid content-grid-2">
      <section className="card">
        <div className="section-header"><div><h2 className="section-title">Where the day goes</h2><p className="section-description">Adjust assumptions to see the estimate change.</p></div><SlidersHorizontal size={16} color="#5A6884" /></div>
        <SliderInput label="Data hunting per case" value={huntMinutes} min={5} max={40} unit="min" confidence="Medium" onChange={setHuntMinutes} />
        <SliderInput label="Systems opened per case" value={systems} min={2} max={12} unit="systems" confidence="Low" onChange={setSystems} />
        <SliderInput label="Documentation per contact" value={documentation} min={4} max={30} unit="min" confidence="Medium" onChange={setDocumentation} />
        <SliderInput label="Unreachable attempts per case" value={failedAttempts} min={0} max={6} unit="attempts" confidence="Low" onChange={setFailedAttempts} />
        <div className="notice section-spacer"><Info size={14} /><span>Assumptions are illustrative. Six new cases and eight contacts are used for this shift-level calculation, not as observed outcomes.</span></div>
      </section>
      <section className="card">
        <div className="section-header"><div><h2 className="section-title">Estimated minutes per shift</h2><p className="section-description">Direct care is held constant. Other categories are modeled from the sliders.</p></div></div>
        <div style={{ height: 280, width: "100%" }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={model} margin={{ top: 10, right: 12, bottom: 4, left: 0 }}>
              <CartesianGrid stroke="#e8ebf0" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="day" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 10 }} />
              <Bar dataKey="directCare" name="Direct care" stackId="a" fill="#2647A4" radius={[0, 0, 0, 0]} />
              <Bar dataKey="dataHunt" name="Data hunting" stackId="a" fill="#709CE2" />
              <Bar dataKey="documentation" name="Documentation" stackId="a" fill="#1BBCE4" />
              <Bar dataKey="outreachFriction" name="Outreach friction" stackId="a" fill="#EC700A" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="content-grid content-grid-3 section-spacer">
          <div><div className="metric-number">{recovered}h</div><div className="metric-label">Potential time returned per shift</div><div className="metric-helper">Illustrative, not measured</div></div>
          <div><div className="metric-number">{systems}</div><div className="metric-label">Current systems opened</div><div className="metric-helper">Assumption · confidence low</div></div>
          <div><div className="metric-number">48</div><div className="metric-label">Current caseload</div><div className="metric-helper">Case scenario input</div></div>
        </div>
      </section>
    </div>

    <section className="card section-spacer">
      <div className="section-header"><div><h2 className="section-title">Pilot metrics</h2><p className="section-description">Illustrative baselines and targets. Validate definitions and starting values before the pilot.</p></div><Target size={17} color="#5A6884" /></div>
      <div className="table-wrap"><table className="data-table"><thead><tr><th>Metric</th><th>Illustrative baseline</th><th>MVP target</th><th>Measurement</th></tr></thead><tbody>{metrics.map(([metric, baseline, target, method]) => <tr key={metric}><td className="member-name">{metric}</td><td>{baseline}<div className="member-meta">Illustrative, to be validated in pilot</div></td><td>{target}</td><td>{method}</td></tr>)}</tbody></table></div>
    </section>
    <div className="content-grid content-grid-2 section-spacer">
      <section className="card">
        <div className="section-header"><div><h2 className="section-title">Risks and mitigations</h2><p className="section-description">Mitigations map to features shown in this prototype.</p></div><TrendingDown size={16} color="#5A6884" /></div>
        {risks.map(([risk, mitigation]) => <div className="fact-row" key={risk}><div><div className="member-name">{risk}</div><div className="member-meta">{mitigation}</div></div><span className="badge badge-blue">Addressed in prototype</span></div>)}
      </section>
      <section className="card">
        <div className="section-header"><div><h2 className="section-title">Pilot and go-to-market</h2><p className="section-description">A limited operational pilot before broader use.</p></div></div>
        <div className="fact-row"><span className="fact-label">Buyer</span><span className="fact-value">VP Clinical Operations or Care Management</span></div>
        <div className="fact-row"><span className="fact-label">Pilot scope</span><span className="fact-value">10 to 15 RNs · 8 to 12 weeks · one program</span></div>
        <div className="fact-row"><span className="fact-label">Pilot pricing signal</span><span className="fact-value">Per RN per month</span></div>
        <div className="fact-row"><span className="fact-label">After pilot</span><span className="fact-value">Enterprise license after outcomes review</span></div>
        <div className="notice section-spacer"><Info size={14} /><span>Compare matched workflows and measure time, follow-up completion and trust signals. Do not claim clinical outcome improvement from this prototype.</span></div>
      </section>
    </div>
  </main>;
}

function SliderInput({ label, value, min, max, unit, confidence, onChange }: { label: string; value: number; min: number; max: number; unit: string; confidence: string; onChange: (value: number) => void }) {
  return <label className="field section-spacer"><span style={{ display: "flex", justifyContent: "space-between", gap: 12 }}><span className="field-label">{label}</span><span className="member-name">{value} {unit}</span></span><input aria-label={label} type="range" min={min} max={max} value={value} onChange={(event) => onChange(Number(event.target.value))} /><span className="member-meta">Confidence: {confidence} · Assumption to validate</span></label>;
}
