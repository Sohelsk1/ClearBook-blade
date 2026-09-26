import { isCategoryForKind, type Kind } from "./model.ts";

export type StatementKind = "income" | "expense";

export type CategoryGuess = {
  categoryId: string;
  needsReview: boolean;
};

const NOISE = new Set([
  "upi", "imps", "neft", "ift", "pos", "nfs", "atm", "dr", "cr", "txn", "ref",
  "inb", "mbs", "ach", "nach", "visa", "rupay", "to", "from", "paid", "payment",
  "transfer", "idfc", "first", "bank",
]);

/** Lowercase narration with rail prefixes, punctuation, and reference numbers removed. */
export function normalizeNarration(text: string): string {
  const tokens = text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .split(" ")
    .filter((token) => token && !NOISE.has(token) && !/^\d{6,}$/.test(token));
  return tokens.join(" ");
}

type Rule = { categoryId: string; pattern: RegExp };

const EXPENSE_RULES: Rule[] = [
  { categoryId: "groceries", pattern: /\b(dmart|d mart|reliance smart|bigbasket|big basket|blinkit|zepto|instamart|jiomart|jio mart|big bazaar|spencers|spencer s|natures basket|kirana|grocer(?:y|ies)|supermarket|amazon fresh)\b/ },
  { categoryId: "dining", pattern: /\b(swiggy|zomato|starbucks|mcdonalds?|kfc|dominos|pizza hut|burger king|cafe|restaurant|dining)\b/ },
  { categoryId: "utilities", pattern: /\b(electricity|bescom|mseb|torrent power|water bill|hp gas|indane|bharat gas|airtel|jio|vodafone|bsnl|broadband|fibernet|recharge|billdesk)\b/ },
  { categoryId: "transport", pattern: /\b(uber|ola|rapido|metro|irctc|redbus|abhibus|msrtc|ksrtc|gsrtc|apsrtc|upsrtc|rsrtc|bmtc|makemytrip|goibibo|indigo|airindia|air india|spicejet|vistara|railway|fastag|fast tag|petrol|diesel|hpcl|bpcl|iocl|indian oil|nayara|fuel|gas station)\b/ },
  { categoryId: "health", pattern: /\b(pharmacy|pharmeasy|netmeds|apollo|medplus|1mg|hospital|clinic|doctor|diagnostic)\b/ },
  { categoryId: "shopping", pattern: /\b(amazon|flipkart|myntra|ajio|meesho|croma|reliance digital|google play|playstore|play store)\b|godaddy|playsto\b/ },
  { categoryId: "housing", pattern: /\b(house rent|rent|landlord|society maintenance)\b/ },
  { categoryId: "personal", pattern: /\b(netflix|spotify|hotstar|prime video|youtube premium|cash withdrawal|cash wdl|sms charge|annual fee|bank charge|imps charge)\b/ },
];

const INCOME_RULES: Rule[] = [
  { categoryId: "refund", pattern: /\b(refund|reversal|cashback|chargeback)\b/ },
  { categoryId: "pay", pattern: /\b(salary|payroll|stipend|wages)\b/ },
  { categoryId: "side", pattern: /\b(freelance|invoice|consulting)\b/ },
];

export function classifyStatementText(kind: StatementKind, text: string): CategoryGuess {
  const normalized = normalizeNarration(text);
  const rules = kind === "income" ? INCOME_RULES : EXPENSE_RULES;
  const match = rules.find((rule) => rule.pattern.test(normalized));
  if (match && isCategoryForKind(match.categoryId, kind)) {
    return { categoryId: match.categoryId, needsReview: false };
  }
  return { categoryId: kind === "income" ? "other-in" : "personal", needsReview: true };
}

export type StatementBackfillRow = {
  id: string;
  userId: string;
  kind: Kind;
  categoryId: string;
  note: string;
  merchant?: string;
  needsReview: boolean;
  categoryLocked: boolean;
};

/** Null means leave the stored category alone. */
export function plannedStatementBackfill(row: StatementBackfillRow): CategoryGuess | null {
  if (row.categoryLocked || !row.id.startsWith("stmt-idfc-")) return null;
  if (row.kind === "savings") return null;
  const importerDefault = (row.kind === "expense" && row.categoryId === "personal")
    || (row.kind === "income" && row.categoryId === "other-in");
  if (!importerDefault) return null;
  const guess = classifyStatementText(row.kind, `${row.merchant ?? ""} ${row.note}`);
  if (!isCategoryForKind(guess.categoryId, row.kind)) return null;
  if (guess.categoryId === row.categoryId && guess.needsReview === row.needsReview) return null;
  return guess;
}
