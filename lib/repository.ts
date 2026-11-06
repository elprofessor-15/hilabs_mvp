import { BACKGROUND_CASES, HERO_CASES } from "@/data/seed";
import { DATASETS } from "@/data/datasets";
import type { DatasetId, QueueCase } from "@/lib/types";

export const workbenchRepository = {
  getQueue(): QueueCase[] {
    return [...HERO_CASES, ...BACKGROUND_CASES];
  },
  getMember(id: string) {
    return HERO_CASES.find((member) => member.id === id);
  },
  getDataset(id: DatasetId) {
    return DATASETS.find((dataset) => dataset.id === id);
  },
  getDatasets() {
    return DATASETS;
  },
};
