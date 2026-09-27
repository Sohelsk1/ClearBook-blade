/** Parsed CIBIL-style report. Amounts are rupees. The original PDF is not stored. */

export type CreditAccount = {
  id: string;
  memberName: string;
  accountType: string;
  accountTypeCode: string;
  accountNumberMasked: string;
  ownership: string;
  isCreditCard: boolean;
  dateOpened: string | null;
  dateClosed: string | null;
  isActive: boolean;
  sanctionedAmount: number;
  currentBalance: number;
  amountOverdue: number;
  creditLimit: number | null;
  cashLimit: number | null;
  emiAmount: number | null;
  repaymentTenure: number | null;
  paymentStatus: string;
  dpdHistory: string[];
  lastPaymentDate: string | null;
};

export type CreditEnquiry = {
  date: string;
  memberName: string;
  purpose: string;
  amount: number;
};

export type CreditSummary = {
  totalAccounts: number;
  activeAccounts: number;
  closedAccounts: number;
  overdueAccounts: number;
  totalOutstanding: number;
  totalOverdue: number;
  totalLoans: number;
  totalCreditCards: number;
  creditUtilizationPercent: number | null;
  onTimePaymentPercent: number | null;
  oldestAccountAgeMonths: number | null;
  totalEmi: number;
};

export type CreditReport = {
  id: string;
  creditScore: number | null;
  personalInfo: { name: string; dob: string; panMasked: string };
  summary: CreditSummary;
  accounts: CreditAccount[];
  enquiries: CreditEnquiry[];
  uploadedAt: string;
  reportDate: string | null;
};

const ACCOUNT_TYPES: Record<string, string> = {
  "01": "Auto Loan", "02": "Housing Loan", "03": "Property Loan", "04": "Loan Against Shares",
  "05": "Personal Loan", "06": "Consumer Loan", "07": "Gold Loan", "08": "Education Loan",
  "09": "Loan Against FD", "10": "Credit Card", "11": "Overdraft", "12": "Two Wheeler Loan",
  "13": "Business Loan", "31": "Secured Credit Card", "51": "Microfinance",
};

const MONTHS: Record<string, string> = {
  jan: "01", feb: "02", mar: "03", apr: "04", may: "05", jun: "06",
  jul: "07", aug: "08", sep: "09", oct: "10", nov: "11", dec: "12",
};

export function formatInr(amount: number): string {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(amount);
}

export function scoreRating(score: number | null): { label: string; tone: "excellent" | "good" | "fair" | "below" | "poor" | "none" } {
  if (score == null) return { label: "No score", tone: "none" };
  if (score >= 800) return { label: "Excellent", tone: "excellent" };
  if (score >= 750) return { label: "Good", tone: "good" };
  if (score >= 650) return { label: "Fair", tone: "fair" };
  if (score >= 550) return { label: "Below Average", tone: "below" };
  return { label: "Poor", tone: "poor" };
}

export function normalizeReportText(text: string): string {
  return text.replace(/[\u0000\u00ad\u200b-\u200d\ufeff]/g, "").replace(/[\u2010-\u2015\u2212]/g, "-").normalize("NFKC");
}

export function looksLikeCreditReport(text: string): boolean {
  const source = normalizeReportText(text);
  if (/cibil|trans[\s-]*union|credit[\s-]*vision|credit[\s-]*information[\s-]*bureau|consumer[\s-]*cir/i.test(source)) return true;
  const compact = source.toLowerCase().replace(/[^a-z0-9]+/g, "");
  return compact.includes("cibil") || compact.includes("transunion") || compact.includes("creditvision");
}

function collapseLetterSpacing(text: string): string {
  const horizontal = text.replace(/(?:[A-Za-z0-9][ \t]){3,}[A-Za-z0-9]/g, (run) => run.replace(/[ \t]+/g, ""));
  const lines = horizontal.split("\n");
  const merged: string[] = [];
  let buffer = "";
  const flush = () => {
    if (!buffer) return;
    merged.push(buffer);
    buffer = "";
  };
  for (const line of lines) {
    const trimmed = line.trim();
    if (/^[A-Za-z0-9®]$/.test(trimmed)) buffer += trimmed.replace("®", "");
    else {
      flush();
      if (trimmed) merged.push(trimmed);
    }
  }
  flush();
  return merged.join("\n");
}

