import type { ParsedTransaction, ParseResult } from "./types";
import { cellStr, chfAmount, parseAmount, parseDate, signedAmount } from "./types";

export function parseLibertyRows(records: Record<string, unknown>[]): ParseResult {
  const errors: string[] = [];
  const transactions: ParsedTransaction[] = [];
  const cards = new Set<string>();

  for (const rec of records) {
    const bookingDate = parseDate(rec["Datum"]);
    if (!bookingDate) continue;
    const rawAmount = parseAmount(rec["Betrag"]);
    if (rawAmount == null) {
      errors.push(`Liberty ${bookingDate}: missing amount`);
      continue;
    }
    const direction = rawAmount < 0 ? "credit" : "debit";
    const amount = signedAmount(rawAmount, direction);
    const currency = cellStr(rec["Währung"] ?? rec["Wahrung"]) || "CHF";
    const card = cellStr(rec["Karte"]) || null;
    if (card) cards.add(card);
    const description = cellStr(rec["Beschreibung"]);

    transactions.push({
      bookingDate,
      valueDate: null,
      currency,
      amount,
      amountChf: chfAmount(currency, amount),
      direction,
      description,
      merchant: description || null,
      cardLabel: card,
      accountLabel: "Liberty / Corner Bonuscard",
      externalId: null,
      issuerCategory: cellStr(rec["Status"]) || null,
      raw: rec,
    });
  }

  return {
    sourceKind: "liberty",
    header: { cards: [...cards] },
    transactions,
    errors,
  };
}
