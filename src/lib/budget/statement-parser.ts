export type PdfText = { str: string; transform: number[] };
export type StatementRow = {
  date: string;
  kind: "income" | "expense";
  amountCents: number;
  description: string;
  reference: string;
  balanceCents: number;
  /** Set when debit versus credit could not be checked against a running balance. */
  uncertain?: boolean;
};

const MONEY = /^\d{1,3}(?:,\d{2,3})*(?:\.\d{2})$|^\d+\.\d{2}$/;
const DATE = /^([0-3]\d)-([A-Za-z]{3})-(20\d{2})$/;
const MONTHS: Record<string, string> = { Jan: "01", Feb: "02", Mar: "03", Apr: "04", May: "05", Jun: "06", Jul: "07", Aug: "08", Sep: "09", Oct: "10", Nov: "11", Dec: "12" };
const MONTH_INDEX: Record<string, string> = { jan: "01", feb: "02", mar: "03", apr: "04", may: "05", jun: "06", jul: "07", aug: "08", sep: "09", oct: "10", nov: "11", dec: "12" };
const cents = (text: string) => Math.round(Number(text.replaceAll(",", "")) * 100);
const REFERENCE = /(?:UPI\s*\/\s*(?:DR|CR)\s*\/\s*\d+|IMPS\/[A-Za-z0-9]+|NEFT\/[A-Za-z0-9]+|IFT\/\d+|\b\d{10,}\b)/i;

const BANKS: [RegExp, string][] = [
  [/IDFC FIRST/i, "IDFC FIRST"],
  [/HDFC BANK/i, "HDFC"],
  [/ICICI BANK/i, "ICICI"],
  [/AXIS BANK/i, "Axis"],
  [/KOTAK/i, "Kotak"],
  [/STATE BANK OF INDIA/i, "SBI"],
  [/YES BANK/i, "Yes Bank"],
  [/PUNJAB NATIONAL BANK|\bPNB\b/i, "PNB"],
  [/BANK OF BARODA/i, "Baroda"],
  [/CANARA BANK/i, "Canara"],
  [/UNION BANK/i, "Union Bank"],
  [/INDUSIND/i, "IndusInd"],
  [/FEDERAL BANK/i, "Federal"],
  [/IDBI BANK/i, "IDBI"],
  [/AU SMALL FINANCE/i, "AU"],
  [/RBL BANK/i, "RBL"],
  [/BANK OF INDIA/i, "BOI"],
  [/INDIAN BANK/i, "Indian Bank"],
];

type Placed = { str: string; x: number; y: number };
type ColumnName = "debit" | "credit" | "balance" | "amount";
type Column = { name: ColumnName; x: number };
type MoneyBit = { cents: number; side?: "income" | "expense"; x: number };

