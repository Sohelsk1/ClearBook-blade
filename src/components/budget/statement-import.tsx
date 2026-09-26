import { useState, type ChangeEvent } from "react";
import { FileUp } from "lucide-react";
import { ResetDataButton } from "@/components/budget/reset-data-button";
import { formatDay, type Transaction } from "@/lib/budget/model";
import { importStatementTransactions, loadLedger } from "@/lib/budget/ledger";
import { ledgerRequestSignal, useBudget } from "@/lib/budget/store";
import { extractStatement, type StatementRow } from "@/lib/budget/statement-parser";
import { classifyStatementText } from "@/lib/budget/statement-categories";

function extractStatementCounterparty(description: string): string {
  const parts = description.split("/").map((part) => part.trim()).filter(Boolean);
  const rail = (parts[0] ?? "").toUpperCase();
  if (rail === "UPI") {
    return (parts[3] || parts[2] || "").slice(0, 60) || description.slice(0, 60);
  }
  if (["IMPS", "NEFT", "RTGS", "IFT"].includes(rail)) {
    return (parts[2] || parts[1] || "").slice(0, 60) || description.slice(0, 60);
  }
  return (parts[2] || parts[1] || "").slice(0, 60) || description.slice(0, 60);
}

async function asTransaction(row: StatementRow, bank: string): Promise<Transaction> {
  const fingerprint = `${row.date}|${row.kind}|${row.amountCents}|${row.balanceCents}|${row.description}`;
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(fingerprint));
  const id = "stmt-idfc-" + [...new Uint8Array(digest)].slice(0, 16).map((byte) => byte.toString(16).padStart(2, "0")).join("");
  const merchant = extractStatementCounterparty(row.description);
  const guess = classifyStatementText(row.kind, `${merchant} ${row.description}`);
  return {
    id,
    date: row.date,
    kind: row.kind,
    amountCents: row.amountCents,
    categoryId: guess.categoryId,
    needsReview: guess.needsReview || row.uncertain === true,
    note: `${bank} ${row.reference} ${row.description}`.trim().slice(0, 80),
    merchant,
  };
}

export function StatementImport() {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const currency = useBudget((state) => state.currency);

  async function onUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    if (!file || busy) return;
    if (currency !== "INR") {
      setMessage("Set your currency to INR before importing this bank statement.");
      return;
    }
    setBusy(true);
    setMessage("Reading and checking your statement…");
    const { epoch, ownerId } = useBudget.getState();
    const signal = ledgerRequestSignal();
    try {
      const { rows: parsed, bank } = await extractStatement(file);
      const rows = parsed;
      if (!rows.length) throw new Error("No transactions were found in this statement.");
      if (rows.length > 300) throw new Error("This statement has more than 300 transactions; use a shorter statement.");
      if (signal.aborted) return;
      const transactions = await Promise.all(rows.map((row) => asTransaction(row, bank)));
      const response = await importStatementTransactions({ data: { transactions }, signal });
      if (signal.aborted || useBudget.getState().ownerId !== ownerId) return;
      useBudget.getState().applyRemote(epoch, response.snapshot);
      const review = response.needsReview ? ` ${response.needsReview} need review.` : "";
      const period = response.period ? `${formatDay(response.period.start)} – ${formatDay(response.period.end)}` : "the statement period";
      setMessage(`Added ${response.added} transaction${response.added === 1 ? "" : "s"} for ${period}. ${response.skipped} already present.${review}`);
    } catch (error) {
      if (signal.aborted) return;
      // A network failure during a batch may occur after some rows were saved.
      try {
        const snapshot = await loadLedger({ signal });
        if (!signal.aborted) useBudget.getState().applyRemote(epoch, snapshot);
      } catch { /* Keep the visible ledger if the connection remains unavailable. */ }
      setMessage(error instanceof Error ? error.message : "Could not import this PDF. No unverified rows were added.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="panel mt-4 rounded-xl border border-border bg-card p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-base font-semibold">Choose your statement</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Upload a bank statement PDF. The actual transaction date range is detected automatically. Duplicates are skipped. The file stays on this device.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-md border border-emerald-500/50 bg-emerald-500/10 px-4 py-2 text-sm font-semibold text-emerald-400 transition-colors duration-200 hover:border-emerald-400 hover:bg-emerald-500/20 focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-emerald-400">
            <FileUp className="size-4" aria-hidden="true" />
            {busy ? "Importing…" : "Choose PDF"}
            <input className="sr-only" type="file" accept="application/pdf,.pdf" disabled={busy} onChange={onUpload} aria-label="Choose bank statement PDF" />
          </label>
          <ResetDataButton />
        </div>
      </div>
      {message && <p className="mt-3 text-sm" role="status" aria-live="polite">{message}</p>}
    </div>
  );
}
