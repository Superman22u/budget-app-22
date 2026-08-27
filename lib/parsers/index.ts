import * as XLSX from "xlsx";
import { parseSwisscardCsv, fromSwisscardRecords } from "./swisscard";
import { parseUbsCsv } from "./ubs-csv";
import { parseLibertyRows } from "./liberty-xls";
import { parseVisecaText } from "./viseca-pdf";
import { extractPdfText } from "./pdf-text";
import { detectFromCsvText, detectFromExcelHeaders, headerNames } from "./detect";
import type { ParseResult } from "./types";
import { cellStr } from "./types";

function extOf(filename: string): string {
  const base = filename.toLowerCase();
  if (base.endsWith(".xlsx")) return "xlsx";
  if (base.endsWith(".xls")) return "xls";
  if (base.endsWith(".csv")) return "csv";
  if (base.endsWith(".pdf")) return "pdf";
  return "";
}

function aoaToRecords(aoa: unknown[][]): Record<string, unknown>[] {
  const headerIndex = aoa.findIndex((row) => row.some((c) => cellStr(c)));
  if (headerIndex < 0) return [];
  const headers = headerNames(aoa[headerIndex] ?? []);
  const records: Record<string, unknown>[] = [];
  for (let i = headerIndex + 1; i < aoa.length; i++) {
    const row = aoa[i] ?? [];
    if (!row.some((c) => cellStr(c))) continue;
    const rec: Record<string, unknown> = {};
    headers.forEach((h, col) => {
      if (h) rec[h] = row[col] ?? "";
    });
    records.push(rec);
  }
  return records;
}

export function parseExcel(buffer: Buffer, filename: string): ParseResult {
  const wb = XLSX.read(buffer, { type: "buffer", cellDates: true, raw: false });
  const sheet = wb.Sheets[wb.SheetNames[0] ?? ""];
  if (!sheet) {
    return { sourceKind: "unknown", header: {}, transactions: [], errors: ["Empty workbook"] };
  }
  const aoa = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: "", raw: true });
  const first = headerNames(aoa.find((r) => r.some((c) => cellStr(c))) ?? []);
  const kind = detectFromExcelHeaders(first, filename);
  const records = aoaToRecords(aoa);
  if (kind === "swisscard") return fromSwisscardRecords(records);
  if (kind === "liberty") return parseLibertyRows(records);
  if (kind === "ubs") {
    const csv = XLSX.utils.sheet_to_csv(sheet, { FS: ";" });
    return parseUbsCsv(csv);
  }
  return {
    sourceKind: "unknown",
    header: { columns: first },
    transactions: [],
    errors: [`Unrecognized Excel layout (${first.join(", ") || "no headers"})`],
  };
}

export async function parseFile(buffer: Buffer, filename: string): Promise<ParseResult> {
  const ext = extOf(filename);
  if (ext === "pdf" || filename.toLowerCase().includes("viseca")) {
    const text = await extractPdfText(buffer);
    return parseVisecaText(text);
  }
  if (ext === "xls" || ext === "xlsx") {
    return parseExcel(buffer, filename);
  }
  const text = buffer.toString("utf8");
  const kind = detectFromCsvText(text, filename);
  if (kind === "ubs") return parseUbsCsv(text);
  if (kind === "swisscard") return parseSwisscardCsv(text);
  if (kind === "liberty") {
    return parseExcel(buffer, filename);
  }
  if (text.includes("Buchungsdatum") && text.includes("Belastung")) return parseUbsCsv(text);
  if (text.includes("Transaktionsdatum")) return parseSwisscardCsv(text);
  return {
    sourceKind: "unknown",
    header: {},
    transactions: [],
    errors: [`Could not detect file format for ${filename}`],
  };
}
