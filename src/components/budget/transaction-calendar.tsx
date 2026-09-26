import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { categoryById, formatDay, formatMoney, monthLabel, shiftMonth, type CurrencyCode, type Transaction } from "@/lib/budget/model";
import { calendarDays } from "@/lib/budget/calendar-data";


export function TransactionCalendar({ transactions, currency, viewMonth }: {
  transactions: Transaction[]; currency: CurrencyCode; viewMonth: string;
}) {
  const [month, setMonth] = useState(viewMonth);
  const [direction, setDirection] = useState<"next" | "previous">("next");
  const [selected, setSelected] = useState<string | null>(null);
  const cells = useMemo(() => calendarDays(month, transactions), [month, transactions]);
  const selectedRows = useMemo(() => transactions.filter((tx) => tx.date === selected)
    .sort((a, b) => a.id.localeCompare(b.id)), [transactions, selected]);
  const total = selectedRows.reduce((sum, tx) => sum + tx.amountCents, 0);
  const net = selectedRows.reduce((sum, tx) => sum + (tx.kind === "income" ? tx.amountCents : -tx.amountCents), 0);
  const today = new Date();
  const todayIso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  useEffect(() => { setMonth(viewMonth); }, [viewMonth]);

  function changeMonth(delta: number) {
    setDirection(delta > 0 ? "next" : "previous");
    setMonth((current) => shiftMonth(current, delta));
    setSelected(null);
  }


  return (
    <section className="panel txcal" aria-labelledby="calendar-heading">
      <div className="txcal-head">
        <div className="txcal-title">
          <h3 id="calendar-heading">Transaction Calendar</h3>
          <p>Darker days have more records.</p>
        </div>
      </div>
      <div className="txcal-toolbar">
        <div className="txcal-month">
          <Button variant="ghost" size="icon" aria-label="Previous calendar month" onClick={() => changeMonth(-1)}><ChevronLeft className="size-4" /></Button>
          <h4 key={month} className="txcal-month-label" aria-live="polite">{monthLabel(month)}</h4>
          <Button variant="ghost" size="icon" aria-label="Next calendar month" onClick={() => changeMonth(1)}><ChevronRight className="size-4" /></Button>
        </div>
        <div className="txcal-legend" aria-label="Transaction frequency from none to most">
          <span>Fewer</span>{[0, 1, 2, 3, 4].map((level) => <span key={level} className={`txcal-legend-swatch txcal-level-${level}`} aria-hidden="true" />)}<span>More</span>
        </div>
      </div>
      <div className="txcal-weekdays" aria-hidden="true">{["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => <span key={day}>{day}</span>)}</div>
      <div key={month} className={`txcal-grid txcal-enter-${direction}`}>
        {cells.map((cell, index) => cell ? (
          <button key={cell.date} type="button" className={`txcal-day txcal-level-${cell.level}${cell.date === todayIso ? " txcal-today" : ""}${selected === cell.date ? " txcal-selected" : ""}`}
            aria-label={`${formatDay(cell.date)}${cell.date === todayIso ? ", today" : ""}, ${cell.count} transaction${cell.count === 1 ? "" : "s"}`}
            aria-current={cell.date === todayIso ? "date" : undefined}
            aria-pressed={selected === cell.date}
            onClick={() => setSelected(cell.date)}>
            <span className="txcal-num">{cell.number}</span>
            <span className="txcal-count" aria-hidden="true">{cell.count > 0 ? cell.count : "\u00a0"}</span>
          </button>
        ) : <span key={`pad-${index}`} className="txcal-pad" aria-hidden="true" />)}
      </div>
      {selected && (
        <Modal title={formatDay(selected)} description={`${selectedRows.length} transaction${selectedRows.length === 1 ? "" : "s"} recorded on this date.`} onClose={() => setSelected(null)} placement="sheet" className="txcal-dialog">
          <dl className="txcal-totals">
            <div><dt>Transactions</dt><dd>{selectedRows.length}</dd></div>
            <div><dt>Total activity</dt><dd>{formatMoney(total, currency)}</dd></div>
            <div><dt>Net change</dt><dd>{formatMoney(net, currency)}</dd></div>
          </dl>
          {selectedRows.length ? <ul className="txcal-transactions">
            {selectedRows.map((tx) => <li key={tx.id}>
              <div className="min-w-0">
                <p className="font-medium">{tx.merchant || tx.note || categoryById(tx.categoryId)?.label || "Transaction"}</p>
                <p className="text-xs text-muted-foreground">{categoryById(tx.categoryId)?.label ?? tx.kind} · {tx.kind}</p>
                {tx.note && tx.merchant && <p className="txcal-note text-xs text-muted-foreground">{tx.note}</p>}
              </div>
              <span className={`txcal-amount ${tx.kind === "income" ? "text-positive" : tx.kind === "expense" ? "text-negative" : "text-savings"}`}>
                {tx.kind === "income" ? "+" : "−"}{formatMoney(tx.amountCents, currency)}
              </span>
            </li>)}
          </ul> : <p className="mt-5 text-sm text-muted-foreground">No transactions recorded for this date.</p>}
        </Modal>
      )}

