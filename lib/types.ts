export const DATASET_IDS = [
  "eligibility",
  "adt",
  "claims",
  "pharmacy",
  "clinical",
  "hie",
  "labs",
  "utilization",
  "appointments",
  "contacts",
  "sdoh",
  "hra",
  "careTeam",
  "riskGaps",
  "caregiver",
  "homeHealth",
] as const;

export type DatasetId = (typeof DATASET_IDS)[number];
export type PriorityBand = "Critical" | "High" | "Medium" | "Low";
export type PriorityFactors = {
  clinical: number;
  events: number;
  gaps: number;
  time: number;
  confidence: number;
};
export type FreshnessState = "Fresh" | "Aging" | "Stale";
export type OutreachOutcome = "Connected" | "Voicemail" | "No answer" | "Disconnected" | "Wrong number";

export interface DatasetDefinition {
  id: DatasetId;
  name: string;
  source: string;
  purpose: string;
  latency: string;
  qualityRisk: string;
  handling: string;
  priority: "Must-have MVP" | "Later";
  decision: string;
}

export interface DatasetRecord {
  patientId: string;
  datasetId: DatasetId;
  source: string;
  eventDate: string;
  receivedDate: string;
  qualityFlags: string[];
  summary: string;
  plantedImperfection: string;
}

export interface TimelineEvent {
  id: string;
  kind: "ADT" | "Claim" | "Pharmacy" | "Appointment" | "Contact" | "Lab" | "Care";
  eventDate: string;
  receivedDate: string;
  title: string;
  detail: string;
  source: string;
  datasetId: DatasetId;
  qualityFlags: string[];
}

export interface MedicationSource {
  source: string;
  medication: string;
  dose: string;
  status: "Prescribed" | "Dispensed" | "Reported";
  eventDate: string;
  receivedDate: string;
  daysSupply?: number;
  qualityFlags: string[];
}

export interface ContactEntry {
  date: string;
  channel: string;
  outcome: OutreachOutcome;
  detail: string;
}

export interface WorkCase {
  id: string;
  name: string;
  age: number;
  plan: string;
  program: string;
  primaryCondition: string;
  language: string;
  pcp: string;
  caregiver: string;
  preferredChannel: string;
  bestTime: string;
  phone: string;
  alternatePhone?: string;
  address: string;
  priorityFactors: PriorityFactors;
  protocolTrigger?: string;
  lastContact: string;
  trigger: string;
  triggerDate: string;
  triggerAgeHours: number;
  deadlineHours: number;
  primaryActionId: string;
  whyNow: string;
  morningBrief: string;
  confidenceNotes: string[];
  attention: { label: string; severity: "Critical" | "High" | "Medium"; evidence: string; actionId: string }[];
  events: TimelineEvent[];
  medications: MedicationSource[];
  contacts: ContactEntry[];
  dataRecords: DatasetRecord[];
  isHero: boolean;
}

export interface BackgroundCase {
  id: string;
  name: string;
  age: number;
  plan: string;
  program: string;
  primaryCondition: string;
  priorityFactors: PriorityFactors;
  lastContact: string;
  trigger: string;
  triggerDate: string;
  triggerAgeHours: number;
  deadlineHours: number;
  primaryActionId: string;
  whyNow: string;
  isHero: false;
}

export type QueueCase = WorkCase | BackgroundCase;

export interface PriorityResult {
  score: number;
  band: PriorityBand;
  verifyFirst: boolean;
  verificationTaskId?: string;
  protocolEscalation: boolean;
  topActionId: string;
}