function prepareReportText(text: string): string {
  return collapseLetterSpacing(normalizeReportText(text).replace(/[®™©]/g, ""))
    .replace(/MEMBERNAME/gi, "MEMBER NAME")
    .replace(/ACCOUNTTYPE/gi, "ACCOUNT TYPE")
    .replace(/ACCOUNTNUMBER/gi, "ACCOUNT NUMBER")
    .replace(/CURRENTBALANCE/gi, "CURRENT BALANCE")
    .replace(/SANCTIONEDAMOUNT/gi, "SANCTIONED AMOUNT")
    .replace(/AMOUNTOVERDUE/gi, "AMOUNT OVERDUE")
    .replace(/CREDITLIMIT/gi, "CREDIT LIMIT")
    .replace(/DATEOPENED/gi, "DATE OPENED")
    .replace(/DATECLOSED/gi, "DATE CLOSED");
}

function money(value: string | null): number {
  if (!value) return 0;
  const amount = Number(value.replace(/[₹,\s]/g, "").replace(/[^0-9.]/g, ""));
  return Number.isFinite(amount) ? Math.round(amount) : 0;
}

function optionalMoney(value: string | null): number | null {
  if (!value || !/\d/.test(value)) return null;
  return money(value);
}

export function parseReportDate(value: string | null): string | null {
  if (!value) return null;
  const text = value.trim().slice(0, 40);
  const numeric = /(\d{2})[\/\-.](\d{2})[\/\-.](\d{4})/.exec(text);
  if (numeric) return `${numeric[3]}-${numeric[2]}-${numeric[1]}`;
  const named = /(\d{2})[\/\-.]([A-Za-z]{3})[\/\-.](\d{4})/.exec(text);
  if (!named) return null;
  const month = MONTHS[named[2].toLowerCase()];
  return month ? `${named[3]}-${month}-${named[1]}` : null;
}

function field(block: string, labels: string[]): string | null {
  const names = labels.map((label) => label.trim().split(/\s+/).map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("\\s+")).join("|");
  const value = new RegExp(`(?:^|\\n)\\s*(?:${names})\\s*[:\\-]?\\s*(?:\\n\\s*)?([^\\n]+)`, "i").exec(`\n${block}`)?.[1]?.trim();
  if (!value || /^(member name|account type|account number|date opened|date closed|type)$/i.test(value)) return null;
  return value.slice(0, 120);
}

function maskPan(pan: string): string {
  return `XXXXX${pan.slice(5, 9)}X`;
}

function resolveType(raw: string | null): { code: string; name: string; card: boolean } {
  if (!raw) return { code: "", name: "Other", card: false };
  const cleaned = raw.replace(/\s+/g, " ").replace(/[^A-Za-z0-9 ()/-].*$/, "").trim();
  const digits = cleaned.replace(/\D/g, "");
  const code = digits.length === 1 || digits.length === 2 ? digits.padStart(2, "0") : "";
  if (code && ACCOUNT_TYPES[code] && cleaned.length <= 3) return { code, name: ACCOUNT_TYPES[code], card: code === "10" || code === "31" };
  const card = /credit card/i.test(cleaned);
  return { code: code && ACCOUNT_TYPES[code] ? code : "", name: (ACCOUNT_TYPES[code] && cleaned.length <= 3 ? ACCOUNT_TYPES[code] : cleaned.slice(0, 40)) || "Other", card };
}

function dpdHistory(block: string): string[] {
  const tokens: string[] = [];
  for (const line of block.split("\n")) {
    const parts = line.trim().split(/\s+/).filter(Boolean);
    if (parts.length && parts.every((part) => /^(?:STD|XXX|SUB|DBT|LSS|\d{3})$/.test(part))) tokens.push(...parts);
  }
  return tokens.slice(-36);
}

function monthsBetween(opened: string, asOf: string): number | null {
  const start = /^(\d{4})-(\d{2})-(\d{2})$/.exec(opened);
  const end = /^(\d{4})-(\d{2})-(\d{2})/.exec(asOf);
  if (!start || !end) return null;
  return Math.max(0, (Number(end[1]) - Number(start[1])) * 12 + (Number(end[2]) - Number(start[2])));
}

