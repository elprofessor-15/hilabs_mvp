import { z } from "zod";
import { DATASET_IDS } from "@/lib/types";

export const datasetRecordSchema = z.object({
  patientId: z.string().min(1),
  datasetId: z.enum(DATASET_IDS),
  source: z.string().min(1),
  eventDate: z.union([z.string().date(), z.string().datetime({ offset: true })]),
  receivedDate: z.union([z.string().date(), z.string().datetime({ offset: true })]),
  qualityFlags: z.array(z.string()),
  summary: z.string().min(1),
  plantedImperfection: z.string(),
  recordId: z.string().min(1).optional(),
  claimId: z.string().optional(),
  diagnosisCode: z.string().optional(),
  medicationCode: z.string().optional(),
  value: z.number().optional(),
  unit: z.string().optional(),
  quantity: z.number().optional(),
  daysSupply: z.number().optional(),
  status: z.string().optional(),
  observations: z.array(z.object({
    name: z.string().min(1),
    value: z.number(),
    unit: z.string().min(1),
    referenceRange: z.string().optional(),
  })).optional(),
});
