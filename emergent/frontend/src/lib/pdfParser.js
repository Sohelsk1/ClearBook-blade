const MONTHS = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 };

function pad(value) {
  return String(value).padStart(2, '0');
}

function toIso(year, month, day) {
  const y = Number(year);
  const m = Number(month);
  const d = Number(day);
  if (!y || !m || !d || m > 12 || d > 31) return '';
  return `${y}-${pad(m)}-${pad(d)}`;
}

export function parseDateToken(token) {
  if (!token) return '';
  let match = token.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (match) return toIso(match[1], match[2], match[3]);
  match = token.match(/^(\d{2})[\/\-.](\d{2})[\/\-.](\d{4})$/);
  if (match) return toIso(match[3], match[2], match[1]);
  match = token.match(/^(\d{2})-([A-Za-z]{3})-(\d{4})$/);
  if (match) return toIso(match[3], MONTHS[match[2].toLowerCase()], match[1]);
  return '';
}

function guessCategory(text) {
  const value = text.toLowerCase();
  if (/swiggy|zomato|blinkit|restaurant|grocery|food/.test(value)) return 'food';
  if (/uber|ola|metro|rapido|irctc|petrol|fuel/.test(value)) return 'transport';
  if (/netflix|hotstar|spotify|prime|bookmyshow/.test(value)) return 'entertainment';
  if (/electricity|water|gas|bill|bescom|airtel|jio/.test(value)) return 'bills';
  if (/amazon|flipkart|myntra|nykaa|ajio/.test(value)) return 'shopping';
  if (/salary|payroll|acme/.test(value)) return 'salary';
  return 'other';
}

function guessMode(text) {
  const value = text.toUpperCase();
  if (value.includes('UPI')) return 'UPI';
  if (value.includes('NEFT')) return 'NEFT';
  if (value.includes('IMPS')) return 'IMPS';
  if (value.includes('CARD') || value.includes('POS')) return 'Card';
  if (value.includes('ATM')) return 'ATM';
  return 'Transfer';
}

function counterparty(text, direction) {
  const upi = text.match(/([a-z0-9._-]+)@[a-z0-9]+/i);
  if (upi) return upi[1].replace(/[._-]+/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
  const paid = text.match(/(?:PAID TO|TO)\s+([A-Z][A-Za-z .]{2,40})/);
  const received = text.match(/(?:RECEIVED FROM|FROM)\s+([A-Z][A-Za-z .]{2,40})/);
  const picked = direction === 'income' ? (received || paid) : (paid || received);
  if (!picked) return direction === 'income' ? 'Unknown sender' : 'Unknown receiver';
  return picked[1].replace(/\s+/g, ' ').trim();
}

function directionOf(text) {
  const value = text.toUpperCase();
  if (/RECEIVED|FROM |SALARY|CREDIT| CR\b|NEFT IN/.test(value) && !/PAID TO|TO /.test(value)) return 'income';
  if (/PAID TO|\bTO\b|DEBIT| DR\b|UPI\/|POS/.test(value)) return 'expense';
  if (/SALARY|RECEIVED|FROM /.test(value)) return 'income';
  return 'expense';
}

export function parseStatementText(text) {
  const lines = String(text || '').split(/\n+/).map((line) => line.replace(/\s+/g, ' ').trim()).filter(Boolean);
  const transactions = [];
  for (const line of lines) {
    const dateMatch = line.match(/(\d{4}-\d{2}-\d{2}|\d{2}[\/\-.]\d{2}[\/\-.]\d{4}|\d{2}-[A-Za-z]{3}-\d{4})/);
    if (!dateMatch) continue;
    const date = parseDateToken(dateMatch[1]);
    if (!date) continue;
    const amounts = [...line.matchAll(/(?:₹|Rs\.?|INR)?\s*([0-9]{1,3}(?:,[0-9]{3})+|[0-9]+)\.(\d{2})/g)].map((match) => Number(`${match[1].replace(/,/g, '')}.${match[2]}`));
    if (!amounts.length) continue;
    const amount = amounts.length > 1 ? amounts[amounts.length - 2] : amounts[0];
    if (!amount) continue;
    const direction = directionOf(line);
    const description = line.replace(dateMatch[1], '').replace(/(?:₹|Rs\.?|INR)?\s*[0-9,]+\.\d{2}/g, '').trim();
    transactions.push({
      id: crypto.randomUUID(),
      date,
      description,
      amount,
      direction,
      type: direction,
      counterparty: counterparty(description || line, direction),
      category: guessCategory(description || line),
      mode: guessMode(line),
    });
  }
  const dates = transactions.map((item) => item.date).sort();
  const totalIncome = transactions.filter((item) => item.direction === 'income').reduce((sum, item) => sum + item.amount, 0);
  const totalExpense = transactions.filter((item) => item.direction === 'expense').reduce((sum, item) => sum + item.amount, 0);
  return {
    transactions,
    statementStartDate: dates[0] || '',
    statementEndDate: dates[dates.length - 1] || '',
    totalIncome,
    totalExpense,
  };
}

function linesFromItems(items) {
  const rows = new Map();
  items.forEach((item) => {
    const y = Math.round(item.transform[5]);
    const key = [...rows.keys()].find((row) => Math.abs(row - y) < 2);
    const bucket = key ?? y;
    if (!rows.has(bucket)) rows.set(bucket, []);
    rows.get(bucket).push(item);
  });
  return [...rows.entries()]
    .sort((a, b) => b[0] - a[0])
    .map(([, row]) => row.sort((a, b) => a.transform[4] - b.transform[4]).map((item) => item.str).join(' '));
}

export async function parsePdfFile(file) {
  const pdfjs = await import('pdfjs-dist/build/pdf');
  pdfjs.GlobalWorkerOptions.workerSrc = 'https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js';
  const data = new Uint8Array(await file.arrayBuffer());
  const doc = await pdfjs.getDocument({ data }).promise;
  const pages = [];
  for (let index = 1; index <= doc.numPages; index += 1) {
    const page = await doc.getPage(index);
    const content = await page.getTextContent();
    pages.push(linesFromItems(content.items).join('\n'));
  }
  return parseStatementText(pages.join('\n'));
}
