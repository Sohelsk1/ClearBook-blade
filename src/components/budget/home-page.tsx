import { useEffect, useRef, useState, type ReactNode } from "react";
import { ChartNoAxesCombined, Download, PencilLine } from "lucide-react";
import { PublicShell } from "@/components/budget/public-shell";
import { HeroUnderline, useHomeCinema } from "@/components/budget/home-stage";

const NOTES = [
  "You type each record. Clearbook does not connect to a bank.",
  "Remaining is income minus expenses minus savings. It is not a bank balance.",
  "Your ledger stays with your account on any device you sign in to.",
  "Excel export is in Settings. Changing currency only changes the symbol.",
] as const;

const START = [
  { href: "/features", label: "Features", text: "What the ledger does." },
  { href: "/track-expenses", label: "Expenses", text: "Write down a purchase." },
  { href: "/record-income", label: "Income", text: "Pay, side work, and refunds." },
  { href: "/category-budgets", label: "Budgets", text: "A limit you set yourself." },
  { href: "/savings-goals", label: "Goals", text: "Money you set aside." },
  { href: "/budget-worksheet", label: "Worksheet", text: "Try the sum without an account." },
] as const;

export function HomePage() {
  const motionScope = useRef<HTMLDivElement>(null);
  useHomeCinema(motionScope);

  useEffect(() => {
    const root = motionScope.current;
    if (!root) return;
    const cards = root.querySelectorAll<HTMLElement>(".home-step-card");
    cards.forEach((card) => {
      card.style.removeProperty("opacity");
      card.style.removeProperty("visibility");
    });
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const targets = root.querySelectorAll<HTMLElement>(".home-step-card, .month-preview, .home-intro, .home-details > section, .home-final");
    const seen = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add("reveal-in");
        seen.unobserve(entry.target);
      }
    }, { rootMargin: "0px 0px -10% 0px", threshold: 0.15 });
    targets.forEach((node) => seen.observe(node));
    return () => seen.disconnect();
  }, []);

  return (
    <PublicShell path="/">
      <div ref={motionScope} className="home-motion">
      <section className="hero hero-landing redesign-hero mt-8" aria-labelledby="home-headline">
        <div className="hero-copy">
          <p className="redesign-eyebrow hero-eyebrow"><span className="hero-mark-fallback" aria-hidden="true" /> A personal ledger</p>
          <h1 id="home-headline">Your money, <span className="hero-gradient">made clear.</span><HeroUnderline /></h1>
          <p className="redesign-hero-description">Record income, expenses, and savings. See what is left this month.</p>
          <div className="hero-actions">
            <a href="/login" className="press redesign-primary">Create account <span aria-hidden="true">↗</span></a>
            <a href="/login?mode=login" className="press redesign-secondary">Log in</a>
          </div>
          <p className="redesign-hero-note">A new account starts empty.</p>
        </div>
        <div className="redesign-mock" aria-label="Example Clearbook dashboard, not real account data">
          <div className="redesign-mock-top"><span>MONTHLY OVERVIEW</span><span>EXAMPLE DATA</span></div>
          <p>Remaining this month</p>
          <ExampleBalance />
          <div className="redesign-mock-bars" aria-hidden="true">
            {[78, 46, 88, 34, 62].map((width) => <span key={width} style={{ width: `${width}%` }} />)}
          </div>
          <div className="redesign-mock-stats">
            <div><span>Income</span><strong>₹80,000</strong></div>
            <div><span>Expenses</span><strong>₹45,000</strong></div>
            <div><span>Savings</span><strong>₹10,000</strong></div>
          </div>
        </div>
      </section>

      <section className="redesign-feature-section" aria-labelledby="redesign-features-heading">
        <div className="home-section-heading"><span className="home-section-number">01</span><h2 id="redesign-features-heading">The essentials</h2></div>
        <div className="home-step-grid">
          <StepCard icon={<PencilLine aria-hidden="true" />} title="Record" text="Add income, expenses, and savings." />
          <StepCard icon={<ChartNoAxesCombined aria-hidden="true" />} title="See the month" text="Categories, budgets, and what is left." />
          <StepCard icon={<Download aria-hidden="true" />} title="Export" text="Download your ledger as Excel." />
        </div>
      </section>

      <MonthPreview />

      <section className="home-intro" aria-labelledby="home-intro-title">
        <span className="home-section-number" aria-hidden="true">02</span>
        <div>
          <h2 id="home-intro-title">One ledger. <em>Your numbers.</em></h2>
          <p>What came in, what went out, and what you set aside.</p>
        </div>
      </section>

      <div className="home-details">
      <section className="home-directory mt-10">
        <span className="home-section-number">03</span>
        <h2 className="font-display text-2xl text-foreground">Look around</h2>
        <ul className="home-directory-grid mt-4">
          {START.map((item) => (
            <li key={item.href}>
              <a href={item.href} className="home-directory-link grid gap-1 py-3">
                <span className="text-sm font-medium text-primary">{item.label}</span>
                <span className="text-sm leading-6 text-foreground">{item.text}</span>
              </a>
            </li>
          ))}
        </ul>
      </section>

      <FactList title="Good to know" items={NOTES} />
      </div>
      <section className="home-final"><span className="home-section-number">START</span><h2>Start with your own records.</h2><div><a href="/login">Create account <span aria-hidden="true">↗</span></a><a href="/budget-worksheet">Try the worksheet <span aria-hidden="true">→</span></a></div></section>
      </div>
    </PublicShell>
  );
}

function StepCard({ icon, kicker, title, text }: { icon?: ReactNode; kicker?: string; title: string; text: string }) {
  return (
    <article className="home-step-card">
      {icon}
      {kicker ? <span>{kicker}</span> : null}
      <h3>{title}</h3>
      <p>{text}</p>
    </article>
  );
}

