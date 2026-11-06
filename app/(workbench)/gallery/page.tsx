import { AlertCircle, CheckCircle2, Clock3, Info, ShieldAlert, Sparkles } from "lucide-react";
import { ConfidenceBadge, FreshnessBadge, PageHeader, PriorityBadge, ProvenanceChip } from "@/components/ui";

const tokens = [
  ["Royal blue", "#2A6AF1"], ["Midnight blue", "#0E254B"], ["Dark slate blue", "#2647A4"],
  ["Page background", "#F3F4F7"], ["Soft blue", "#ECF2FE"], ["Lavender", "#D3E1FC"],
  ["Critical", "#DC2626"], ["Warning", "#A64B00"], ["Info", "#075E76"], ["AI", "#7034EA"],
];

export default function ComponentGalleryPage() {
  return <main className="page-content">
    <PageHeader eyebrow="Design system" title="Component gallery" description="A small reference for the workbench palette, status language, source chips and accessible controls." />
    <section className="card">
      <div className="section-header"><div><h2 className="section-title">Color tokens</h2><p className="section-description">Status always includes an icon and readable text, not color alone.</p></div></div>
      <div className="content-grid content-grid-3">{tokens.map(([name, value]) => <div className="fact-row" key={name}><span className="avatar" style={{ background: value, borderRadius: 7 }} aria-hidden="true" /><div style={{ flex: 1 }}><div className="member-name">{name}</div><div className="member-meta">{value}</div></div></div>)}</div>
    </section>
    <div className="content-grid content-grid-2 section-spacer">
      <section className="card">
        <h2 className="section-title">Priority and freshness</h2>
        <div className="page-actions section-spacer"><PriorityBadge band="Critical" /><PriorityBadge band="High" /><PriorityBadge band="Medium" /><PriorityBadge band="Low" /></div>
        <div className="page-actions section-spacer"><FreshnessBadge eventDate="2026-11-08" datasetId="adt" /><FreshnessBadge eventDate="2026-10-25" datasetId="adt" /><FreshnessBadge eventDate="2026-10-01" datasetId="adt" /></div>
        <div className="notice section-spacer"><Info size={14} /><span>Color is paired with an icon and a text label in every status badge.</span></div>
      </section>
      <section className="card">
        <h2 className="section-title">Confidence and provenance</h2>
        <div className="page-actions section-spacer"><ConfidenceBadge score={82} reasons={["One source is current.", "No quality flags in this example."]} /><ConfidenceBadge score={32} reasons={["Phone ownership is unverified.", "Claims feed is delayed."]} /></div>
        <div className="section-spacer"><ProvenanceChip source="Hospital ADT" eventDate="2026-11-07" receivedDate="2026-11-08" datasetId="adt" qualityFlags={["Diagnosis detail missing"]} /></div>
        <div className="notice notice-ai section-spacer"><Sparkles size={14} /><span>AI-drafted content uses a violet label and border. Confirmation is required before save.</span></div>
      </section>
    </div>
    <section className="card section-spacer">
      <h2 className="section-title">Button states</h2>
      <div className="page-actions section-spacer"><button className="button button-primary"><CheckCircle2 size={13} />Primary action</button><button className="button button-secondary"><Clock3 size={13} />Secondary action</button><button className="button button-danger"><AlertCircle size={13} />Destructive or reject</button><button className="button button-secondary" disabled><ShieldAlert size={13} />Unavailable until reviewed</button></div>
      <div className="field-row section-spacer"><label className="field"><span className="field-label">Text input</span><input className="input" placeholder="Search or enter a reason" /></label><label className="field"><span className="field-label">Select</span><select className="select" defaultValue="Select a value"><option>Select a value</option><option>Verified</option></select></label></div>
    </section>
  </main>;
}
