"use client";

import { create } from "zustand";
import { createJSONStorage, persist, type StateStorage } from "zustand/middleware";
import { SCENARIO_NOW } from "@/config/workbench";

export interface AuditEntry {
  id: string;
  patientId: string;
  kind: "priority override" | "outreach" | "documentation" | "conflict";
  detail: string;
  by: string;
  at: string;
}

export interface SavedDocumentation {
  callNote: string;
  carePlan: string;
  memberGoal: string;
  contactOutcome: string;
  savedAt: string;
}

interface PersistedWorkbenchState {
  priorityOverrides: Record<string, { band: string; reason: string }>;
  auditEntries: AuditEntry[];
  failedAttempts: Record<string, number>;
  confirmedFields: string[];
  conflictDecisions: Record<string, string>;
  savedDocumentation: Record<string, SavedDocumentation>;
}

interface WorkbenchState extends PersistedWorkbenchState {
  setPriorityOverride: (patientId: string, band: string, reason: string) => void;
  logContact: (patientId: string, outcome: string, channel: string, note?: string) => void;
  logDocumentation: (patientId: string, detail: string) => void;
  saveDocumentation: (patientId: string, documentation: Omit<SavedDocumentation, "savedAt">) => void;
  confirmField: (patientId: string, field: string) => void;
  decideConflict: (patientId: string, decision: string) => void;
}

function reportStorageError(operation: string, error: unknown) {
  console.error(`Workbench session storage ${operation} failed.`, error);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("workbench:storage-error"));
  }
}

const sessionStorageAdapter: StateStorage = {
  getItem(name) {
    try {
      return typeof window === "undefined" ? null : window.sessionStorage.getItem(name);
    } catch (error) {
      reportStorageError("read", error);
      return null;
    }
  },
  setItem(name, value) {
    try {
      if (typeof window !== "undefined") window.sessionStorage.setItem(name, value);
    } catch (error) {
      reportStorageError("write", error);
    }
  },
  removeItem(name) {
    try {
      if (typeof window !== "undefined") window.sessionStorage.removeItem(name);
    } catch (error) {
      reportStorageError("remove", error);
    }
  },
};

function audit(state: WorkbenchState, patientId: string, kind: AuditEntry["kind"], detail: string): AuditEntry {
  const timestamp = new Date(SCENARIO_NOW.getTime() + state.auditEntries.length * 60_000);
  return {
    id: `${patientId}-${state.auditEntries.length + 1}`,
    patientId,
    kind,
    detail,
    by: "Maria Chen, RN",
    at: new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short", timeZone: "America/New_York" }).format(timestamp),
  };
}

export const useWorkbenchStore = create<WorkbenchState>()(
  persist<WorkbenchState, [], [], PersistedWorkbenchState>(
    (set) => ({
      priorityOverrides: {},
      auditEntries: [],
      failedAttempts: {},
      confirmedFields: [],
      conflictDecisions: {},
      savedDocumentation: {},
      setPriorityOverride: (patientId, band, reason) =>
        set((state) => ({
          priorityOverrides: { ...state.priorityOverrides, [patientId]: { band, reason } },
          auditEntries: [audit(state, patientId, "priority override", `Priority changed to ${band}. ${reason}`), ...state.auditEntries],
        })),
      logContact: (patientId, outcome, channel, note) =>
        set((state) => ({
          failedAttempts: {
            ...state.failedAttempts,
            [patientId]: ["No answer", "Voicemail", "Disconnected", "Wrong number"].includes(outcome)
              ? (state.failedAttempts[patientId] ?? 0) + 1
              : 0,
          },
          auditEntries: [audit(state, patientId, "outreach", `${channel} attempt logged as ${outcome}.${note ? ` ${note}` : ""}`), ...state.auditEntries],
        })),
      logDocumentation: (patientId, detail) =>
        set((state) => ({ auditEntries: [audit(state, patientId, "documentation", detail), ...state.auditEntries] })),
      saveDocumentation: (patientId, documentation) =>
        set((state) => {
          const entry = audit(state, patientId, "documentation", "Nurse-reviewed call note and care plan saved.");
          const savedAt = entry.at;
          return {
            savedDocumentation: { ...state.savedDocumentation, [patientId]: { ...documentation, savedAt } },
            auditEntries: [entry, ...state.auditEntries],
          };
        }),
      confirmField: (patientId, field) =>
        set((state) => ({
          confirmedFields: Array.from(new Set([...state.confirmedFields, `${patientId}:${field}`])),
          auditEntries: [audit(state, patientId, "documentation", `${field} confirmed.`), ...state.auditEntries],
        })),
      decideConflict: (patientId, decision) =>
        set((state) => ({
          conflictDecisions: { ...state.conflictDecisions, [patientId]: decision },
          auditEntries: [audit(state, patientId, "conflict", `Medication conflict marked: ${decision}.`), ...state.auditEntries],
        })),
    }),
    {
      name: "hilabs-care-workbench-session",
      storage: createJSONStorage(() => sessionStorageAdapter),
      partialize: (state) => ({
        priorityOverrides: state.priorityOverrides,
        auditEntries: state.auditEntries,
        failedAttempts: state.failedAttempts,
        confirmedFields: state.confirmedFields,
        conflictDecisions: state.conflictDecisions,
        savedDocumentation: state.savedDocumentation,
      }),
      skipHydration: true,
    },
  ),
);
