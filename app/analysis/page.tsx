"use client";

import { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type Analysis = {
  byCategory: Array<{ name: string; color: string; debit: number; credit: number }>;
  byMonth: Array<{ month: string; debit: number; credit: number }>;
  bySource: Array<{ sourceKind: string; debit: number; credit: number }>;
};

export default function AnalysisPage() {
  const [data, setData] = useState<Analysis | null>(null);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [sourceKind, setSourceKind] = useState("");
  const [card, setCard] = useState("");
  const [cards, setCards] = useState<string[]>([]);

  useEffect(() => {
    void fetch("/api/transactions")
      .then((r) => r.json())
      .then((json) => setCards(json.cards ?? []));
  }, []);

  useEffect(() => {
    const params = new URLSearchParams();
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    if (sourceKind) params.set("sourceKind", sourceKind);
    if (card) params.set("card", card);
    void fetch(`/api/analysis?${params}`)
      .then((r) => r.json())
      .then(setData);
  }, [from, to, sourceKind, card]);

  const spend = data?.byCategory.reduce((s, c) => s + c.debit, 0) ?? 0;
  const income = data?.byCategory.reduce((s, c) => s + c.credit, 0) ?? 0;

  return (
    <>
      <h1 className="text-3xl tracking-tight mb-1">Analysis</h1>
      <p className="muted mb-4">CHF spend by category, month, and source. Filter by date, card, or issuer.</p>
      <div className="filters">
        <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
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
      </div>
      <div className="kpis">
        <div className="card">
          Spend<b className="debit">{fmt(spend)}</b>
        </div>
        <div className="card">
          Income / credits<b className="credit">{fmt(income)}</b>
        </div>
        <div className="card">
          Net<b className={income - spend >= 0 ? "credit" : "debit"}>{fmt(income - spend)}</b>
        </div>
      </div>

      <div className="card" style={{ marginBottom: "1rem", height: 320 }}>
        <h2 className="mb-2">By month</h2>
        <ResponsiveContainer width="100%" height="90%">
          <BarChart data={data?.byMonth ?? []}>
            <CartesianGrid stroke="#efe8db" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="debit" fill="#9b2c2c" name="Spend" />
            <Bar dataKey="credit" fill="#2f5d3a" name="Credit" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="card" style={{ marginBottom: "1rem", height: 380 }}>
        <h2 className="mb-2">By category (spend)</h2>
        <ResponsiveContainer width="100%" height="90%">
          <BarChart data={data?.byCategory ?? []} layout="vertical" margin={{ left: 80 }}>
            <CartesianGrid stroke="#efe8db" />
            <XAxis type="number" />
            <YAxis type="category" dataKey="name" width={110} />
            <Tooltip />
            <Bar dataKey="debit" fill="#2f5d3a" name="Spend CHF" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="card" style={{ height: 280 }}>
        <h2 className="mb-2">By source</h2>
        <ResponsiveContainer width="100%" height="90%">
          <BarChart data={data?.bySource ?? []}>
            <CartesianGrid stroke="#efe8db" />
            <XAxis dataKey="sourceKind" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="debit" fill="#9b2c2c" name="Spend" />
            <Bar dataKey="credit" fill="#2f5d3a" name="Credit" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </>
  );
}

function fmt(n: number): string {
  return n.toLocaleString("de-CH", { style: "currency", currency: "CHF" });
}
