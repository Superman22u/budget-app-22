import { parse } from "csv-parse/sync";
import type { ParsedTransaction, ParseResult } from "./types";
import { cellStr, chfAmount, joinParts, parseAmount, parseDate, signedAmount } from "./types";

function asRecords(rows: unknown[]): Record<string, unknown>[] {
  return rows as Record<string, unknown>[];
}

export function parseSwisscardCsv(text: string): ParseResult {
  const errors: string[] = [];
  let records: Record<string, unknown>[] = [];
  try {
    records = asRecords(
      parse(text, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
        relax_quotes: true,
        bom: true,
      }),
    );
  } catch (err) {
    return {
      sourceKind: "swisscard",
      header: {},
      transactions: [],
      errors: [`Swisscard CSV parse failed: ${err instanceof Error ? err.message : String(err)}`],
    };
  }

  return fromSwisscardRecords(records, errors);
}

export function fromSwisscardRecords(
  records: Record<string, unknown>[],
  errors: string[] = [],
): ParseResult {
  const transactions: ParsedTransaction[] = [];
  const cards = new Set<string>();

  for (const rec of records) {
    const bookingDate = parseDate(rec["Transaktionsdatum"]);
    if (!bookingDate) {
      errors.push("Swisscard row skipped: missing date");
      continue;
    }
    const rawAmount = parseAmount(rec["Betrag"]);
    if (rawAmount == null) {
      errors.push(`Swisscard ${bookingDate}: missing amount`);
      continue;
    }
    const dk = cellStr(rec["Debit/Kredit"]).toLowerCase();
    const direction = dk.includes("gutschrift") || dk.includes("credit") ? "credit" : "debit";
    const amount = signedAmount(rawAmount, direction);
    const currency = cellStr(rec["Währung"]) || "CHF";
    const fxAmount = parseAmount(rec["Betrag in Fremdwährung"]);
    const fxCurrency = cellStr(rec["Fremdwährung"]) || null;
    const card = cellStr(rec["Kartennummer"]) || null;
    if (card) cards.add(card);
    const issuerCategory = joinParts([cellStr(rec["Händlerkategorie"]), cellStr(rec["Registrierte Kategorie"])]) || null;

    let amountChf: number | null;
    if (currency.toUpperCase() === "CHF") {
      amountChf = amount;
    } else if (fxCurrency?.toUpperCase() === "CHF" && fxAmount != null) {
      amountChf = signedAmount(fxAmount, direction);
    } else {
      amountChf = chfAmount(currency, amount);
    }

    transactions.push({
      bookingDate,
      valueDate: null,
      currency,
      amount,
      amountChf,
      direction,
      description: cellStr(rec["Beschreibung"]) || cellStr(rec["Händler"]),
      merchant: cellStr(rec["Händler"]) || null,
      cardLabel: card,
      accountLabel: "Swisscard",
      externalId: null,
      issuerCategory,
      raw: rec,
    });
  }

  return {
    sourceKind: "swisscard",
    header: { cards: [...cards] },
    transactions,
    errors,
  };
}
