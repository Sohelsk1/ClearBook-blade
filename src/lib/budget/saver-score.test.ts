import assert from "node:assert/strict";
import test from "node:test";
import { scoreStatement, saverBand } from "./saver-score.ts";
import type { Transaction } from "./model.ts";

function tx(partial: Pick<Transaction, "kind" | "amountCents" | "categoryId"> & Partial<Transaction>): Transaction {
  return {
    id: partial.categoryId + partial.kind + partial.amountCents,
    note: "",
    date: "2026-09-10",
    ...partial,
  };
}

test("0 is excellent and 100 is critical on a 0 to 100 dial", () => {
  assert.equal(saverBand(0).label, "Excellent");
  assert.equal(saverBand(30).label, "Excellent");
  assert.equal(saverBand(31).label, "Alert");
  assert.equal(saverBand(100).label, "Critical");
});

test("keeping most of the income scores under 30 and celebrates", () => {
  const result = scoreStatement(
    [
      tx({ kind: "income", amountCents: 1_000_000, categoryId: "pay" }),
      tx({ kind: "expense", amountCents: 250_000, categoryId: "housing" }),
      tx({ kind: "expense", amountCents: 80_000, categoryId: "groceries" }),
      tx({ kind: "expense", amountCents: 40_000, categoryId: "dining" }),
    ],
    "2026-09-01",
    "2026-09-30",
    "INR",
  );
  assert.ok(result);
  assert.ok(result.score != null && result.score <= 30);
  assert.equal(result.celebrate, true);
  assert.equal(result.personaLabel, "Excellent");
});

test("overspending scores high and leads with a critical alert", () => {
  const result = scoreStatement(
    [
      tx({ kind: "income", amountCents: 500_000, categoryId: "pay" }),
      tx({ kind: "expense", amountCents: 280_000, categoryId: "housing", note: "Rent", date: "2026-09-02" }),
      tx({ kind: "expense", amountCents: 220_000, categoryId: "dining", merchant: "Swiggy", date: "2026-09-18" }),
      tx({ kind: "expense", amountCents: 160_000, categoryId: "shopping", merchant: "Amazon", date: "2026-09-09" }),
    ],
    "2026-09-01",
    "2026-09-30",
    "INR",
  );
  assert.ok(result);
  assert.ok(result.score != null && result.score > 30);
  assert.equal(result.celebrate, false);
  assert.equal(result.level, "critical");
  assert.equal(result.tips[0]?.tone, "bad");
  assert.ok(result.tips.length >= 3);
  const text = result.tips.map((tip) => `${tip.title} ${tip.detail}`).join(" ");
  assert.match(text, /extra|Swiggy|Rent/);
  assert.doesNotMatch(text, /subscription/i);
});

test("two different statements do not get the same tips", () => {
  const dining = scoreStatement(
    [
      tx({ kind: "income", amountCents: 800_000, categoryId: "pay" }),
      tx({ kind: "expense", amountCents: 700_000, categoryId: "dining", merchant: "Zomato", date: "2026-09-04" }),
      tx({ kind: "expense", amountCents: 50_000, categoryId: "groceries", date: "2026-09-11" }),
    ],
    "2026-09-01",
    "2026-09-30",
    "INR",
  );
  const travel = scoreStatement(
    [
      tx({ kind: "income", amountCents: 800_000, categoryId: "pay" }),
      tx({ kind: "expense", amountCents: 640_000, categoryId: "transport", merchant: "Uber", date: "2026-09-20" }),
      tx({ kind: "expense", amountCents: 90_000, categoryId: "utilities", note: "Electricity", date: "2026-09-03" }),
    ],
    "2026-09-01",
    "2026-09-30",
    "INR",
  );
  assert.ok(dining && travel);
  assert.notEqual(dining.tips.map((tip) => tip.title).join("|"), travel.tips.map((tip) => tip.title).join("|"));
  assert.match(dining.tips.map((tip) => tip.title).join(" "), /Zomato/);
  assert.match(travel.tips.map((tip) => tip.title).join(" "), /Uber/);
});

test("income with no expenses does not celebrate", () => {
  const result = scoreStatement(
    [tx({ kind: "income", amountCents: 10_000_000, categoryId: "pay" })],
    "2026-09-01",
    "2026-09-30",
    "INR",
  );
  assert.ok(result);
  assert.equal(result.score, null);
  assert.equal(result.celebrate, false);
  assert.equal(result.personaLabel, "Not enough yet");
});

test("an empty period has no score", () => {
  assert.equal(scoreStatement([], "2026-09-01", "2026-09-30", "INR"), null);
});
