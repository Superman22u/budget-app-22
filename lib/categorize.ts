import type { Category, CategoryRule } from "@prisma/client";
import type { ParsedTransaction } from "./parsers/types";

export type RuleInput = Pick<CategoryRule, "matchType" | "pattern" | "priority" | "categoryId">;
export type CategoryInput = Pick<Category, "id" | "slug" | "name">;

const ISSUER_HINTS: Array<{ pattern: RegExp; slug: string }> = [
  { pattern: /bars?,\s*lounges|bar\b|lounge/i, slug: "beer" },
  { pattern: /eating places|restaurants?|gastronomie|pizzeria/i, slug: "restaurant" },
  { pattern: /grocery|supermarket|lebensmittel|supermärkte|supermarke/i, slug: "groceries" },
  { pattern: /lodging|hotel|reisen/i, slug: "travel" },
  { pattern: /drug store|pharmac/i, slug: "health" },
  { pattern: /computer software|computersoftware/i, slug: "subscriptions" },
  { pattern: /zahlungen|money transfer|finanzen/i, slug: "transfers" },
  { pattern: /sporting goods|unterhaltung/i, slug: "shopping" },
];

export function matchCategory(opts: {
  tx: ParsedTransaction;
  categories: CategoryInput[];
  rules: RuleInput[];
}): number | null {
  const bySlug = new Map(opts.categories.map((c) => [c.slug, c.id]));
  const hay = `${opts.tx.description}\n${opts.tx.merchant ?? ""}\n${opts.tx.issuerCategory ?? ""}`;

  const sorted = [...opts.rules].sort((a, b) => a.priority - b.priority);
  for (const rule of sorted) {
    try {
      const hit =
        rule.matchType === "regex"
          ? new RegExp(rule.pattern, "i").test(hay)
          : hay.toLowerCase().includes(rule.pattern.toLowerCase());
      if (hit) return rule.categoryId;
    } catch {
      continue;
    }
  }

  if (opts.tx.issuerCategory) {
    for (const hint of ISSUER_HINTS) {
      if (hint.pattern.test(opts.tx.issuerCategory)) {
        const id = bySlug.get(hint.slug);
        if (id) return id;
      }
    }
  }

  return bySlug.get("uncategorized") ?? null;
}
