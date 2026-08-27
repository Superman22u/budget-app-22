import { NextRequest, NextResponse } from "next/server";
import { importStatement } from "@/lib/import-statement";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const files = form.getAll("file").filter((f): f is File => f instanceof File);
  if (files.length === 0) {
    return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
  }

  const results = [];
  for (const file of files) {
    const buffer = Buffer.from(await file.arrayBuffer());
    try {
      results.push(await importStatement(file.name, buffer));
    } catch (err) {
      results.push({
        filename: file.name,
        sourceKind: "unknown",
        alreadyImported: false,
        importFileId: 0,
        parsed: 0,
        inserted: 0,
        skipped: 0,
        errors: [err instanceof Error ? err.message : String(err)],
        header: {},
      });
    }
  }

  return NextResponse.json({ results });
}
