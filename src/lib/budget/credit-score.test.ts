import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  consumeCreditScoreAttempt,
  isApprovedCreditProviderConfigured,
  maskPan,
  parseCreditScoreRequest,
  resolveCreditScoreCheck,
  validateDateOfBirth,
  validatePan,
} from "./credit-score.ts";

const NOW = new Date("2026-09-26T00:00:00.000Z");
const PAN = "ABCDE1234F";

test("PAN and date of birth are validated without echoing the value", () => {
  assert.equal(validatePan("abcde1234f"), null);
  assert.equal(validatePan("ABCDE12345"), "Enter a valid PAN.");
  assert.equal(validatePan("ABCDE12345")?.includes("ABCDE12345"), false);
  assert.equal(validateDateOfBirth("2026-09-27", NOW), "Date of birth cannot be in the future.");
  assert.equal(validateDateOfBirth("2026-02-31", NOW), "Enter a valid date of birth.");
  assert.equal(validateDateOfBirth("2010-01-01", NOW), "Credit score checks are available from age 18.");
  assert.equal(validateDateOfBirth("1990-01-15", NOW), null);
  assert.equal(maskPan(PAN), "••••••234F");
});

test("lookup cannot start before explicit consent and never invents a score", () => {
  const refused = parseCreditScoreRequest({ pan: PAN, dob: "1990-01-15", consent: false }, NOW);
  assert.equal(refused.ok, false);
  assert.equal(isApprovedCreditProviderConfigured({
    CREDIT_SCORE_PROVIDER: "unapproved-bureau",
    CREDIT_SCORE_API_URL: "https://example.test/score",
    CREDIT_SCORE_API_KEY: "not-a-real-key",
  }), false);
  const result = resolveCreditScoreCheck(false);
  assert.equal(result.status, "not_configured");
  assert.equal(result.message, "Credit score service is not configured yet.");
  assert.equal("score" in result, false);
  assert.equal(JSON.stringify(result).includes(PAN), false);
});

test("too many checks are rate limited without calling a provider", () => {
  let stamps: number[] = [];
  for (let index = 0; index < 5; index += 1) {
    const next = consumeCreditScoreAttempt(stamps, 1_000 + index);
    assert.equal(next.allowed, true);
    stamps = next.stamps;
  }
  assert.equal(consumeCreditScoreAttempt(stamps, 1_010).allowed, false);
});

test("Loans navigation offers only the credit score check and keeps stored report code", () => {
  const shell = readFileSync(new URL("../../components/budget/app-shell.tsx", import.meta.url), "utf8");
  const route = readFileSync(new URL("../../routes/loans.tsx", import.meta.url), "utf8");
  const page = readFileSync(new URL("../../components/budget/credit-score-page.tsx", import.meta.url), "utf8");
  const store = readFileSync(new URL("./credit-store.ts", import.meta.url), "utf8");
  const worker = readFileSync(new URL("../../../public/sw.js", import.meta.url), "utf8");
  assert.equal(shell.match(/to: "\/loans"/g)?.length, 1);
  assert.match(route, /CreditScorePage/);
  assert.doesNotMatch(route, /LoansPage/);
  assert.match(page, /Check my credit score/);
  assert.match(page, /checked=\{consent\}/);
  assert.doesNotMatch(page, /defaultChecked/);
  assert.doesNotMatch(page, /Drop your CIBIL/);
  assert.match(store, /credit_reports/);
  assert.match(worker, /caches\.delete/);
  assert.doesNotMatch(worker, /cache\.put/);
});
