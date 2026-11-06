import { describe, expect, it } from "vitest";
import { ALL_DATASET_RECORDS, BACKGROUND_CASES, HERO_CASES, VALIDATED_DATASET_RECORDS } from "@/data/seed";
import { calculateFillGap, deriveCaseFacts, getFreshness, getQueueMetrics, scorePriority } from "@/lib/engines";
import { SCENARIO_NOW } from "@/config/workbench";
import { createAnnexWorkbook } from "@/lib/annex-export";

describe("record-derived queue assessment", () => {
  it.each([
    ["P1", "Critical", "A01"],
    ["P2", "Medium", "A02"],
    ["P3", "High", "A03"],
    ["P4", "Critical", "A04"],
    ["P5", "High", "A14"],
  ])("%s derives the expected band and first matching action", (id, band, action) => {
    const member = HERO_CASES.find((item) => item.id === id);
    expect(member).toBeDefined();
    const result = scorePriority(member!);
    expect(result.band).toBe(band);
    expect(result.topActionId).toBe(action);
    expect(result.matchingActionIds).toContain(action);
    expect(result.factors).toEqual(expect.objectContaining({
      clinical: expect.any(Number),
      events: expect.any(Number),
      gaps: expect.any(Number),
      time: expect.any(Number),
      confidence: expect.any(Number),
    }));
  });

  it("changes the selected action when the underlying pharmacy record changes", () => {
    const linda = HERO_CASES.find((member) => member.id === "P2")!;
    const updatedMedicationHistory = {
      ...linda,
      medications: linda.medications.map((medication) => ({ ...medication, daysSupply: 365 })),
    };
    expect(scorePriority(linda).topActionId).toBe("A02");
    expect(deriveCaseFacts(updatedMedicationHistory).medicationFillGapDays).toBe(0);
    expect(scorePriority(updatedMedicationHistory).topActionId).toBe("A08");
  });

  it("changes the action and factors when discharge or gap evidence changes", () => {
    const robert = HERO_CASES.find((member) => member.id === "P1")!;
    const withoutDischargeEvidence = {
      ...robert,
      events: robert.events.filter((event) => event.kind !== "ADT"),
    };
    expect(scorePriority(withoutDischargeEvidence).topActionId).not.toBe("A01");
    expect(scorePriority(withoutDischargeEvidence).topActionId).toBe("A06");

    const withoutOpenGaps = { ...robert, attention: [] };
    expect(scorePriority(withoutOpenGaps).factors.gaps).toBeLessThan(scorePriority(robert).factors.gaps);
  });

  it("derives time sensitivity from the due timestamp", () => {
    const member = HERO_CASES.find((item) => item.id === "P1")!;
    const extendedDeadline = { ...member, contactDueAt: "2026-11-12T08:00:00-05:00" };
    expect(scorePriority(member).factors.time).toBeGreaterThan(scorePriority(extendedDeadline).factors.time);
  });

  it("keeps a verification task when the source quality worsens", () => {
    const harold = HERO_CASES.find((member) => member.id === "P5")!;
    const lowerConfidence = {
      ...harold,
      dataRecords: harold.dataRecords.map((record) => ({ ...record, qualityFlags: [...record.qualityFlags, "Additional source mismatch"] })),
    };
    expect(scorePriority(harold).verifyFirst).toBe(false);
    expect(scorePriority(lowerConfidence).verifyFirst).toBe(true);
    expect(scorePriority(lowerConfidence).verificationTaskId).toBe("A15");
  });

  it("forces human review for an explicit protocol trigger", () => {
    const elena = HERO_CASES.find((member) => member.id === "P4")!;
    const result = scorePriority(elena);
    expect(result.band).toBe("Critical");
    expect(result.protocolEscalation).toBe(true);
    expect(result.topActionId).toBe("A04");
  });

  it("derives all queue counts and the review estimate from the cases", () => {
    const cases = [...HERO_CASES, ...BACKGROUND_CASES];
    const metrics = getQueueMetrics(cases);
    expect(metrics.totalCases).toBe(cases.length);
    expect(metrics.newAlerts).toBe(cases.filter((member) => deriveCaseFacts(member).triggerAgeHours <= 24).length);
    expect(metrics.unreachable).toBe(cases.filter((member) => deriveCaseFacts(member).failedOutreachAttempts > 0).length);
    expect(metrics.estimatedReviewMinutes).toBeGreaterThan(0);
  });
});

describe("synthetic annex coverage", () => {
  it("validates source records across all configured domains", () => {
    expect(VALIDATED_DATASET_RECORDS).toHaveLength(ALL_DATASET_RECORDS.length);
    expect(new Set(VALIDATED_DATASET_RECORDS.map((record) => record.datasetId)).size).toBe(16);
  });

  it("has at least eight source records across ten or more domains per detailed scenario member", () => {
    for (const member of HERO_CASES) {
      expect(member.dataRecords.length).toBeGreaterThanOrEqual(8);
      expect(new Set(member.dataRecords.map((record) => record.datasetId)).size).toBeGreaterThanOrEqual(10);
    }
  });

  it("keeps every quality flag paired with a populated imperfection field", () => {
    for (const record of VALIDATED_DATASET_RECORDS.filter((item) => item.qualityFlags.length > 0)) {
      expect(record.plantedImperfection.trim()).not.toBe("");
    }
  });

  it("includes structured laboratory values, claim identifiers, and pharmacy codes", () => {
    expect(VALIDATED_DATASET_RECORDS.some((record) => record.datasetId === "labs" && record.observations?.some((result) => result.value > 0 && result.unit.length > 0))).toBe(true);
    expect(VALIDATED_DATASET_RECORDS.filter((record) => record.datasetId === "claims").every((record) => record.claimId && record.diagnosisCode)).toBe(true);
    expect(VALIDATED_DATASET_RECORDS.some((record) => record.datasetId === "pharmacy" && record.medicationCode && record.daysSupply)).toBe(true);
    expect(VALIDATED_DATASET_RECORDS.filter((record) => record.datasetId === "utilization")).toHaveLength(5);
    expect(VALIDATED_DATASET_RECORDS.filter((record) => record.datasetId === "homeHealth")).toHaveLength(5);
  });

  it("exports the validated records as domain sheets with structured columns", () => {
    const workbook = createAnnexWorkbook();
    expect(workbook.worksheets).toHaveLength(17);
    const labs = workbook.getWorksheet("labs");
    const claims = workbook.getWorksheet("claims");
    expect(labs?.rowCount).toBeGreaterThan(1);
    const labRows = labs ? labs.getRows(2, Math.max(0, labs.rowCount - 1)) ?? [] : [];
    expect(labRows.some((row) => row.getCell(12).value === 1180)).toBe(true);
    expect(claims?.getRow(2).getCell(8).value).toBe("SYN-CLM-P1-1025");
    expect(workbook.getWorksheet("utilization")?.rowCount).toBe(6);
  });
});

describe("freshness and medication gap calculations", () => {
  it("calculates ADT freshness using elapsed hours", () => {
    const freshness = getFreshness("2026-11-06T08:00:00-05:00", "adt", SCENARIO_NOW);
    expect(freshness.ageHours).toBe(72);
    expect(freshness.state).toBe("Aging");
  });

  it("calculates days beyond the expected runout date", () => {
    expect(calculateFillGap("2026-07-14", 90, SCENARIO_NOW)).toBe(28);
    expect(calculateFillGap("2026-11-01", 30, SCENARIO_NOW)).toBe(0);
  });
});
