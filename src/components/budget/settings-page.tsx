import { Button } from "@/components/ui/button";
import { CalendarCard } from "@/components/budget/calendar-card";
import { CategoryBudgets } from "@/components/budget/category-budgets";
import { ExportCard } from "@/components/budget/export-card";
import { CURRENCIES, type CurrencyCode } from "@/lib/budget/model";
import { DEFAULT_CARD_ORDER, useBudget, type OverviewCardId } from "@/lib/budget/store";

const LABELS: Record<OverviewCardId, string> = {
  snapshot: "Monthly Snapshot",
  stats: "Income, Expenses, Saved This Month",
  rhythm: "Spending Rhythm",
  breakdown: "Spending Breakdown",
  goals: "Savings Goals",
  notes: "Month in Review and Upcoming Payments",
  recent: "Transactions",
};

export function SettingsPage() {
  const settings = useBudget((state) => state.settings);
  const patchSettings = useBudget((state) => state.patchSettings);
  const moveCard = useBudget((state) => state.moveCard);
  const currency = useBudget((state) => state.currency);
  const setCurrency = useBudget((state) => state.setCurrency);
  const removeRecurring = useBudget((state) => state.removeRecurring);

  return (
    <div className="grid gap-4">
      <header>
        <h2 className="font-display text-3xl font-medium tracking-tight">Settings</h2>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">Saved with this account, not only on this phone.</p>
      </header>
      <ExportCard />
      <div id="budgets" className="scroll-mt-24">
        <CategoryBudgets />
      </div>
      <CalendarCard />
      <section className="panel p-5">
        <h3 className="text-lg font-medium">Appearance</h3>
        <p className="mt-1 text-sm text-muted-foreground">Saved with this account.</p>
        <div className="appearance-tiles">
          {(["light", "dark"] as const).map((theme) => (
            <button
              key={theme}
              type="button"
              className={settings.theme === theme ? "appearance-tile is-on" : "appearance-tile"}
              aria-pressed={settings.theme === theme}
              onClick={() => patchSettings({ theme })}
            >
              <span className={theme === "dark" ? "appearance-swatch is-dark" : "appearance-swatch"} aria-hidden="true" />
              <span>{theme === "light" ? "Light" : "Dark"}</span>
            </button>
          ))}
        </div>
      </section>
      <section className="panel p-4">
        <h3 className="text-lg font-medium">Currency</h3>
        <p className="mt-1 text-sm text-muted-foreground">Changes the symbol only. Amounts are not converted.</p>
        <label className="mt-3 grid gap-1 text-sm">
          Display currency
          <select className="field max-w-xs" value={currency} onChange={(event) => setCurrency(event.target.value as CurrencyCode)}>
            {CURRENCIES.map((item) => (
              <option key={item.code} value={item.code}>{item.label}</option>
            ))}
          </select>
        </label>
      </section>
      <section className="panel p-4">
        <h3 className="text-lg font-medium">Financial month</h3>
        <p className="mt-1 text-sm text-muted-foreground">1 is a calendar month. A later day runs into the next month.</p>
        <label className="mt-3 grid max-w-xs gap-1 text-sm">
          Starts on day
          <input
            className="field"
            type="number"
            min={1}
            max={28}
            value={settings.monthStartsOn}
            onChange={(event) => patchSettings({ monthStartsOn: Math.min(28, Math.max(1, Number(event.target.value) || 1)) })}
          />
        </label>
      </section>
      <section className="panel p-4">
        <h3 className="text-lg font-medium">Overview order</h3>
        <p className="mt-1 text-sm text-muted-foreground">Changes the order, not the numbers.</p>
        <ol className="mt-3 space-y-2">
          {settings.cardOrder.map((id, index) => (
            <li key={id} className="flex items-center justify-between gap-3 rounded-md bg-muted px-3 py-2">
              <span className="text-sm">{LABELS[id]}</span>
              <span className="flex gap-1">
                <Button variant="ghost" size="sm" aria-label={`Move ${LABELS[id]} up`} disabled={index === 0} onClick={() => moveCard(id, -1)}>Up</Button>
                <Button variant="ghost" size="sm" aria-label={`Move ${LABELS[id]} down`} disabled={index === settings.cardOrder.length - 1} onClick={() => moveCard(id, 1)}>Down</Button>
              </span>
            </li>
          ))}
        </ol>
        <Button className="mt-3" variant="secondary" onClick={() => patchSettings({ cardOrder: [...DEFAULT_CARD_ORDER] })}>Reset order</Button>
      </section>
      <section className="panel p-4">
        <h3 className="text-lg font-medium">Scheduled payments</h3>
        {settings.recurring.length === 0 ? <p className="mt-2 text-sm text-muted-foreground">None yet. A repeat shows up in Reports after two months.</p> : null}
        <ul className="mt-2 space-y-2">
          {settings.recurring.map((item) => (
            <li key={item.id} className="flex items-center justify-between gap-3 text-sm">
              <span>{item.label} · day {item.dayOfMonth}</span>
              <Button variant="ghost" size="sm" onClick={() => removeRecurring(item.id)}>Remove</Button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
