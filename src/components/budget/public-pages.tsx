import { useEffect, useState } from "react";
import { PublicShell, ProseSection } from "@/components/budget/public-shell";
import { PUBLIC_PAGES } from "@/lib/seo";
import { formatRupees, monthlyRemaining, parseWorksheetRupees } from "@/lib/budget/worksheet";

const EXPENSE_CATEGORIES = ["Housing", "Groceries", "Dining", "Transport", "Utilities", "Health", "Shopping", "Personal"] as const;
const INCOME_CATEGORIES = ["Pay", "Side work", "Refund", "Other income"] as const;

export function FeaturesPage() {
  const page = PUBLIC_PAGES.find((item) => item.path === "/features")!;
  return (
    <PublicShell path="/features">
      <h1 className="mt-6 font-display text-4xl leading-tight text-foreground">{page.h1}</h1>
      <p className="mt-4 text-sm leading-6 text-foreground">{page.description}</p>
      <ProseSection title="A record, not a bank feed">
        <p>You type each amount, category, and date. There is no bank connection.</p>
      </ProseSection>
      <ProseSection title="The month you are looking at">
        <p>Remaining is income minus expenses minus savings. A missing month is not treated as zero.</p>
      </ProseSection>
      <ProseSection title="Your account only">
        <p>A new account starts empty. The same records appear on any device you sign in to. Export Excel from Settings.</p>
      </ProseSection>
      <PageLinks except="/features" />
    </PublicShell>
  );
}

export function TrackExpensesPage() {
  const page = PUBLIC_PAGES.find((item) => item.path === "/track-expenses")!;
  return (
    <PublicShell path="/track-expenses">
      <h1 className="mt-6 font-display text-4xl leading-tight text-foreground">{page.h1}</h1>
      <p className="mt-4 text-sm leading-6 text-foreground">{page.description}</p>
      <ProseSection title="What one expense contains">
        <p>An amount above zero, a date, and a category such as {EXPENSE_CATEGORIES.join(", ")}. A refund is income, not a negative expense.</p>
      </ProseSection>
      <ProseSection title="Finding it later">
        <p>Search, filter, edit, duplicate, or delete. Split a payment if it covers two categories.</p>
      </ProseSection>
      <ProseSection title="What this page is not">
        <p>Not automatic tracking. Cash you do not write down is simply absent.</p>
      </ProseSection>
      <p className="mt-8 text-sm">
        <a href="/login" className="font-medium text-primary underline-offset-2 hover:underline">Create an account</a>
        <span> to keep the list, or use the </span>
        <a href="/budget-worksheet" className="font-medium text-primary underline-offset-2 hover:underline">worksheet</a>
        <span> if you only want the monthly sum.</span>
      </p>
    </PublicShell>
  );
}

export function RecordIncomePage() {
  const page = PUBLIC_PAGES.find((item) => item.path === "/record-income")!;
  return (
    <PublicShell path="/record-income">
      <h1 className="mt-6 font-display text-4xl leading-tight text-foreground">{page.h1}</h1>
      <p className="mt-4 text-sm leading-6 text-foreground">{page.description}</p>
      <ProseSection title="Income categories">
        <p>{INCOME_CATEGORIES.join(", ")}. Each record needs an amount above zero and a date.</p>
      </ProseSection>
      <ProseSection title="A refund is income">
        <p>Record the money you got back as Refund. Leave the original expense as it was.</p>
      </ProseSection>
      <ProseSection title="How income changes the month">
        <p>Remaining is income minus expenses minus savings. Unentered income is not assumed.</p>
      </ProseSection>
      <p className="mt-8 text-sm">
        <a href="/track-expenses" className="font-medium text-primary underline-offset-2 hover:underline">Expenses</a>
        <span> and </span>
        <a href="/savings-goals" className="font-medium text-primary underline-offset-2 hover:underline">savings goals</a>
        <span> are recorded separately, so they are not mixed into income.</span>
      </p>
    </PublicShell>
  );
}

