import { categoryById, daySpan, formatDay, formatMoney, inRange, type CurrencyCode, type Transaction } from "./model.ts";

/** 0 = low spender (excellent). 100 = high spender (critical). Not a bureau score. */

const WANT_IDS = new Set(["dining", "shopping"]);

export const SAVER_BANDS = [
  { id: "excellent", label: "Excellent", from: 0, to: 30, color: "var(--band-excellent)", ink: "var(--band-excellent-ink)" },
  { id: "alert", label: "Alert", from: 30, to: 60, color: "var(--band-alert)", ink: "var(--band-alert-ink)" },
  { id: "critical", label: "Critical", from: 60, to: 100, color: "var(--band-critical)", ink: "var(--band-critical-ink)" },
] as const;

export type SaverBandId = (typeof SAVER_BANDS)[number]["id"];
export type SaverLevel = "excellent" | "critical" | "incomplete";
export type SaverTip = {
  id: string;
  title: string;
  detail: string;
  tone: "good" | "warn" | "bad";
  whatIfScore: number | null;
  whatIfLabel: string;
};

export type SaverScore = {
  score: number | null;
  band: SaverBandId;
  bandLabel: string;
  ink: string;
  level: SaverLevel;
  personaLabel: string;
  celebrate: boolean;
  tips: SaverTip[];
};

function clamp(score: number): number {
  return Math.min(100, Math.max(0, score));
}

function piece(value: number, stops: readonly [number, number][]): number {
  if (value <= stops[0][0]) return stops[0][1];
  for (let index = 1; index < stops.length; index++) {
    const [x0, y0] = stops[index - 1];
    const [x1, y1] = stops[index];
    if (value <= x1) return y0 + ((value - x0) / (x1 - x0)) * (y1 - y0);
  }
  return stops[stops.length - 1][1];
}

/** Higher share of income spent → higher (worse) score. */
const SPEND_STOPS: readonly [number, number][] = [
  [0, 0],
  [0.35, 14],
  [0.5, 24],
  [0.65, 36],
  [0.8, 52],
  [1, 74],
  [1.2, 90],
  [2, 100],
];

export function saverBand(score: number) {
  if (score <= 30) return SAVER_BANDS[0];
  if (score <= 60) return SAVER_BANDS[1];
  return SAVER_BANDS[2];
}

function spendScore(income: number, expense: number, wantCents: number): number {
  if (income <= 0) return expense > 0 ? 96 : 0;
  let score = Math.round(piece(expense / income, SPEND_STOPS));
  const share = expense > 0 ? wantCents / expense : 0;
  if (share > 0.35) score += Math.min(6, Math.round((share - 0.35) * 16));
  return clamp(score);
}

type Hit = { cents: number; categoryId: string; date: string; name: string; want: boolean; unsorted: boolean };

