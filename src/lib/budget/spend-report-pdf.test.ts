import assert from "node:assert/strict";
import test from "node:test";
import { buildSpendReportPdf, spendReportLines } from "./spend-report-pdf.ts";
import type { Transaction } from "./model.ts";

function tx(partial: Pick<Transaction, "kind" | "amountCents" | "categoryId"> & Partial<Transaction>): Transaction {
  return { id: partial.categoryId + String(partial.amountCents), note: "", date: "2026-09-10", ...partial };
}

const input = {
  periodLabel: "1 Sep 2026 - 30 Sep 2026",
  currency: "INR" as const,
  start: "2026-09-01",
  end: "2026-09-30",
  incomeCents: 100_000,
  expenseCents: 140_000,
  categories: [{ label: "Dining", cents: 90_000 }],
  transactions: [
    tx({ kind: "income", amountCents: 100_000, categoryId: "pay" }),
    tx({ kind: "expense", amountCents: 90_000, categoryId: "dining", merchant: "Swiggy" }),
    tx({ kind: "expense", amountCents: 50_000, categoryId: "housing", note: "Rent", date: "2026-09-02" }),
  ],
};

test("the spend report uses plain language and is not a credit score", () => {
  const text = spendReportLines(input).join("\n");
  assert.match(text, /not a CIBIL/);
  assert.match(text, /Swiggy/);
  assert.match(text, /You spent/);
  assert.doesNotMatch(text, /subscription/i);
});

test("the spend report downloads as a real PDF", () => {
  const pdf = new TextDecoder().decode(buildSpendReportPdf(input));
  assert.match(pdf, /^%PDF-1\.4/);
  assert.match(pdf, /%%EOF/);
  assert.match(pdf, /Clearbook spend report/);
});
