import { parseCibilText, type CreditReport } from "./credit-report.ts";

export const MAX_CREDIT_PAGES = 200;
const EMPTY_TEXT = "No selectable text was found in this PDF. Scanned image reports are not supported.";
const EXTRACT_FAILED = "Text could not be extracted from this PDF.";

export function creditPageLimitMessage(pageCount: number): string | null {
  if (pageCount > MAX_CREDIT_PAGES) {
    return `This PDF has ${pageCount} pages. Clearbook reads text-based credit reports up to ${MAX_CREDIT_PAGES} pages.`;
  }
  return null;
}

/** Map a PDF-library failure to a message that never includes the password or document text. */
export function mapCreditPdfError(error: unknown): Error {
  const name = error instanceof Error ? error.name : "";
  const code = typeof error === "object" && error && "code" in error ? Number(error.code) : 0;
  if (name === "PasswordException" && code === 2) return new Error("That password did not unlock this PDF. Check it and try again.");
  if (name === "PasswordException") return new Error("This PDF is password-protected. Enter the password and try again.");
  return new Error("The uploaded file is not a valid PDF");
}

type TextItem = { str?: string; transform?: number[]; width?: number; height?: number };

type Glyph = { str: string; x: number; y: number; size: number; width: number };

function glyphOf(item: TextItem): Glyph | null {
  const str = item.str ?? "";
  if (!str.trim()) return null;
  const x = item.transform?.[4] ?? 0;
  const y = item.transform?.[5] ?? 0;
  const size = Math.max(1, Math.hypot(item.transform?.[2] ?? 0, item.transform?.[3] ?? 0) || Math.hypot(item.transform?.[0] ?? 0, item.transform?.[1] ?? 0) || 10);
  const width = item.width && item.width > 0 ? item.width : Math.max(str.trim().length, 1) * size * 0.45;
  return { str, x, y, size, width };
}

function lineGroups(items: TextItem[]): Glyph[][] {
  const glyphs = items.map(glyphOf).filter((glyph): glyph is Glyph => Boolean(glyph));
  glyphs.sort((a, b) => b.y - a.y || a.x - b.x);
  const lines: Glyph[][] = [];
  for (const glyph of glyphs) {
    const line = lines.find((row) => Math.abs(row[0].y - glyph.y) <= Math.max(3, row[0].size, glyph.size) * 0.45);
    if (line) line.push(glyph);
    else lines.push([glyph]);
  }
  for (const line of lines) line.sort((a, b) => a.x - b.x);
  return lines;
}

export function itemsToText(items: TextItem[]): string {
  return lineGroups(items).map((line) => {
    let text = "";
    let cursor = -1;
    for (const glyph of line) {
      const gap = cursor < 0 ? 0 : glyph.x - cursor;
      text += `${text && gap > Math.max(glyph.size * 0.28, 1.5) ? " " : ""}${glyph.str}`;
      cursor = Math.max(cursor, glyph.x + glyph.width);
    }
    return text.replace(/[ \t]{2,}/g, " ").trim();
  }).filter(Boolean).join("\n");
}

/** The gauge score is usually the largest 3-digit number on the page, even when its label is far away. */
export function prominentScore(items: TextItem[]): number | null {
  const best: { value: number | null; size: number } = { value: null, size: 0 };
  for (const line of lineGroups(items)) {
    let token = "";
    let size = 0;
    let lastX = -1;
    const consider = () => {
      if (!/^\d{3}$/.test(token)) return;
      const value = Number(token);
      if (value < 300 || value > 900 || value === 300 || value === 900) return;
      if (best.value == null || size > best.size + 0.5) {
        best.value = value;
        best.size = size;
      }
    };
    for (const glyph of line) {
      const gap = lastX < 0 ? 0 : glyph.x - lastX;
      if (token && (gap > Math.max(size, glyph.size) * 0.8 || !/^\d+$/.test(glyph.str.trim()))) {
        consider();
        token = "";
        size = 0;
      }
      if (/^\d+$/.test(glyph.str.trim())) {
        token += glyph.str.trim();
        size = Math.max(size, glyph.size);
        lastX = glyph.x + glyph.width;
      }
    }
    consider();
  }
  return best.value;
}

async function loadPdfjs() {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  if (!pdfjs.GlobalWorkerOptions.workerSrc) {
    try {
      const worker = await import("pdfjs-dist/build/pdf.worker.min.mjs?url");
      pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
    } catch {
      pdfjs.GlobalWorkerOptions.workerSrc = new URL(
        "../../../node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs",
        import.meta.url,
      ).href;
    }
  }
  return pdfjs;
}

export async function extractCreditReport(file: File, password: string): Promise<CreditReport> {
  if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
    throw new Error("The uploaded file is not a valid PDF");
  }
  if (file.size > 10 * 1024 * 1024) throw new Error("File size exceeds 10MB limit");
  const pdfjs = await loadPdfjs();
  const provided = password.trim();
  let pdf: Awaited<ReturnType<typeof pdfjs.getDocument>["promise"]>;
  try {
    pdf = await pdfjs.getDocument({
      data: new Uint8Array(await file.arrayBuffer()),
      password: provided || undefined,
      disableFontFace: true,
      useSystemFonts: true,
    }).promise;
  } catch (error) {
    throw mapCreditPdfError(error);
  }
  try {
    const tooLong = creditPageLimitMessage(pdf.numPages);
    if (tooLong) throw new Error(tooLong);
    let text = "";
    const items: TextItem[] = [];
    for (let pageNo = 1; pageNo <= pdf.numPages; pageNo += 1) {
      let content: { items: TextItem[] };
      try {
        content = await (await pdf.getPage(pageNo)).getTextContent() as { items: TextItem[] };
      } catch {
        throw new Error(EXTRACT_FAILED);
      }
      items.push(...(content.items as TextItem[]));
      text += `${itemsToText(content.items)}\n`;
    }
    if (!/[A-Za-z]{4,}/.test(text)) throw new Error(EMPTY_TEXT);
    try {
      return parseCibilText(text, crypto.randomUUID(), new Date().toISOString());
    } catch (error) {
      const score = prominentScore(items);
      if (!(error instanceof Error) || !/could not be read/.test(error.message) || score == null) throw error;
      return parseCibilText(`CIBIL TRANSUNION SCORE: ${score}\n${text}`, crypto.randomUUID(), new Date().toISOString());
    }
  } finally {
    await pdf.destroy();
  }
}
