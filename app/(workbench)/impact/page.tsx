"use client";

import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Info, SlidersHorizontal, Target, TrendingDown } from "lucide-react";
import { PageHeader } from "@/components/ui";
import { BACKGROUND_CASES, HERO_CASES } from "@/data/seed";
import { getQueueMetrics } from "@/lib/engines";

const CASES = [...HERO_CASES, ...BACKGROUND_CASES];
const queueMetrics = getQueueMetrics(CASES);
const pilotMetrics = [
  ["Chart-prep time per case", "Not supplied", "Set after baseline measurement", "Timed sample of chart review; report median and range."],
  ["Systems opened per case", "Not supplied", "Measure, no target", "Observed distinct systems opened for each reviewed case."],
  ["Documentation time per contact", "Not supplied", "Set after baseline measurement", "Time from contact end to signed note."],
  ["Outreach connect rate", "Not supplied", "Measure, no target", "Connected attempts divided by eligible attempts."],
  ["Time to first post-discharge contact", "Not supplied", "Set after baseline measurement", "ADT event timestamp to first completed contact timestamp."],
  ["7-day follow-up completion", "Not supplied", "Measure, no target", "Eligible discharges with a confirmed visit in seven days."],
  ["Active cases per manager", `${CASES.length} in this synthetic scenario`, "Operationally configured", "Distinct active cases in the defined caseload."],
  ["Nurse override rate", "Not supplied", "Track, no target", "Overrides divided by reviewed prioritization recommendations."],
  ["Recommendation acceptance rate", "Not supplied", "Track, no target", "Accepted actions divided by reviewed actions."],
];

const risks = [
  ["Stale or wrong data", "Show event and received dates, source flags and a nurse verification step."],
  ["Alert fatigue", "Show a ranked queue with explicit reasons and saved filters."],
  ["Clinician trust", "Expose score factors, evidence, data confidence and audit history."],
  ["Wrong patient match", "Display identity and source match flags before action."],
  ["Heuristic error", "Use transparent rules, show their source facts and require nurse review."],
];

