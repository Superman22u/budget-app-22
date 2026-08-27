import { Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import { parseFile } from "./parsers";
import { matchCategory } from "./categorize";
import { sha256, transactionFingerprint } from "./fingerprint";
import type { ParseResult, SourceKind } from "./parsers/types";

export type ImportSummary = {
  filename: string;
  sourceKind: SourceKind;
  alreadyImported: boolean;
  importFileId: number;
  parsed: number;
  inserted: number;
  skipped: number;
  errors: string[];
  header: Record<string, unknown>;
};

export async function importStatement(filename: string, buffer: Buffer): Promise<ImportSummary> {
  const fileSha256 = sha256(buffer);
  const existing = await prisma.importFile.findUnique({ where: { fileSha256 } });
  if (existing) {
    return {
      filename: existing.filename,
      sourceKind: existing.sourceKind,
      alreadyImported: true,
      importFileId: existing.id,
      parsed: existing.insertedCount + existing.skippedCount,
      inserted: 0,
      skipped: existing.insertedCount + existing.skippedCount,
      errors: ["This exact file was already imported."],
      header: (existing.headerJson as Record<string, unknown>) ?? {},
    };
  }

  const parsed: ParseResult = await parseFile(buffer, filename);
  const [categories, rules] = await Promise.all([
    prisma.category.findMany(),
    prisma.categoryRule.findMany(),
  ]);

  const importFile = await prisma.importFile.create({
    data: {
      filename,
      sourceKind: parsed.sourceKind,
      fileSha256,
      headerJson: parsed.header as Prisma.InputJsonValue,
    },
  });

  let inserted = 0;
  let skipped = 0;
  const errors = [...parsed.errors];

  for (const tx of parsed.transactions) {
    const fingerprint = transactionFingerprint(parsed.sourceKind, tx);
    const found = await prisma.transaction.findUnique({ where: { fingerprint } });
    if (found) {
      skipped += 1;
      continue;
    }
    const categoryId = matchCategory({ tx, categories, rules });
    try {
      await prisma.transaction.create({
        data: {
          sourceId: importFile.id,
          bookingDate: new Date(`${tx.bookingDate}T00:00:00.000Z`),
          valueDate: tx.valueDate ? new Date(`${tx.valueDate}T00:00:00.000Z`) : null,
          currency: tx.currency,
          amount: new Prisma.Decimal(tx.amount.toFixed(2)),
          amountChf: tx.amountChf != null ? new Prisma.Decimal(tx.amountChf.toFixed(2)) : null,
          direction: tx.direction,
          description: tx.description,
          merchant: tx.merchant,
          cardLabel: tx.cardLabel,
          accountLabel: tx.accountLabel,
          externalId: tx.externalId,
          fingerprint,
          categoryId,
          rawJson: tx.raw as Prisma.InputJsonValue,
        },
      });
      inserted += 1;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("Unique constraint") || msg.includes("fingerprint")) {
        skipped += 1;
      } else {
        errors.push(msg);
      }
    }
  }

  await prisma.importFile.update({
    where: { id: importFile.id },
    data: {
      insertedCount: inserted,
      skippedCount: skipped,
      errorCount: errors.length,
    },
  });

  return {
    filename,
    sourceKind: parsed.sourceKind,
    alreadyImported: false,
    importFileId: importFile.id,
    parsed: parsed.transactions.length,
    inserted,
    skipped,
    errors,
    header: parsed.header,
  };
}
