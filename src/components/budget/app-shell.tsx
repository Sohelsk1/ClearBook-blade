import { useEffect, useState, type ReactNode } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight, Menu, Plus, LayoutDashboard, List, Settings, Target, ChartNoAxesCombined, Landmark, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EntryDialog, draftFromTransaction, type Draft } from "@/components/budget/entry-dialog";
import {
  CURRENCIES,
  currentMonthKey,
  defaultDateForMonth,
  periodLabel,
  shiftMonth,
  type CurrencyCode,
  type Transaction,
} from "@/lib/budget/model";
import { UserButton } from "@/lib/auth/gates";
import { useBudget } from "@/lib/budget/store";
import { ImportBanner } from "@/components/budget/import-banner";
import { EditorContext } from "@/components/budget/editor-context";
import { Mark } from "@/components/budget/frame";
import { SvgTheme } from "@/components/budget/svg-theme";

const NAV = [
  { to: "/dashboard", label: "Home", icon: LayoutDashboard, active: (path: string) => path === "/dashboard" },
  { to: "/transactions", label: "Passbook", icon: List, active: (path: string) => path.startsWith("/transactions") },
  { to: "/reports", label: "Reports", icon: ChartNoAxesCombined, active: (path: string) => path.startsWith("/reports") || path.startsWith("/insights") },
  { to: "/goals", label: "Savings", icon: Target, active: (path: string) => path.startsWith("/goals") },
  { to: "/loans", label: "Loans", icon: Landmark, active: (path: string) => path.startsWith("/loans") },
  { to: "/settings", label: "Settings", icon: Settings, active: (path: string) => path.startsWith("/settings") },
] as const;

