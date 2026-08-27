import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const from = req.nextUrl.searchParams.get("from");
    const to = req.nextUrl.searchParams.get("to");
    const sourceKind = req.nextUrl.searchParams.get("sourceKind");
    const card = req.nextUrl.searchParams.get("card")?.trim() ?? "";
    const where: Prisma.TransactionWhereInput = {
      amountChf: { not: null },
    };
    if (from || to) {
      where.bookingDate = {};
      if (from) where.bookingDate.gte = new Date(`${from}T00:00:00.000Z`);
      if (to) where.bookingDate.lte = new Date(`${to}T00:00:00.000Z`);
    }
    if (sourceKind) {
      where.source = { sourceKind: sourceKind as Prisma.EnumSourceKindFilter["equals"] };
    }
    if (card) where.cardLabel = { contains: card };

    const rows = await prisma.transaction.findMany({
    where,
    select: {
      bookingDate: true,
      amountChf: true,
      direction: true,
      category: { select: { id: true, name: true, color: true, slug: true } },
      source: { select: { sourceKind: true } },
      cardLabel: true,
    },
  });

  const byCategory = new Map<string, { name: string; color: string; debit: number; credit: number }>();
  const byMonth = new Map<string, { debit: number; credit: number }>();
  const bySource = new Map<string, { debit: number; credit: number }>();

  for (const row of rows) {
    const chf = Number(row.amountChf ?? 0);
    const debit = chf < 0 ? Math.abs(chf) : 0;
    const credit = chf > 0 ? chf : 0;
    const catName = row.category?.name ?? "Uncategorized";
    const catColor = row.category?.color ?? "#78716c";
    const cat = byCategory.get(catName) ?? { name: catName, color: catColor, debit: 0, credit: 0 };
    cat.debit += debit;
    cat.credit += credit;
    byCategory.set(catName, cat);

    const month = row.bookingDate.toISOString().slice(0, 7);
    const m = byMonth.get(month) ?? { debit: 0, credit: 0 };
    m.debit += debit;
    m.credit += credit;
    byMonth.set(month, m);

    const src = row.source.sourceKind;
    const s = bySource.get(src) ?? { debit: 0, credit: 0 };
    s.debit += debit;
    s.credit += credit;
    bySource.set(src, s);
  }

  return NextResponse.json({
    byCategory: [...byCategory.values()].sort((a, b) => b.debit - a.debit),
    byMonth: [...byMonth.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, v]) => ({ month, ...v })),
    bySource: [...bySource.entries()].map(([sourceKind, v]) => ({ sourceKind, ...v })),
  });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
