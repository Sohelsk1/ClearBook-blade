import { ArrowRight, CheckCircle2, Circle, FileText, Info, PiggyBank, ReceiptText, RefreshCw, ShoppingBag, TrendingUp, Upload, Utensils } from "lucide-react";
import { formatDay, formatMoney, type CurrencyCode, type Transaction } from "@/lib/budget/model";
import type { RecurringItem } from "@/lib/budget/store";

type MoneyRiskProps = {
  transactions: Transaction[];
  start: string;
  end: string;
  currency: CurrencyCode;
  recurring: RecurringPayment[];
  onUploadMore: () => void;
};

type RiskSummary = {
  score: number;
  income: number;
  expense: number;
  savings: number;
  savingsRate: number;
  discretionaryRate: number;
  recurringLoad: number;
  spendingRatio: number;
};

const clamp = (value: number, min = 0, max = 100) => Math.max(min, Math.min(max, value));

function summarize(transactions: Transaction[], start: string, end: string, recurring: RecurringPayment[]): RiskSummary {
  let income = 0;
  let expense = 0;
  let savings = 0;
  let discretionary = 0;

  for (const tx of transactions) {
    if (tx.date < start || tx.date > end || !Number.isFinite(tx.amountCents) || tx.amountCents <= 0) continue;
    if (tx.kind === "income") income += tx.amountCents;
    if (tx.kind === "savings") savings += tx.amountCents;
    if (tx.kind === "expense") {
      expense += tx.amountCents;
      if (tx.categoryId === "dining" || tx.categoryId === "shopping" || tx.categoryId === "personal") discretionary += tx.amountCents;
    }
  }

  const spendingRatio = income > 0 ? expense / income : expense > 0 ? 1 : 0;
  const savingsRate = income > 0 ? savings / income : 0;
  const discretionaryRate = expense > 0 ? discretionary / expense : 0;
  const recurringMonthly = recurring.reduce((sum, item) => sum + Math.max(0, item.amountCents), 0);
  const recurringLoad = income > 0 ? recurringMonthly / income : 0;

  // This is a ClearBook behaviour indicator, not a credit score.
  // Higher values mean more spending pressure.
  const score = Math.round(clamp(
    spendingRatio * 55 +
    (1 - Math.min(1, savingsRate / 0.3)) * 25 +
    discretionaryRate * 12 +
    Math.min(1, recurringLoad / 0.35) * 8,
  ));

  return {
    score,
    income,
    expense,
    savings,
    savingsRate,
    discretionaryRate,
    recurringLoad,
    spendingRatio,
  };
}

function riskLabel(score: number) {
  if (score >= 76) return { label: "High spending risk", tone: "risk-high" as const };
  if (score >= 51) return { label: "Needs attention", tone: "risk-watch" as const };
  if (score >= 26) return { label: "Mostly controlled", tone: "risk-mid" as const };
  return { label: "Healthy spending pattern", tone: "risk-low" as const };
}

function previousRange(start: string, end: string) {
  const length = Math.max(1, Math.round((Date.parse(`${end}T00:00:00Z`) - Date.parse(`${start}T00:00:00Z`)) / 86400000) + 1);
  const endDate = new Date(`${start}T00:00:00Z`);
  endDate.setUTCDate(endDate.getUTCDate() - 1);
  const previousEnd = endDate.toISOString().slice(0, 10);
  const previousStartDate = new Date(endDate);
  previousStartDate.setUTCDate(previousStartDate.getUTCDate() - length + 1);
  return { start: previousStartDate.toISOString().slice(0, 10), end: previousEnd };
}

function scoreForRange(transactions: Transaction[], start: string, end: string, recurring: RecurringPayment[]) {
  return summarize(transactions, start, end, recurring).score;
}