/** IDFC FIRST Bank's selectable-text statement; returns no partial imports on ambiguity. */
export function parseIdfcStatement(pages: PdfText[][]): StatementRow[] {
  if (!pages.length || !pages[0].some((item) => /IDFC FIRST BANK/i.test(item.str))) throw new Error("This IDFC FIRST statement could not be read.");
  const result: StatementRow[] = [];
  let previousBalance: number | null = null;
  for (const page of pages) {
    const items = page.filter((item) => item.str.trim()).map((item) => ({ str: item.str.trim(), x: item.transform[4], y: item.transform[5] }));
    const header = items.find((item) => item.str === "Debit" && item.x > 350 && item.x < 440);
    if (!header) {
      if (items.some((item) => item.x < 95 && DATE.test(item.str))) throw new Error("Statement table could not be read.");
      continue;
    }
    const table = items.filter((item) => item.y < header.y - 8 && item.y > 45);
    const dates = table.filter((item) => item.x < 95 && DATE.test(item.str));
    const details = table.filter((item) => item.x >= 185 && item.x < 360 && !MONEY.test(item.str)).sort((a, b) => b.y - a.y || a.x - b.x);
    const blocks: typeof details[] = [];
    for (const item of details) {
      const block = blocks.at(-1);
      if (!block || block.at(-1)!.y - item.y > 14) blocks.push([item]);
      else block.push(item);
    }
    if (!dates.length && table.some((item) => item.x > 370 && MONEY.test(item.str))) throw new Error("No transactions could be read from a statement page.");
    for (const dateItem of dates) {
      const match = DATE.exec(dateItem.str)!;
      const date = `${match[3]}-${MONTHS[match[2]]}-${match[1]}`;
      if (!MONTHS[match[2]] || Number(match[1]) > new Date(Number(match[3]), Number(MONTHS[match[2]]), 0).getDate()) throw new Error("Invalid statement date.");
      const onLine = table.filter((item) => Math.abs(item.y - dateItem.y) < 2 && MONEY.test(item.str));
      const debit = onLine.find((item) => item.x >= 360 && item.x < 440);
      const credit = onLine.find((item) => item.x >= 440 && item.x < 520);
      const balance = onLine.find((item) => item.x >= 520);
      if (Number(Boolean(debit)) + Number(Boolean(credit)) !== 1 || !balance) throw new Error(`Amount columns could not be read for ${dateItem.str}.`);
      const candidates = blocks.filter((block) => block[0].y + 3 >= dateItem.y && block.at(-1)!.y - 3 <= dateItem.y);
      if (candidates.length !== 1) throw new Error(`Description could not be read for ${dateItem.str}.`);
      const block = candidates[0];
      blocks.splice(blocks.indexOf(block), 1);
      const description = block.map((item) => item.str).join(" ").replace(/\s+/g, " ").trim();
      const reference = REFERENCE.exec(description)?.[0]?.toUpperCase().replace(/\s+/g, "") ?? "";
      const amountCents = cents((debit ?? credit)!.str);
      const balanceCents = cents(balance.str);
      if (!Number.isSafeInteger(amountCents) || amountCents <= 0 || !Number.isSafeInteger(balanceCents)) throw new Error("Invalid statement amount.");
      if (previousBalance !== null && previousBalance + (credit ? amountCents : -amountCents) !== balanceCents) throw new Error(`Statement balance does not match on ${dateItem.str}.`);
      result.push({ date, kind: credit ? "income" : "expense", amountCents, description, reference, balanceCents });
      previousBalance = balanceCents;
    }
  }
  if (!result.length) throw new Error("No transactions found in the PDF.");
  return result;
}

export function detectBank(text: string): string {
  for (const [pattern, name] of BANKS) if (pattern.test(text)) return name;
  return "Bank";
}

function isoDate(year: string, month: string, day: string): string | null {
  const y = Number(year);
  const m = Number(month);
  const d = Number(day);
  if (!Number.isInteger(y) || m < 1 || m > 12 || d < 1 || d > new Date(y, m, 0).getDate()) return null;
  return `${year}-${month}-${String(d).padStart(2, "0")}`;
}

function parseDateToken(raw: string): string | null {
  const text = raw.trim();
  const named = /^([0-3]?\d)[-\/]([A-Za-z]{3})[-\/](\d{2}|\d{4})$/.exec(text) ?? /^([0-3]?\d)\s+([A-Za-z]{3})\s+(\d{2}|\d{4})$/.exec(text);
  if (named) {
    const month = MONTH_INDEX[named[2].toLowerCase()];
    if (!month) return null;
    const year = named[3].length === 2 ? `20${named[3]}` : named[3];
    return isoDate(year, month, named[1]);
  }
  const numeric = /^([0-3]?\d)[\/\-.]([01]?\d)[\/\-.](\d{2}|\d{4})$/.exec(text);
  if (!numeric) return null;
  const year = numeric[3].length === 2 ? `20${numeric[3]}` : numeric[3];
  return isoDate(year, numeric[2].padStart(2, "0"), numeric[1]);
}

function readMoney(raw: string): { cents: number; side?: "income" | "expense" } | null {
  const match = /^((?:\d{1,3}(?:,\d{2,3})+|\d+)\.\d{2})(?:\(?((?:dr|cr))\)?)?$/i.exec(raw.replace(/\s+/g, ""));
  if (!match) return null;
  const amount = cents(match[1]);
  if (!Number.isSafeInteger(amount) || amount < 0) return null;
  const mark = match[2]?.toLowerCase();
  return { cents: amount, side: mark === "dr" ? "expense" : mark === "cr" ? "income" : undefined };
}

