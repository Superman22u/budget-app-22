"use client";

import { useState } from "react";

type Result = {
  filename: string;
  sourceKind: string;
  alreadyImported: boolean;
  parsed: number;
  inserted: number;
  skipped: number;
  errors: string[];
  header: Record<string, unknown>;
};

export default function ImportPage() {
  const [over, setOver] = useState(false);
  const [busy, setBusy] = useState(false);
  const [results, setResults] = useState<Result[]>([]);

  async function send(files: FileList | File[]) {
    const list = [...files];
    if (list.length === 0) return;
    setBusy(true);
    const form = new FormData();
    for (const f of list) form.append("file", f);
    const res = await fetch("/api/import", { method: "POST", body: form });
    const json = await res.json();
    setResults(json.results ?? []);
    setBusy(false);
  }

  return (
    <>
      <h1 className="text-3xl tracking-tight mb-1">Import statements</h1>
      <p className="muted mb-4">
        Drop UBS CSV, Swisscard CSV/XLSX, Liberty XLS, or Viseca PDF. Overlapping downloads are skipped by fingerprint.
      </p>
      <div
        className={`drop ${over ? "over" : ""}`}
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          void send(e.dataTransfer.files);
        }}
      >
        <p className="display text-xl mb-2">Drop files here</p>
        <p className="muted mb-3">or choose from disk</p>
        <input
          type="file"
          multiple
          accept=".csv,.xls,.xlsx,.pdf"
          onChange={(e) => e.target.files && void send(e.target.files)}
        />
        {busy ? <p className="muted mt-3">Reading…</p> : null}
      </div>

      {results.map((r) => (
        <div key={r.filename} className="card" style={{ marginTop: "1rem" }}>
          <h2 className="text-xl mb-1">{r.filename}</h2>
          <p className="muted">
            Detected as <strong>{r.sourceKind}</strong>
            {r.alreadyImported ? " · already imported" : ""}
          </p>
          <div className="kpis">
            <div>
              Parsed<b>{r.parsed}</b>
            </div>
            <div>
              Inserted<b>{r.inserted}</b>
            </div>
            <div>
              Duplicates skipped<b>{r.skipped}</b>
            </div>
          </div>
          {Object.keys(r.header ?? {}).length > 0 ? (
            <pre className="muted" style={{ whiteSpace: "pre-wrap", fontSize: "0.8rem" }}>
              {JSON.stringify(r.header, null, 2)}
            </pre>
          ) : null}
          {r.errors?.length ? (
            <ul className="debit">
              {r.errors.map((e) => (
                <li key={e}>{e}</li>
              ))}
            </ul>
          ) : null}
        </div>
      ))}
    </>
  );
}
