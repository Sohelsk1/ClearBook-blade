import { useState } from "react";
import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { loadLedger, resetLedgerData } from "@/lib/budget/ledger";
import { currentMonthKey } from "@/lib/budget/model";
import { ledgerRequestSignal, useBudget } from "@/lib/budget/store";

export function ResetDataButton() {
  const [confirmReset, setConfirmReset] = useState(false);
  const [resetPending, setResetPending] = useState(false);
  const [error, setError] = useState("");

  async function resetAll() {
    if (resetPending) return;
    setResetPending(true);
    setError("");
    const { epoch, ownerId } = useBudget.getState();
    const signal = ledgerRequestSignal();
    try {
      const snapshot = await resetLedgerData({ data: { confirm: "RESET" }, signal });
      if (signal.aborted || useBudget.getState().ownerId !== ownerId) return;
      useBudget.getState().applyRemote(epoch, snapshot);
      useBudget.setState({ notice: null });
      useBudget.getState().setViewMonth(currentMonthKey());
      setConfirmReset(false);
    } catch {
      if (!signal.aborted) {
        try {
          const snapshot = await loadLedger({ signal });
          if (!signal.aborted && useBudget.getState().ownerId === ownerId) {
            useBudget.getState().applyRemote(epoch, snapshot);
            useBudget.setState({ notice: null });
          }
        } catch { /* Keep visible data until the connection returns. */ }
        setError("Connection interrupted. Check your ledger before trying again.");
      }
    } finally {
      setResetPending(false);
    }
  }

  return (
    <>
      <Button type="button" variant="outline" className="min-h-11 gap-2 text-negative" onClick={() => { setError(""); setConfirmReset(true); }} disabled={resetPending} aria-label="Reset all ClearBook data">
        <RotateCcw className="size-4" aria-hidden="true" />
        Reset
      </Button>
      {confirmReset ? (
        <Modal title="Are you sure?" description="This will permanently delete your transactions, savings goals, budgets, recurring schedules and export history. Your account and sign-in will remain." onClose={() => { if (!resetPending) setConfirmReset(false); }}>
          <p className="mt-4 text-sm text-muted-foreground">This action cannot be undone.</p>
          {error ? <p className="mt-3 text-sm text-negative" role="alert">{error}</p> : null}
          <div className="mt-5 flex justify-end gap-2">
            <Button type="button" variant="secondary" disabled={resetPending} onClick={() => setConfirmReset(false)}>No</Button>
            <Button type="button" className="txcal-danger" disabled={resetPending} onClick={() => void resetAll()}>{resetPending ? "Resetting…" : "Yes, reset all"}</Button>
          </div>
        </Modal>
      ) : null}
    </>
  );
}