function parseAccounts(text: string): CreditAccount[] {
  const label = /\b(member\s+name|account\s+number|acct\s+number|account\s+type|acct\s+type|credit\s+facility\s+status|date\s+opened(?:\s*\/\s*disbursed)?|date\s+closed|date\s+of\s+last\s+payment|last\s+payment|current\s+balance|sanctioned(?:\s+amount)?|high\s+credit|amount\s+overdue|credit\s+limit|cash\s+limit|emi(?:\s+amount)?|repayment\s+tenure|payment\s+status|account\s+status|ownership|(?<![a-z])opened|(?<![a-z])closed|(?<![a-z])overdue|(?<![a-z])type)\b\s*[:\-]?\s*/gi;
  const hits = [...text.matchAll(label)];
  type Draft = {
    member: string; type: string; number: string; opened: string; closed: string; balance: string;
    sanctioned: string; overdue: string; limit: string; cash: string; emi: string; tenure: string;
    status: string; ownership: string; lastPayment: string; slice: string;
  };
  const empty = (): Draft => ({ member: "", type: "", number: "", opened: "", closed: "", balance: "", sanctioned: "", overdue: "", limit: "", cash: "", emi: "", tenure: "", status: "", ownership: "", lastPayment: "", slice: "" });
  const drafts: Draft[] = [];
  let draft = empty();
  const put = (key: keyof Draft, value: string) => {
    const clean = value.replace(/\s+/g, " ").replace(/^[:\-]\s*/, "").trim().slice(0, 80);
    if (!clean || /^(member name|account type|account number|type|opened|closed)$/i.test(clean)) return;
    if (!draft[key]) draft[key] = clean;
  };
  for (let index = 0; index < hits.length; index += 1) {
    const hit = hits[index];
    const name = hit[1].toLowerCase().replace(/\s+/g, " ");
    const from = (hit.index ?? 0) + hit[0].length;
    const to = hits[index + 1]?.index ?? Math.min(text.length, from + 180);
    const value = text.slice(from, to).split("\n").map((line) => line.trim()).find(Boolean) ?? "";
    const startsAccount = (/member name/.test(name) && Boolean(draft.member || draft.type || draft.balance || draft.sanctioned))
      || (/account number|acct number/.test(name) && Boolean(draft.number));
    if (startsAccount && (draft.member || draft.type || draft.balance || draft.sanctioned)) {
      drafts.push(draft);
      draft = empty();
    }
    draft.slice += text.slice(hit.index ?? 0, to);
    if (/member name/.test(name)) put("member", value);
    else if (/account number|acct number/.test(name)) put("number", value);
    else if (/account type|acct type|^type$/.test(name) && plausibleType(value)) put("type", value);
    else if (/opened/.test(name)) put("opened", value);
    else if (/^closed$|date closed/.test(name)) put("closed", value);
    else if (/current balance/.test(name)) put("balance", value);
    else if (/sanctioned|high credit/.test(name)) put("sanctioned", value);
    else if (/overdue/.test(name)) put("overdue", value);
    else if (/credit limit/.test(name)) put("limit", value);
    else if (/cash limit/.test(name)) put("cash", value);
    else if (/^emi/.test(name)) put("emi", value);
    else if (/tenure/.test(name)) put("tenure", value);
    else if (/status/.test(name)) put("status", value);
    else if (/ownership/.test(name)) put("ownership", value);
    else if (/last payment/.test(name)) put("lastPayment", value);
  }
  if (draft.member || draft.type || draft.balance || draft.sanctioned) drafts.push(draft);
  const accounts: CreditAccount[] = [];
  for (const item of drafts) {
    if (!item.type && !item.member) continue;
    if (!item.type && !item.balance && !item.sanctioned && !item.opened) continue;
    const type = resolveType(item.type || null);
    const closed = parseReportDate(item.closed);
    const status = item.status || (closed ? "Closed" : "Standard");
    const writtenOff = /written[-\s]?off|\bWO\b|\bloss\b/i.test(status);
    accounts.push({
      id: `${accounts.length + 1}-${(item.member || "account").slice(0, 24)}`,
      memberName: (item.member || "Unknown lender").slice(0, 80),
      accountType: type.name,
      accountTypeCode: type.code,
      accountNumberMasked: item.number.replace(/\d(?=\d{4})/g, "X").slice(0, 24),
      ownership: (item.ownership || "Individual").slice(0, 40),
      isCreditCard: type.card,
      dateOpened: parseReportDate(item.opened),
      dateClosed: closed,
      isActive: !closed && !writtenOff && !/closed/i.test(status),
      sanctionedAmount: money(item.sanctioned),
      currentBalance: money(item.balance),
      amountOverdue: money(item.overdue),
      creditLimit: optionalMoney(item.limit),
      cashLimit: optionalMoney(item.cash),
      emiAmount: optionalMoney(item.emi),
      repaymentTenure: optionalMoney(item.tenure),
      paymentStatus: status.slice(0, 40),
      dpdHistory: dpdHistory(item.slice),
      lastPaymentDate: parseReportDate(item.lastPayment),
    });
    if (accounts.length >= 80) break;
  }
  return accounts;
}

