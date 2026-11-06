import { FRESHNESS_THRESHOLDS, NEXT_ACTION_RULES, PRIORITY_WEIGHTS } from "@/config/workbench";
import type { DatasetId, DatasetRecord, FreshnessState, PriorityBand, PriorityFactors, PriorityResult } from "@/lib/types";

export function scorePriority(factors: PriorityFactors, protocolTrigger?: string, preferredActionId = "A15"): PriorityResult {
  const score = Math.round(
    factors.clinical * PRIORITY_WEIGHTS.clinical +
      factors.events * PRIORITY_WEIGHTS.events +
      factors.gaps * PRIORITY_WEIGHTS.gaps +
      factors.time * PRIORITY_WEIGHTS.time +
      factors.confidence * PRIORITY_WEIGHTS.confidence,
  );
  const verifyFirst = factors.confidence < 40;
  const protocolEscalation = Boolean(protocolTrigger);
  let band: PriorityBand = score >= 85 ? "Critical" : score >= 70 ? "High" : score >= 40 ? "Medium" : "Low";
  if (verifyFirst && band === "Low") band = "Medium";
  if (protocolEscalation) band = "Critical";
  return {
    score,
    band,
    verifyFirst,
    verificationTaskId: verifyFirst ? "A15" : undefined,
    protocolEscalation,
    topActionId: protocolEscalation ? "A04" : preferredActionId,
  };
}

export function getFreshness(eventDate: string, datasetId: DatasetId, now: Date): { state: FreshnessState; ageDays: number } {
  const ageDays = Math.max(0, Math.floor((now.getTime() - new Date(eventDate).getTime()) / 86_400_000));
  const threshold = FRESHNESS_THRESHOLDS[datasetId];
  return {
    ageDays,
    state: ageDays < threshold.freshDays ? "Fresh" : ageDays <= threshold.agingDays ? "Aging" : "Stale",
  };
}

export function calculateFillGap(lastFillDate: string, daysSupply: number, now: Date): number {
  const expectedRunout = new Date(lastFillDate);
  expectedRunout.setDate(expectedRunout.getDate() + daysSupply);
  return Math.max(0, Math.floor((now.getTime() - expectedRunout.getTime()) / 86_400_000));
}

export function getActionRule(id: string) {
  return NEXT_ACTION_RULES.find((rule) => rule.id === id);
}

export function getDatasetConfidence(records: DatasetRecord[]) {
  if (records.length === 0) return { score: 0, label: "Not available", reasons: ["No source records are available."] };
  const flagged = records.flatMap((record) => record.qualityFlags.map((flag) => `${record.source}: ${flag}`));
  const score = Math.max(20, 100 - flagged.length * 12 - (records.some((record) => record.eventDate !== record.receivedDate) ? 8 : 0));
  return {
    score,
    label: score >= 75 ? "Higher confidence" : score >= 45 ? "Review sources" : "Verify first",
    reasons: flagged.length ? flagged.slice(0, 3) : ["No quality flags in the displayed records."],
  };
}
