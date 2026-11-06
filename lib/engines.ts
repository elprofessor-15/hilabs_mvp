import { ESTIMATED_REVIEW_MINUTES, FRESHNESS_THRESHOLDS, NEXT_ACTION_RULES, PRIORITY_WEIGHTS, SCENARIO_NOW } from "@/config/workbench";
import type { CaseFacts, DatasetId, DatasetRecord, FreshnessState, PriorityBand, PriorityFactors, PriorityResult, QueueCase } from "@/lib/types";

const DAY_MS = 86_400_000;

function ageHours(date: string, now: Date): number {
  const parsed = new Date(date);
  return Number.isNaN(parsed.getTime()) ? 0 : (now.getTime() - parsed.getTime()) / 3_600_000;
}

function caseConfidence(member: QueueCase) {
  if ("dataRecords" in member) return getDatasetConfidence(member.dataRecords);
  const score = Math.max(20, 100 - member.dataQualityFlags.length * 12);
  return {
    score,
    label: score >= 75 ? "Higher confidence" : score >= 45 ? "Review sources" : "Verify first",
    reasons: member.dataQualityFlags.length ? member.dataQualityFlags : ["Background case; verify source records before action."],
  };
}

function recordSummary(member: QueueCase, datasetId: DatasetId) {
  return "dataRecords" in member ? member.dataRecords.filter((record) => record.datasetId === datasetId) : [];
}

function hasQualityFlag(member: QueueCase, text: string) {
  return "dataRecords" in member && member.dataRecords.some((record) =>
    record.qualityFlags.some((flag) => flag.toLowerCase().includes(text.toLowerCase())),
  );
}

export function deriveCaseFacts(member: QueueCase, now = SCENARIO_NOW): CaseFacts {
  const confidence = caseConfidence(member);
  const triggerAge = Math.max(0, ageHours(member.triggerAt, now));
  const deadlineHours = ageHours(member.contactDueAt, now) * -1;
  const events = "events" in member ? member.events : [];
  const records = "dataRecords" in member ? member.dataRecords : [];
  const failedOutreachAttempts = "contacts" in member
    ? member.contacts.filter((entry) => ["No answer", "Voicemail", "Disconnected", "Wrong number"].includes(entry.outcome)).length
    : member.failedAttemptCount;
  const attention = "attention" in member ? member.attention : [];
  const openGaps = "riskSignals" in member ? member.riskSignals : [];
  const clinicalRecords = records.filter((record) => record.datasetId === "clinical" || record.datasetId === "labs");
  const claims = recordSummary(member, "claims");
  const appointments = recordSummary(member, "appointments");
  const utilizationRecords = recordSummary(member, "utilization");
  const medicationConflict = "medications" in member
    ? member.medications.some((medication) => medication.qualityFlags.some((flag) => flag.toLowerCase().includes("conflict") || flag.toLowerCase().includes("duplicate")))
    : false;
  const medicationFillGapDays = "medications" in member
    ? member.medications.reduce((max, medication) => medication.daysSupply === undefined
      ? max
      : Math.max(max, calculateFillGap(medication.eventDate, medication.daysSupply, now)), 0)
    : 0;
  const pendingAuthorizationDays = utilizationRecords.some((record) => /pending/i.test(record.summary))
    ? Math.max(...utilizationRecords.map((record) => Math.ceil(Math.max(0, ageHours(record.eventDate, now)) / 24)))
    : 0;
  const recentDischargeWithoutContact = events.some((event) =>
    event.kind === "ADT" && /discharg/i.test(event.title) && ageHours(event.eventDate, now) <= 72,
  ) && !events.some((event) => event.kind === "Contact" && new Date(event.eventDate) >= new Date(member.triggerAt));
  const followUpNotFound = appointments.some((record) => /no .*appointment|no follow-up/i.test(record.summary));
  const invalidPhoneRecorded = "contacts" in member
    ? member.contacts.some((entry) => entry.outcome === "Disconnected" || entry.outcome === "Wrong number")
    : false;
  const transportBarrier = records.some((record) => record.datasetId === "sdoh" && /transport/i.test(record.summary));
  const caregiverStrain = records.some((record) => record.datasetId === "caregiver" && /strain/i.test(record.summary));
  const claimsDelayed = claims.some((record) => record.qualityFlags.some((flag) => /lag|delay/i.test(flag)) || ageHours(record.receivedDate, now) - ageHours(record.eventDate, now) > 14 * 24);
  const staleClinicalFact = clinicalRecords.some((record) => getFreshness(record.eventDate, record.datasetId, now).state === "Stale");
  const missedAppointment = appointments.some((record) => /missed/i.test(record.summary));
  const criticalGapCount = attention.filter((item) => item.severity === "Critical").length || openGaps.filter((item) => item.severity === "Critical").length;
  const highGapCount = attention.filter((item) => item.severity === "High").length || openGaps.filter((item) => item.severity === "High").length;
  const mediumGapCount = attention.filter((item) => item.severity === "Medium").length || openGaps.filter((item) => item.severity === "Medium").length;
  const recentEventCount = events.filter((event) => ageHours(event.eventDate, now) <= 30 * 24).length || (triggerAge <= 30 * 24 ? 1 : 0);

  return {
    caseId: member.id,
    program: member.program,
    triggerAgeHours: triggerAge,
    deadlineHours,
    protocolEscalation: "protocolTrigger" in member && Boolean(member.protocolTrigger),
    recentDischargeWithoutContact,
    medicationFillGapDays,
    failedOutreachAttempts,
    pendingAuthorizationDays,
    medicationConflict: medicationConflict || hasQualityFlag(member, "medication list conflict"),
    followUpNotFound,
    invalidPhoneRecorded,
    transportBarrier,
    caregiverStrain,
    claimsDelayed,
    staleClinicalFact,
    missedAppointment,
    confidenceScore: confidence.score,
    criticalGapCount,
    highGapCount,
    mediumGapCount,
    recentEventCount,
    dataQualityIssueCount: records.flatMap((record) => record.qualityFlags).length + ("dataQualityFlags" in member ? member.dataQualityFlags.length : 0),
  };
}

