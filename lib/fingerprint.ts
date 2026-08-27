import { createHash } from "crypto";
import type { ParsedTransaction, SourceKind } from "./parsers/types";

export function sha256(input: string | Buffer): string {
  return createHash("sha256").update(input).digest("hex");
}

function norm(value: string | null | undefined): string {
  return (value ?? "").toLowerCase().replace(/\s+/g, " ").trim();
}

export function transactionFingerprint(sourceKind: SourceKind, tx: ParsedTransaction): string {
  if (tx.externalId) {
    return sha256(`${sourceKind}|id|${tx.externalId}`);
  }
  return sha256(
    [
      sourceKind,
      tx.bookingDate,
      tx.amount.toFixed(2),
      tx.currency.toUpperCase(),
      norm(tx.description),
      norm(tx.cardLabel),
      norm(tx.accountLabel),
    ].join("|"),
  );
}