function linesOf(items: Placed[]): Placed[][] {
  const sorted = [...items].sort((a, b) => b.y - a.y || a.x - b.x);
  const lines: Placed[][] = [];
  for (const item of sorted) {
    const line = lines.at(-1);
    if (!line || Math.abs(line[0].y - item.y) > 4) lines.push([item]);
    else line.push(item);
  }
  for (const line of lines) line.sort((a, b) => a.x - b.x);
  return lines;
}

function readHeader(line: Placed[]): Column[] | null {
  const text = line.map((item) => item.str).join(" ").toLowerCase();
  if (!/balance/.test(text) || !/(debit|withdrawal|credit|deposit|\bamount\b)/.test(text)) return null;
  const columns: Column[] = [];
  for (const item of line) {
    const word = item.str.toLowerCase();
    if (/debit|withdrawal/.test(word)) columns.push({ name: "debit", x: item.x });
    else if (/credit|deposit/.test(word)) columns.push({ name: "credit", x: item.x });
    else if (/balance/.test(word)) columns.push({ name: "balance", x: item.x });
    else if (/^amount/.test(word)) columns.push({ name: "amount", x: item.x });
  }
  return columns.some((column) => column.name === "balance") ? columns : null;
}

function columnFor(x: number, columns: Column[]): ColumnName | null {
  const sorted = [...columns].sort((a, b) => a.x - b.x);
  let name: ColumnName | null = null;
  for (let index = 0; index < sorted.length; index += 1) {
    const start = sorted[index].x - 36;
    const end = index + 1 < sorted.length ? sorted[index + 1].x - 12 : Number.POSITIVE_INFINITY;
    if (x >= start && x < end) name = sorted[index].name;
  }
  return name;
}

type Draft = { date: string; parts: string[]; amounts: MoneyBit[] };

function narrationKind(text: string): "income" | "expense" | null {
  if (/\bCR\b|UPI\/CR|NEFT[-\s/]*CR|IMPS[-\s/]*CR|\bSALARY\b|\bREFUND\b/i.test(text)) return "income";
  if (/\bDR\b|UPI\/DR|\bATM\b|\bWDL\b|\bPOS\b/i.test(text)) return "expense";
  return null;
}

