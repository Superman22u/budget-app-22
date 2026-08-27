import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import { decodeCidText } from "./viseca-pdf";

type TextItem = {
  str?: string;
  transform?: number[];
};

export async function extractPdfText(buffer: Buffer): Promise<string> {
  const loadingTask = getDocument({
    data: new Uint8Array(buffer),
    disableWorker: true,
    isEvalSupported: false,
    useSystemFonts: true,
    verbosity: 0,
  });
  const pdf = await loadingTask.promise;
  const pages: string[] = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const rows: { y: number; parts: { x: number; str: string }[] }[] = [];

    for (const raw of content.items) {
      const item = raw as TextItem;
      if (!item.str || !item.transform) continue;
      const x = item.transform[4] ?? 0;
      const y = Math.round((item.transform[5] ?? 0) * 2) / 2;
      const str = decodeCidText(item.str);
      if (!str.trim()) {
        continue;
      }
      let row = rows.find((r) => Math.abs(r.y - y) < 3);
      if (!row) {
        row = { y, parts: [] };
        rows.push(row);
      }
      row.parts.push({ x, str });
    }

    rows.sort((a, b) => b.y - a.y);
    pages.push(
      rows
        .map((r) =>
          r.parts
            .sort((a, b) => a.x - b.x)
            .map((p) => p.str)
            .join(" ")
            .replace(/\s+/g, " ")
            .trim(),
        )
        .filter(Boolean)
        .join("\n"),
    );
  }

  return pages.join("\n");
}
