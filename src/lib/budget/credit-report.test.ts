import assert from "node:assert/strict";
import test from "node:test";
import { creditTips, parseCibilText, recentEnquiryCount } from "./credit-report.ts";

const SAMPLE = `
CIBIL TRANSUNION SCORE: 762
CONSUMER NAME: QA SAMPLE
DATE OF BIRTH: 01-01-1990
PAN: ABCDE1234F
REPORT DATE: 01-09-2026

MEMBER NAME: HDFC BANK
ACCOUNT TYPE: 05
ACCOUNT NUMBER: 123456789012
OWNERSHIP: Individual
DATE OPENED: 15-03-2020
SANCTIONED AMOUNT: 5,00,000
CURRENT BALANCE: 2,50,000
AMOUNT OVERDUE: 0
EMI AMOUNT: 15,000
REPAYMENT TENURE: 36
PAYMENT STATUS: Standard
000 000 030 000

MEMBER NAME: ICICI BANK
ACCOUNT TYPE: 10
ACCOUNT NUMBER: 999988887777
OWNERSHIP: Individual
DATE OPENED: 01-06-2022
CREDIT LIMIT: 2,00,000
CURRENT BALANCE: 40,000
AMOUNT OVERDUE: 0
PAYMENT STATUS: Standard
000 000 000

ENQUIRIES
01-08-2026 | HDFC BANK | Credit Card | 50000
`;

test("parses a text CIBIL report into loans, cards, and a masked PAN", () => {
  const report = parseCibilText(SAMPLE, "qa-1", "2026-09-25T00:00:00.000Z");
  assert.equal(report.creditScore, 762);
  assert.equal(report.personalInfo.panMasked, "XXXXX1234X");
  assert.equal(report.personalInfo.name, "QA SAMPLE");
  assert.equal(report.accounts.length, 2);
  assert.equal(report.summary.totalLoans, 1);
  assert.equal(report.summary.totalCreditCards, 1);
  assert.equal(report.summary.totalOutstanding, 290000);
  assert.equal(report.summary.creditUtilizationPercent, 20);
  assert.equal(report.summary.totalEmi, 15000);
  assert.equal(report.accounts[0].accountType, "Personal Loan");
  assert.equal(report.accounts[0].dpdHistory.join(" "), "000 000 030 000");
  assert.equal(report.accounts[0].accountNumberMasked.endsWith("9012"), true);
  assert.equal(report.enquiries.length, 1);
  assert.equal(report.summary.onTimePaymentPercent, 85.7);
  assert.equal(report.summary.oldestAccountAgeMonths, 78);
  assert.equal(recentEnquiryCount(report), 1);
  assert.ok(creditTips(report).some((tip) => /on-time/i.test(tip.text)));
});

test("rejects a file that is not a credit report", () => {
  assert.throws(() => parseCibilText("bank statement salary 5000", "x", "2026-09-25T00:00:00.000Z"), /not a supported CIBIL/);
});

test("detects CIBIL markers split by whitespace, hyphens, or page breaks", () => {
  const split = "CI\u00adBIL\nTRANS\nUNION\nSCORE\n742\n\nMEMBER NAME: HDFC BANK\nACCOUNT TYPE: 05\nCURRENT BALANCE: 1000\n";
  const report = parseCibilText(split, "split", "2026-09-25T00:00:00.000Z");
  assert.equal(report.creditScore, 742);
  assert.equal(report.accounts.length, 1);
});

test("reads accounts that follow an enquiry summary and sit on the same line as other columns", () => {
  const cir = `
CIBIL TRANSUNION SCORE: 738
ENQUIRY SUMMARY
Past 30 days: 0
ACCOUNT DATES AMOUNTS STATUS
MEMBER NAME: NOT DISCLOSED DATE OPENED: 27-12-2019 SANCTIONED: 88,363 CURRENT BALANCE: 39,528 OVERDUE: 44,832
TYPE: PERSONAL LOAN OWNERSHIP: INDIVIDUAL CREDIT FACILITY STATUS: WRITTEN-OFF
000 000 030
MEMBER NAME: SBI ACCOUNT NUMBER: 41975467823 TYPE: GOLD LOAN OPENED: 02-08-2024 SANCTIONED: 5,250 CURRENT BALANCE: 1,200
`;
  const report = parseCibilText(cir, "columns", "2026-09-25T00:00:00.000Z");
  assert.equal(report.creditScore, 738);
  assert.equal(report.accounts.length, 2);
  assert.equal(report.accounts[0]?.accountType, "PERSONAL LOAN");
  assert.equal(report.accounts[0]?.currentBalance, 39528);
  assert.equal(report.accounts[0]?.amountOverdue, 44832);
  assert.equal(report.accounts[0]?.isActive, false);
  assert.equal(report.accounts[1]?.memberName, "SBI");
  assert.equal(report.accounts[1]?.accountType, "GOLD LOAN");
  assert.equal(report.accounts[1]?.currentBalance, 1200);
  assert.equal(report.summary.totalOutstanding, 40728);
});

test("reads a letter-spaced consumer CIR with the score before the scale", () => {
  const cir = `
C I B I L TRANSUNION SCORE(S):
S C O R E N A M E
CREDITVISION SCORE
658
POSSIBLE RANGE FOR CREDITVISION SCORE : 300 (high risk) to 900 (low risk)
M E M B E R  N A M E :
HDFC BANK
A C C O U N T  N U M B E R :
XXXX1234
T Y P E :
PERSONAL LOAN
O P E N E D :
16-05-2018
C U R R E N T  B A L A N C E
250000
750
Your CIBIL Score
`;
  const report = parseCibilText(cir, "cir", "2026-09-25T00:00:00.000Z");
  assert.equal(report.creditScore, 658);
  assert.equal(report.accounts[0]?.memberName, "HDFC BANK");
  assert.equal(report.accounts[0]?.accountType, "PERSONAL LOAN");
  assert.equal(report.accounts[0]?.currentBalance, 250000);
  assert.equal(report.accounts[0]?.dateOpened, "2018-05-16");
});
