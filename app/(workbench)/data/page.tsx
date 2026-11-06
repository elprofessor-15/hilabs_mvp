"use client";

import { ArrowDownToLine, CheckCircle2, Database, Download, Search, ShieldCheck } from "lucide-react";
import { useMemo, useState } from "react";
import { COMBINATION_INSIGHTS, DATASETS } from "@/data/datasets";
import { HERO_CASES, VALIDATED_DATASET_RECORDS } from "@/data/seed";
import { EmptyState, PageHeader } from "@/components/ui";

export default function DataSourcesPage() {
  const [query, setQuery] = useState("");
  const [priority, setPriority] = useState("All datasets");
  const [exportError, setExportError] = useState("");
  const datasets = useMemo(() => DATASETS.filter((dataset) => {
    const matchesText = `${dataset.name} ${dataset.source} ${dataset.decision}`.toLowerCase().includes(query.toLowerCase());
    return matchesText && (priority === "All datasets" || dataset.priority === priority);
  }), [query, priority]);

  async function exportAnnex() {
    try {
      const { downloadAnnex } = await import("@/lib/annex-export");
      await downloadAnnex();
      setExportError("");
    } catch (error) {
      console.error("Could not export the synthetic annex.", error);
      setExportError("The Excel file could not be created. Try again or use the repository export script.");
    }
  }

  return <main className="page-content">
    <PageHeader eyebrow="Data strategy" title="Data and sources" description="Sixteen data domains, each connected to a nurse decision. Event time, received time and data quality stay visible." actions={<button className="button button-primary" onClick={exportAnnex}><Download size={13} />Export annex</button>} />
    <div className="content-grid content-grid-3">
      <div className="stat-card"><div className="stat-icon"><Database size={15} /></div><div><div className="stat-value">{DATASETS.length}</div><div className="stat-label">Data domains mapped</div></div></div>
      <div className="stat-card"><div className="stat-icon"><CheckCircle2 size={15} /></div><div><div className="stat-value">{VALIDATED_DATASET_RECORDS.length}</div><div className="stat-label">Validated sample records</div></div></div>
      <div className="stat-card"><div className="stat-icon stat-icon-warning"><ShieldCheck size={15} /></div><div><div className="stat-value">{HERO_CASES.length}</div><div className="stat-label">Scenario members</div></div></div>
      {exportError && <div className="notice notice-danger section-spacer" role="alert">{exportError}</div>}
    </div>
    <div className="notice section-spacer"><ShieldCheck size={14} /><span>Data in this prototype is static and synthetic. No external API or health system is connected. Freshness thresholds are configurable and illustrative.</span></div>

    <section className="card section-spacer">
      <div className="section-header"><div><h2 className="section-title">Data inventory</h2><p className="section-description">Priority reflects workflow value and expected readiness, not a production integration commitment.</p></div><span className="badge badge-neutral">{datasets.length} shown</span></div>
      <div className="content-grid content-grid-2">
        <label className="field"><span className="field-label">Search sources</span><div style={{ position: "relative" }}><Search size={14} style={{ position: "absolute", top: 11, left: 10, color: "#7b8799" }} /><input className="input" style={{ paddingLeft: 31 }} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Dataset, source or decision" /></div></label>
        <label className="field"><span className="field-label">Priority</span><select className="select" value={priority} onChange={(event) => setPriority(event.target.value)}><option>All datasets</option><option>Must-have MVP</option><option>Later</option></select></label>
      </div>
      {datasets.length === 0 ? <div className="section-spacer"><EmptyState title="No datasets match" description="Try another search or priority filter." /></div> : <div className="table-wrap section-spacer"><table className="data-table"><thead><tr><th>Dataset</th><th>Source</th><th>What it tells the nurse</th><th>Typical latency</th><th>Quality risk and handling</th><th>Priority</th><th>Decision enabled</th></tr></thead><tbody>
        {datasets.map((dataset) => <tr key={dataset.id}><td className="member-name">{dataset.name}</td><td>{dataset.source}</td><td>{dataset.purpose}</td><td>{dataset.latency}</td><td><strong>{dataset.qualityRisk}</strong><div className="member-meta">{dataset.handling}</div></td><td><span className={`badge ${dataset.priority === "Must-have MVP" ? "badge-blue" : "badge-neutral"}`}>{dataset.priority}</span></td><td>{dataset.decision}</td></tr>)}
      </tbody></table></div>}
    </section>

    <section className="card section-spacer">
      <div className="section-header"><div><h2 className="section-title">Combination insights</h2><p className="section-description">Rules connect records into a question for the nurse. They do not make a diagnosis or act automatically.</p></div></div>
      <div className="content-grid content-grid-3">
        {COMBINATION_INSIGHTS.map((insight, index) => <article key={insight.inputs} className="queue-expanded">
          <div className="eyebrow">Rule set 0{index + 1}</div>
          <div className="member-name">{insight.inputs}</div>
          <div className="member-meta section-spacer">If · {insight.logic}</div>
          <div className="notice section-spacer"><ArrowDownToLine size={14} /><span><strong>Surface</strong><br />{insight.output}</span></div>
          <div className="member-meta section-spacer">Example · {insight.example}</div>
        </article>)}
      </div>
    </section>

    <section className="card section-spacer">
      <div className="section-header"><div><h2 className="section-title">Synthetic annex</h2><p className="section-description">Five patient summaries and one worksheet per available dataset.</p></div><button className="button button-secondary" onClick={exportAnnex}><Download size={13} />Download Excel</button></div>
      <div className="notice"><Database size={14} /><span>Exports {DATASETS.length + 1} sheets with record and claim IDs, coding fields, lab observations with units, event and received times, quality flags and planted imperfections.</span></div>
    </section>
  </main>;
}
