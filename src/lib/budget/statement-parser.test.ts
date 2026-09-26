import assert from "node:assert/strict";
import test from "node:test";
import { parseBankStatement, parseIdfcStatement, type PdfText } from "./statement-parser.ts";

function item(str: string, x: number, y: number): PdfText {
  return { str, transform: [1, 0, 0, 1, x, y] };
}

function row(y: number, cells: [string, number][]): PdfText[] {
  return cells.map(([str, x]) => item(str, x, y));
}

test("IDFC FIRST keeps the strict debit and credit columns", () => {
  const rows = parseIdfcStatement([[
    item("IDFC FIRST BANK", 40, 800),
    item("Debit", 380, 700),
    item("Credit", 460, 700),
    item("Balance", 540, 700),
    item("01-Sep-2026", 40, 640),
    item("UPI/DR/1234567890/DMART", 200, 640),
    item("1,250.00", 380, 640),
    item("48,750.00", 540, 640),
    item("02-Sep-2026", 40, 610),
    item("NEFT/SALARY9876543210", 200, 610),
    item("80,000.00", 460, 610),
    item("1,28,750.00", 540, 610),
  ]]);
  assert.equal(rows[0]?.kind, "expense");
  assert.equal(rows[0]?.amountCents, 125000);
  assert.equal(rows[0]?.date, "2026-09-01");
  assert.equal(rows[1]?.kind, "income");
  assert.equal(rows[1]?.amountCents, 8000000);
});

test("HDFC-style withdrawal and deposit columns are read", () => {
  const rows = parseBankStatement([[
    ...row(780, [["HDFC BANK", 40]]),
    ...row(740, [["Date", 40], ["Narration", 140], ["Withdrawal", 360], ["Deposit", 470], ["Balance", 560]]),
    ...row(700, [["01/09/2026", 40], ["UPI-DMART", 140], ["1,250.00", 370], ["48,750.00", 560]]),
    ...row(660, [["02/09/2026", 40], ["SALARY CREDIT", 140], ["80,000.00", 470], ["1,28,750.00", 560]]),
  ]]);
  assert.equal(rows.length, 2);
  assert.deepEqual(rows.map((entry) => [entry.date, entry.kind, entry.amountCents]), [
    ["2026-09-01", "expense", 125000],
    ["2026-09-02", "income", 8000000],
  ]);
  assert.equal(rows[0]?.uncertain, undefined);
});

test("SBI-style dates and an opening balance decide debit versus credit", () => {
  const rows = parseBankStatement([[
    ...row(760, [["STATE BANK OF INDIA", 40]]),
    ...row(720, [["Date", 36], ["Details", 150], ["Debit", 360], ["Credit", 460], ["Balance", 560]]),
    ...row(680, [["Opening Balance", 150], ["10,000.00", 560]]),
    ...row(640, [["01 Sep 2026", 36], ["UPI/DR/9988776655/UBER", 150], ["265.00", 360], ["9,735.00", 560]]),
  ]]);
  assert.equal(rows.length, 1);
  assert.equal(rows[0]?.kind, "expense");
  assert.equal(rows[0]?.amountCents, 26500);
  assert.equal(rows[0]?.date, "2026-09-01");
});

test("ICICI Dr and Cr suffixes are accepted without a bank name", () => {
  const rows = parseBankStatement([[
    ...row(700, [["Date", 40], ["Particulars", 160], ["Amount", 400], ["Balance", 520]]),
    ...row(660, [["01-09-2026", 40], ["UPI/SWIGGY", 160], ["450.00(Dr)", 400], ["9,550.00", 520]]),
    ...row(620, [["03-09-2026", 40], ["UPI/CR/1122334455/REFUND", 160], ["100.00(Cr)", 400], ["9,650.00", 520]]),
  ]]);
  assert.equal(rows[0]?.kind, "expense");
  assert.equal(rows[1]?.kind, "income");
  assert.equal(rows[1]?.amountCents, 10000);
});

test("Axis-style rows and a wrapped narration stay one transaction", () => {
  const rows = parseBankStatement([[
    ...row(700, [["AXIS BANK", 40]]),
    ...row(660, [["Tran Date", 40], ["Particulars", 160], ["Debit", 380], ["Credit", 480], ["Balance", 560]]),
    ...row(620, [["01-09-2026", 40], ["UPI/P2A", 160], ["500.00", 380], ["4,500.00", 560]]),
    ...row(600, [["DMART MUMBAI", 160]]),
  ]]);
  assert.equal(rows.length, 1);
  assert.match(rows[0]?.description ?? "", /DMART MUMBAI/);
  assert.equal(rows[0]?.kind, "expense");
});

test("a statement with no dates is rejected by the caller when nothing is parsed", () => {
  assert.deepEqual(parseBankStatement([[item("This is a letter, not a statement.", 40, 700)]]), []);
});
