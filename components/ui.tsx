"use client";

import * as Tooltip from "@radix-ui/react-tooltip";
import { AlertCircle, CheckCircle2, Clock3, Info, ShieldAlert } from "lucide-react";
import type { DatasetId, PriorityBand } from "@/lib/types";
import { getFreshness } from "@/lib/engines";
import { SCENARIO_NOW } from "@/config/workbench";

export function PageHeader({ eyebrow, title, description, actions }: { eyebrow?: string; title: string; description?: string; actions?: React.ReactNode }) {
  return (
    <div className="page-heading">
      <div>
        {eyebrow && <div className="eyebrow">{eyebrow}</div>}
        <h1 className="page-title">{title}</h1>
        {description && <p className="page-subtitle">{description}</p>}
      </div>
      {actions && <div className="page-actions">{actions}</div>}
    </div>
  );
}

export function PriorityBadge({ band }: { band: PriorityBand }) {
  const icon = band === "Critical" ? <ShieldAlert size={12} /> : band === "High" ? <AlertCircle size={12} /> : band === "Low" ? <CheckCircle2 size={12} /> : <Info size={12} />;
  return <span className={`badge badge-${band.toLowerCase()}`}>{icon}{band}</span>;
}

export function FreshnessBadge({ eventDate, datasetId }: { eventDate: string; datasetId: DatasetId }) {
  const { state, ageDays } = getFreshness(eventDate, datasetId, SCENARIO_NOW);
  const icon = state === "Fresh" ? <CheckCircle2 size={11} /> : state === "Aging" ? <Clock3 size={11} /> : <AlertCircle size={11} />;
  return <span className={`badge badge-${state.toLowerCase()}`} title={`${ageDays} days since event date`}>{icon}{state} · {ageDays}d</span>;
}

export function ProvenanceChip({ source, eventDate, receivedDate, datasetId, qualityFlags = [] }: {
  source: string;
  eventDate: string;
  receivedDate: string;
  datasetId: DatasetId;
  qualityFlags?: string[];
}) {
  const freshness = getFreshness(eventDate, datasetId, SCENARIO_NOW);
  return (
    <Tooltip.Provider delayDuration={250}>
      <Tooltip.Root>
        <Tooltip.Trigger asChild>
          <button type="button" className="provenance" aria-label={`Source ${source}. Event ${eventDate}. Received ${receivedDate}. ${freshness.state}.`}>
            <Info size={11} aria-hidden="true" />
            <span>{source}</span>
            <FreshnessBadge eventDate={eventDate} datasetId={datasetId} />
          </button>
        </Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Content sideOffset={6} style={{ maxWidth: 280, padding: "10px 12px", borderRadius: 8, color: "#fff", background: "#031335", fontSize: 12, lineHeight: 1.55, zIndex: 80 }}>
            <strong>Source:</strong> {source}<br />
            <strong>Event date:</strong> {eventDate}<br />
            <strong>Received date:</strong> {receivedDate}<br />
            <strong>Freshness:</strong> {freshness.state}, {freshness.ageDays} days old
            {qualityFlags.length > 0 && <><br /><strong>Quality flags:</strong> {qualityFlags.join("; ")}</>}
            <Tooltip.Arrow style={{ fill: "#031335" }} />
          </Tooltip.Content>
        </Tooltip.Portal>
      </Tooltip.Root>
    </Tooltip.Provider>
  );
}

export function ConfidenceBadge({ score, reasons }: { score: number; reasons: string[] }) {
  const label = score >= 75 ? "Higher confidence" : score >= 45 ? "Review sources" : "Verify first";
  return (
    <Tooltip.Provider delayDuration={250}>
      <Tooltip.Root>
        <Tooltip.Trigger asChild>
          <button type="button" className={`badge ${score < 45 ? "badge-aging" : "badge-blue"}`} aria-label={`${label}, ${score} percent. View factors.`}>
            <Info size={11} />{label} · {score}%
          </button>
        </Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Content sideOffset={6} style={{ maxWidth: 290, padding: "10px 12px", borderRadius: 8, color: "#fff", background: "#031335", fontSize: 12, lineHeight: 1.55, zIndex: 80 }}>
            Confidence reflects source quality flags, not clinical certainty.
            {reasons.map((reason) => <div key={reason}>• {reason}</div>)}
            <Tooltip.Arrow style={{ fill: "#031335" }} />
          </Tooltip.Content>
        </Tooltip.Portal>
      </Tooltip.Root>
    </Tooltip.Provider>
  );
}

export function RecordDraftBadge() {
  return <span className="badge badge-blue">Record-derived draft · review required</span>;
}

export function EmptyState({ title, description, action }: { title: string; description: string; action?: React.ReactNode }) {
  return <div className="empty-state"><h3 className="section-title">{title}</h3><p className="section-description">{description}</p>{action && <div className="section-spacer">{action}</div>}</div>;
}

export function DataStateNotice() {
  return <div className="notice"><Info size={14} /><span>Data in this prototype is static and synthetic. Missing data is shown as unknown, not as evidence that an event did not occur.</span></div>;
}
