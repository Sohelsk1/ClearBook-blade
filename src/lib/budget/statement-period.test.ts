import assert from "node:assert/strict";
import test from "node:test";
import { calendarJsonWithPeriod, periodFromCalendarJson, statementPeriodFrom } from "./statement-period.ts";

test("statement period accepts only a real date range", () => {
  assert.deepEqual(statementPeriodFrom({ start: "2026-08-28", end: "2026-09-27" }), {
    start: "2026-08-28",
    end: "2026-09-27",
  });
  assert.equal(statementPeriodFrom({ start: "2026-09-27", end: "2026-08-28" }), null);
  assert.equal(statementPeriodFrom({ start: "September", end: "2026-09-27" }), null);
  assert.equal(statementPeriodFrom(null), null);
});

test("calendar json keeps the imported range and ignores the whole ledger", () => {
  const saved = calendarJsonWithPeriod({ mode: "daily" }, { start: "2026-08-28", end: "2026-09-27" });
  assert.deepEqual(periodFromCalendarJson(saved), { start: "2026-08-28", end: "2026-09-27" });
  const again = calendarJsonWithPeriod(JSON.parse(saved), periodFromCalendarJson(saved));
  assert.equal(periodFromCalendarJson(again)?.start, "2026-08-28");
  assert.equal(periodFromCalendarJson("{"), null);
});
