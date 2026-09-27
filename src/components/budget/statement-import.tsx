import { useState, type ChangeEvent } from "react";
import { Eye, EyeOff, FileUp, LockKeyhole } from "lucide-react";
import { ResetDataButton } from "@/components/budget/reset-data-button";
import { formatDay, type Transaction } from "@/lib/budget/model";
import { importStatementTransactions, loadLedger } from "@/lib/budget/ledger";
import { ledgerRequestSignal, useBudget } from "@/lib/budget/store";
import { extractStatement, type StatementRow } from "@/lib/budget/statement-parser";
import { classifyStatementText } from "@/lib/budget/statement-categories";

function extractStatementCounterparty(description: string): string {
  const parts = description.split("/").map((part) => part.trim()).filter(Boolean);
  const rail = (parts[0] ?? "").toUpperCase();
  if (rail === "UPI") return (parts[3] || parts[2] || "").slice(0, 60) || description.slice(0, 60);
  if (["IMPS", "NEFT", "RTGS", "IFT"].includes(rail)) return (parts[2] || parts[1] || "").slice(0, 60) || description.slice(0, 60);
  return (parts[2] || parts[1] || "").slice(0, 60) || description.slice(0, 60);
}

async function asTransaction(row: StatementRow, bank: string): Promise<Transaction> {
  const fingerprint = `${row.date}|${row.kind}|${row.amountCents}|${row.balanceCents}|${row.description}`;
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(fingerprint));
  const id = "stmt-" + [...new Uint8Array(digest)].slice(0, 16).map((byte) => byte.toString(16).padStart(2, "0")).join("");
  const merchant = extractStatementCounterparty(row.description);
  const guess = classifyStatementText(row.kind, `${merchant} ${row.description}`);
  return {
    id, date: row.date, kind: row.kind, amountCents: row.amountCents,
    categoryId: guess.categoryId, needsReview: guess.needsReview || row.uncertain === true,
    note: `${bank} ${row.reference} ${row.description}`.trim().slice(0, 80), merchant,
  };
}

export function StatementImport() {
  const [file, setFile] = useState<File | null>(null);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const currency = useBudget((state) => state.currency);

  function choose(event: ChangeEvent<HTMLInputElement>) {
    setFile(event.currentTarget.files?.[0] ?? null);
    event.currentTarget.value = "";
    setMessage("");
  }

  async function onImport() {
    if (!file || busy) return;
    if (currency !== "INR") { setMessage("Set your currency to INR before importing this bank statement."); return; }
    setBusy(true); setMessage("Reading and checking your statement…");
    const { epoch, ownerId } = useBudget.getState();
    const signal = ledgerRequestSignal();
    try {
      const { rows: parsed, bank } = await extractStatement(file, password);
      if (!parsed.length) throw new Error("No transactions were found in this statement.");
      if (parsed.length > 300) throw new Error("This statement has more than 300 transactions; use a shorter statement.");
      const transactions = await Promise.all(parsed.map((row) => asTransaction(row, bank)));
      const response = await importStatementTransactions({ data: { transactions }, signal });
      if (signal.aborted || useBudget.getState().ownerId !== ownerId) return;
      useBudget.getState().applyRemote(epoch, response.snapshot);
      const review = response.needsReview ? ` ${response.needsReview} need review.` : "";
      const period = response.period ? `${formatDay(response.period.start)} – ${formatDay(response.period.end)}` : "the statement period";
      setMessage(`Added ${response.added} transaction${response.added === 1 ? "" : "s"} for ${period}. ${response.skipped} already present.${review}`);
      setFile(null); setPassword("");
    } catch (error) {
      if (!signal.aborted) {
        try { const snapshot = await loadLedger({ signal }); if (!signal.aborted) useBudget.getState().applyRemote(epoch, snapshot); } catch {}
        setMessage(error instanceof Error ? error.message : "Could not import this PDF.");
      }
    } finally { setBusy(false); }
  }

  return (
    <section className="panel mt-4 rounded-xl border border-border bg-card p-4" aria-labelledby="statement-import-heading">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h3 id="statement-import-heading" className="text-base font-semibold">Import bank statement</h3>
          <p className="mt-1 text-sm text-muted-foreground">Upload a bank statement PDF. Transactions, dates, debit/credit, merchants and categories are detected automatically. Duplicates are skipped.</p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <label className="statement-pdf-button inline-flex cursor-pointer items-center justify-center gap-2 text-sm font-semibold">
            <FileUp className="size-4" /> Choose PDF
            <input className="sr-only" type="file" accept="application/pdf,.pdf" disabled={busy} onChange={choose} />
          </label>
          <ResetDataButton />
        </div>
      </div>
      {file ? <div className="mt-4 grid gap-3 rounded-lg border border-border bg-muted/40 p-3">
        <p className="text-sm"><span className="font-medium">{file.name}</span> · {Math.ceil(file.size / 1024)} KB</p>
        <label className="grid gap-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          PDF password (if protected)
          <span className="flex gap-2 normal-case tracking-normal">
            <input className="field min-w-0 flex-1" type={showPassword ? "text" : "password"} value={password} placeholder="Enter PDF password if required" onChange={(e) => setPassword(e.target.value)} autoComplete="off" />
            <button type="button" className="inline-flex h-11 shrink-0 items-center gap-2 rounded-md border border-border px-3 text-sm" onClick={() => setShowPassword((v) => !v)}>
              {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />} {showPassword ? "Hide" : "Show"}
            </button>
          </span>
        </label>
        <p className="flex items-center gap-2 text-xs text-muted-foreground"><LockKeyhole className="size-3" /> The password is used only in this browser to unlock the PDF.</p>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="statement-pdf-button" disabled={busy} onClick={() => void onImport()}>{busy ? "Importing…" : "Import statement"}</button>
          <button type="button" className="text-sm underline" disabled={busy} onClick={() => { setFile(null); setPassword(""); setMessage(""); }}>Remove</button>
        </div>
      </div> : null}
      {message ? <p className="mt-3 text-sm" role="status" aria-live="polite">{message}</p> : null}
    </section>
  );
}