export default function ImpactPage() {
  const [casesReviewed, setCasesReviewed] = useState(12);
  const [contactsCompleted, setContactsCompleted] = useState(8);
  const [directCareMinutes, setDirectCareMinutes] = useState(18);
  const [currentSystems, setCurrentSystems] = useState(7);
  const [workbenchSystems, setWorkbenchSystems] = useState(2);
  const [minutesPerSystem, setMinutesPerSystem] = useState(3);
  const [documentationMinutes, setDocumentationMinutes] = useState(12);
  const [failedAttempts, setFailedAttempts] = useState(2);
  const [minutesPerAttempt, setMinutesPerAttempt] = useState(6);
  const [dataHuntReduction, setDataHuntReduction] = useState(40);
  const [documentationReduction, setDocumentationReduction] = useState(40);
  const [outreachReduction, setOutreachReduction] = useState(30);

  const model = useMemo(() => {
    const currentDataHunt = casesReviewed * currentSystems * minutesPerSystem;
    const modeledDataHunt = casesReviewed * workbenchSystems * minutesPerSystem * (1 - dataHuntReduction / 100);
    const directCare = contactsCompleted * directCareMinutes;
    const currentDocumentation = contactsCompleted * documentationMinutes;
    const modeledDocumentation = currentDocumentation * (1 - documentationReduction / 100);
    const currentOutreachFriction = contactsCompleted * failedAttempts * minutesPerAttempt;
    const modeledOutreachFriction = currentOutreachFriction * (1 - outreachReduction / 100);
    return [
      { workflow: "Current workflow", directCare, dataHunt: currentDataHunt, documentation: currentDocumentation, outreachFriction: currentOutreachFriction },
      { workflow: "Modeled with workbench", directCare, dataHunt: modeledDataHunt, documentation: modeledDocumentation, outreachFriction: modeledOutreachFriction },
    ];
  }, [casesReviewed, contactsCompleted, directCareMinutes, currentSystems, workbenchSystems, minutesPerSystem, documentationMinutes, failedAttempts, minutesPerAttempt, dataHuntReduction, documentationReduction, outreachReduction]);

  const returnedMinutes = Math.max(0, Math.round(
    model[0].dataHunt + model[0].documentation + model[0].outreachFriction
      - model[1].dataHunt - model[1].documentation - model[1].outreachFriction,
  ));
  const assumptions = [
    ["Active caseload", `${CASES.length} records`, "Scenario states a 48-case load; count is derived from the queue seed.", "High for this scenario; synthetic"],
    ["New alerts", `${queueMetrics.newAlerts} in the last 24h`, "Counted from trigger timestamps in the queue seed.", "High for this scenario; synthetic"],
    ["Cases reviewed per shift", `${casesReviewed}`, "User-adjustable modeling input; no observed workflow baseline supplied.", "Low; pilot measurement needed"],
    ["Contacts completed per shift", `${contactsCompleted}`, "User-adjustable modeling input; no observed workflow baseline supplied.", "Low; pilot measurement needed"],
    ["Systems opened", `${currentSystems} current / ${workbenchSystems} modeled`, "Current and modeled system counts are adjustable inputs; modeled value is a design assumption.", "Low; pilot measurement needed"],
    ["Minutes per system opened", `${minutesPerSystem}`, "Assumption applied to each system opened; replace with timed observation.", "Low; pilot measurement needed"],
    ["Direct care minutes per contact", `${directCareMinutes}`, "Assumption multiplied by completed contacts; held constant between scenarios.", "Low; pilot measurement needed"],
    ["Documentation minutes per contact", `${documentationMinutes}`, "Assumption multiplied by completed contacts; reduction is independently adjustable.", "Low; pilot measurement needed"],
    ["Failed attempts and duration", `${failedAttempts} × ${minutesPerAttempt} minutes`, "Assumptions applied to completed contacts; reduction is independently adjustable.", "Low; pilot measurement needed"],
    ["Modeled reductions", `Data ${dataHuntReduction}% · documentation ${documentationReduction}% · outreach ${outreachReduction}%`, "Visible user inputs, not measured outcomes or vendor performance claims.", "Low; illustrative only"],
  ];

  return <main className="page-content">
    <PageHeader eyebrow="Pilot measurement" title="Measure what changes for Maria" description="A transparent shift-level model. Every workflow rate is an adjustable assumption, not a measured result or external benchmark." />
    <div className="content-grid content-grid-2">
      <section className="card">
        <div className="section-header"><div><h2 className="section-title">Model inputs</h2><p className="section-description">The case load is derived from the 48 synthetic queue records. Other inputs require pilot timing.</p></div><SlidersHorizontal size={16} color="#5A6884" /></div>
        <div className="notice"><Info size={14} /><span>Current systems opened now affects current chart-prep time. Modeled systems and all three reduction sliders directly affect the comparison.</span></div>
        <SliderInput label="Cases reviewed this shift" value={casesReviewed} min={1} max={CASES.length} unit="cases" confidence="Low" onChange={setCasesReviewed} />
        <SliderInput label="Completed contacts this shift" value={contactsCompleted} min={0} max={CASES.length} unit="contacts" confidence="Low" onChange={setContactsCompleted} />
        <SliderInput label="Direct care per completed contact" value={directCareMinutes} min={5} max={60} unit="min" confidence="Low" onChange={setDirectCareMinutes} />
        <SliderInput label="Current systems opened per case" value={currentSystems} min={1} max={12} unit="systems" confidence="Low" onChange={(value) => { setCurrentSystems(value); setWorkbenchSystems((current) => Math.min(current, value)); }} />
        <SliderInput label="Modeled systems opened per case" value={workbenchSystems} min={1} max={currentSystems} unit="systems" confidence="Low" onChange={setWorkbenchSystems} />
        <SliderInput label="Minutes per system opened" value={minutesPerSystem} min={1} max={10} unit="min" confidence="Low" onChange={setMinutesPerSystem} />
        <SliderInput label="Documentation per completed contact" value={documentationMinutes} min={1} max={30} unit="min" confidence="Low" onChange={setDocumentationMinutes} />
        <SliderInput label="Failed attempts per completed contact" value={failedAttempts} min={0} max={6} unit="attempts" confidence="Low" onChange={setFailedAttempts} />
        <SliderInput label="Minutes per failed attempt" value={minutesPerAttempt} min={1} max={15} unit="min" confidence="Low" onChange={setMinutesPerAttempt} />
        <SliderInput label="Data-hunt time reduction" value={dataHuntReduction} min={0} max={80} unit="%" confidence="Low" onChange={setDataHuntReduction} />
        <SliderInput label="Documentation time reduction" value={documentationReduction} min={0} max={80} unit="%" confidence="Low" onChange={setDocumentationReduction} />
        <SliderInput label="Outreach friction reduction" value={outreachReduction} min={0} max={80} unit="%" confidence="Low" onChange={setOutreachReduction} />
      </section>
      <section className="card">
        <div className="section-header"><div><h2 className="section-title">Modeled minutes per shift</h2><p className="section-description">Direct care is calculated from contacts × minutes per contact and held constant in both scenarios.</p></div></div>
        <div style={{ height: 320, width: "100%" }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={model} margin={{ top: 10, right: 12, bottom: 4, left: 0 }}>
              <CartesianGrid stroke="#e8ebf0" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="workflow" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="directCare" name="Direct care" stackId="a" fill="#2647A4" />
              <Bar dataKey="dataHunt" name="Data hunting" stackId="a" fill="#709CE2" />
              <Bar dataKey="documentation" name="Documentation" stackId="a" fill="#1BBCE4" />
              <Bar dataKey="outreachFriction" name="Outreach friction" stackId="a" fill="#EC700A" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="content-grid content-grid-3 section-spacer">
          <div><div className="metric-number">{(returnedMinutes / 60).toFixed(1)}h</div><div className="metric-label">Modeled difference</div><div className="metric-helper">Not measured or guaranteed</div></div>
          <div><div className="metric-number">{CASES.length}</div><div className="metric-label">Synthetic active cases</div><div className="metric-helper">Derived from queue records</div></div>
          <div><div className="metric-number">{queueMetrics.newAlerts}</div><div className="metric-label">Alerts in last 24h</div><div className="metric-helper">Derived from trigger timestamps</div></div>
        </div>
      </section>
    </div>

    <section className="card section-spacer">
      <div className="section-header"><div><h2 className="section-title">Sources and assumptions</h2><p className="section-description">Confidence describes evidence quality, not clinical certainty. Low-confidence values must be replaced with pilot observations.</p></div><Target size={17} color="#5A6884" /></div>
      <div className="table-wrap"><table className="data-table"><thead><tr><th>Input</th><th>Current value</th><th>Derivation and source</th><th>Confidence</th></tr></thead><tbody>{assumptions.map(([name, value, derivation, confidence]) => <tr key={name}><td className="member-name">{name}</td><td>{value}</td><td>{derivation}</td><td>{confidence}</td></tr>)}</tbody></table></div>
    </section>
    <section className="card section-spacer">
      <div className="section-header"><div><h2 className="section-title">Pilot metrics</h2><p className="section-description">No empirical baseline or target was supplied for these measures. Set them only after a baseline collection period.</p></div></div>
      <div className="table-wrap"><table className="data-table"><thead><tr><th>Metric</th><th>Baseline in supplied materials</th><th>Target</th><th>Measurement</th></tr></thead><tbody>{pilotMetrics.map(([metric, baseline, target, method]) => <tr key={metric}><td className="member-name">{metric}</td><td>{baseline}</td><td>{target}</td><td>{method}</td></tr>)}</tbody></table></div>
    </section>
    <div className="content-grid content-grid-2 section-spacer">
      <section className="card">
        <div className="section-header"><div><h2 className="section-title">Risks and mitigations</h2><p className="section-description">Mitigations map to features shown in this prototype.</p></div><TrendingDown size={16} color="#5A6884" /></div>
        {risks.map(([risk, mitigation]) => <div className="fact-row" key={risk}><div><div className="member-name">{risk}</div><div className="member-meta">{mitigation}</div></div><span className="badge badge-blue">Prototype control</span></div>)}
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
