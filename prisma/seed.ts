import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const categories: Array<{
  name: string;
  slug: string;
  color: string;
  sortOrder: number;
}> = [
  { name: "Groceries", slug: "groceries", color: "#3f6b3a", sortOrder: 10 },
  { name: "Restaurant", slug: "restaurant", color: "#b45309", sortOrder: 20 },
  { name: "Beer / bars", slug: "beer", color: "#92400e", sortOrder: 30 },
  { name: "Parking", slug: "parking", color: "#57534e", sortOrder: 40 },
  { name: "Transport", slug: "transport", color: "#1e3a5f", sortOrder: 50 },
  { name: "Insurance", slug: "insurance", color: "#0f4c5c", sortOrder: 60 },
  { name: "Housing", slug: "housing", color: "#44403c", sortOrder: 70 },
  { name: "Health", slug: "health", color: "#9f1239", sortOrder: 80 },
  { name: "Salary", slug: "salary", color: "#166534", sortOrder: 90 },
  { name: "Transfers", slug: "transfers", color: "#57534e", sortOrder: 100 },
  { name: "Shopping", slug: "shopping", color: "#6b21a8", sortOrder: 110 },
  { name: "Subscriptions", slug: "subscriptions", color: "#1e3a8a", sortOrder: 120 },
  { name: "Travel", slug: "travel", color: "#0e7490", sortOrder: 130 },
  { name: "Utilities", slug: "utilities", color: "#365314", sortOrder: 140 },
  { name: "Uncategorized", slug: "uncategorized", color: "#78716c", sortOrder: 999 },
];

const rules: Array<{ slug: string; pattern: string; priority: number }> = [
  { slug: "salary", pattern: "salär", priority: 10 },
  { slug: "salary", pattern: "salaer", priority: 10 },
  { slug: "transfers", pattern: "ihre zahlung", priority: 10 },
  { slug: "transfers", pattern: "viseca payment", priority: 15 },
  { slug: "transfers", pattern: "swisscard", priority: 15 },
  { slug: "transfers", pattern: "cornèr bank", priority: 15 },
  { slug: "transfers", pattern: "corner bank", priority: 15 },
  { slug: "transfers", pattern: "bonuscard", priority: 15 },
  { slug: "transfers", pattern: "revolut", priority: 20 },
  { slug: "insurance", pattern: "swica", priority: 20 },
  { slug: "insurance", pattern: "pax", priority: 20 },
  { slug: "health", pattern: "zahnarzt", priority: 20 },
  { slug: "health", pattern: "apodro", priority: 20 },
  { slug: "health", pattern: "kinderspital", priority: 20 },
  { slug: "housing", pattern: "stweg", priority: 20 },
  { slug: "housing", pattern: "gemeinde bubikon", priority: 20 },
  { slug: "utilities", pattern: "elektrizitätsgenossenschaft", priority: 20 },
  { slug: "utilities", pattern: "repower", priority: 20 },
  { slug: "parking", pattern: "parkingpay", priority: 20 },
  { slug: "beer", pattern: "safari bar", priority: 20 },
  { slug: "beer", pattern: "ebrietas", priority: 20 },
  { slug: "beer", pattern: "bar kobel", priority: 20 },
  { slug: "restaurant", pattern: "brasserie", priority: 25 },
  { slug: "restaurant", pattern: "pizzeria", priority: 25 },
  { slug: "restaurant", pattern: "kebab", priority: 25 },
  { slug: "restaurant", pattern: "restaurant", priority: 40 },
  { slug: "groceries", pattern: "coop", priority: 30 },
  { slug: "groceries", pattern: "migros", priority: 30 },
  { slug: "groceries", pattern: "denner", priority: 30 },
  { slug: "groceries", pattern: "lidl", priority: 30 },
  { slug: "groceries", pattern: "volg", priority: 30 },
  { slug: "groceries", pattern: "landi", priority: 30 },
  { slug: "shopping", pattern: "h & m", priority: 30 },
  { slug: "shopping", pattern: "manor", priority: 30 },
  { slug: "shopping", pattern: "foot locker", priority: 30 },
  { slug: "subscriptions", pattern: "netflix", priority: 20 },
  { slug: "subscriptions", pattern: "google", priority: 30 },
  { slug: "transport", pattern: "sbb", priority: 20 },
  { slug: "travel", pattern: "grand resort", priority: 20 },
];

async function main() {
  for (const cat of categories) {
    await prisma.category.upsert({
      where: { slug: cat.slug },
      create: cat,
      update: { name: cat.name, color: cat.color, sortOrder: cat.sortOrder },
    });
  }

  const all = await prisma.category.findMany();
  const bySlug = new Map(all.map((c) => [c.slug, c.id]));
  await prisma.categoryRule.deleteMany();
  await prisma.categoryRule.createMany({
    data: rules.map((r) => ({
      matchType: "contains" as const,
      pattern: r.pattern,
      priority: r.priority,
      categoryId: bySlug.get(r.slug)!,
    })),
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (err) => {
    console.error(err);
    await prisma.$disconnect();
    process.exit(1);
  });