function calculateFactors(facts: CaseFacts): PriorityFactors {
  const program = facts.program.toLowerCase();
  const clinicalBase = program.includes("heart failure") ? 68
    : program.includes("post-acute") || program.includes("transition") ? 64
      : program.includes("behavioral") ? 62
        : program.includes("copd") ? 56
          : program.includes("diabetes") ? 50 : 45;
  const clinical = Math.min(100, clinicalBase + facts.criticalGapCount * 24 + facts.highGapCount * 12);
  const events = Math.min(100, 18 + facts.recentEventCount * 12 + Math.max(0, 7 - facts.triggerAgeHours / 24) * 7);
  const gaps = Math.min(100, 18 + facts.criticalGapCount * 32 + facts.highGapCount * 18 + facts.mediumGapCount * 9);
  const time = facts.deadlineHours <= 0 ? 100
    : facts.deadlineHours <= 4 ? 92
      : facts.deadlineHours <= 24 ? 82
        : facts.deadlineHours <= 72 ? 68
          : facts.deadlineHours <= 168 ? 50 : 30;
  return { clinical, events: Math.round(events), gaps, time, confidence: facts.confidenceScore };
}

function actionReason(facts: CaseFacts, ruleId: string, ruleRationale: string) {
  switch (ruleId) {
    case "A01": return `Discharge event is ${Math.round(facts.triggerAgeHours)} hours old; no later contact is recorded.`;
    case "A02": return `A pharmacy record calculates to a ${facts.medicationFillGapDays}-day fill gap. Confirm use and access with the member.`;
    case "A03": return `${facts.failedOutreachAttempts} recorded attempts did not connect. Confirm a safe alternate route.`;
    case "A04": return ruleRationale;
    case "A14": return `Authorization record is ${facts.pendingAuthorizationDays} days old and remains pending.`;
    case "A05": return `A utilization record is pending. Confirm its current status and owner.`;
    default: return ruleRationale;
  }
}