export function scoreStatement(
  transactions: Transaction[],
  start: string,
  end: string,
  currency: CurrencyCode,
): SaverScore | null {
  let income = 0;
  const hits: Hit[] = [];

  for (const tx of transactions) {
    if (!inRange(tx.date, start, end) || !Number.isFinite(tx.amountCents) || tx.amountCents <= 0) continue;
    if (tx.kind === "income") income += tx.amountCents;
    else if (tx.kind === "expense") {
      const unsorted = Boolean(tx.needsReview) || tx.categoryId === "personal";
      const label = categoryById(tx.categoryId)?.label ?? "Spending";
      const named = (tx.merchant || tx.note || "").trim();
      hits.push({
        cents: tx.amountCents,
        categoryId: tx.categoryId,
        date: tx.date,
        name: named || label,
        want: !unsorted && WANT_IDS.has(tx.categoryId),
        unsorted,
      });
    }
  }

  const expense = hits.reduce((sum, hit) => sum + hit.cents, 0);
  if (income <= 0 && expense <= 0) return null;

  const money = (cents: number) => formatMoney(Math.abs(Math.round(cents)), currency);
  const wantCents = hits.reduce((sum, hit) => sum + (hit.want ? hit.cents : 0), 0);
  const incomplete = income > 0 && expense <= 0;
  const score = spendScore(income, expense, wantCents);
  const band = incomplete ? SAVER_BANDS[1] : saverBand(score);
  const level: SaverLevel = incomplete ? "incomplete" : score <= 30 ? "excellent" : "critical";
  const days = Math.max(1, daySpan(start, end));

  const whatIf = (nextExpense: number, nextWants: number, label: string) => {
    const next = spendScore(income, Math.max(0, nextExpense), Math.max(0, nextWants));
    return { whatIfScore: next === score ? null : next, whatIfLabel: label };
  };

  const tips: SaverTip[] = [];
  const add = (tip: SaverTip) => {
    if (tips.some((item) => item.id === tip.id || item.title === tip.title)) return;
    tips.push(tip);
  };

  if (incomplete) {
    add({ id: "missing-spend", title: "No spending yet", detail: `${money(income)} came in, but no spending is recorded. Add expenses to get a real score.`, tone: "warn", whatIfScore: null, whatIfLabel: "" });
  } else if (level === "excellent") {
    const kept = income - expense;
    add({ id: "kept", title: `You kept ${money(Math.max(0, kept))}`, detail: income > 0 ? `That is ${Math.round((kept / income) * 100)}% of the money that came in.` : "You spent very little.", tone: "good", whatIfScore: null, whatIfLabel: "" });
    const top = [...hits].sort((a, b) => b.cents - a.cents)[0];
    if (top) {
      add({ id: "watch", title: `${top.name} was your biggest spend`, detail: `${money(top.cents)} on ${formatDay(top.date)}. You are still in the safe zone.`, tone: "good", ...whatIf(expense - top.cents, wantCents - (top.want ? top.cents : 0), "See the score without this payment") });
    }
  } else {
    const gap = expense - income;
    if (income <= 0) {
      add({ id: "no-income", title: `${money(expense)} went out`, detail: "Money went out, but nothing came in on this statement.", tone: "bad", whatIfScore: null, whatIfLabel: "" });
    } else if (gap > 0) {
      add({
        id: "gap",
        title: `You spent ${money(gap)} extra`,
        detail: `You spent more than the money that came in. If this happens for 3 months, you will be short ${money(gap * 3)}.`,
        tone: "bad",
        ...whatIf(income, wantCents * (expense > 0 ? income / expense : 0), "See the score if you spend only what you got"),
      });
    } else {
      const used = Math.round((expense / income) * 100);
      add({
        id: "used",
        title: `You used ${used}% of your money`,
        detail: `Only ${money(income - expense)} is left. One more bill and you go over.`,
        tone: "bad",
        ...whatIf(expense * 0.8, wantCents * 0.8, "See the score if you spend a little less"),
      });
    }

    const biggest = [...hits].sort((a, b) => b.cents - a.cents)[0];
    if (biggest && expense > 0) {
      const share = Math.round((biggest.cents / expense) * 100);
      add({
        id: "hit",
        title: `${biggest.name} was ${money(biggest.cents)}`,
        detail: `On ${formatDay(biggest.date)}. This one payment is ${share}% of all your spending.`,
        tone: "bad",
        ...whatIf(expense - biggest.cents, wantCents - (biggest.want ? biggest.cents : 0), "See the score without this payment"),
      });
    }

    const byDay = new Map<string, number>();
    const byCat = new Map<string, { cents: number; label: string }>();
    let unsorted = 0;
    for (const hit of hits) {
      byDay.set(hit.date, (byDay.get(hit.date) ?? 0) + hit.cents);
      const label = hit.unsorted ? "Unsorted" : (categoryById(hit.categoryId)?.label ?? "Spending");
      const bucket = byCat.get(label) ?? { cents: 0, label };
      bucket.cents += hit.cents;
      byCat.set(label, bucket);
      if (hit.unsorted) unsorted += hit.cents;
    }
    const hot = [...byDay.entries()].sort((a, b) => b[1] - a[1])[0];
    if (hot && byDay.size > 1 && hot[1] / expense >= 0.35) {
      add({
        id: "day",
        title: `Big spending on ${formatDay(hot[0])}`,
        detail: `You spent ${money(hot[1])} that day. That is ${Math.round((hot[1] / expense) * 100)}% of this period.`,
        tone: "warn",
        ...whatIf(expense - hot[1], wantCents, "See the score without that day"),
      });
    }

    const topCat = [...byCat.values()].sort((a, b) => b.cents - a.cents)[0];
    if (topCat && expense > 0 && topCat.cents / expense >= 0.25) {
      add({
        id: "cat",
        title: `${topCat.label}: ${money(topCat.cents)}`,
        detail: income > 0 ? `${Math.round((topCat.cents / income) * 100)}% of the money you got went here.` : `${Math.round((topCat.cents / expense) * 100)}% of spending is in one place.`,
        tone: "warn",
        whatIfScore: null,
        whatIfLabel: "",
      });
    }

    if (unsorted > 0 && unsorted / expense >= 0.4) {
      add({
        id: "unsorted",
        title: `${money(unsorted)} has no category`,
        detail: "These payments are mixed together. Label them so you can see where the money went.",
        tone: "warn",
        whatIfScore: null,
        whatIfLabel: "",
      });
    }

    const burn = Math.round(expense / days);
    if (hits.length >= 3) {
      add({
        id: "pace",
        title: `About ${money(burn)} each day`,
        detail: `You made ${hits.length} payments in ${days} days. Together they add up to ${money(expense)}.`,
        tone: "warn",
        whatIfScore: null,
        whatIfLabel: "",
      });
    }
  }

  return {
    score: incomplete ? null : score,
    band: band.id,
    bandLabel: band.label,
    ink: band.ink,
    level,
    personaLabel: level === "excellent" ? "Excellent" : level === "critical" ? "Critical" : "Not enough yet",
    celebrate: level === "excellent",
    tips: tips.slice(0, 4),
  };
}
