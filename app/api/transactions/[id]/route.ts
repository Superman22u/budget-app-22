import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const body = (await req.json()) as {
    categoryId?: number | null;
    saveRule?: boolean;
    rulePattern?: string;
  };

  const tx = await prisma.transaction.update({
    where: { id: Number(id) },
    data: {
      categoryId: body.categoryId === undefined ? undefined : body.categoryId,
      categoryLocked: true,
    },
    include: { category: true },
  });

  if (body.saveRule && body.categoryId && body.rulePattern?.trim()) {
    await prisma.categoryRule.create({
      data: {
        matchType: "contains",
        pattern: body.rulePattern.trim(),
        priority: 5,
        categoryId: body.categoryId,
      },
    });
  }

  return NextResponse.json({ transaction: tx });
}
