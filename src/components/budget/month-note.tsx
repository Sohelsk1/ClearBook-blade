import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { useEditor } from "@/components/budget/editor-context";
import { formatMoney, type CurrencyCode, type SpendSlice } from "@/lib/budget/model";

type Step = { id: string; done: boolean; label: string; href?: string };

export function MonthNote({
  viewMonth,
  currency,
  remaining,
  income,
  expense,
  recordCount,
  reviewCount,
  budgetCount,
  top,
}: {
  viewMonth: string;
  currency: CurrencyCode;
  remaining: number;
  income: number;
  expense: number;
  recordCount: number;
  reviewCount: number;
  budgetCount: number;
  top: SpendSlice | undefined;
}) {
  const { openCreate } = useEditor();
  const key = `cb-month-note:${viewMonth}`;
  const [hidden, setHidden] = useState(true);

  useEffect(() => {
    setHidden(window.localStorage.getItem(key) === "1");
  }, [key]);

  if (hidden) return null;

  const steps: Step[] = [
    { id: "record", done: recordCount > 0, label: "Add one record this month" },
    { id: "both", done: income > 0 && expense > 0, label: "Record both income and an expense" },
    { id: "budget", done: budgetCount > 0, label: "Set one category limit", href: "/settings" },
  ];
  const next = steps.find((step) => !step.done);

  return (
    <section className="month-note panel mb-4 p-4" aria-labelledby="month-note-heading">
      <div className="flex items-start justify-between gap-3">
        <h2 id="month-note-heading" className="text-lg font-medium">Worth a minute</h2>
        <button
          type="button"
          className="text-sm text-muted-foreground underline-offset-2 hover:underline"
          onClick={() => {
            window.localStorage.setItem(key, "1");
            setHidden(true);
          }}
        >
          Dismiss
        </button>
      </div>
      <p className="mt-2 text-muted-foreground">
        {recordCount === 0
          ? "Nothing is recorded this month yet. One entry is enough to start."
          : `${formatMoney(remaining, currency)} left.${top ? ` Most spending is ${top.label}.` : ""}${reviewCount > 0 ? ` ${reviewCount} need a category check.` : ""}`}
      </p>
      <ul className="mt-3 grid gap-1">
        {steps.map((step) => (
          <li key={step.id} className={step.done ? "month-note-step is-done" : "month-note-step"}>
            <span aria-hidden="true">{step.done ? "✓" : "○"}</span>
            {step.href && !step.done ? <Link to={step.href} hash="budgets">{step.label}</Link> : <span>{step.label}</span>}
          </li>
        ))}
      </ul>
      {next && !next.href ? (
        <Button className="mt-3" onClick={openCreate}>Add transaction</Button>
      ) : next ? null : (
        <p className="mt-3 text-sm text-muted-foreground">Checklist done for this month. Open Insights to compare it with the last one.</p>
      )}
    </section>
  );
}
