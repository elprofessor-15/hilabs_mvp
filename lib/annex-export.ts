import ExcelJS from "exceljs";
import { DATASETS } from "@/data/datasets";
import { HERO_CASES, VALIDATED_DATASET_RECORDS } from "@/data/seed";
import type { DatasetRecord } from "@/lib/types";

const ANNEX_COLUMNS = [
  { header: "Patient", key: "patient", width: 24 },
  { header: "Member ID", key: "memberId", width: 14 },
  { header: "Record ID", key: "recordId", width: 24 },
  { header: "Source", key: "source", width: 28 },
  { header: "Event date/time", key: "eventDate", width: 24 },
  { header: "Received date/time", key: "receivedDate", width: 24 },
  { header: "Status", key: "status", width: 22 },
  { header: "Claim ID", key: "claimId", width: 22 },
  { header: "Diagnosis code", key: "diagnosisCode", width: 18 },
  { header: "Medication code (synthetic)", key: "medicationCode", width: 28 },
  { header: "Observation", key: "observation", width: 24 },
  { header: "Value", key: "value", width: 14 },
  { header: "Unit", key: "unit", width: 22 },
  { header: "Reference range", key: "referenceRange", width: 36 },
  { header: "Quantity", key: "quantity", width: 14 },
  { header: "Days supply", key: "daysSupply", width: 14 },
  { header: "Summary", key: "summary", width: 60 },
  { header: "Quality flags", key: "qualityFlags", width: 42 },
  { header: "Planted imperfection", key: "plantedImperfection", width: 42 },
];

function recordRows(record: DatasetRecord) {
  const patient = HERO_CASES.find((member) => member.id === record.patientId);
  const observations = record.observations?.length ? record.observations : [undefined];
  return observations.map((observation) => ({
    patient: patient?.name ?? record.patientId,
    memberId: record.patientId,
    recordId: record.recordId,
    source: record.source,
    eventDate: record.eventDate,
    receivedDate: record.receivedDate,
    status: record.status,
    claimId: record.claimId,
    diagnosisCode: record.diagnosisCode,
    medicationCode: record.medicationCode,
    observation: observation?.name,
    value: observation?.value ?? record.value,
    unit: observation?.unit ?? record.unit,
    referenceRange: observation?.referenceRange,
    quantity: record.quantity,
    daysSupply: record.daysSupply,
    summary: record.summary,
    qualityFlags: record.qualityFlags.join("; "),
    plantedImperfection: record.plantedImperfection,
  }));
}

export function createAnnexWorkbook() {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "HiLabs Care Workbench";
  workbook.subject = "Synthetic nurse case-management scenarios";
  workbook.title = "HiLabs Care Workbench synthetic annex";
  workbook.company = "Synthetic demonstration data";
  workbook.created = new Date("2026-11-09T08:00:00-05:00");

  const summary = workbook.addWorksheet("Summary");
  summary.columns = [
    { header: "Patient", key: "patient", width: 24 },
    { header: "Member ID", key: "memberId", width: 14 },
    { header: "Program", key: "program", width: 30 },
    { header: "Scenario brief", key: "brief", width: 90 },
  ];
  summary.addRows(HERO_CASES.map((patient) => ({
    patient: patient.name,
    memberId: patient.id,
    program: patient.program,
    brief: patient.morningBrief,
  })));

  for (const dataset of DATASETS) {
    const sheet = workbook.addWorksheet(dataset.id);
    sheet.columns = ANNEX_COLUMNS;
    const rows = VALIDATED_DATASET_RECORDS
      .filter((record) => record.datasetId === dataset.id)
      .flatMap(recordRows);
    sheet.addRows(rows);
  }

  for (const sheet of workbook.worksheets) {
    sheet.views = [{ state: "frozen", ySplit: 1 }];
    sheet.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: Math.max(1, sheet.rowCount), column: sheet.columnCount },
    };
    const header = sheet.getRow(1);
    header.font = { bold: true, color: { argb: "FFFFFFFF" } };
    header.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0E254B" } };
    header.alignment = { vertical: "middle", wrapText: true };
    header.height = 30;
    sheet.eachRow((row, rowNumber) => {
      if (rowNumber > 1) row.alignment = { vertical: "top", wrapText: true };
    });
  }
  return workbook;
}

export async function downloadAnnex() {
  const workbook = createAnnexWorkbook();
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([new Uint8Array(buffer)], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "hilabs-care-workbench-annex.xlsx";
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
}
