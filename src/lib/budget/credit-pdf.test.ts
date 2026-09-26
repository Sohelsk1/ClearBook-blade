import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { creditPageLimitMessage, extractCreditReport, itemsToText, mapCreditPdfError, prominentScore } from "./credit-pdf.ts";
import { looksLikeCreditReport, parseCibilText } from "./credit-report.ts";

const PASSWORD = "synthetic-pass";
const ACCOUNT = ["MEMBER NAME: HDFC BANK", "ACCOUNT TYPE: 05", "CURRENT BALANCE: 250000", "AMOUNT OVERDUE: 0", "PAYMENT STATUS: Standard", "000 000 000"];

function escapePdf(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function buildTextPdf(pages: string[][]): File {
  const objects: { id: number; body: string }[] = [];
  const fontId = 3 + pages.length * 2;
  const kids: number[] = [];
  let id = 3;
  for (const lines of pages) {
    const pageId = id++;
    const contentId = id++;
    kids.push(pageId);
    const ops = ["BT /F1 11 Tf", ...lines.map((line, index) => `1 0 0 1 72 ${760 - index * 14} Tm (${escapePdf(line)}) Tj`), "ET"].join("\n");
    objects.push({ id: contentId, body: `<< /Length ${ops.length} >>\nstream\n${ops}\nendstream` });
    objects.push({ id: pageId, body: `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents ${contentId} 0 R /Resources << /Font << /F1 ${fontId} 0 R >> >> >>` });
  }
  objects.push({ id: fontId, body: "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>" });
  objects.push({ id: 2, body: `<< /Type /Pages /Count ${pages.length} /Kids [${kids.map((kid) => `${kid} 0 R`).join(" ")}] >>` });
  objects.push({ id: 1, body: "<< /Type /Catalog /Pages 2 0 R >>" });
  objects.sort((left, right) => left.id - right.id);
  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  for (const object of objects) {
    offsets[object.id] = pdf.length;
    pdf += `${object.id} 0 obj\n${object.body}\nendobj\n`;
  }
  const xrefAt = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let number = 1; number <= objects.length; number += 1) pdf += `${String(offsets[number]).padStart(10, "0")} 00000 n \n`;
  pdf += `trailer << /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefAt}\n%%EOF`;
  return new File([pdf], "synthetic.pdf", { type: "application/pdf" });
}

function encryptedFixture(): File {
  const bytes = readFileSync(new URL("./fixtures/synthetic-aes-cibil.pdf", import.meta.url));
  return new File([bytes], "synthetic-aes-cibil.pdf", { type: "application/pdf" });
}

test("a correct password decrypts an AES-256 CIBIL PDF and parses it", async () => {
  const report = await extractCreditReport(encryptedFixture(), PASSWORD);
  assert.equal(report.creditScore, 742);
  assert.equal(report.accounts[0]?.accountType, "Personal Loan");
  assert.equal(report.personalInfo.panMasked, "");
});

test("a blank or wrong password is not described as the wrong report type", async () => {
  await assert.rejects(extractCreditReport(encryptedFixture(), ""), /password-protected/);
  await assert.rejects(extractCreditReport(encryptedFixture(), "not-the-password"), /did not unlock/);
  for (const attempt of ["", "not-the-password"]) {
    await assert.rejects(extractCreditReport(encryptedFixture(), attempt), (error: Error) => {
      assert.equal(/not a supported CIBIL|Could not parse/i.test(error.message), false);
      assert.equal(error.message.includes(PASSWORD), false);
      assert.equal(error.message.includes("not-the-password"), false);
      return true;
    });
  }
});

test("an unlocked PDF that is not a credit report is rejected without saving a report", async () => {
  await assert.rejects(extractCreditReport(buildTextPdf([["Grocery list", "milk and rice"]]), ""), /not a supported CIBIL/);
});

test("an 81-page text PDF is read through the last page", async () => {
  assert.equal(creditPageLimitMessage(81), null);
  const pages = Array.from({ length: 81 }, () => ["Continuation page"]);
  pages[80] = ["CIBIL TRANSUNION SCORE: 755", ...ACCOUNT];
  const report = await extractCreditReport(buildTextPdf(pages), "");
  assert.equal(report.creditScore, 755);
  assert.equal(report.accounts.length, 1);
});

test("markers split across pages still count as a CIBIL report", () => {
  assert.equal(looksLikeCreditReport("TRANS\nUNION consumer report"), true);
  const report = parseCibilText("CI\nBIL\nSCORE: 710\nMEMBER NAME: ICICI BANK\nACCOUNT TYPE: 10\nCURRENT BALANCE: 4000\nCREDIT LIMIT: 20000\n", "split-pages", "2026-09-25T00:00:00.000Z");
  assert.equal(report.creditScore, 710);
  assert.equal(report.summary.totalCreditCards, 1);
});

test("corrupt, empty, and incomplete files fail with specific errors and no report object", async () => {
  const corrupt = new File([new Uint8Array([1, 2, 3, 4])], "broken.pdf", { type: "application/pdf" });
  await assert.rejects(extractCreditReport(corrupt, PASSWORD), /not a valid PDF/);
  await assert.rejects(extractCreditReport(buildTextPdf([[" "]]), ""), /No selectable text/);
  assert.throws(() => parseCibilText("CIBIL TRANSUNION\nno accounts here", "incomplete", "2026-09-25T00:00:00.000Z"), /could not be read/);
  assert.equal(mapCreditPdfError({ name: "PasswordException", code: 1 }).message.includes(PASSWORD), false);
});

test("reconstructed reading order and the large gauge digits produce a report", () => {
  const items = [
    { str: "CONSUMER LOAN", transform: [12, 0, 0, 12, 220, 500], width: 110 },
    { str: "TYPE:", transform: [11, 0, 0, 11, 72, 500], width: 36 },
    { str: "7", transform: [32, 0, 0, 32, 90, 700], width: 18 },
    { str: "3", transform: [32, 0, 0, 32, 112, 700], width: 18 },
    { str: "8", transform: [32, 0, 0, 32, 134, 700], width: 18 },
    { str: "300", transform: [8, 0, 0, 8, 40, 660], width: 20 },
    { str: "900", transform: [8, 0, 0, 8, 180, 660], width: 20 },
    { str: "CIBIL", transform: [10, 0, 0, 10, 72, 740], width: 40 },
    { str: "OPENED:", transform: [11, 0, 0, 11, 72, 470], width: 52 },
    { str: "02-10-2023", transform: [11, 0, 0, 11, 220, 470], width: 70 },
    { str: "CURRENT BALANCE:", transform: [11, 0, 0, 11, 72, 448], width: 110 },
    { str: "1,200", transform: [11, 0, 0, 11, 220, 448], width: 36 },
  ];
  const text = itemsToText(items);
  assert.match(text, /TYPE: CONSUMER LOAN/);
  assert.equal(prominentScore(items), 738);
  const report = parseCibilText(`CIBIL TRANSUNION SCORE: ${prominentScore(items)}\n${text}`, "gauge", "2026-09-25T00:00:00.000Z");
  assert.equal(report.creditScore, 738);
  assert.equal(report.accounts[0]?.accountType, "CONSUMER LOAN");
  assert.equal(report.accounts[0]?.currentBalance, 1200);
  assert.equal(report.accounts[0]?.dateOpened, "2023-10-02");
});