export function FrameInner({ children, userId }: { children: ReactNode; userId: string }) {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const currency = useBudget((state) => state.currency);
  const setCurrency = useBudget((state) => state.setCurrency);
  const viewMonth = useBudget((state) => state.viewMonth);
  const setViewMonth = useBudget((state) => state.setViewMonth);
  const settings = useBudget((state) => state.settings);
  const goals = useBudget((state) => state.goals);
  const notice = useBudget((state) => state.notice);
  const undoDelete = useBudget((state) => state.undoDelete);
  const dismissNotice = useBudget((state) => state.dismissNotice);
  const addTransaction = useBudget((state) => state.addTransaction);
  const updateTransaction = useBudget((state) => state.updateTransaction);
  const deleteTransaction = useBudget((state) => state.deleteTransaction);
  const [editor, setEditor] = useState<null | { mode: "create"; nonce: number } | { mode: "edit"; tx: Transaction }>(null);
  const [navOpen, setNavOpen] = useState(false);

  useEffect(() => {
    setNavOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!navOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setNavOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [navOpen]);

  useEffect(() => {
    document.documentElement.dataset.theme = settings.theme;
  }, [settings.theme]);

  const label = periodLabel(viewMonth, settings.monthStartsOn);
  const api = {
    openCreate: () => setEditor({ mode: "create", nonce: Date.now() }),
    openEdit: (tx: Transaction) => setEditor({ mode: "edit", tx }),
  };

  const createDraft: Draft = {
    kind: "expense",
    amount: "",
    categoryId: "groceries",
    note: "",
    merchant: "",
    date: defaultDateForMonth(viewMonth),
    goalId: goals[0]?.id ?? "",
  };

  return (
    <EditorContext.Provider value={api}>
      <div className="app-redesign mx-auto min-h-screen w-full" data-appearance={settings.theme}>
        <SvgTheme />
        <aside id="app-sidebar" className={navOpen ? "app-sidebar is-open" : "app-sidebar"} aria-label="Main navigation">
          <Link to="/dashboard" className="app-sidebar-brand" aria-label="Clearbook dashboard">
            <Mark className="size-8 shrink-0" />
            <span className="wordmark">ClearBook</span>
          </Link>
          <button type="button" className="app-sidebar-close" aria-label="Close navigation" onClick={() => setNavOpen(false)}>
            <X className="size-4" aria-hidden="true" />
          </button>
          <nav aria-label="Sections" className="app-sidebar-links">
            {NAV.map((item, index) => (
              <span key={item.to} className="contents">
                {index === NAV.length - 1 ? <hr className="app-sidebar-rule" /> : null}
                <Link to={item.to} aria-current={item.active(pathname) ? "page" : undefined}
                  className={item.active(pathname) ? "app-nav-link app-nav-active" : "app-nav-link"}>
                  <item.icon className="size-[18px] shrink-0" strokeWidth={1.5} aria-hidden="true" />
                  {item.label}
                </Link>
              </span>
            ))}
          </nav>
          <div className="app-sidebar-user">
            <UserButton />
            <Link to="/settings" className="app-sidebar-gear" aria-label="Settings">
              <Settings className="size-[18px]" strokeWidth={1.5} aria-hidden="true" />
            </Link>
          </div>
        </aside>
        {navOpen ? <button type="button" className="app-sidebar-overlay" aria-label="Close navigation" onClick={() => setNavOpen(false)} /> : null}
        <div className="app-main">
          <header className="app-topbar">
            <Link to="/dashboard" className="app-mobile-brand" aria-label="Clearbook dashboard">
              <Mark className="size-9 shrink-0" /><span className="wordmark">ClearBook</span>
            </Link>
            <button type="button" className="app-nav-toggle" aria-expanded={navOpen} aria-controls="app-sidebar" onClick={() => setNavOpen(true)}>
              <Menu className="size-5" aria-hidden="true" />
              <span className="sr-only">Open navigation</span>
            </button>
            <div className="app-topbar-controls">
              <label className="sr-only" htmlFor="currency">Currency</label>
              <select id="currency" className="field w-24" value={currency} title="Changes display only. Amounts are not converted."
                onChange={(event) => setCurrency(event.target.value as CurrencyCode)}>
                {CURRENCIES.map((item) => <option key={item.code} value={item.code}>{item.label}</option>)}
              </select>
              {pathname !== "/dashboard" ? <div className="app-month-switch">
                <Button variant="ghost" size="icon" aria-label="Previous month" onClick={() => setViewMonth(shiftMonth(viewMonth, -1))}><ChevronLeft className="size-4" /></Button>
                <p className="app-month-label">{label}</p>
                <Button variant="ghost" size="icon" aria-label="Next month" onClick={() => setViewMonth(shiftMonth(viewMonth, 1))}><ChevronRight className="size-4" /></Button>
              </div> : null}
              <Button className="app-add-button" onClick={api.openCreate}><Plus className="size-4" /> <span className="app-add-label">Add transaction</span></Button>
              <div className="app-mobile-user"><UserButton /></div>
            </div>
          </header>
          <ImportBanner userId={userId} currency={currency} />
          {notice ? (
            <div className="mb-4 flex items-center justify-between gap-3 rounded-card border border-border bg-card px-4 py-3 text-sm" role="status">
              <p>{notice.text}</p>
              <div className="flex gap-2">
                {notice.undo ? <Button size="sm" variant="secondary" onClick={undoDelete}>Undo</Button> : null}
                <Button size="sm" variant="ghost" onClick={dismissNotice}>Dismiss</Button>
              </div>
            </div>
          ) : null}
          <div key={pathname} className="page-rise">
            {children}
          </div>
        </div>
      </div>
      <nav className="app-bottom-nav" aria-label="Sections">
        {NAV.map((item) => (
          <Link key={item.to} to={item.to} aria-current={item.active(pathname) ? "page" : undefined}
            className={item.active(pathname) ? "app-bottom-link app-bottom-active" : "app-bottom-link"}>
            <item.icon className="size-5" aria-hidden="true" /><span>{item.label}</span>
          </Link>
        ))}
      </nav>
      {editor?.mode === "create" ? (
        <EntryDialog
          key={editor.nonce}
          title="Add Transaction"
          initial={createDraft}
          currency={currency}
          goals={goals}
          onClose={() => setEditor(null)}
          onSubmit={(value) => {
            addTransaction({ id: crypto.randomUUID(), ...value });
            setViewMonth(value.date.slice(0, 7));
            setEditor(null);
          }}
        />
      ) : null}
      {editor?.mode === "edit" ? (
        <EntryDialog
          key={editor.tx.id}
          title="Edit transaction"
          initial={draftFromTransaction(editor.tx)}
          currency={currency}
          goals={goals}
          onClose={() => setEditor(null)}
          onSubmit={(value) => {
            updateTransaction(editor.tx.id, value);
            setViewMonth(value.date.slice(0, 7));
            setEditor(null);
          }}
          onDelete={() => {
            deleteTransaction(editor.tx.id);
            setEditor(null);
          }}
        />
      ) : null}
      <span className="sr-only">Viewing {label}. Currency display is {currency}. Today’s month key is {currentMonthKey()}.</span>
    </EditorContext.Provider>
  );
}
