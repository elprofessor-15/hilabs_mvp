import { writeFileSync } from "node:fs";
import { join } from "node:path";
import * as XLSX from "xlsx";
import { DATASETS } from "../data/datasets";
import { HERO_CASES, VALIDATED_DATASET_RECORDS } from "../data/seed";

const workbook = XLSX.utils.book_new();
const summary = HERO_CASES.map((patient) => ({
  Patient: patient.name,
  "Member ID": patient.id,
  Program: patient.program,
  "8 am Monday": patient.morningBrief,
}));
XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(summary), "Summary");

for (const dataset of DATASETS) {
  const rows = VALIDATED_DATASET_RECORDS.filter((record) => record.datasetId === dataset.id).map((record) => ({
    Patient: HERO_CASES.find((patient) => patient.id === record.patientId)?.name ?? record.patientId,
    "Member ID": record.patientId,
    Source: record.source,
    "Event date": record.eventDate,
    "Received date": record.receivedDate,
    Summary: record.summary,
    "Quality flags": record.qualityFlags.join("; "),
    "Planted imperfection": record.plantedImperfection,
  }));
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(rows), dataset.id.slice(0, 31));
}

const target = join(process.cwd(), "data", "synthetic-annex.xlsx");
writeFileSync(target, XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }));
console.log(`Exported ${DATASETS.length} datasets and ${HERO_CASES.length} patient summaries to ${target}`);