export function MoneyRiskCard({ transactions, start, end, currency, recurring, onUploadMore }: MoneyRiskProps) {
  const current = summarize(transactions, start, end, recurring);
  const previous = previousRange(start, end);
  const previousScore = scoreForRange(transactions, previous.start, previous.end, recurring);
  const previousTxCount = transactions.filter((tx) => tx.date >= previous.start && tx.date <= previous.end).length;
  const confidence = transactions.length >= 120 && previousTxCount >= 20 ? "High" : transactions.length >= 40 || previousTxCount >= 10 ? "Medium" : "Low";
  const risk = riskLabel(current.score);
  const discretionaryCents = Math.round(current.expense * current.discretionaryRate);
  const improvement = current.score > 10 ? Math.max(1, Math.round(current.score * 0.08)) : 0;
  const targetScore = Math.max(0, current.score - improvement);
  const shoppingCents = transactions.filter((tx) => tx.date >= start && tx.date <= end && tx.kind === "expense" && tx.categoryId === "shopping").reduce((sum, tx) => sum + tx.amountCents, 0);
  const diningCents = transactions.filter((tx) => tx.date >= start && tx.date <= end && tx.kind === "expense" && tx.categoryId === "dining").reduce((sum, tx) => sum + tx.amountCents, 0);

  const scoreAngle = -90 + (current.score / 100) * 180;
  const hasEnoughForTrend = previousTxCount > 0;

  return (
    <section className="mb-4 overflow-hidden rounded-card border border-border bg-card" aria-labelledby="money-risk-heading">
      <div className="border-b border-border bg-gradient-to-br from-card via-card to-muted/40 p-5 sm:p-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">ClearBook</p>
            <h2 id="money-risk-heading" className="mt-1 font-display text-2xl font-medium tracking-tight sm:text-3xl">Your Money Risk</h2>
            <p className="mt-1 max-w-xl text-sm text-muted-foreground">A spending-behaviour indicator for this statement period. Higher % means higher spending pressure.</p>
          </div>
          <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1.5 text-xs font-medium text-muted-foreground">
            <Info className="size-3.5" aria-hidden="true" />
            {confidence} confidence
          </span>
        </div>

        <div className="mx-auto mt-4 max-w-2xl">
          <div className="relative h-64 overflow-hidden sm:h-72" aria-label={`Money Risk ${current.score} percent`}>
            <svg viewBox="0 0 620 330" className="h-full w-full" role="img" aria-hidden="true">
              <defs>
                <linearGradient id="money-risk-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#2f9e62" />
                  <stop offset="48%" stopColor="#e2ae22" />
                  <stop offset="100%" stopColor="#9e3833" />
                </linearGradient>
              </defs>
              <path d="M 85 260 A 225 225 0 0 1 535 260" fill="none" stroke="url(#money-risk-gradient)" strokeWidth="40" strokeLinecap="round" />
              {[0, 25, 50, 75, 100].map((tick) => {
                const angle = (-180 + tick * 1.8) * Math.PI / 180;
                const cx = 310 + Math.cos(angle) * 225;
                const cy = 260 + Math.sin(angle) * 225;
                const ix = 310 + Math.cos(angle) * 199;
                const iy = 260 + Math.sin(angle) * 199;
                return <line key={tick} x1={ix} y1={iy} x2={cx} y2={cy} stroke="white" strokeWidth="3" opacity=".8" />;
              })}
              <g transform={`rotate(${scoreAngle} 310 260)`} style={{ transition: "transform 800ms cubic-bezier(.2,.8,.2,1)" }}>
                <line x1="310" y1="260" x2="310" y2="104" stroke="currentColor" strokeWidth="6" strokeLinecap="round" />
                <circle cx="310" cy="260" r="17" fill="currentColor" />
                <circle cx="310" cy="260" r="6" fill="white" />
              </g>
            </svg>
            <div className="pointer-events-none absolute inset-x-0 bottom-2 text-center">
              <div className="font-display text-6xl font-semibold tracking-tight tabular-nums">{current.score}%</div>
              <div className={`mx-auto mt-2 inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                risk.tone === "risk-high" ? "bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-300" :
                risk.tone === "risk-watch" ? "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300" :
                risk.tone === "risk-mid" ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-950/40 dark:text-yellow-300" :
                "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
              }`}>{risk.label}</div>
            </div>
          </div>
          <div className="grid grid-cols-3 text-center text-[11px] font-semibold uppercase tracking-wide">
            <span className="text-emerald-700 dark:text-emerald-400">0 · Healthy</span>
            <span className="text-amber-700 dark:text-amber-400">50 · Watch</span>
            <span className="text-red-700 dark:text-red-400">100 · High risk</span>
          </div>
        </div>
      </div>

      <div className="grid gap-3 p-5 sm:grid-cols-3 sm:p-6">
        <Metric icon={ReceiptText} label="Spending pressure" value={`${Math.round(current.spendingRatio * 100)}%`} />
        <Metric icon={PiggyBank} label="Saving strength" value={`${Math.round(clamp(current.savingsRate * 100))}%`} />
        <Metric icon={RefreshCw} label="Recurring load" value={`${Math.round(clamp(current.recurringLoad * 100))}%`} />
      </div>

      <div className="grid gap-5 border-t border-border p-5 sm:p-6 lg:grid-cols-[1.05fr_.95fr]">
        <div>
          <h3 className="text-base font-semibold">What is influencing your score?</h3>
          <div className="mt-3 space-y-3">
            <Factor label="Spending vs income" value={clamp(current.spendingRatio * 100)} tone="risk" />
            <Factor label="Discretionary spending" value={clamp(current.discretionaryRate * 100)} tone="watch" />
            <Factor label="Saving pattern" value={clamp(current.savingsRate / .3 * 100)} tone="good" inverse />
            <Factor label="Recurring payments" value={clamp(current.recurringLoad * 100)} tone="watch" />
          </div>
        </div>
        <div className="rounded-xl border border-border bg-muted/30 p-4">
          <h3 className="text-base font-semibold">Why this matters</h3>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            This score is designed to help you notice spending pressure and changes in your own pattern. It is not a credit score and does not predict loan approval.
          </p>
          <div className="mt-4 flex items-center justify-between gap-3 rounded-lg bg-background p-3">
            <span className="text-sm text-muted-foreground">Previous comparable period</span>
            <span className="font-semibold tabular-nums">{previousTxCount ? `${previousScore}%` : "Not enough data"}</span>
          </div>
        </div>
      </div>

      <div className="border-t border-border p-5 sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold">What changed this period?</h3>
            <p className="mt-1 text-sm text-muted-foreground">The categories with the most useful signals.</p>
          </div>
          {hasEnoughForTrend ? <span className={`text-xs font-semibold ${current.score > previousScore ? "text-red-700 dark:text-red-300" : "text-emerald-700 dark:text-emerald-300"}`}>
            {current.score > previousScore ? `+${current.score - previousScore} risk` : `${previousScore - current.score} lower risk`}
          </span> : null}
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <ChangeRow icon={ShoppingBag} label="Shopping" amount={shoppingCents} currency={currency} />
          <ChangeRow icon={Utensils} label="Dining" amount={diningCents} currency={currency} />
        </div>
      </div>

      <div className="border-t border-border bg-muted/20 p-5 sm:p-6">
        <div className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-lg font-semibold">Track your spending pattern</h3>
            <p className="mt-1 max-w-xl text-sm leading-6 text-muted-foreground">
              Upload your bank statements to see how your spending, saving and risk pattern changes over time.
            </p>
            <p className="mt-2 text-xs text-muted-foreground">More statement history helps ClearBook make the pattern more meaningful.</p>
          </div>
          <button type="button" onClick={onUploadMore} className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2">
            <Upload className="size-4" aria-hidden="true" />
            Upload statements
            <ArrowRight className="size-4" aria-hidden="true" />
          </button>
        </div>
      </div>
    </section>
  );
}

