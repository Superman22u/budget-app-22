import type { ParsedTransaction, ParseResult } from "./types";
import { cellStr, chfAmount, joinParts, parseAmount, parseDate, signedAmount } from "./types";

function rowRecord(headers: string[], cells: unknown[]): Record<string, unknown> {
  const rec: Record<string, unknown> = {};
  headers.forEach((h, i) => {
    rec[h] = cells[i] ?? "";
  });
  return rec;
}

export function parseUbsCsv(text: string): ParseResult {
  const errors: string[] = [];
  const header: Record<string, unknown> = {};
  const lines = text.replace(/^\uFEFF/, "").split(/\r?\n/);

  let headerIndex = -1;
  for (let i = 0; i < Math.min(lines.length, 20); i++) {
    const cols = lines[i].split(";");
    const first = (cols[0] ?? "").replace(/:$/, "").trim();
    if (["Kontonummer", "IBAN", "Von", "Bis", "Anfangssaldo", "Schlusssaldo", "Bewertet in", "Anzahl Transaktionen in diesem Zeitraum"].includes(first)) {
      header[first] = (cols[1] ?? "").trim();
    }
    if (cols.some((c) => c.trim() === "Buchungsdatum") && cols.some((c) => c.includes("Belastung") || c.includes("Gutschrift"))) {
      headerIndex = i;
      break;
    }
  }

  if (headerIndex < 0) {
    return { sourceKind: "ubs", header, transactions: [], errors: ["UBS header row with Buchungsdatum not found"] };
  }

  const headers = lines[headerIndex].split(";").map((h) => h.trim().replace(/:$/, ""));
  const transactions: ParsedTransaction[] = [];
  const accountLabel = [cellStr(header.IBAN), cellStr(header.Kontonummer)].filter(Boolean).join(" · ") || null;

  for (let i = headerIndex + 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;
    const cells = parseSemiRow(line);
    const rec = rowRecord(headers, cells);
    const bookingDate = parseDate(rec["Buchungsdatum"] ?? rec["Abschlussdatum"]);
    if (!bookingDate) {
      if (cellStr(rec["Buchungsdatum"])) errors.push(`Row ${i + 1}: could not parse date`);
      continue;
    }
    const desc1 = cellStr(rec["Beschreibung1"]);
    if (/^saldovortrag$/i.test(desc1)) continue;

    const debit = parseAmount(rec["Belastung"]);
    const credit = parseAmount(rec["Gutschrift"]);
    let direction: "debit" | "credit";
    let value: number;
    if (debit != null && debit !== 0) {
      direction = "debit";
      value = debit;
    } else if (credit != null && credit !== 0) {
      direction = "credit";
      value = credit;
    } else {
      const single = parseAmount(rec["Einzelbetrag"]);
      if (single == null || single === 0) {
        errors.push(`Row ${i + 1}: no amount`);
        continue;
      }
      direction = single < 0 ? "debit" : "credit";
      value = single;
    }

    const amount = signedAmount(value, direction);
    const currency = cellStr(rec["Währung"]) || cellStr(header["Bewertet in"]) || "CHF";
    const description = joinParts([
      cellStr(rec["Beschreibung1"]),
      cellStr(rec["Beschreibung2"]),
      cellStr(rec["Beschreibung3"]),
    ]);

    transactions.push({
      bookingDate,
      valueDate: parseDate(rec["Valutadatum"]),
      currency,
      amount,
      amountChf: chfAmount(currency, amount),
      direction,
      description,
      merchant: cellStr(rec["Beschreibung1"]) || null,
      cardLabel: null,
      accountLabel,
      externalId: cellStr(rec["Transaktions-Nr."]) || null,
      issuerCategory: cellStr(rec["Beschreibung2"]) || null,
      raw: rec,
    });
  }

  return { sourceKind: "ubs", header, transactions, errors };
}

function parseSemiRow(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ";" && !inQuotes) {
      out.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out;
}
