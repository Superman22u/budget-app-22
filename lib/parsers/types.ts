export type SourceKind = "ubs" | "swisscard" | "viseca" | "liberty" | "unknown";

export type Direction = "debit" | "credit";

export type ParsedTransaction = {
  bookingDate: string;
  valueDate: string | null;
  currency: string;
  amount: number;
  amountChf: number | null;
  direction: Direction;
  description: string;
  merchant: string | null;
  cardLabel: string | null;
  accountLabel: string | null;
  externalId: string | null;
  issuerCategory: string | null;
  raw: Record<string, unknown>;
};

export type ParseResult = {
  sourceKind: SourceKind;
  header: Record<string, unknown>;
  transactions: ParsedTransaction[];
  errors: string[];
};

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function signedAmount(value: number, direction: Direction): number {
  const abs = Math.abs(value);
  return round2(direction === "debit" ? -abs : abs);
}

export function chfAmount(currency: string, amount: number, hint?: number | null): number | null {
  if (hint != null && Number.isFinite(hint)) return round2(hint);
  if (currency.toUpperCase() === "CHF") return round2(amount);
  return null;
}

export function parseAmount(raw: unknown): number | null {
  if (raw == null || raw === "") return null;
  if (typeof raw === "number" && Number.isFinite(raw)) return round2(raw);
  let s = String(raw).trim().replace(/\s/g, "").replace(/['’´]/g, "");
  if (!s || s === "-") return null;
  if (s.includes(",") && s.includes(".")) {
    if (s.lastIndexOf(",") > s.lastIndexOf(".")) {
      s = s.replace(/\./g, "").replace(",", ".");
    } else {
      s = s.replace(/,/g, "");
    }
  } else if ((s.match(/,/g) ?? []).length === 1 && /^\d+,\d{1,2}$/.test(s.replace(/^-/, ""))) {
    s = s.replace(",", ".");
  }
  const n = Number(s);
  return Number.isFinite(n) ? round2(n) : null;
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

export function ymd(year: number, month: number, day: number): string | null {
  if (year < 1990 || year > 2100 || month < 1 || month > 12 || day < 1 || day > 31) {
    return null;
  }
  return `${year}-${pad2(month)}-${pad2(day)}`;
}

function excelDateToYmd(d: Date): string | null {
  const shifted = new Date(d.getTime() - d.getTimezoneOffset() * 60_000);
  return ymd(shifted.getUTCFullYear(), shifted.getUTCMonth() + 1, shifted.getUTCDate());
}

export function parseDate(raw: unknown): string | null {
  if (raw == null || raw === "") return null;
  if (raw instanceof Date && !Number.isNaN(raw.getTime())) {
    return excelDateToYmd(raw);
  }
  if (typeof raw === "number" && raw > 20000 && raw < 90000) {
    const utc = new Date(Math.round((raw - 25569) * 86400 * 1000));
    return ymd(utc.getUTCFullYear(), utc.getUTCMonth() + 1, utc.getUTCDate());
  }
  const s = String(raw).trim();
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return ymd(Number(iso[1]), Number(iso[2]), Number(iso[3]));
  const dmy = s.match(/^(\d{1,2})[./](\d{1,2})[./](\d{2,4})$/);
  if (dmy) {
    let year = Number(dmy[3]);
    if (year < 100) year += year >= 70 ? 1900 : 2000;
    return ymd(year, Number(dmy[2]), Number(dmy[1]));
  }
  return null;
}

export function cellStr(raw: unknown): string {
  if (raw == null) return "";
  if (raw instanceof Date) return parseDate(raw) ?? "";
  return String(raw).trim();
}

export function joinParts(parts: Array<string | null | undefined>): string {
  return parts
    .map((p) => (p ?? "").replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .join(" · ");
}

export function normalizeHeader(name: string): string {
  return name.replace(/^\uFEFF/, "").trim();
}