export function CategoryBudgetsPage() {
  const page = PUBLIC_PAGES.find((item) => item.path === "/category-budgets")!;
  return (
    <PublicShell path="/category-budgets">
      <h1 className="mt-6 font-display text-4xl leading-tight text-foreground">{page.h1}</h1>
      <p className="mt-4 text-sm leading-6 text-foreground">{page.description}</p>
      <ProseSection title="A limit is not a payment">
        <p>A budget is a ceiling you type. Clearbook compares it with expenses you recorded. It does not block a purchase.</p>
      </ProseSection>
      <ProseSection title="Tied to the month you open">
        <p>Only expenses in the month you are viewing count toward the limit.</p>
      </ProseSection>
      <p className="mt-8 text-sm">
        <a href="/track-expenses" className="font-medium text-primary underline-offset-2 hover:underline">Record the expenses</a>
        <span> first. A budget with no records has nothing to measure.</span>
      </p>
    </PublicShell>
  );
}

export function SavingsGoalsPage() {
  const page = PUBLIC_PAGES.find((item) => item.path === "/savings-goals")!;
  return (
    <PublicShell path="/savings-goals">
      <h1 className="mt-6 font-display text-4xl leading-tight text-foreground">{page.h1}</h1>
      <p className="mt-4 text-sm leading-6 text-foreground">{page.description}</p>
      <ProseSection title="More than one target">
        <p>Each goal has a name and a target. Savings reduce remaining. They are not income or an expense.</p>
      </ProseSection>
      <ProseSection title="Progress">
        <p>The bar is what you saved against the target you set. No pace is shown until this period has a contribution.</p>
      </ProseSection>
      <p className="mt-8 text-sm">
        <a href="/budget-worksheet" className="font-medium text-primary underline-offset-2 hover:underline">The worksheet</a>
        <span> uses the same remaining sum if you want to try figures before you create an account.</span>
      </p>
    </PublicShell>
  );
}

const EXAMPLE = { income: "80000", expenses: "45000", savings: "10000" };

export function WorksheetPage() {
  const page = PUBLIC_PAGES.find((item) => item.path === "/budget-worksheet")!;
  const [income, setIncome] = useState("");
  const [expenses, setExpenses] = useState("");
  const [savings, setSavings] = useState("");
  const [tried, setTried] = useState(false);
  const incomeValue = parseWorksheetRupees(income);
  const expenseValue = parseWorksheetRupees(expenses);
  const savingsValue = parseWorksheetRupees(savings);
  const ready = incomeValue !== null && expenseValue !== null && savingsValue !== null;
  const remaining = ready ? monthlyRemaining(incomeValue, expenseValue, savingsValue) : null;
  const invalid = tried && !ready;

  return (
    <PublicShell path="/budget-worksheet">
      <h1 className="mt-6 font-display text-4xl leading-tight text-foreground">{page.h1}</h1>
      <p className="mt-4 text-sm leading-6 text-foreground">{page.description}</p>
      <ProseSection title="The sum">
        <p className="worksheet-formula">Remaining = <span className="is-in">income</span> − <span className="is-out">expenses</span> − <span className="is-save">savings</span>. Not a bank balance.</p>
        <p>Example: ₹80,000 − ₹45,000 − ₹10,000 = ₹25,000. Nothing on this page is saved.</p>
      </ProseSection>
      <form
        className="worksheet-form mt-8 grid gap-4"
        onSubmit={(event) => {
          event.preventDefault();
          setTried(true);
        }}
      >
        <AmountField kind="income" label="Income for the month" value={income} onChange={setIncome} />
        <AmountField kind="expenses" label="Expenses for the month" value={expenses} onChange={setExpenses} />
        <AmountField kind="savings" label="Savings set aside" value={savings} onChange={setSavings} />
        {invalid ? (
          <p className="text-sm text-negative" role="alert">
            Use zero or a positive amount with at most two decimal places. Negative amounts are not accepted.
          </p>
        ) : null}
        <div className="flex flex-wrap gap-2">
          <button type="submit" className="worksheet-calculate press inline-flex h-11 items-center rounded-lg bg-primary px-5 text-sm font-medium text-primary-foreground">
            Calculate
          </button>
          <button
            type="button"
            className="worksheet-example press inline-flex h-11 items-center rounded-lg border border-white/10 px-4 text-sm font-medium"
            onClick={() => {
              setIncome(EXAMPLE.income);
              setExpenses(EXAMPLE.expenses);
              setSavings(EXAMPLE.savings);
              setTried(true);
            }}
          >
            Fill the example
          </button>
          <button
            type="button"
            className="worksheet-clear press inline-flex h-11 items-center rounded-lg px-4 text-sm font-medium text-muted-foreground underline-offset-4 hover:underline"
            onClick={() => {
              setIncome("");
              setExpenses("");
              setSavings("");
              setTried(false);
            }}
          >
            Clear
          </button>
        </div>
        {remaining !== null && ready ? (
          <WorksheetResult income={incomeValue} expenses={expenseValue} savings={savingsValue} remaining={remaining} />
        ) : (
          <p className="text-sm leading-6" role="status" aria-live="polite">Enter all three amounts to see remaining.</p>
        )}
      </form>
      <p className="mt-6 text-sm leading-6">
        <a href="/login" className="font-medium text-primary underline-offset-2 hover:underline">Create an account</a> to keep the records.
      </p>
    </PublicShell>
  );
}