function FactList({ title, items }: { title: string; items: readonly string[] }) {
  return (
    <section className="mt-10">
      <h2 className="font-display text-2xl text-foreground">{title}</h2>
      <ul className="mt-4 divide-y divide-border border-y border-border">
        {items.map((item) => (
          <li key={item} className="py-3 text-sm leading-6 text-foreground">
            {item}
          </li>
        ))}
      </ul>
    </section>
  );
}

const previewMoney = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });

function MonthPreview() {
  const income = 80_000;
  const expenses = 45_000;
  const [savings, setSavings] = useState(10_000);
  const remaining = income - expenses - savings;
  const expenseShare = expenses / income * 100;
  const savingsShare = savings / income * 100;
  const remainingShare = remaining / income * 100;
  const money = (amount: number) => previewMoney.format(amount);

  return (
    <section className="month-preview mt-6" aria-labelledby="month-preview-title">
      <div className="month-preview-header">
        <div>
          <p className="month-preview-eyebrow">A clearer view of your month</p>
          <h2 id="month-preview-title" className="font-display text-2xl text-foreground">Where the money went</h2>
        </div>
        <span className="month-preview-badge">Illustrative example</span>
      </div>
      <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">Example only. Not a real account.</p>
      <div className="month-preview-grid">
        <div className="month-preview-balance">
          <p className="text-sm text-muted-foreground">Remaining after expenses and savings</p>
          <output className="month-preview-amount block" aria-live="polite">{money(remaining)}</output>
          <p className="mt-2 text-xs leading-5 text-muted-foreground">{money(income)} income − {money(expenses)} expenses − {money(savings)} savings</p>
          <div className="month-preview-visual">
            <div
              className="month-preview-ring"
              style={{ background: `conic-gradient(#EF4444 0% ${Math.max(0, expenseShare - 1.2)}%, transparent ${Math.max(0, expenseShare - 1.2)}% ${expenseShare}%, #3B82F6 ${expenseShare}% ${expenseShare + Math.max(0, savingsShare - 1.2)}%, transparent ${expenseShare + Math.max(0, savingsShare - 1.2)}% ${expenseShare + savingsShare}%, #10B981 ${expenseShare + savingsShare}% 100%)` }}
              role="img"
              aria-label={`Example allocation of ${money(income)} income: ${money(expenses)} expenses, ${money(savings)} savings, and ${money(remaining)} remaining`}
            >
              <div className="month-preview-ring-center" aria-hidden="true">
                <span>Still available</span>
                <strong>{money(remaining)}</strong>
                <small>{Math.round(remainingShare)}% of income</small>
              </div>
            </div>
            <div className="month-preview-visual-note">
              <span className="month-preview-visual-kicker">One month, at a glance</span>
              <strong>See the whole picture.</strong>
              <span>Move the slider. Remaining updates.</span>
            </div>
          </div>
          <div className="month-preview-bar mt-5" role="img" aria-label={`Example: ${money(expenses)} expenses, ${money(savings)} savings, and ${money(remaining)} remaining from ${money(income)} income`}>
            <span className="month-preview-segment month-preview-expenses" style={{ width: `${expenseShare}%` }} />
            <span className="month-preview-segment month-preview-savings" style={{ width: `${savingsShare}%` }} />
            <span className="month-preview-segment month-preview-remaining" style={{ width: `${remainingShare}%` }} />
          </div>
          <div className="month-preview-legend" aria-hidden="true">
            <span><i className="month-preview-dot month-preview-dot-expenses" />Expenses</span>
            <span><i className="month-preview-dot month-preview-dot-savings" />Savings</span>
            <span><i className="month-preview-dot month-preview-dot-remaining" />Remaining</span>
          </div>
        </div>
        <div className="month-preview-entries" aria-label="Illustrative ledger entries">
          <div className="month-preview-entry"><span className="month-preview-entry-icon month-preview-entry-icon-income" aria-hidden="true">+</span><span><strong>Pay</strong><small>Income recorded</small></span><b>+{money(income)}</b></div>
          <div className="month-preview-entry"><span className="month-preview-entry-icon month-preview-entry-icon-expense" aria-hidden="true">−</span><span><strong>Groceries &amp; more</strong><small>Expenses recorded</small></span><b>−{money(expenses)}</b></div>
          <div className="month-preview-entry"><span className="month-preview-entry-icon month-preview-entry-icon-savings" aria-hidden="true">↗</span><span><strong>Money set aside</strong><small>Savings recorded</small></span><b>{savings === 0 ? money(0) : `−${money(savings)}`}</b></div>
        </div>
      </div>
      <div className="month-preview-try">
        <div className="month-preview-try-heading">
          <div>
            <label htmlFor="preview-savings" className="font-medium text-foreground">What if you set aside {money(savings)}?</label>
            <p id="month-preview-range-help" className="mt-1 text-xs text-muted-foreground">Savings change what is left.</p>
          </div>
          <button type="button" className="month-preview-reset" onClick={() => setSavings(10_000)}>Reset</button>
        </div>
        <input id="preview-savings" className="month-preview-range" type="range" min="0" max="30000" step="1000" value={savings} onChange={(event) => setSavings(Number(event.target.value))} aria-describedby="month-preview-range-help" />
        <div className="month-preview-range-labels" aria-hidden="true"><span>₹0</span><span>₹30,000</span></div>
      </div>
      <a href="/budget-worksheet" className="month-preview-link">Try your own figures <span aria-hidden="true">→</span></a>
    </section>
  );
}

function ExampleBalance() {
  return <strong className="redesign-mock-balance">{previewMoney.format(25_000)}</strong>;
}
