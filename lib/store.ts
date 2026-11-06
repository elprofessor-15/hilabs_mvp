"use client";

import { create } from "zustand";
import { SCENARIO_NOW } from "@/config/workbench";

export interface AuditEntry {
  id: string;
  patientId: string;
  kind: "priority override" | "outreach" | "documentation" | "conflict";
  detail: string;
  by: string;
  at: string;
}

interface WorkbenchState {
  priorityOverrides: Record<string, { band: string; reason: string }>;
  auditEntries: AuditEntry[];
  failedAttempts: Record<string, number>;
  confirmedFields: string[];
  conflictDecisions: Record<string, string>;
  setPriorityOverride: (patientId: string, band: string, reason: string) => void;
  logContact: (patientId: string, outcome: string, channel: string, note?: string) => void;
  logDocumentation: (patientId: string, detail: string) => void;
  confirmField: (patientId: string, field: string) => void;
  decideConflict: (patientId: string, decision: string) => void;
}

const timestamp = () => new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short", timeZone: "America/New_York" }).format(SCENARIO_NOW);
const audit = (patientId: string, kind: AuditEntry["kind"], detail: string): AuditEntry => ({
  id: `${patientId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  patientId,
  kind,
  detail,
  by: "Maria Chen, RN",
  at: timestamp(),
});

export const useWorkbenchStore = create<WorkbenchState>((set) => ({
  priorityOverrides: {},
  auditEntries: [],
  failedAttempts: {},
  confirmedFields: [],
  conflictDecisions: {},
  setPriorityOverride: (patientId, band, reason) =>
    set((state) => ({
      priorityOverrides: { ...state.priorityOverrides, [patientId]: { band, reason } },
      auditEntries: [audit(patientId, "priority override", `Priority changed to ${band}. ${reason}`), ...state.auditEntries],
    })),
  logContact: (patientId, outcome, channel, note) =>
    set((state) => ({
      failedAttempts: {
        ...state.failedAttempts,
        [patientId]: ["No answer", "Voicemail", "Disconnected", "Wrong number"].includes(outcome)
          ? (state.failedAttempts[patientId] ?? 0) + 1
          : 0,
      },
      auditEntries: [audit(patientId, "outreach", `${channel} attempt logged as ${outcome}.${note ? ` ${note}` : ""}`), ...state.auditEntries],
    })),
  logDocumentation: (patientId, detail) =>
    set((state) => ({ auditEntries: [audit(patientId, "documentation", detail), ...state.auditEntries] })),
  confirmField: (patientId, field) =>
    set((state) => ({
      confirmedFields: Array.from(new Set([...state.confirmedFields, `${patientId}:${field}`])),
      auditEntries: [audit(patientId, "documentation", `${field} confirmed.`), ...state.auditEntries],
    })),
  decideConflict: (patientId, decision) =>
    set((state) => ({
      conflictDecisions: { ...state.conflictDecisions, [patientId]: decision },
      auditEntries: [audit(patientId, "conflict", `Medication conflict marked: ${decision}.`), ...state.auditEntries],
    })),
}));
