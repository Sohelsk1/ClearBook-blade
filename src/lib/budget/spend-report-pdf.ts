import { categoryById, formatDay, formatMoney, inRange, type CurrencyCode, type Transaction } from "./model.ts";
import { scoreStatement } from "./saver-score.ts";

export type SpendReportInput = {
  periodLabel: string;
  currency: CurrencyCode;
  transactions: Transaction[];
  start: string;
  end: string;
  incomeCents: number;
  expenseCents: number;
  categories: { label: string; cents: number }[];
};

function ascii(value: string): string {
  return value
    .replaceAll("₹", "Rs ")
    .replaceAll("–", "-")
    .replaceAll("—", "-")
    .replace(/[^\x20-\x7E]/g, "");
}

function wrap(value: string, width: number): string[] {
  const words = ascii(value).split(/\s+/).filter(Boolean);
  if (words.length === 0) return [""];
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (next.length > width && line) {
      lines.push(line);
      line = word;
    } else line = next;
  }
  if (line) lines.push(line);
  return lines;
}

function escapePdf(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

export function spendReportLines(input: SpendReportInput): string[] {
  const scored = scoreStatement(input.transactions, input.start, input.end, input.currency);
  const money = (cents: number) => formatMoney(cents, input.currency);
  const left = input.incomeCents - input.expenseCents;
  const lines = [
    "Clearbook spend report",
    `Period: ${input.periodLabel}`,
    "",
    "Your spend score",
    scored?.score == null ? "No score yet" : `${scored.score} of 100`,
    scored?.score == null ? "Add income and spending to get a score." : scored.level === "excellent" ? "Excellent. You spent less than you got." : scored.level === "critical" ? "Critical. You spent too much of the money that came in." : "Not enough spending yet.",
    "",
    "This is not a CIBIL or bank credit score.",
    "It only uses the money in this statement.",
    "",
    `Money in: ${money(input.incomeCents)}`,
    `Money out: ${money(input.expenseCents)}`,
    `Left: ${money(left)}`,
    "",
    "What to do",
  ];
  if (!scored || scored.tips.length === 0) lines.push("No tips yet.");
  else {
    for (const tip of scored.tips) {
      lines.push(`- ${tip.title}`);
      lines.push(`  ${tip.detail}`);
    }
  }
  lines.push("", "Where the money went");
  if (input.categories.length === 0) lines.push("No spending categories yet.");
  else {
    for (const category of input.categories.slice(0, 8)) {
      const share = input.expenseCents > 0 ? Math.round((category.cents / input.expenseCents) * 100) : 0;
      lines.push(`- ${category.label}: ${money(category.cents)} (${share}%)`);
    }
  }
  const payments = input.transactions
    .filter((tx) => tx.kind === "expense" && inRange(tx.date, input.start, input.end) && tx.amountCents > 0)
    .sort((a, b) => b.amountCents - a.amountCents)
    .slice(0, 8);
  lines.push("", "Biggest payments");
  if (payments.length === 0) lines.push("No payments in this period.");
  else {
    for (const tx of payments) {
      const name = (tx.merchant || tx.note || categoryById(tx.categoryId)?.label || "Payment").trim();
      lines.push(`- ${formatDay(tx.date)}  ${name}  ${money(tx.amountCents)}`);
    }
  }
  lines.push("", "Made on this device from your own records. Nothing here was sent to a credit bureau.");
  return lines;
}

export function buildSpendReportPdf(input: SpendReportInput): Uint8Array {
  const wrapped: string[] = [];
  for (const line of spendReportLines(input)) wrapped.push(...wrap(line, 86));
  const pages: string[][] = [];
  for (let index = 0; index < wrapped.length; index += 44) pages.push(wrapped.slice(index, index + 44));
  if (pages.length === 0) pages.push(["Clearbook spend report"]);

  const objects: { id: number; body: string }[] = [];
  const fontId = 3 + pages.length * 2;
  const kids: number[] = [];
  let id = 3;
  for (const pageLines of pages) {
    const pageId = id++;
    const contentId = id++;
    kids.push(pageId);
    const ops = ["BT /F1 11 Tf", ...pageLines.map((line, index) => `1 0 0 1 54 ${760 - index * 16} Tm (${escapePdf(ascii(line))}) Tj`), "ET"].join("\n");
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
  return new TextEncoder().encode(pdf);
}

export function downloadSpendReport(input: SpendReportInput) {
  const raw = buildSpendReportPdf(input);
  const copy = new ArrayBuffer(raw.byteLength);
  new Uint8Array(copy).set(raw);
  const blob = new Blob([copy], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "clearbook-spend-report.pdf";
  link.click();
  URL.revokeObjectURL(url);
}