function AmountField({ kind, label, value, onChange }: { kind: "income" | "expenses" | "savings"; label: string; value: string; onChange: (value: string) => void }) {
  const id = label.toLowerCase().replace(/[^a-z]+/g, "-");
  return (
    <label className={`worksheet-field worksheet-field-${kind} grid gap-2`} htmlFor={id}>
      {label}
      <input
        id={id}
        className="field field-amount"
        inputMode="decimal"
        autoComplete="off"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

function WorksheetResult({ income, expenses, savings, remaining }: { income: number; expenses: number; savings: number; remaining: number }) {
  const [shown, setShown] = useState(0);
  const total = Math.max(income, expenses + savings + Math.max(remaining, 0), 1);
  const expensePct = Math.max(0, expenses) / total * 100;
  const savingsPct = Math.max(0, savings) / total * 100;
  const remainPct = Math.max(0, remaining) / total * 100;
  const spendPct = income > 0 ? Math.round(expenses / income * 100) : null;
  const savePct = income > 0 ? Math.round(savings / income * 100) : null;
  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setShown(remaining);
      return;
    }
    let frame = 0;
    const started = performance.now();
    const tick = (now: number) => {
      const progress = Math.min(1, Math.max(0, (now - started) / 700));
      setShown(Math.round(remaining * (1 - Math.pow(1 - progress, 3))));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [remaining]);
  const tone = remaining > 0 ? "is-in" : remaining < 0 ? "is-out" : "is-zero";
  return (
    <div className="worksheet-result" role="status" aria-live="polite">
      <p>Monthly remaining</p>
      <strong className={tone}>{formatRupees(shown)}</strong>
      {remaining < 0 ? <p className="worksheet-note">Expenses and savings are higher than income in these figures. That is not a bank overdraft.</p> : null}
      <div className="worksheet-bar" aria-hidden="true">
        <span className="is-out" style={{ width: `${expensePct}%` }} />
        <span className="is-save" style={{ width: `${savingsPct}%` }} />
        <span className="is-in" style={{ width: `${remainPct}%` }} />
      </div>
      <ul>
        <li><i className="is-in" />Income <b>{formatRupees(income)}</b></li>
        <li><i className="is-out" />Expenses <b>{formatRupees(expenses)}</b></li>
        <li><i className="is-save" />Savings <b>{formatRupees(savings)}</b></li>
      </ul>
      {spendPct !== null && savePct !== null ? (
        <p className="worksheet-insight">You're spending <b>{spendPct}%</b> of income on expenses and saving <b>{savePct}%</b>.</p>
      ) : null}
    </div>
  );
}

function PageLinks({ except }: { except: string }) {
  return (
    <section className="mt-10">
      <h2 className="font-display text-2xl text-foreground">Related pages</h2>
      <ul className="public-related">
        {PUBLIC_PAGES.filter((item) => item.path !== "/" && item.path !== except).map((item) => (
          <li key={item.path}>
            <a href={item.path}>
              <span>{item.h1}</span>
              <span>{item.description}</span>
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
