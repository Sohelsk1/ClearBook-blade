import React from 'react';
import { motion } from 'framer-motion';
import { ArrowDownLeft, ArrowUpRight, Calendar } from 'lucide-react';
import { INR, CATEGORIES, INCOME_SOURCES } from '../mock';

function prettyDate(value) {
  if (!value) return '';
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function labelFor(item) {
  if (item.direction === 'income') return INCOME_SOURCES.find((source) => source.id === item.source)?.label || CATEGORIES.find((cat) => cat.id === item.category)?.label || 'Income';
  return CATEGORIES.find((cat) => cat.id === item.category)?.label || 'Other';
}

export default function StatementSummary({ statement }) {
  if (!statement?.transactions?.length) return null;
  const groups = [];
  statement.transactions.slice().sort((a, b) => String(b.date).localeCompare(String(a.date))).forEach((item) => {
    const last = groups[groups.length - 1];
    if (!last || last.date !== item.date) groups.push({ date: item.date, rows: [item] });
    else last.rows.push(item);
  });

  return (
    <section className="cb-card p-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-lg font-bold tracking-tight">
            <Calendar className="h-5 w-5 text-primary" />
            Statement Period: {prettyDate(statement.statementStartDate)} → {prettyDate(statement.statementEndDate)}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Parsed {statement.count} transactions • {INR(statement.totalIncome)} in • {INR(statement.totalExpense)} out
          </p>
        </div>
      </div>
      <div className="mt-4 space-y-4">
        {groups.map((group) => (
          <div key={group.date}>
            <div className="sticky top-0 z-10 bg-card/95 py-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground backdrop-blur">{prettyDate(group.date)}</div>
            <div className="divide-y divide-border">
              {group.rows.map((item, index) => {
                const income = item.direction === 'income';
                return (
                  <motion.div key={item.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(index, 12) * 0.02 }} className="flex items-center gap-3 py-3">
                    <div className={`grid h-9 w-9 shrink-0 place-items-center rounded-full ${income ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                      {income ? <ArrowDownLeft className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-semibold">{income ? 'Received from' : 'Paid to'} {item.counterparty || 'Unknown'}</div>
                      <div className="mt-0.5 text-xs text-muted-foreground">{labelFor(item)} · {prettyDate(item.date)} · {item.mode || 'Transfer'}</div>
                    </div>
                    <div className={`cb-num shrink-0 text-sm font-semibold ${income ? 'text-emerald-500' : 'text-rose-500'}`}>
                      {income ? '+' : '−'}{INR(item.amount)}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
