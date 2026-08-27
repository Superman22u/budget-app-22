"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table";

type Category = { id: number; name: string; slug: string; color: string | null };
type Tx = {
  id: number;
  bookingDate: string;
  currency: string;
  amount: string;
  amountChf: string | null;
  direction: "debit" | "credit";
  description: string;
  merchant: string | null;
  cardLabel: string | null;
  accountLabel: string | null;
  categoryId: number | null;
  category: Category | null;
  source: { filename: string; sourceKind: string };
};

export function TransactionBoard() {
  const [rows, setRows] = useState<Tx[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [cards, setCards] = useState<string[]>([]);
  const [q, setQ] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [sourceKind, setSourceKind] = useState("");
  const [direction, setDirection] = useState("");
  const [card, setCard] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [saveAsRule, setSaveAsRule] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sorting, setSorting] = useState<SortingState>([{ id: "bookingDate", desc: true }]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (categoryId) params.set("categoryId", categoryId);
    if (sourceKind) params.set("sourceKind", sourceKind);
    if (direction) params.set("direction", direction);
    if (card) params.set("card", card);
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    try {
      const [txRes, catRes] = await Promise.all([
        fetch(`/api/transactions?${params}`),
        fetch("/api/categories"),
      ]);
      if (!txRes.ok) {
        const body = await txRes.text();
        throw new Error(body.slice(0, 300) || txRes.statusText);
      }
      const txJson = await txRes.json();
      const catJson = await catRes.json();
      setRows(txJson.transactions ?? []);
      setCards(txJson.cards ?? []);
      setCategories(catJson.categories ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [q, categoryId, sourceKind, direction, card, from, to]);

  useEffect(() => {
    void load();
  }, [load]);

  const setCategory = useCallback(
    async (row: Tx, nextId: number) => {
      const pattern = (row.merchant || row.description || "").slice(0, 80);
      await fetch(`/api/transactions/${row.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          categoryId: nextId,
          saveRule: saveAsRule && Boolean(pattern.trim()),
          rulePattern: pattern,
        }),
      });
      setRows((cur) =>
        cur.map((r) =>
          r.id === row.id
            ? { ...r, categoryId: nextId, category: categories.find((c) => c.id === nextId) ?? r.category }
            : r,
        ),
      );
    },
    [categories, saveAsRule],
  );

  const columns = useMemo<ColumnDef<Tx>[]>(
    () => [
      {
        accessorKey: "bookingDate",
        header: "Booking",
        cell: (info) => <span className="num">{info.getValue<string>()}</span>,
      },
      {
        id: "description",
        accessorKey: "description",
        header: "Description",
        cell: (info) => (
          <div>
            <div>{info.row.original.description}</div>
            <div className="muted" style={{ fontSize: "0.75rem" }}>
              {info.row.original.source.filename}
            </div>
          </div>
        ),
      },
      {
        accessorKey: "amountChf",
        header: "CHF",
        sortingFn: (a, b) => Number(a.original.amountChf ?? 0) - Number(b.original.amountChf ?? 0),
        cell: (info) => {
          const v = info.getValue<string | null>();
          return <span className={Number(v) < 0 ? "debit" : "credit"}>{fmt(v)}</span>;
        },
      },
      {
        accessorKey: "amount",
        header: "Amount",
        sortingFn: (a, b) => Number(a.original.amount) - Number(b.original.amount),
        cell: (info) => (
          <span className="num">
            {info.row.original.currency} {fmt(info.getValue<string>())}
          </span>
        ),
      },
      {
        accessorKey: "direction",
        header: "Dr/Cr",
        cell: (info) => <span className="chip">{info.getValue<string>()}</span>,
      },
      {
        accessorKey: "cardLabel",
        header: "Card",
        cell: (info) => info.getValue<string | null>() ?? "—",
      },
      {
        id: "category",
        accessorFn: (row) => row.category?.name ?? "",
        header: "Category",
        cell: (info) => (
          <select
            value={info.row.original.categoryId ?? ""}
            onChange={(e) => void setCategory(info.row.original, Number(e.target.value))}
          >
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        ),
      },
      {
        id: "sourceKind",
        accessorFn: (row) => row.source.sourceKind,
        header: "Source",
        cell: (info) => <span className="chip">{info.getValue<string>()}</span>,
      },
    ],
    [categories, setCategory],
  );

  const table = useReactTable({
    data: rows,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
    <div>
      <div className="filters">
        <input placeholder="Search description…" value={q} onChange={(e) => setQ(e.target.value)} />
        <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <select value={sourceKind} onChange={(e) => setSourceKind(e.target.value)}>
          <option value="">All sources</option>
          {["ubs", "swisscard", "liberty", "viseca"].map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <select value={card} onChange={(e) => setCard(e.target.value)}>
          <option value="">All cards</option>
          {cards.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <select value={direction} onChange={(e) => setDirection(e.target.value)}>
          <option value="">Debit & credit</option>
          <option value="debit">Debit</option>
          <option value="credit">Credit</option>
        </select>
        <label className="muted" style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <input type="checkbox" checked={saveAsRule} onChange={(e) => setSaveAsRule(e.target.checked)} />
          Save merchant as rule
        </label>
      </div>

      {error ? (
        <div className="card debit" style={{ marginBottom: "1rem" }}>
          Could not load transactions. Create the MariaDB database and set DATABASE_URL in .env (see README).
          <pre style={{ whiteSpace: "pre-wrap", color: "inherit" }}>{error}</pre>
        </div>
      ) : null}

      <div className="card" style={{ overflowX: "auto" }}>
        {loading ? <p className="muted">Loading…</p> : null}
        <table className="ledger">
          <thead>
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id}>
                {hg.headers.map((header) => (
                  <th key={header.id} onClick={header.column.getToggleSortingHandler()}>
                    {flexRender(header.column.columnDef.header, header.getContext())}
                    {header.column.getIsSorted() === "asc"
                      ? " ↑"
                      : header.column.getIsSorted() === "desc"
                        ? " ↓"
                        : ""}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => (
              <tr key={row.id}>
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {!loading && rows.length === 0 ? <p className="muted">No transactions yet. Import a statement first.</p> : null}
      </div>
    </div>
  );
}

function fmt(n: string | null): string {
  if (n == null || n === "") return "—";
  const v = Number(n);
  if (!Number.isFinite(v)) return n;
  return v.toLocaleString("de-CH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
