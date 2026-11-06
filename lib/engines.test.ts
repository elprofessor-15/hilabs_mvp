import { describe, expect, it } from "vitest";
import { ALL_DATASET_RECORDS, HERO_CASES, VALIDATED_DATASET_RECORDS } from "@/data/seed";
import { calculateFillGap, getFreshness, scorePriority } from "@/lib/engines";
import { SCENARIO_NOW } from "@/config/workbench";

describe("transparent priority engine", () => {
  it.each([
    ["P1", "Critical", "A01"],
    ["P2", "High", "A02"],
    ["P3", "High", "A03"],
    ["P4", "Critical", "A04"],
    ["P5", "High", "A05"],
  ])("%s has the expected band and first action", (id, band, action) => {
    const member = HERO_CASES.find((item) => item.id === id);
    expect(member).toBeDefined();
    const result = scorePriority(member!.priorityFactors, member!.protocolTrigger, member!.primaryActionId);
    expect(result.band).toBe(band);
    expect(result.topActionId).toBe(action);
  });

  it("raises low-confidence cases to at least Medium and requests verification", () => {
    const result = scorePriority({ clinical: 10, events: 10, gaps: 5, time: 5, confidence: 12 });
    expect(result.band).toBe("Medium");
    expect(result.verifyFirst).toBe(true);
    expect(result.verificationTaskId).toBe("A15");
    expect(result.topActionId).toBe("A15");
  });

  it("forces a critical band for a protocol trigger", () => {
    const result = scorePriority({ clinical: 20, events: 20, gaps: 20, time: 20, confidence: 20 }, "clinician review");
    expect(result.band).toBe("Critical");
    expect(result.protocolEscalation).toBe(true);
    expect(result.topActionId).toBe("A04");
  });

  describe("synthetic seed coverage", () => {
    it("provides at least eight source records for each detailed scenario member", () => {
      for (const member of HERO_CASES) {
        expect(member.dataRecords.length).toBeGreaterThanOrEqual(8);
      }
    });

    it("validates source records across all 16 data domains", () => {
      expect(VALIDATED_DATASET_RECORDS).toHaveLength(ALL_DATASET_RECORDS.length);
      expect(new Set(VALIDATED_DATASET_RECORDS.map((record) => record.datasetId)).size).toBe(16);
    });
  });
});

describe("freshness and medication gap calculations", () => {
  it("uses configured dataset freshness thresholds", () => {
    expect(getFreshness("2026-11-08", "adt", SCENARIO_NOW).state).toBe("Fresh");
    expect(getFreshness("2026-10-25", "adt", SCENARIO_NOW).state).toBe("Stale");
  });

  it("calculates days beyond the expected runout date", () => {
    expect(calculateFillGap("2026-07-14", 90, SCENARIO_NOW)).toBe(28);
    expect(calculateFillGap("2026-11-01", 30, SCENARIO_NOW)).toBe(0);
  });
});
