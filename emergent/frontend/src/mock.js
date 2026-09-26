// Mock data for ClearBook clone (frontend-only)

export const INR = (n) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n || 0);

export const CATEGORIES = [
  { id: 'food', label: 'Food & Dining', color: '#10b981', emoji: 'Utensils' },
  { id: 'transport', label: 'Transport', color: '#6366f1', emoji: 'Car' },
  { id: 'shopping', label: 'Shopping', color: '#f59e0b', emoji: 'ShoppingBag' },
  { id: 'bills', label: 'Bills & Utilities', color: '#0ea5e9', emoji: 'Receipt' },
  { id: 'entertainment', label: 'Entertainment', color: '#ec4899', emoji: 'Film' },
  { id: 'health', label: 'Health', color: '#ef4444', emoji: 'HeartPulse' },
  { id: 'travel', label: 'Travel', color: '#8b5cf6', emoji: 'Plane' },
  { id: 'education', label: 'Education', color: '#14b8a6', emoji: 'GraduationCap' },
  { id: 'other', label: 'Other', color: '#64748b', emoji: 'MoreHorizontal' },
];

export const INCOME_SOURCES = [
  { id: 'salary', label: 'Salary' },
  { id: 'freelance', label: 'Freelance' },
  { id: 'business', label: 'Business' },
  { id: 'invest', label: 'Investments' },
  { id: 'gift', label: 'Gift / Bonus' },
  { id: 'other', label: 'Other' },
];

const today = new Date();
const d = (offset) => { const x = new Date(today); x.setDate(x.getDate() + offset); return x.toISOString().slice(0,10); };

export const mockExpenses = [
  { id: 'e1', date: d(-1), amount: 480, category: 'food', note: 'Zomato dinner' },
  { id: 'e2', date: d(-2), amount: 220, category: 'transport', note: 'Uber to office' },
  { id: 'e3', date: d(-3), amount: 1899, category: 'shopping', note: 'Nykaa skincare' },
  { id: 'e4', date: d(-4), amount: 349, category: 'entertainment', note: 'Netflix' },
  { id: 'e5', date: d(-5), amount: 2450, category: 'bills', note: 'Electricity bill' },
  { id: 'e6', date: d(-6), amount: 620, category: 'food', note: 'Groceries' },
  { id: 'e7', date: d(-7), amount: 180, category: 'transport', note: 'Metro card recharge' },
  { id: 'e8', date: d(-9), amount: 4200, category: 'travel', note: 'Weekend trip' },
  { id: 'e9', date: d(-10), amount: 890, category: 'health', note: 'Pharmacy' },
  { id: 'e10', date: d(-12), amount: 260, category: 'food', note: 'Coffee & snacks' },
  { id: 'e11', date: d(-14), amount: 3200, category: 'education', note: 'Online course' },
  { id: 'e12', date: d(-16), amount: 540, category: 'entertainment', note: 'Movie night' },
];

export const mockIncomes = [
  { id: 'i1', date: d(-1),  amount: 65000, source: 'salary', note: 'Monthly salary' },
  { id: 'i2', date: d(-8),  amount: 12000, source: 'freelance', note: 'Website project' },
  { id: 'i3', date: d(-15), amount: 3200,  source: 'invest',   note: 'Dividend' },
  { id: 'i4', date: d(-22), amount: 5000,  source: 'gift',     note: 'Birthday gift' },
];

export const mockBudgets = [
  { id: 'b1', category: 'food',          limit: 6000 },
  { id: 'b2', category: 'transport',     limit: 2500 },
  { id: 'b3', category: 'shopping',      limit: 4000 },
  { id: 'b4', category: 'bills',         limit: 5000 },
  { id: 'b5', category: 'entertainment', limit: 2000 },
];

export const mockGoals = [
  { id: 'g1', name: 'Emergency Fund',    target: 200000, saved: 85000, deadline: '2026-06-30', color: '#10b981' },
  { id: 'g2', name: 'Goa Trip',          target: 40000,  saved: 22500, deadline: '2026-02-15', color: '#6366f1' },
  { id: 'g3', name: 'New MacBook',       target: 150000, saved: 42000, deadline: '2026-09-01', color: '#f59e0b' },
  { id: 'g4', name: 'SIP - Index Fund',  target: 60000,  saved: 60000, deadline: '2025-12-31', color: '#0ea5e9' },
];

// 12-month trend (income/expense/savings)
const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
export const yearTrend = months.map((m, i) => {
  const income = 55000 + Math.round(Math.sin(i/2)*4000) + i*400;
  const expenses = 32000 + Math.round(Math.cos(i/2.5)*4500) + i*250;
  return { month: m, income, expenses, savings: income - expenses };
});

export const spendScore = { score: 78, trend: +6, tier: 'Great' };

export const recentActivity = [
  { id: 'a1', kind: 'expense', label: 'Zomato dinner',  amount: 480,  when: 'Yesterday' },
  { id: 'a2', kind: 'income',  label: 'Freelance paid', amount: 12000, when: '8 days ago' },
  { id: 'a3', kind: 'expense', label: 'Electricity bill', amount: 2450, when: '5 days ago' },
  { id: 'a4', kind: 'goal',    label: 'Emergency Fund +5,000', amount: 5000, when: '2 days ago' },
];
