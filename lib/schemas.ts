import { z } from "zod";
import { DATASET_IDS } from "@/lib/types";

export const datasetRecordSchema = z.object({
  patientId: z.string().min(1),
  datasetId: z.enum(DATASET_IDS),
  source: z.string().min(1),
  eventDate: z.string().date(),
  receivedDate: z.string().date(),
  qualityFlags: z.array(z.string()),
  summary: z.string().min(1),
  plantedImperfection: z.string(),
});
