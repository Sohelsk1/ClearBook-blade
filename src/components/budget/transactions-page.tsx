import { useEffect, useMemo, useState } from "react";
import { getRouteApi } from "@tanstack/react-router";
import { createColumnHelper, flexRender, getCoreRowModel, getPaginationRowModel, useReactTable } from "@tanstack/react-table";
import { ChevronDown, Copy, Pencil, Receipt, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { useEditor } from "@/components/budget/frame";
import { StatementImport } from "@/components/budget/statement-import";
import { CATEGORIES, categoryById, categoryColor, formatDay, formatMoney, periodBounds, periodLabel, summarizeRange, transactionWindow, type Kind, type Transaction } from "@/lib/budget/model";
import { useBudget } from "@/lib/budget/store";

const routeApi = getRouteApi("/transactions");
const columnHelper = createColumnHelper<Transaction>();
const PAGE_SIZE = 12;

type KindFilter = "all" | Kind;

export function TransactionsPage() {
  const search = routeApi.useSearch();
  const transactions = useBudget((state) => state.transactions);
  const currency = useBudget((state) => state.currency);
  const viewMonth = useBudget((state) => state.viewMonth);
  const statementPeriod = useBudget((state) => state.statementPeriod);
  const settings = useBudget((state) => state.settings);
  const deleteTransaction = useBudget((state) => state.deleteTransaction);
  const duplicateTransaction = useBudget((state) => state.duplicateTransaction);
  const setDisplayRange = useBudget((state) => state.setDisplayRange);
  const { openEdit, openCreate } = useEditor();
  const bounds = statementPeriod ?? periodBounds(viewMonth, settings.monthStartsOn);
  const periodKey = statementPeriod ? `${statementPeriod.start}:${statementPeriod.end}` : `${viewMonth}:${settings.monthStartsOn}`;
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [query, setQuery] = useState(search.q ?? "");
  const [kind, setKind] = useState<KindFilter>(search.kind ?? "all");
  const [category, setCategory] = useState(search.category ?? "all");
  const [from, setFrom] = useState(search.day ?? search.from ?? bounds.start);
  const [to, setTo] = useState(search.day ?? search.to ?? bounds.end);
  const [appliedPeriod, setAppliedPeriod] = useState(periodKey);
  const [min, setMin] = useState(search.min ?? "");
  const [max, setMax] = useState(search.max ?? "");
  const [sort, setSort] = useState<"date" | "amount">(search.sort ?? "date");
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: PAGE_SIZE });

  const searchKey = `${search.day ?? ""}|${search.from ?? ""}|${search.to ?? ""}|${search.kind ?? ""}|${search.category ?? ""}|${search.q ?? ""}`;
  const [appliedSearch, setAppliedSearch] = useState(searchKey);
  if (appliedSearch !== searchKey) {
    setAppliedSearch(searchKey);
    if (search.day) {
      setFrom(search.day);
      setTo(search.day);
    } else {
      if (search.from) setFrom(search.from);
      if (search.to) setTo(search.to);
    }
    if (search.kind) setKind(search.kind);
    if (search.category) setCategory(search.category);
    if (search.q != null) setQuery(search.q);
  }

  if (appliedPeriod !== periodKey) {
    setAppliedPeriod(periodKey);
    setFrom(bounds.start);
    setTo(bounds.end);
  }

  const activeWindow = statementPeriod ? { from: bounds.start, to: bounds.end, custom: true } : transactionWindow(viewMonth, settings.monthStartsOn, from, to);
  const rangeSummary = useMemo(() => summarizeRange(transactions, from, to), [transactions, from, to]);

  useEffect(() => {
    setDisplayRange({ start: from, end: to, custom: activeWindow.custom });
  }, [from, to, activeWindow.custom, setDisplayRange]);

  const rows = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const minCents = min.trim() === "" ? null : Math.round(Number(min.replace(/,/g, "")) * 100);
    const maxCents = max.trim() === "" ? null : Math.round(Number(max.replace(/,/g, "")) * 100);
    const filtered = transactions.filter((tx) => {
      if (kind !== "all" && tx.kind !== kind) return false;
      if (category !== "all" && tx.categoryId !== category) return false;
      if (from && tx.date < from) return false;
      if (to && tx.date > to) return false;
      if (minCents != null && Number.isFinite(minCents) && tx.amountCents < minCents) return false;
      if (maxCents != null && Number.isFinite(maxCents) && tx.amountCents > maxCents) return false;
      if (!needle) return true;
      const categoryLabel = categoryById(tx.categoryId)?.label ?? "";
      const amount = formatMoney(tx.amountCents, currency).toLowerCase();
      return `${tx.note} ${tx.merchant ?? ""} ${categoryLabel} ${amount} ${tx.amountCents / 100}`.toLowerCase().includes(needle);
    });
    return filtered.sort((a, b) => {
      if (sort === "amount") return b.amountCents - a.amountCents || (a.date < b.date ? 1 : -1);
      return a.date === b.date ? (a.id < b.id ? 1 : -1) : a.date < b.date ? 1 : -1;
    });
  }, [transactions, query, kind, category, from, to, min, max, sort, currency]);

  useEffect(() => {
    setPagination((current) => ({ ...current, pageIndex: 0 }));
  }, [query, kind, category, from, to, min, max, sort, viewMonth]);

  const columns = useMemo(() => [
    columnHelper.display({
      id: "details",
      header: "Details",
      cell: ({ row }) => {
        const tx = row.original;
        const category = categoryById(tx.categoryId)?.label ?? "Transaction";
        const title = tx.merchant || tx.note || category;
        return (
          <div className="min-w-0">
            <p className="truncate font-medium">{title}</p>
            {tx.note && tx.merchant ? <p className="tx-note">{tx.note}</p> : null}
          </div>
        );
      },
    }),
    columnHelper.display({
      id: "category",
      header: "Category",
      cell: ({ row }) => {
        const tx = row.original;
        const category = categoryById(tx.categoryId)?.label ?? "Transaction";
        return (
          <span className="tx-cat">
            <span className="tx-dot" style={{ background: categoryColor(tx.categoryId) }} aria-hidden="true" />
            {category}
            {tx.needsReview ? <span className="tx-review">Needs review</span> : null}
          </span>
        );
      },
    }),
    columnHelper.accessor("date", {
      header: () => (
        <button type="button" className={`tx-sort ${sort === "date" ? "is-sorted" : ""}`} onClick={() => setSort("date")}>
          Date {sort === "date" ? <ChevronDown className="size-3.5" aria-hidden="true" /> : null}
        </button>
      ),
      cell: ({ getValue }) => <span className="tx-date">{formatDay(getValue())}</span>,
    }),
    columnHelper.display({
      id: "amount",
      header: () => (
        <button type="button" className={`tx-sort ${sort === "amount" ? "is-sorted" : ""}`} onClick={() => setSort("amount")}>
          Amount {sort === "amount" ? <ChevronDown className="size-3.5" aria-hidden="true" /> : null}
        </button>
      ),
      cell: ({ row }) => {
        const tx = row.original;
        const tone = tx.kind === "income" ? "is-in" : tx.kind === "expense" ? "is-out" : "is-save";
        return (
          <span className={`tx-amount ${tone}`}>
            {tx.kind === "income" ? "+" : tx.kind === "expense" ? "−" : ""}
            {formatMoney(tx.amountCents, currency)}
          </span>
        );
      },
    }),
    columnHelper.display({
      id: "actions",
      header: () => <span className="sr-only">Actions</span>,
      cell: ({ row }) => {
        const tx = row.original;
        const category = categoryById(tx.categoryId)?.label ?? "Transaction";
        const title = tx.merchant || tx.note || category;
        const confirming = confirmId === tx.id;
        return (
          <div className="tx-actions">
            <Button variant="ghost" size="sm" className="h-11 px-2" aria-label={`Edit ${title}`} onClick={() => openEdit(tx)}><Pencil className="size-3.5" /></Button>
            <Button variant="ghost" size="sm" className="h-11 px-2" aria-label={`Duplicate ${title}`} onClick={() => duplicateTransaction(tx.id)}><Copy className="size-3.5" /></Button>
            <Button variant="ghost" size="sm" className="h-11 px-2 text-negative" aria-label={confirming ? `Confirm delete ${title}` : `Delete ${title}`} onClick={() => { if (confirming) { deleteTransaction(tx.id); setConfirmId(null); } else setConfirmId(tx.id); }}>
              <Trash2 className="size-3.5" />
              {confirming ? "Confirm" : ""}
            </Button>
          </div>
        );
      },
    }),
  ], [confirmId, currency, deleteTransaction, duplicateTransaction, openEdit, sort]);

  const table = useReactTable({
    data: rows,
    columns,
    state: { pagination },
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getRowId: (row) => row.id,
  });

  const filters = (
    <div className="grid gap-2 sm:grid-cols-2">
      <label className="grid gap-1 text-sm">
        Type
        <select className="field" value={kind} onChange={(event) => setKind(event.target.value as KindFilter)}>
          <option value="all">All</option>
          <option value="income">Income</option>
          <option value="expense">Expenses</option>
          <option value="savings">Savings</option>
        </select>
      </label>
      <label className="grid gap-1 text-sm">
        Category
        <select className="field" value={category} onChange={(event) => setCategory(event.target.value)}>
          <option value="all">All categories</option>
          {CATEGORIES.map((item) => (
            <option key={item.id} value={item.id}>{item.label}</option>
          ))}
        </select>
      </label>
      <label className="grid gap-1 text-sm">
        From
        <input className="field field-amount" type="date" value={from} onChange={(event) => setFrom(event.target.value)} />
      </label>
      <label className="grid gap-1 text-sm">
        To
        <input className="field field-amount" type="date" value={to} onChange={(event) => setTo(event.target.value)} />
      </label>
      <label className="grid gap-1 text-sm">
        Minimum amount
        <input className="field field-amount" inputMode="decimal" value={min} onChange={(event) => setMin(event.target.value)} placeholder="Any" />
      </label>
      <label className="grid gap-1 text-sm">
        Maximum amount
        <input className="field field-amount" inputMode="decimal" value={max} onChange={(event) => setMax(event.target.value)} placeholder="Any" />
      </label>
      <label className="grid gap-1 text-sm sm:col-span-2">
        Sort
        <select className="field" value={sort} onChange={(event) => setSort(event.target.value as "date" | "amount")}>
          <option value="date">Date</option>
          <option value="amount">Amount</option>
        </select>
      </label>
    </div>
  );

  return (
    <section aria-labelledby="tx-heading">
      <h2 id="tx-heading" className="font-display text-3xl font-medium tracking-tight">Transactions</h2>
      <p className="mt-1 text-sm font-medium">{statementPeriod ? "Statement period" : activeWindow.custom ? "Custom range" : periodLabel(viewMonth, settings.monthStartsOn)}</p>
      <p className="text-sm text-muted-foreground">{from && to ? `${formatDay(from)} – ${formatDay(to)}` : "Choose a start and end date."}</p>
      <dl className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Total label="Income" value={formatMoney(rangeSummary.income, currency)} />
        <Total label="Expenses" value={formatMoney(rangeSummary.expense, currency)} />
        <Total label="Saved" value={formatMoney(rangeSummary.savings, currency)} />
        <Total label="Remaining" value={formatMoney(rangeSummary.remaining, currency)} />
      </dl>
      <StatementImport />
      <label className="mt-4 grid gap-1 text-sm">
        <span className="sr-only">Search transactions</span>
        <input className="field" type="search" value={query} placeholder="Search transactions" onChange={(event) => setQuery(event.target.value)} />
      </label>
      <div className="mt-3 hidden md:block">{filters}</div>
      <Button className="mt-3 md:hidden" variant="secondary" onClick={() => setFiltersOpen(true)}>
        Filters
      </Button>
      {filtersOpen ? (
        <Modal title="Filters" description="Narrow this list. Nothing here changes your records." onClose={() => setFiltersOpen(false)}>
          {filters}
          <Button className="mt-4 w-full" onClick={() => setFiltersOpen(false)}>Show transactions</Button>
        </Modal>
      ) : null}
      {rows.length === 0 ? (
        <div className="tx-empty">
          <Receipt className="size-8" aria-hidden="true" />
          <p>
            {transactions.length === 0
              ? "No transactions yet"
              : "No transactions match these filters."}
          </p>
          {transactions.length === 0 ? <p>Start tracking your expenses by adding your first transaction.</p> : null}
          <Button onClick={openCreate}>Add Transaction</Button>
        </div>
      ) : (
        <>
          <ul className="tx-cards">
            {table.getRowModel().rows.map((row) => {
              const tx = row.original;
              const category = categoryById(tx.categoryId)?.label ?? "Transaction";
              const title = tx.merchant || tx.note || category;
              const confirming = confirmId === tx.id;
              const tone = tx.kind === "income" ? "is-in" : tx.kind === "expense" ? "is-out" : "is-save";
              return (
                <li key={tx.id} className="tx-card">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{title}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{formatDay(tx.date)} · {category}{tx.needsReview ? <span className="tx-review">Needs review</span> : null}</p>
                    {tx.note && tx.merchant ? <p className="tx-card-note">{tx.note}</p> : null}
                  </div>
                  <div className="tx-card-side">
                    <span className={`tx-amount ${tone}`}>{tx.kind === "income" ? "+" : tx.kind === "expense" ? "−" : ""}{formatMoney(tx.amountCents, currency)}</span>
                    <div className="tx-actions">
                      <Button variant="ghost" size="sm" className="h-11 px-2" aria-label={`Edit ${title}`} onClick={() => openEdit(tx)}><Pencil className="size-3.5" /></Button>
                      <Button variant="ghost" size="sm" className="h-11 px-2" aria-label={`Duplicate ${title}`} onClick={() => duplicateTransaction(tx.id)}><Copy className="size-3.5" /></Button>
                      <Button variant="ghost" size="sm" className="h-11 px-2 text-negative" aria-label={confirming ? `Confirm delete ${title}` : `Delete ${title}`} onClick={() => { if (confirming) { deleteTransaction(tx.id); setConfirmId(null); } else setConfirmId(tx.id); }}>
                        <Trash2 className="size-3.5" />
                        {confirming ? "Confirm" : ""}
                      </Button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
          <div className="tx-table">
          <div className="tx-table-scroll">
            <table>
              <thead>
                {table.getHeaderGroups().map((group) => (
                  <tr key={group.id}>
                    {group.headers.map((header) => (
                      <th key={header.id} className={header.column.id === sort ? "is-sorted" : undefined}>
                        {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody>
                {table.getRowModel().rows.map((row) => (
                  <tr key={row.id}>
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="tx-pages">
            <button type="button" disabled={!table.getCanPreviousPage()} onClick={() => table.previousPage()}>Previous</button>
            {table.getPageOptions().map((index) => (
              <button key={index} type="button" aria-current={index === pagination.pageIndex ? "page" : undefined} onClick={() => table.setPageIndex(index)}>
                {index + 1}
              </button>
            ))}
            <button type="button" disabled={!table.getCanNextPage()} onClick={() => table.nextPage()}>Next</button>
          </div>
        </div>
        </>
      )}
      <p className="mt-2 text-xs text-muted-foreground">{rows.length} transaction{rows.length === 1 ? "" : "s"}</p>
    </section>
  );
}

function Total({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-muted px-3 py-2">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-sm font-medium tabular-nums">{value}</dd>
    </div>
  );
}