function Metric({ icon: Icon, label, value }: { icon: typeof ReceiptText; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-background p-4">
      <div className="flex items-center gap-2 text-xs text-muted-foreground"><Icon className="size-4" aria-hidden="true" />{label}</div>
      <p className="mt-2 text-2xl font-semibold tabular-nums">{value}</p>
    </div>
  );
}

function Factor({ label, value, tone, inverse = false }: { label: string; value: number; tone: "risk" | "watch" | "good"; inverse?: boolean }) {
  const effective = inverse ? 100 - value : value;
  const color = tone === "risk" ? "bg-red-500" : tone === "watch" ? "bg-amber-500" : "bg-emerald-500";
  return (
    <div>
      <div className="flex items-center justify-between gap-3 text-xs">
        <span>{label}</span><span className="font-semibold tabular-nums">{Math.round(effective)}%</span>
      </div>
      <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-muted">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${clamp(effective)}%` }} />
      </div>
    </div>
  );
}

function ChangeRow({ icon: Icon, label, amount, currency }: { icon: typeof ShoppingBag; label: string; amount: number; currency: CurrencyCode }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-background p-3">
      <div className="flex min-w-0 items-center gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-muted"><Icon className="size-4" aria-hidden="true" /></span>
        <span className="truncate text-sm font-medium">{label}</span>
      </div>
      <span className="font-semibold tabular-nums">{formatMoney(amount, currency)}</span>
    </div>
  );
}

export function MoneyRiskEmptyState({ onUpload }: { onUpload: () => void }) {
  return (
    <section className="mb-4 overflow-hidden rounded-card border border-border bg-card p-6 sm:p-8">
      <div className="mx-auto max-w-2xl text-center">
        <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-primary/10 text-primary">
          <FileText className="size-7" aria-hidden="true" />
        </div>
        <h2 className="mt-4 font-display text-2xl font-medium tracking-tight">Understand your money pattern</h2>
        <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-muted-foreground">
          Upload your bank statements to discover how you spend, save and manage your money. ClearBook detects the actual statement period automatically.
        </p>
        <button type="button" onClick={onUpload} className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-md bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground">
          <Upload className="size-4" aria-hidden="true" /> Upload statements
        </button>
        <p className="mt-3 text-xs text-muted-foreground">Your statement data stays in your ClearBook account and is used to calculate your insights.</p>
      </div>
    </section>
  );
}

export function ProcessingSteps({ activeStep }: { activeStep: number }) {
  const steps = [
    ["Reading transactions", "Extracting statement details…"],
    ["Categorising spending", "Identifying where your money went…"],
    ["Finding recurring payments", "Looking for subscriptions and repeated debits…"],
    ["Comparing your spending", "Checking changes across periods…"],
    ["Calculating your Money Risk", "Almost there…"],
  ] as const;
  return (
    <div className="mt-4 rounded-xl border border-border bg-background p-4">
      <div className="space-y-4" aria-live="polite">
        {steps.map(([title, copy], index) => {
          const done = index < activeStep;
          const current = index === activeStep;
          return (
            <div key={title} className="flex gap-3">
              <span className={`mt-0.5 grid size-8 shrink-0 place-items-center rounded-full ${done ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300" : current ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                {done ? <CheckCircle2 className="size-4" /> : current ? <RefreshCw className="size-4 animate-spin" /> : <Circle className="size-4" />}
              </span>
              <div>
                <p className="text-sm font-medium">{title}</p>
                <p className="text-xs text-muted-foreground">{copy}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