export function scorePriority(member: QueueCase, now = SCENARIO_NOW): PriorityResult {
  const facts = deriveCaseFacts(member, now);
  const factors = calculateFactors(facts);
  const score = Math.round(
    factors.clinical * PRIORITY_WEIGHTS.clinical
      + factors.events * PRIORITY_WEIGHTS.events
      + factors.gaps * PRIORITY_WEIGHTS.gaps
      + factors.time * PRIORITY_WEIGHTS.time
      + factors.confidence * PRIORITY_WEIGHTS.confidence,
  );
  const verifyFirst = facts.confidenceScore < 40;
  const protocolEscalation = facts.protocolEscalation;
  let band: PriorityBand = score >= 82 ? "Critical" : score >= 65 ? "High" : score >= 40 ? "Medium" : "Low";
  if (verifyFirst && band === "Low") band = "Medium";
  if (protocolEscalation) band = "Critical";

  const matchedRules = NEXT_ACTION_RULES.filter((rule) => rule.matches(facts));
  const selectedRule = matchedRules[0] ?? NEXT_ACTION_RULES[NEXT_ACTION_RULES.length - 1];
  return {
    score,
    band,
    verifyFirst,
    verificationTaskId: verifyFirst ? "A15" : undefined,
    protocolEscalation,
    topActionId: selectedRule.id,
    factors,
    whyNow: actionReason(facts, selectedRule.id, selectedRule.rationale),
    matchingActionIds: matchedRules.map((rule) => rule.id),
  };
}

export function getQueueMetrics(cases: QueueCase[], now = SCENARIO_NOW) {
  const assessments = cases.map((member) => ({
    member,
    facts: deriveCaseFacts(member, now),
    priority: scorePriority(member, now),
  }));
  const reviewWork = assessments.filter(({ facts, priority }) => facts.deadlineHours <= 24 || priority.verifyFirst);
  return {
    totalCases: cases.length,
    newAlerts: assessments.filter(({ facts }) => facts.triggerAgeHours <= 24).length,
    newDischarges: assessments.filter(({ member, facts }) => /discharg/i.test(member.trigger) && facts.triggerAgeHours <= 72).length,
    dueToday: assessments.filter(({ facts }) => facts.deadlineHours >= 0 && facts.deadlineHours <= 24).length,
    overdue: assessments.filter(({ facts }) => facts.deadlineHours < 0).length,
    unreachable: assessments.filter(({ facts }) => facts.failedOutreachAttempts > 0).length,
    critical: assessments.filter(({ priority }) => priority.band === "Critical").length,
    dueBeforeNoon: assessments.filter(({ facts }) => facts.deadlineHours >= 0 && facts.deadlineHours <= 4).length,
    estimatedReviewMinutes: reviewWork.reduce((total, { priority }) => total + ESTIMATED_REVIEW_MINUTES[priority.band], 0),
  };
}

export function getFreshness(eventDate: string, datasetId: DatasetId, now: Date): { state: FreshnessState; ageDays: number; ageHours: number } {
  const ageHours = Math.max(0, ageHoursFrom(eventDate, now));
  const threshold = FRESHNESS_THRESHOLDS[datasetId];
  return {
    ageDays: Math.floor(ageHours / 24),
    ageHours,
    state: ageHours < threshold.freshHours ? "Fresh" : ageHours <= threshold.agingHours ? "Aging" : "Stale",
  };
}

function ageHoursFrom(date: string, now: Date) {
  const parsed = new Date(date);
  return Number.isNaN(parsed.getTime()) ? 0 : (now.getTime() - parsed.getTime()) / 3_600_000;
}

export function calculateFillGap(lastFillDate: string, daysSupply: number, now: Date): number {
  const expectedRunout = new Date(lastFillDate);
  expectedRunout.setDate(expectedRunout.getDate() + daysSupply);
  return Math.max(0, Math.floor((now.getTime() - expectedRunout.getTime()) / DAY_MS));
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
