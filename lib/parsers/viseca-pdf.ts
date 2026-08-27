import type { ParsedTransaction, ParseResult } from "./types";
import { chfAmount, parseAmount, parseDate, signedAmount } from "./types";

const SKIP_RE =
  /totalbetrag\s+letzte|total\s+karte|total\s+rechnungsbetrag|fälliger|falliger\s+mindest|information\s+zum|seite\s+\d|globallimite|zahlbar\s+bis|paynet|kontoinhaber|kartenlimite|datum\s+valuta/i;

const CARD_RE = /(\d{4}\s+\d{2}X{2}\s+X{4}\s+\d{4})/i;
const TX_RE =
  /^(\d{2}\.\d{2}\.\d{2})(?:\s+(\d{2}\.\d{2}\.\d{2}))?\s+(.+?)\s+([\d'’]+[.,]\d{2})\s*(-)?\s*$/;

export function decodeCidText(text: string): string {
  let out = "";
  for (const ch of text) {
    const code = ch.codePointAt(0) ?? 0;
    if (code >= 0xe000 && code <= 0xf8ff) {
      out += String.fromCharCode(code & 0xff);
    } else {
      out += ch;
    }
  }
  return out;
}

export function parseVisecaText(rawText: string): ParseResult {
  const text = decodeCidText(rawText).replace(/\r/g, "");
  const errors: string[] = [];
  const header: Record<string, unknown> = {};
  const transactions: ParsedTransaction[] = [];

  const account = text.match(/Kartenkontonummer\s+([0-9 ]{10,})/i);
  if (account) header.accountNumber = account[1].replace(/\s+/g, " ").trim();
  const billed = text.match(/Abrechnung vom\s+(\d{2}\.\d{2}\.\d{4})/i);
  if (billed) header.statementDate = billed[1];
  const holder = text.match(/Kontoinhaber\s+([^\n]+)/i);
  if (holder) header.accountHolder = holder[1].trim();
  header.issuer = "Viseca / Migros Bank Cumulus";

  const accountLabel = [header.issuer, header.accountNumber].filter(Boolean).join(" · ") as string;
  let currentCard: string | null = null;

  const lines = text
    .split("\n")
    .map((l) => l.replace(/\s+/g, " ").trim())
    .filter(Boolean);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const cardMatch = line.match(CARD_RE);
    if (cardMatch && /kreditkarte|cumulus/i.test(line) && !/kartenkonto/i.test(line) && !/^total/i.test(line)) {
      currentCard = cardMatch[1].replace(/\s+/g, " ");
      header.card = currentCard;
      continue;
    }
    if (SKIP_RE.test(line)) continue;

    const m = line.match(TX_RE);
    if (!m) continue;

    const bookingDate = parseDate(m[1]);
    const valueDate = m[2] ? parseDate(m[2]) : null;
    const rest = m[3].trim();
    const rawAmount = parseAmount(m[4]);
    const trailingMinus = m[5] === "-";
    if (!bookingDate || rawAmount == null) {
      errors.push(`Viseca line skipped: ${line}`);
      continue;
    }

    const isPayment = trailingMinus || /ihre zahlung/i.test(rest);
    const direction = isPayment ? "credit" : "debit";
    const amount = signedAmount(rawAmount, direction);

    let issuerCategory: string | null = null;
    const next = lines[i + 1];
    if (next && !TX_RE.test(next) && !SKIP_RE.test(next) && !CARD_RE.test(next) && next.length < 80) {
      issuerCategory = next;
      i += 1;
    }

    transactions.push({
      bookingDate,
      valueDate,
      currency: "CHF",
      amount,
      amountChf: chfAmount("CHF", amount),
      direction,
      description: rest,
      merchant: rest,
      cardLabel: currentCard,
      accountLabel,
      externalId: null,
      issuerCategory,
      raw: { line, issuerCategory, trailingMinus },
    });
  }

  const fallbackCard = (header.card as string | undefined) ?? null;
  if (fallbackCard) {
    for (const tx of transactions) {
      if (!tx.cardLabel) tx.cardLabel = fallbackCard;
    }
  }

  if (transactions.length === 0) {
    errors.push("No Viseca transactions found in PDF text");
  }

  return { sourceKind: "viseca", header, transactions, errors };
}