function plausibleType(value: string): boolean {
  const text = value.replace(/\s+/g, " ").trim();
  if (/^\d{1,2}\b/.test(text)) return true;
  return /\b(?:loan|card|overdraft|housing|auto|gold|consumer|education|property|tractor|business|microfinance|credit|wheeler|mortgage)\b/i.test(text);
}

const PRODUCT_LINE = /^(?:housing loan|home loan|personal loan|auto loan|car loan|vehicle loan|two wheeler loan|credit card|consumer loan|gold loan|education loan|business loan|property loan|tractor loan|overdraft|microfinance|secured credit card|used car loan|loan against (?:property|shares|fd|securities))$/i;

function parseLooseAccounts(text: string): CreditAccount[] {
  const lines = text.split("\n").map((line) => line.trim()).filter(Boolean);
  const accounts: CreditAccount[] = [];
  const seen = new Set<string>();
  for (let index = 0; index < lines.length; index += 1) {
    const typeName = lines[index].replace(/[:\-]+$/g, "").trim();
    if (!PRODUCT_LINE.test(typeName)) continue;
    const window = lines.slice(index + 1, index + 16);
    const opened = window.map((line) => parseReportDate(line)).find((date): date is string => Boolean(date)) ?? null;
    const amounts = window.flatMap((line) => [...line.matchAll(/(?:₹\s*)?(\d{1,3}(?:,\d{2,3})+|\d{3,})/g)].map((match) => money(match[1]))).filter((value) => value >= 100);
    const lender = window.find((line) => /[A-Za-z]{4,}/.test(line) && !PRODUCT_LINE.test(line.replace(/[:\-]+$/g, "")) && !/balance|opened|sanctioned|overdue|ownership|status|reported|payment|account|individual|guarantor|active|closed|score|range|history/i.test(line));
    if (!opened && !amounts.length) continue;
    const key = `${typeName}|${opened ?? ""}|${amounts[0] ?? 0}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const type = resolveType(typeName);
    accounts.push({
      id: `${accounts.length + 1}-${(lender ?? "account").slice(0, 24)}`,
      memberName: (lender ?? "Unknown lender").slice(0, 80),
      accountType: type.name,
      accountTypeCode: type.code,
      accountNumberMasked: "",
      ownership: "Individual",
      isCreditCard: type.card,
      dateOpened: opened,
      dateClosed: null,
      isActive: true,
      sanctionedAmount: amounts[0] ?? 0,
      currentBalance: amounts[1] ?? amounts[0] ?? 0,
      amountOverdue: 0,
      creditLimit: type.card ? (amounts[0] ?? null) : null,
      cashLimit: null,
      emiAmount: null,
      repaymentTenure: null,
      paymentStatus: "Standard",
      dpdHistory: [],
      lastPaymentDate: null,
    });
    if (accounts.length >= 80) break;
  }
  return accounts;
}

function parseEnquiries(text: string): CreditEnquiry[] {
  const body = (text.split(/\n\s*ENQUIR(?:Y|IES)\b/i)[1] ?? "").split(/\n\s*(?:SCORE|ACCOUNT|CONSUMER|PERSONAL)\b/i)[0] ?? "";
  const rows: CreditEnquiry[] = [];
  for (const block of body.split(/\n(?=\s*DATE\b)/i).slice(1)) {
    const date = parseReportDate(field(block, ["DATE", "DATE OF ENQUIRY"]));
    if (!date) continue;
    rows.push({
      date,
      memberName: (field(block, ["MEMBER NAME", "LENDER"]) ?? "Unknown").slice(0, 80),
      purpose: (field(block, ["ENQUIRY PURPOSE", "PURPOSE"]) ?? "Enquiry").slice(0, 60),
      amount: money(field(block, ["ENQUIRY AMOUNT", "AMOUNT"])),
    });
  }
  if (rows.length) return rows.slice(0, 40);
  for (const line of body.split("\n")) {
    const match = /^(\d{2}[\/\-.]\d{2}[\/\-.]\d{4}|\d{2}[\/\-.][A-Za-z]{3}[\/\-.]\d{4})\s*\|\s*([^|]+)\|\s*([^|]+)\|\s*([0-9,]+)/.exec(line.trim());
    if (!match) continue;
    const date = parseReportDate(match[1]);
    if (!date) continue;
    rows.push({ date, memberName: match[2].trim().slice(0, 80), purpose: match[3].trim().slice(0, 60), amount: money(match[4]) });
  }
  return rows.slice(0, 40);
}

export function summarize(accounts: CreditAccount[], asOf: string): CreditSummary {
  const cards = accounts.filter((account) => account.isCreditCard);
  const limit = cards.reduce((sum, account) => sum + (account.creditLimit ?? 0), 0);
  const used = cards.reduce((sum, account) => sum + account.currentBalance, 0);
  const known = accounts.flatMap((account) => account.dpdHistory).filter((token) => token !== "XXX");
  const onTime = known.filter((token) => token === "000" || token === "STD").length;
  const opened = accounts.map((account) => account.dateOpened).filter((date): date is string => Boolean(date)).sort();
  return {
    totalAccounts: accounts.length,
    activeAccounts: accounts.filter((account) => account.isActive).length,
    closedAccounts: accounts.filter((account) => !account.isActive).length,
    overdueAccounts: accounts.filter((account) => account.amountOverdue > 0).length,
    totalOutstanding: accounts.reduce((sum, account) => sum + account.currentBalance, 0),
    totalOverdue: accounts.reduce((sum, account) => sum + account.amountOverdue, 0),
    totalLoans: accounts.filter((account) => !account.isCreditCard).length,
    totalCreditCards: cards.length,
    creditUtilizationPercent: limit > 0 ? Math.round((used / limit) * 1000) / 10 : null,
    onTimePaymentPercent: known.length ? Math.round((onTime / known.length) * 1000) / 10 : null,
    oldestAccountAgeMonths: opened[0] ? monthsBetween(opened[0], asOf.slice(0, 10)) : null,
    totalEmi: accounts.reduce((sum, account) => sum + (account.emiAmount ?? 0), 0),
  };
}

function pickScore(values: number[]): number | null {
  const unique = [...new Set(values.filter((value) => value >= 300 && value <= 900))];
  const inner = unique.filter((value) => value !== 300 && value !== 900);
  if (inner.length) return inner[0];
  return unique.length === 1 ? unique[0] : null;
}

function readScore(source: string): number | null {
  const found: number[] = [];
  const patterns = [
    /(?:cibil|transunion|creditvision|credit)[\s-]*scores?[\s:\-]*(\d{3})\b/gi,
    /\b(\d{3})\b(?=[\s\S]{0,40}?(?:cibil|creditvision|transunion)[\s-]*scores?)/gi,
    /(?:cibil|transunion|creditvision)[\s-]*scores?(?:[\s\S]{0,160}?)(\d{3})\b/gi,
  ];
  for (const pattern of patterns) {
    for (const match of source.matchAll(pattern)) found.push(Number(match[1]));
  }
  const compact = source.toLowerCase().replace(/[^a-z0-9]+/g, "");
  const folded = /(?:cibil|transunion|creditvision)scores?(\d{3})/.exec(compact);
  if (folded) found.push(Number(folded[1]));
  return pickScore(found);
}

export function parseCibilText(text: string, id: string, uploadedAt: string): CreditReport {
  const source = prepareReportText(text).replace(/[ \t]+\n/g, "\n");
  if (!looksLikeCreditReport(source)) throw new Error("This PDF opened, but it is not a supported CIBIL/TransUnion report.");
  const creditScore = readScore(source);
  const pan = /\b([A-Z]{5}\d{4}[A-Z])\b/.exec(source)?.[1] ?? "";
  const labeled = parseAccounts(source);
  const accounts = labeled.length ? labeled : parseLooseAccounts(source);
  if (creditScore == null && accounts.length === 0) {
    throw new Error("This credit report opened, but the score and account sections could not be read.");
  }
  return {
    id,
    creditScore,
    personalInfo: {
      name: (field(source, ["CONSUMER NAME", "NAME"]) ?? "").slice(0, 80),
      dob: parseReportDate(field(source, ["DATE OF BIRTH", "DOB"])) ?? "",
      panMasked: pan ? maskPan(pan) : "",
    },
    summary: summarize(accounts, uploadedAt),
    accounts,
    enquiries: parseEnquiries(source),
    uploadedAt,
    reportDate: parseReportDate(field(source, ["REPORT DATE", "DATE", "DATE OF REPORT"])),
  };
}

export type CreditTip = { tone: "urgent" | "watch" | "good"; text: string };

export function creditTips(report: CreditReport): CreditTip[] {
  const tips: CreditTip[] = [];
  const { summary, accounts, enquiries } = report;
  if ((summary.creditUtilizationPercent ?? 0) > 30) tips.push({ tone: "watch", text: `Reduce credit card utilization below 30%. Currently at ${summary.creditUtilizationPercent}%.` });
  for (const account of accounts.filter((item) => item.amountOverdue > 0)) {
    tips.push({ tone: "urgent", text: `Clear overdue amount of ${formatInr(account.amountOverdue)} on ${account.memberName} to avoid further score damage.` });
  }
  if (summary.onTimePaymentPercent != null && summary.onTimePaymentPercent < 95) tips.push({ tone: "watch", text: `Maintain on-time payments. Your current rate is ${summary.onTimePaymentPercent}%.` });
  const recent = enquiries.filter((enquiry) => {
    const age = monthsBetween(enquiry.date, report.uploadedAt.slice(0, 10));
    return age != null && age <= 6;
  });
  if (recent.length > 3) tips.push({ tone: "watch", text: `Avoid applying for multiple loans or cards. You have ${recent.length} enquiries in the last 6 months.` });
  if (accounts.length > 0 && new Set(accounts.map((account) => account.accountType)).size < 2) {
    tips.push({ tone: "good", text: "A mix of account types can help a score. This report shows only one kind of credit." });
  }
  if (summary.oldestAccountAgeMonths != null && summary.oldestAccountAgeMonths < 24) {
    tips.push({ tone: "good", text: "Your credit history is young. Keep existing accounts open to build history." });
  }
  if (!tips.length) tips.push({ tone: "good", text: "Nothing in this report stands out as urgent. Keep paying on time and utilization low." });
  return tips.slice(0, 6);
}

export function recentEnquiryCount(report: CreditReport): number {
  return report.enquiries.filter((enquiry) => {
    const age = monthsBetween(enquiry.date, report.uploadedAt.slice(0, 10));
    return age != null && age <= 6;
  }).length;
}

export function isCreditReport(value: unknown): value is CreditReport {
  if (!value || typeof value !== "object") return false;
  const row = value as CreditReport;
  return typeof row.id === "string" && row.id.length > 0 && row.id.length < 80
    && (row.creditScore == null || (Number.isInteger(row.creditScore) && row.creditScore >= 300 && row.creditScore <= 900))
    && Array.isArray(row.accounts) && row.accounts.length <= 80
    && Array.isArray(row.enquiries)
    && typeof row.uploadedAt === "string";
}
