import type { SourceKind } from "./types";
import { cellStr, normalizeHeader } from "./types";

export function headerNames(row: unknown[]): string[] {
  return row.map((c) => normalizeHeader(cellStr(c)));
}

export function looksLike(headers: string[], needles: string[]): boolean {
  const set = new Set(headers.map((h) => h.toLowerCase()));
  return needles.every((n) => [...set].some((h) => h.includes(n.toLowerCase())));
}

export function detectFromCsvText(text: string, filename: string): SourceKind {
  const head = text.slice(0, 2000).toLowerCase();
  const name = filename.toLowerCase();
  if (name.includes("ubs") || head.includes("buchungsdatum") || head.includes("kontonummer")) {
    return "ubs";
  }
  if (
    name.includes("sc-") ||
    name.includes("swisscard") ||
    head.includes("händlerkategorie") ||
    head.includes("handlerkategorie") ||
    head.includes("transaktionsdatum")
  ) {
    return "swisscard";
  }
  if (name.includes("liberty") || name.includes("corner") || name.includes("bonuscard")) {
    return "liberty";
  }
  return "unknown";
}

export function detectFromExcelHeaders(headers: string[], filename: string): SourceKind {
  const name = filename.toLowerCase();
  if (looksLike(headers, ["transaktionsdatum", "kartennummer"]) || looksLike(headers, ["händlerkategorie"])) {
    return "swisscard";
  }
  if (looksLike(headers, ["datum", "karte", "betrag"]) || name.includes("liberty")) {
    return "liberty";
  }
  if (looksLike(headers, ["buchungsdatum"])) return "ubs";
  return detectFromCsvText(headers.join(";"), filename);
}
