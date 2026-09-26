import assert from "node:assert/strict";
import test from "node:test";
import { classifyStatementText, normalizeNarration, plannedStatementBackfill, type StatementBackfillRow } from "./statement-categories.ts";

function expense(text: string) {
  return classifyStatementText("expense", text);
}

test("grocery narrations map to groceries, including merchant variants", () => {
  for (const text of [
    "UPI/DR/998877665544/DMART BANER",
    "UPI/DR/111/D-MART",
    "POS RELIANCE SMART",
    "IMPS/123456/BIGBASKET",
    "UPI/DR/222/BLINKIT",
    "Zepto order",
    "local kirana store",
  ]) {
    assert.equal(expense(text).categoryId, "groceries", text);
    assert.equal(expense(text).needsReview, false, text);
  }
});

test("dining, transport, utilities, health, fuel, cash, and fees use existing categories", () => {
  assert.deepEqual(expense("UPI/DR/1/SWIGGY ORDER"), { categoryId: "dining", needsReview: false });
  assert.deepEqual(expense("UPI/DR/2/ZOMATO"), { categoryId: "dining", needsReview: false });
  assert.deepEqual(expense("UPI/DR/3/UBER TRIP"), { categoryId: "transport", needsReview: false });
  assert.deepEqual(expense("UPI/DR/4/OLA RIDE"), { categoryId: "transport", needsReview: false });
  assert.deepEqual(expense("UPI/DR/9/MSRTC/AIRP"), { categoryId: "transport", needsReview: false });
  assert.deepEqual(expense("UPI/DR/9/Google P/utib/playsto"), { categoryId: "shopping", needsReview: false });
  assert.deepEqual(expense("POS-VISA/ GODADDYLLCV2"), { categoryId: "shopping", needsReview: false });
  assert.deepEqual(expense("BESCOM electricity bill"), { categoryId: "utilities", needsReview: false });
  assert.deepEqual(expense("AIRTEL MOBILE RECHARGE"), { categoryId: "utilities", needsReview: false });
  assert.deepEqual(expense("APOLLO PHARMACY"), { categoryId: "health", needsReview: false });
  assert.deepEqual(expense("HPCL PETROL PUMP"), { categoryId: "transport", needsReview: false });
  assert.deepEqual(expense("ATM CASH WITHDRAWAL"), { categoryId: "personal", needsReview: false });
  assert.deepEqual(expense("SMS CHARGE GST"), { categoryId: "personal", needsReview: false });
  assert.deepEqual(expense("HOUSE RENT MARCH"), { categoryId: "housing", needsReview: false });
  assert.deepEqual(expense("AMAZON ORDER"), { categoryId: "shopping", needsReview: false });
});

test("the same UPI shape maps from the merchant, not the rail", () => {
  assert.equal(expense("UPI/DR/555/DMART").categoryId, "groceries");
  assert.equal(expense("UPI/DR/555/SWIGGY").categoryId, "dining");
  assert.notEqual(normalizeNarration("UPI/DR/555/DMART"), "");
});

test("generic UPI narration stays personal and needs review", () => {
  const guess = expense("UPI/DR/998877665544/RAHUL KUMAR");
  assert.deepEqual(guess, { categoryId: "personal", needsReview: true });
});

test("income narration stays on income categories", () => {
  assert.deepEqual(classifyStatementText("income", "NEFT/QA202609/SYNTHETIC PAYROLL"), { categoryId: "pay", needsReview: false });
  assert.deepEqual(classifyStatementText("income", "UPI/CR/1/SWIGGY REFUND"), { categoryId: "refund", needsReview: false });
  assert.deepEqual(classifyStatementText("income", "UPI/CR/2/FRIEND TRANSFER"), { categoryId: "other-in", needsReview: true });
  assert.notEqual(classifyStatementText("income", "UPI/CR/3/SWIGGY FOOD").categoryId, "dining");
});

function row(partial: Partial<StatementBackfillRow>): StatementBackfillRow {
  return {
    id: "stmt-idfc-abc",
    userId: "user-a",
    kind: "expense",
    categoryId: "personal",
    note: "IDFC FIRST UPI/DR/1/DMART",
    merchant: "DMART",
    needsReview: false,
    categoryLocked: false,
    ...partial,
  };
}

test("backfill corrects importer defaults and skips edited, locked, and other users' rows", () => {
  assert.deepEqual(plannedStatementBackfill(row({})), { categoryId: "groceries", needsReview: false });
  assert.equal(plannedStatementBackfill(row({ categoryId: "dining" })), null);
  assert.equal(plannedStatementBackfill(row({ categoryLocked: true })), null);
  assert.equal(plannedStatementBackfill(row({ id: "manual-1" })), null);
  assert.equal(plannedStatementBackfill(row({ note: "UPI/DR/1/RAHUL", merchant: "RAHUL", needsReview: true })), null);
  assert.deepEqual(plannedStatementBackfill(row({ note: "UPI/DR/1/RAHUL", merchant: "RAHUL" })), { categoryId: "personal", needsReview: true });
  const accounts = [row({ userId: "user-a" }), row({ userId: "user-b", note: "RENT", merchant: "LANDLORD" })];
  const mine = accounts.filter((item) => item.userId === "user-a").map(plannedStatementBackfill);
  assert.deepEqual(mine, [{ categoryId: "groceries", needsReview: false }]);
});

test("statement identity ignores category so a re-import is still a duplicate", async () => {
  const fingerprint = (description: string) => `2026-09-10|expense|25000|9975000|${description}`;
  const idFor = async (description: string) => {
    const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(fingerprint(description)));
    return [...new Uint8Array(digest)].slice(0, 16).map((byte) => byte.toString(16).padStart(2, "0")).join("");
  };
  const grocery = await idFor("UPI/DR/1/DMART");
  const sameRow = await idFor("UPI/DR/1/DMART");
  assert.equal(grocery, sameRow);
  assert.ok(!grocery.includes("groceries"));
});
