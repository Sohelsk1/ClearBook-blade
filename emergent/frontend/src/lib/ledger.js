import { useEffect, useState } from 'react';

const KEYS = {
  expenses: 'cb.expenses',
  incomes: 'cb.incomes',
  budgets: 'cb.budgets',
  goals: 'cb.goals',
  statement: 'cb.statement',
};

function read(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

export function loadLedger() {
  return {
    expenses: read(KEYS.expenses, []),
    incomes: read(KEYS.incomes, []),
    budgets: read(KEYS.budgets, []),
    goals: read(KEYS.goals, []),
    statement: read(KEYS.statement, null),
  };
}

function notify() {
  window.dispatchEvent(new Event('cb-ledger'));
}

export function saveCollection(name, items) {
  localStorage.setItem(KEYS[name], JSON.stringify(items));
  notify();
}

export function applyStatement(transactions) {
  const expenses = transactions.filter((item) => item.direction === 'expense').map((item) => ({
    id: item.id,
    date: item.date,
    amount: item.amount,
    category: item.category,
    note: item.description || item.counterparty || '',
    counterparty: item.counterparty || '',
    direction: 'expense',
    mode: item.mode || '',
  }));
  const incomes = transactions.filter((item) => item.direction === 'income').map((item) => ({
    id: item.id,
    date: item.date,
    amount: item.amount,
    source: item.category === 'salary' ? 'salary' : 'other',
    category: item.category,
    note: item.description || item.counterparty || '',
    counterparty: item.counterparty || '',
    direction: 'income',
    mode: item.mode || '',
  }));
  const dates = transactions.map((item) => item.date).filter(Boolean).sort();
  const totalIncome = incomes.reduce((sum, item) => sum + Number(item.amount), 0);
  const totalExpense = expenses.reduce((sum, item) => sum + Number(item.amount), 0);
  localStorage.setItem(KEYS.expenses, JSON.stringify(expenses));
  localStorage.setItem(KEYS.incomes, JSON.stringify(incomes));
  localStorage.setItem(KEYS.statement, JSON.stringify({
    statementStartDate: dates[0] || '',
    statementEndDate: dates[dates.length - 1] || '',
    totalIncome,
    totalExpense,
    count: transactions.length,
    transactions,
  }));
  notify();
}

export function resetLedger() {
  Object.values(KEYS).forEach((key) => localStorage.removeItem(key));
  notify();
}

export function useLedger() {
  const [data, setData] = useState(loadLedger);
  useEffect(() => {
    const sync = () => setData(loadLedger());
    window.addEventListener('cb-ledger', sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener('cb-ledger', sync);
      window.removeEventListener('storage', sync);
    };
  }, []);
  return data;
}

export function summarize(expenses, incomes) {
  const totalIncome = incomes.reduce((sum, item) => sum + Number(item.amount), 0);
  const totalExpense = expenses.reduce((sum, item) => sum + Number(item.amount), 0);
  const savingsRate = totalIncome ? Math.round(((totalIncome - totalExpense) / totalIncome) * 100) : 0;
  const byCat = {};
  expenses.forEach((item) => {
    byCat[item.category] = (byCat[item.category] || 0) + Number(item.amount);
  });
  const weekly = [...expenses].sort((a, b) => String(b.date).localeCompare(String(a.date))).slice(0, 7).map((item) => ({ day: item.date, amount: Number(item.amount) }));
  const trend = {};
  incomes.forEach((item) => {
    const month = String(item.date || '').slice(0, 7);
    if (!month) return;
    trend[month] = trend[month] || { income: 0, expenses: 0 };
    trend[month].income += Number(item.amount);
  });
  expenses.forEach((item) => {
    const month = String(item.date || '').slice(0, 7);
    if (!month) return;
    trend[month] = trend[month] || { income: 0, expenses: 0 };
    trend[month].expenses += Number(item.amount);
  });
  const yearTrend = Object.keys(trend).sort().map((month) => ({
    month,
    income: trend[month].income,
    expenses: trend[month].expenses,
    savings: trend[month].income - trend[month].expenses,
  }));
  let score = 0;
  if (totalIncome) score = Math.max(20, Math.min(100, Math.round(100 - (totalExpense / totalIncome) * 60)));
  const tier = score >= 75 ? 'Great' : score >= 55 ? 'Good' : 'Watch';
  return {
    totalIncome,
    totalExpense,
    remaining: totalIncome - totalExpense,
    savingsRate,
    byCategory: Object.entries(byCat).map(([category, amount]) => ({ category, amount })),
    weekly,
    yearTrend,
    spendScore: { score, trend: 0, tier },
  };
}