/** Debit, credit, and running-balance tables used by most Indian banks. */
export function parseBankStatement(pages: PdfText[][]): StatementRow[] {
  const result: StatementRow[] = [];
  let previous: number | null = null;
  let columns: Column[] | null = null;
  let draft: Draft | null = null;

  const flush = () => {
    if (!draft) return;
    const date = draft.date;
    const text = draft.parts.join(" ").replace(/\s+/g, " ").trim();
    const amounts = draft.amounts.filter((amount) => amount.cents > 0);
    draft = null;
    if (/opening balance|brought forward|balance b\/f|^b\/f\b/i.test(text) && amounts.length <= 1) {
      if (amounts[0]) previous = amounts[0].cents;
      return;
    }
    if (/closing balance|grand total|^total\b|page total/i.test(text) && !/upi|neft|imps|atm/i.test(text)) return;

    let balance: number | null = null;
    let amount: MoneyBit | null = null;
    if (columns) {
      for (const money of amounts) {
        const column = columnFor(money.x, columns);
        if (column === "balance") balance = money.cents;
        else if (column === "debit" || column === "credit" || column === "amount") amount = { ...money, side: column === "debit" ? "expense" : column === "credit" ? "income" : money.side };
      }
    }
    if (balance == null || !amount) {
      const ordered = [...amounts].sort((a, b) => a.x - b.x);
      if (ordered.length >= 2) {
        balance = ordered[ordered.length - 1].cents;
        amount = amount ?? ordered[ordered.length - 2];
      } else if (ordered.length === 1) amount = amount ?? ordered[0];
    }
    if (!amount || amount.cents <= 0) return;

    let kind: "income" | "expense" | null = amount.side ?? null;
    let uncertain = !kind;
    if (balance != null && previous != null) {
      const delta = balance - previous;
      if (delta === amount.cents) { kind = "income"; uncertain = false; }
      else if (delta === -amount.cents) { kind = "expense"; uncertain = false; }
      else uncertain = true;
    }
    if (!kind) kind = narrationKind(text) ?? "expense";
    if (!amount.side && !narrationKind(text) && (balance == null || previous == null)) uncertain = true;
    if (balance != null && previous != null && previous + (kind === "income" ? amount.cents : -amount.cents) !== balance) uncertain = true;

    const reference = REFERENCE.exec(text)?.[0]?.toUpperCase().replace(/\s+/g, "") ?? "";
    result.push({
      date,
      kind,
      amountCents: amount.cents,
      description: text || "Bank transaction",
      reference,
      balanceCents: balance ?? previous ?? amount.cents,
      ...(uncertain ? { uncertain: true } : {}),
    });
    if (balance != null) previous = balance;
  };

  for (const page of pages) {
    const items = page.filter((item) => item.str.trim()).map((item) => ({ str: item.str.trim(), x: item.transform[4], y: item.transform[5] }));
    for (const line of linesOf(items)) {
      const header = readHeader(line);
      if (header) {
        columns = header;
        continue;
      }
      if (/^page \d+/i.test(line.map((item) => item.str).join(" "))) continue;
      const dateItem = line.find((item) => item.x < 180 && parseDateToken(item.str));
      const date = dateItem ? parseDateToken(dateItem.str) : null;
      const bits: MoneyBit[] = [];
      const words: string[] = [];
      for (const item of line) {
        if (dateItem && item === dateItem) continue;
        if (parseDateToken(item.str)) continue;
        const money = readMoney(item.str);
        if (money) bits.push({ ...money, x: item.x });
        else words.push(item.str);
      }
      const label = words.join(" ");
      if (!date && !draft && /opening balance|brought forward|balance b\/f|^b\/f\b/i.test(label)) {
        const opening = bits.filter((bit) => bit.cents > 0).at(-1);
        if (opening) previous = opening.cents;
        continue;
      }
      if (date) flush();
      if (date) draft = { date, parts: words, amounts: bits };
      else if (draft) {
        draft.parts.push(...words);
        draft.amounts.push(...bits);
      }
    }
  }
  flush();
  return result.filter((row) => row.date);
}

export async function extractStatement(file: File, password = ""): Promise<{ rows: StatementRow[]; bank: string }> {
  if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) throw new Error("Choose a PDF statement.");
  if (file.size > 10 * 1024 * 1024) throw new Error("PDF must be smaller than 10 MB.");
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const { default: workerSrc } = await import("pdfjs-dist/build/pdf.worker.min.mjs?url");
  pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;
  let pdf: Awaited<ReturnType<typeof pdfjs.getDocument>["promise"]>;
  try {
    pdf = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()), password: password.trim() || undefined, useSystemFonts: true }).promise;
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (/password/i.test(message)) throw new Error(password.trim() ? "That PDF password did not unlock the statement. Check the password and try again." : "This PDF is password-protected. Enter the PDF password below and try again.");
    throw new Error("Could not open this PDF.");
  }
  try {
    if (pdf.numPages > 50) throw new Error("Statement exceeds 50 pages.");
    const pages: PdfText[][] = [];
    for (let pageNo = 1; pageNo <= pdf.numPages; pageNo++) {
      const content = await (await pdf.getPage(pageNo)).getTextContent();
      pages.push(content.items.filter((item): item is PdfText & typeof item => "str" in item && "transform" in item).map((item) => ({ str: item.str, transform: item.transform })));
    }
    const text = pages.flat().map((item) => item.str).join(" ");
    if (text.trim().length < 40) throw new Error("This PDF has no selectable text. Download the statement from net banking instead of a scan or photo.");
    const bank = detectBank(text);
    if (/IDFC FIRST BANK/i.test(text)) return { rows: parseIdfcStatement(pages), bank: "IDFC FIRST" };
    const rows = parseBankStatement(pages);
    if (!rows.length) throw new Error("No transactions found. Use a text statement from your bank. Scanned photos are not supported.");
    return { rows, bank };
  } finally { await pdf.destroy(); }
}

/** @deprecated Use extractStatement. Kept so older imports still open any supported bank. */
export async function extractIdfcStatement(file: File): Promise<StatementRow[]> {
  return (await extractStatement(file)).rows;
}
