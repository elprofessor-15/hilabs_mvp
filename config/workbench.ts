import type { CaseFacts, DatasetId, PriorityFactors } from "@/lib/types";

export const SCENARIO_NOW = new Date("2026-11-09T08:00:00-05:00");
export const SCENARIO_LABEL = "Mon 9 Nov 2026, 08:00";
export const ACTIVE_CASELOAD = 48;
export const ESTIMATED_REVIEW_MINUTES: Record<"Critical" | "High" | "Medium" | "Low", number> = {
  Critical: 25,
  High: 18,
  Medium: 12,
  Low: 8,
};

export const PRIORITY_WEIGHTS: PriorityFactors = {
  clinical: 0.35,
  events: 0.25,
  gaps: 0.2,
  time: 0.15,
  confidence: 0.05,
};

export const FRESHNESS_THRESHOLDS: Record<DatasetId, { freshHours: number; agingHours: number }> = {
  eligibility: { freshHours: 720, agingHours: 2160 },
  adt: { freshHours: 48, agingHours: 168 },
  claims: { freshHours: 336, agingHours: 1080 },
  pharmacy: { freshHours: 168, agingHours: 720 },
  clinical: { freshHours: 72, agingHours: 336 },
  hie: { freshHours: 72, agingHours: 336 },
  labs: { freshHours: 168, agingHours: 720 },
  utilization: { freshHours: 72, agingHours: 336 },
  appointments: { freshHours: 168, agingHours: 720 },
  contacts: { freshHours: 24, agingHours: 336 },
  sdoh: { freshHours: 720, agingHours: 4320 },
  hra: { freshHours: 720, agingHours: 4320 },
  careTeam: { freshHours: 720, agingHours: 2160 },
  riskGaps: { freshHours: 168, agingHours: 720 },
  caregiver: { freshHours: 720, agingHours: 4320 },
  homeHealth: { freshHours: 72, agingHours: 336 },
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
  matches: (facts: CaseFacts) => boolean;
}[] = [
  { id: "A04", condition: "Unreviewed positive safety screening item", action: "Escalate to a licensed clinician for review", rationale: "A source record is explicitly marked for clinician review. This prototype does not make a clinical determination.", evidence: ["screening note", "care plan"], matches: (facts) => facts.protocolEscalation },
  { id: "A01", condition: "Recent discharge and no completed contact", action: "Call today and confirm the discharge plan", rationale: "A recent discharge has no completed follow-up contact recorded.", evidence: ["ADT alert", "contact history"], matches: (facts) => facts.recentDischargeWithoutContact },
  { id: "A03", condition: "Repeated unsuccessful outreach", action: "Stop repeat calls and coordinate an alternate route", rationale: "Recorded attempts have not connected. Verify a safe, permitted alternate route before use.", evidence: ["contact history", "ADT alert"], matches: (facts) => facts.failedOutreachAttempts >= 3 },
  { id: "A14", condition: "Authorization pending more than five days", action: "Request an update from the authorization owner", rationale: "The recorded authorization age exceeds the five-day follow-up threshold.", evidence: ["UM record"], matches: (facts) => facts.pendingAuthorizationDays > 5 },
  { id: "A05", condition: "Home-health authorization is pending", action: "Check authorization status with the UM team", rationale: "A source record shows a pending authorization. Confirm its status and owner.", evidence: ["UM record", "home-health order"], matches: (facts) => facts.pendingAuthorizationDays > 0 },
  { id: "A06", condition: "Medication lists disagree", action: "Reconcile the medication list with the member and care team", rationale: "Source lists conflict. Do not silently select or change a medication.", evidence: ["clinical summary", "pharmacy fill", "HIE"], matches: (facts) => facts.medicationConflict },
  { id: "A02", condition: "Medication fill gap needs verification", action: "Use a verified channel and check medication access", rationale: "A calculated fill gap is a signal to verify, not proof of non-adherence.", evidence: ["pharmacy fill", "contact data", "SDOH screen"], matches: (facts) => facts.medicationFillGapDays > 0 },
  { id: "A08", condition: "Contact history marks a number invalid", action: "Verify the best contact number before calling", rationale: "A recorded attempt marks a number invalid. Avoid repeating a call to it.", evidence: ["contact history", "provider directory"], matches: (facts) => facts.invalidPhoneRecorded },
  { id: "A07", condition: "Follow-up appointment is not found", action: "Confirm or arrange a follow-up appointment", rationale: "The available appointment feed does not show a scheduled visit; confirm before concluding it was missed.", evidence: ["ADT alert", "appointment feed"], matches: (facts) => facts.followUpNotFound },
  { id: "A09", condition: "A transport barrier is recorded", action: "Ask about transportation and offer available support", rationale: "A reported transport barrier may affect care. Reconfirm it with the member.", evidence: ["SDOH screen", "appointment feed"], matches: (facts) => facts.transportBarrier },
  { id: "A10", condition: "Caregiver strain is recorded", action: "Check in with the caregiver and review support options", rationale: "A strain screen is not current. Reassess before acting on it.", evidence: ["caregiver record", "contact history"], matches: (facts) => facts.caregiverStrain },
  { id: "A11", condition: "Claims data is delayed", action: "Use the current event feed and label claims as delayed", rationale: "Claims may not reflect recent care. Missing claims are not evidence that care did not occur.", evidence: ["claims", "ADT alert"], matches: (facts) => facts.claimsDelayed },
  { id: "A12", condition: "Clinical fact is stale", action: "Verify the clinical detail before documenting it as current", rationale: "A displayed clinical source is outside its configured freshness window.", evidence: ["clinical summary", "labs"], matches: (facts) => facts.staleClinicalFact },
  { id: "A13", condition: "A follow-up visit is recorded as missed", action: "Confirm the visit with the member or PCP office", rationale: "Confirm the appointment record with the member or office before treating it as missed.", evidence: ["appointment feed", "claims"], matches: (facts) => facts.missedAppointment },
  { id: "A15", condition: "Low data confidence", action: "Verify identity and key facts before acting", rationale: "Source quality flags lower confidence. Verify key facts before action.", evidence: ["member record", "source quality flags"], matches: (facts) => facts.confidenceScore < 45 },
  { id: "A16", condition: "No higher-priority rule matched", action: "Use the stated language and preferred contact window", rationale: "Honor the recorded communication preference and verify it during outreach.", evidence: ["member record", "contact history"], matches: () => true },
];
