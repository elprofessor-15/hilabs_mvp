import type { DatasetId, PriorityFactors } from "@/lib/types";

export const SCENARIO_NOW = new Date("2026-11-09T08:00:00-05:00");
export const SCENARIO_LABEL = "Mon 9 Nov 2026, 08:00";

export const PRIORITY_WEIGHTS: PriorityFactors = {
  clinical: 0.35,
  events: 0.25,
  gaps: 0.2,
  time: 0.15,
  confidence: 0.05,
};

export const FRESHNESS_THRESHOLDS: Record<DatasetId, { freshDays: number; agingDays: number }> = {
  eligibility: { freshDays: 30, agingDays: 90 },
  adt: { freshDays: 2, agingDays: 7 },
  claims: { freshDays: 14, agingDays: 45 },
  pharmacy: { freshDays: 7, agingDays: 30 },
  clinical: { freshDays: 3, agingDays: 14 },
  hie: { freshDays: 3, agingDays: 14 },
  labs: { freshDays: 7, agingDays: 30 },
  utilization: { freshDays: 3, agingDays: 14 },
  appointments: { freshDays: 7, agingDays: 30 },
  contacts: { freshDays: 1, agingDays: 14 },
  sdoh: { freshDays: 30, agingDays: 180 },
  hra: { freshDays: 30, agingDays: 180 },
  careTeam: { freshDays: 30, agingDays: 90 },
  riskGaps: { freshDays: 7, agingDays: 30 },
  caregiver: { freshDays: 30, agingDays: 180 },
  homeHealth: { freshDays: 3, agingDays: 14 },
};

export type ActionRuleId =
  | "A01"
  | "A02"
  | "A03"
  | "A04"
  | "A05"
  | "A06"
  | "A07"
  | "A08"
  | "A09"
  | "A10"
  | "A11"
  | "A12"
  | "A13"
  | "A14"
  | "A15"
  | "A16";

export const NEXT_ACTION_RULES: {
  id: ActionRuleId;
  condition: string;
  action: string;
  rationale: string;
  evidence: string[];
}[] = [
  { id: "A01", condition: "Recent discharge and no completed contact", action: "Call today and confirm the discharge plan", rationale: "The transition contact window is time-sensitive. Verify the plan before coordinating follow-up.", evidence: ["ADT alert", "contact history"], },
  { id: "A02", condition: "Medication fill gap with an access signal", action: "Use the verified alternate channel and check medication access", rationale: "A fill gap is a signal to verify, not proof of non-adherence.", evidence: ["pharmacy fill", "contact data", "SDOH screen"], },
  { id: "A03", condition: "Repeated unsuccessful outreach", action: "Stop repeat calls and coordinate an alternate route", rationale: "Repeated calls to unverified numbers have not connected. Use a documented partner route.", evidence: ["contact history", "ADT alert"], },
  { id: "A04", condition: "Unreviewed positive safety screening item", action: "Escalate to a licensed clinician for review", rationale: "A safety screening item needs prompt human assessment. The prototype does not make a clinical determination.", evidence: ["screening note", "care plan"], },
  { id: "A05", condition: "Home-health authorization is pending", action: "Check authorization status with the UM team", rationale: "The pending authorization may delay a requested service. Confirm status and owner.", evidence: ["UM record", "home-health order"], },
  { id: "A06", condition: "Medication lists disagree", action: "Reconcile the medication list with the member and care team", rationale: "Source lists conflict. Do not silently select or change a medication.", evidence: ["clinical summary", "pharmacy fill", "HIE"], },
  { id: "A07", condition: "No follow-up appointment after discharge", action: "Confirm or arrange a follow-up appointment", rationale: "The available appointment feed does not show a scheduled visit.", evidence: ["ADT alert", "appointment feed"], },
  { id: "A08", condition: "Invalid primary phone number", action: "Verify the best contact number before calling", rationale: "The listed number is marked invalid. Avoid repeating a call to a disconnected line.", evidence: ["contact history", "provider directory"], },
  { id: "A09", condition: "Transport barrier and upcoming appointment", action: "Ask about transportation and offer available support", rationale: "A reported transport barrier may affect the planned appointment. Reconfirm because the screening is aging.", evidence: ["SDOH screen", "appointment feed"], },
  { id: "A10", condition: "Caregiver strain is reported", action: "Check in with the caregiver and review support options", rationale: "The strain screen is not current. Reassess before acting on it.", evidence: ["caregiver record", "contact history"], },
  { id: "A11", condition: "Claims data is delayed", action: "Use the current event feed and label claims as delayed", rationale: "Claims may not reflect recent care. Do not treat a missing claim as evidence that care did not occur.", evidence: ["claims", "ADT alert"], },
  { id: "A12", condition: "Clinical fact is stale", action: "Verify the clinical detail before documenting it as current", rationale: "The source record is outside the configured freshness window.", evidence: ["clinical summary", "labs"], },
  { id: "A13", condition: "PCP visit not found within the follow-up window", action: "Confirm the visit with the member or PCP office", rationale: "The appointment feed may be incomplete. Confirm before concluding a visit was missed.", evidence: ["appointment feed", "claims"], },
  { id: "A14", condition: "Prior authorization has been pending more than five days", action: "Request an update from the authorization owner", rationale: "The request is beyond the illustrative follow-up threshold.", evidence: ["UM record"], },
  { id: "A15", condition: "Low data confidence", action: "Verify identity and key facts before acting", rationale: "Missing or conflicting records lower confidence. Low confidence adds a verification task and cannot make a case look low priority.", evidence: ["member record", "source quality flags"], },
  { id: "A16", condition: "Language or contact-time preference is available", action: "Use the stated language and preferred contact window", rationale: "Honor the member's recorded communication preference and verify it during outreach.", evidence: ["member record", "contact history"], },
];
