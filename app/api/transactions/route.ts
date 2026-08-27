import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

function dec(value: Prisma.Decimal | null | undefined): string | null {
  return value == null ? null : value.toFixed(2);
}

export async function GET(req: NextRequest) {
  try {
    const url = req.nextUrl.searchParams;
    const q = url.get("q")?.trim() ?? "";
    const categoryId = url.get("categoryId");
    const sourceKind = url.get("sourceKind");
    const direction = url.get("direction");
    const card = url.get("card")?.trim() ?? "";
    const from = url.get("from");
    const to = url.get("to");
    const sort = url.get("sort") ?? "bookingDate";
    const dir = url.get("dir") === "asc" ? "asc" : "desc";

    const where: Prisma.TransactionWhereInput = {};
    if (q) {
      where.OR = [
        { description: { contains: q } },
        { merchant: { contains: q } },
        { cardLabel: { contains: q } },
        { accountLabel: { contains: q } },
        { externalId: { contains: q } },
      ];
    }
    if (categoryId === "none") where.categoryId = null;
    else if (categoryId) where.categoryId = Number(categoryId);
    if (sourceKind) where.source = { sourceKind: sourceKind as Prisma.EnumSourceKindFilter["equals"] };
    if (direction === "debit" || direction === "credit") where.direction = direction;
    if (card) where.cardLabel = { contains: card };
    if (from || to) {
      where.bookingDate = {};
      if (from) where.bookingDate.gte = new Date(`${from}T00:00:00.000Z`);
      if (to) where.bookingDate.lte = new Date(`${to}T00:00:00.000Z`);
    }

  const sortable = new Set([
    "bookingDate",
    "amount",
    "amountChf",
    "currency",
    "direction",
    "description",
    "merchant",
    "cardLabel",
    "accountLabel",
  ]);
  const orderBy = sortable.has(sort) ? { [sort]: dir } : { bookingDate: "desc" as const };

    const [rows, cardRows] = await Promise.all([
      prisma.transaction.findMany({
        where,
        orderBy,
        include: {
          category: true,
          source: { select: { filename: true, sourceKind: true, importedAt: true } },
        },
        take: 5000,
      }),
      prisma.transaction.findMany({
        where: { cardLabel: { not: null } },
        distinct: ["cardLabel"],
        select: { cardLabel: true },
      }),
    ]);

    return NextResponse.json({
      cards: cardRows.map((c) => c.cardLabel).filter((c): c is string => Boolean(c)),
      transactions: rows.map((t) => ({
      id: t.id,
      bookingDate: t.bookingDate.toISOString().slice(0, 10),
      valueDate: t.valueDate ? t.valueDate.toISOString().slice(0, 10) : null,
      currency: t.currency,
      amount: dec(t.amount),
      amountChf: dec(t.amountChf),
      direction: t.direction,
      description: t.description,
      merchant: t.merchant,
      cardLabel: t.cardLabel,
      accountLabel: t.accountLabel,
      externalId: t.externalId,
      categoryId: t.categoryId,
      category: t.category,
      categoryLocked: t.categoryLocked,
      source: t.source,
    })),
  });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
