import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Plus, Wallet, Coins, PiggyBank, Sparkles, TrendingUp, TrendingDown, RotateCcw } from 'lucide-react';
import { INR, CATEGORIES } from '../mock';
import { useAuth } from '../contexts/AuthContext';
import { Link } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Progress } from '../components/ui/progress';
import { summarize, useLedger } from '../lib/ledger';
import StatementUploader from '../components/StatementUploader';
import StatementSummary from '../components/StatementSummary';
import ResetAllDialog from '../components/ResetAllDialog';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  PieChart, Pie, Cell, BarChart, Bar, RadialBarChart, RadialBar
} from 'recharts';

function StatCard({ icon: Icon, label, value, delta, tone = 'primary' }) {
  const positive = delta >= 0;
  const toneMap = {
    primary: 'from-emerald-500/15 to-emerald-500/0 text-emerald-500',
    accent:  'from-indigo-500/15 to-indigo-500/0 text-indigo-500',
    warn:    'from-amber-500/15 to-amber-500/0 text-amber-500',
    rose:    'from-rose-500/15 to-rose-500/0 text-rose-500',
  };
  return (
    <motion.div whileHover={{ y: -3 }} className="cb-card p-5 relative overflow-hidden">
      <div className={`absolute inset-0 bg-gradient-to-br ${toneMap[tone]} opacity-70`} />
      <div className="relative">
        <div className="flex items-center justify-between">
          <div className={`h-10 w-10 rounded-xl bg-background/70 backdrop-blur border border-border grid place-items-center ${toneMap[tone].split(' ').pop()}`}>
            <Icon className="h-5 w-5" />
          </div>
          <span className={`text-xs font-semibold flex items-center gap-0.5 px-2 py-1 rounded-full ${positive ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
            {positive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />} {Math.abs(delta)}%
          </span>
        </div>
        <div className="mt-4 text-sm text-muted-foreground">{label}</div>
        <div className="cb-num text-3xl font-bold tracking-tight mt-1">{value}</div>
      </div>
    </motion.div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const { expenses, incomes, goals, statement } = useLedger();
  const summary = useMemo(() => summarize(expenses, incomes), [expenses, incomes]);
  const hasData = expenses.length + incomes.length > 0;

  const byCategory = useMemo(() => {
    if (!summary) return [];
    return summary.byCategory.map(c => {
      const meta = CATEGORIES.find(x => x.id === c.category) || { color: '#64748b', label: c.category };
      return { name: meta.label, value: c.amount, color: meta.color };
    });
  }, [summary]);

  const weekly = useMemo(() => (summary?.weekly || []).slice().reverse().map(w => ({ day: w.day.slice(5), amount: w.amount })), [summary]);

  if (!summary) return null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-xs text-muted-foreground font-medium">Overview</div>
          <h1 className="text-3xl font-bold tracking-tight mt-1">Good evening, {(user?.name || 'You').split(' ')[0]} 👋</h1>
          <p className="text-sm text-muted-foreground mt-1.5">Here is a calm snapshot of your month so far.</p>
        </div>
        <div className="flex gap-2">
          <ResetAllDialog trigger={<Button variant="outline" className="h-10"><RotateCcw className="h-4 w-4 mr-1" /> Reset All Data</Button>} />
          <Link to="/expenses"><Button variant="outline" className="h-10"><Plus className="h-4 w-4 mr-1" /> Expense</Button></Link>
          <Link to="/income"><Button className="h-10"><Plus className="h-4 w-4 mr-1" /> Income</Button></Link>
        </div>
      </div>

      <StatementUploader />
      {hasData ? <StatementSummary statement={statement} /> : (
        <div className="cb-card p-8 text-center text-sm text-muted-foreground">No transactions yet. Upload a PDF statement to see your money story.</div>
      )}

      {hasData ? <>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard icon={Coins}     label="Income this month"   value={INR(summary.totalIncome)}  delta={+8}  tone="primary" />
        <StatCard icon={Wallet}    label="Expenses this month" value={INR(summary.totalExpense)} delta={-4}  tone="rose" />
        <StatCard icon={PiggyBank} label="Remaining"            value={INR(summary.remaining)}    delta={+12} tone="accent" />
        <StatCard icon={Sparkles}  label="Savings rate"         value={`${summary.savingsRate}%`}  delta={+6}  tone="warn" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="cb-card p-5 xl:col-span-2">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-sm font-semibold">Cashflow trend</div>
              <div className="text-xs text-muted-foreground mt-0.5">Income vs Expenses by month</div>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-[hsl(var(--chart-1))]" /> Income</span>
              <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-[hsl(var(--chart-2))]" /> Expenses</span>
            </div>
          </div>
          <div className="h-72 mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={summary.yearTrend} margin={{ left: -10, right: 6, top: 8, bottom: 0 }}>
                <defs>
                  <linearGradient id="gInc" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="hsl(var(--chart-1))" stopOpacity="0.4" /><stop offset="100%" stopColor="hsl(var(--chart-1))" stopOpacity="0" /></linearGradient>
                  <linearGradient id="gExp" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="hsl(var(--chart-2))" stopOpacity="0.35" /><stop offset="100%" stopColor="hsl(var(--chart-2))" stopOpacity="0" /></linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 10, fontSize: 12 }} formatter={(v) => INR(v)} />
                <Area type="monotone" dataKey="income"   stroke="hsl(var(--chart-1))" strokeWidth={2.5} fill="url(#gInc)" />
                <Area type="monotone" dataKey="expenses" stroke="hsl(var(--chart-2))" strokeWidth={2.5} fill="url(#gExp)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="cb-card p-5">
          <div className="text-sm font-semibold">Spend Score</div>
          <div className="text-xs text-muted-foreground mt-0.5">Your financial health at a glance</div>
          <div className="h-52 mt-2 relative">
            <ResponsiveContainer width="100%" height="100%">
              <RadialBarChart innerRadius="70%" outerRadius="100%" data={[{ name: 'score', value: summary.spendScore.score, fill: 'hsl(var(--chart-1))' }]} startAngle={220} endAngle={-40}>
                <RadialBar background={{ fill: 'hsl(var(--muted))' }} dataKey="value" cornerRadius={12} />
              </RadialBarChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 grid place-items-center pointer-events-none">
              <div className="text-center">
                <div className="cb-num text-4xl font-extrabold">{summary.spendScore.score}</div>
                <div className="text-xs text-emerald-500 font-medium mt-1">+{summary.spendScore.trend} this month</div>
              </div>
            </div>
          </div>
          <div className="text-xs text-muted-foreground text-center">Tier: <span className="text-foreground font-medium">{summary.spendScore.tier}</span></div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="cb-card p-5">
          <div className="text-sm font-semibold">Spend by category</div>
          <div className="text-xs text-muted-foreground mt-0.5">Where your money went</div>
          <div className="h-52 mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={byCategory} dataKey="value" innerRadius={55} outerRadius={85} paddingAngle={2}>
                  {byCategory.map((c, i) => <Cell key={i} fill={c.color} />)}
                </Pie>
                <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 10, fontSize: 12 }} formatter={(v) => INR(v)} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 space-y-2">
            {byCategory.slice(0, 4).map(c => (
              <div key={c.name} className="flex items-center gap-2 text-sm">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: c.color }} />
                <span className="flex-1 text-muted-foreground">{c.name}</span>
                <span className="cb-num font-medium">{INR(c.value)}</span>
              </div>
            ))}
            {byCategory.length === 0 && <div className="text-xs text-muted-foreground">No expenses yet.</div>}
          </div>
        </div>

        <div className="cb-card p-5">
          <div className="text-sm font-semibold">Recent spending</div>
          <div className="text-xs text-muted-foreground mt-0.5">Last 7 entries</div>
          <div className="h-56 mt-3">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weekly} margin={{ left: -20, right: 6, top: 8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 10, fontSize: 12 }} formatter={(v) => INR(v)} />
                <Bar dataKey="amount" fill="hsl(var(--chart-2))" radius={[6,6,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="cb-card p-5">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold">Active goals</div>
              <div className="text-xs text-muted-foreground mt-0.5">Progress you’re building</div>
            </div>
            <Link to="/goals" className="text-xs text-primary font-medium">See all</Link>
          </div>
          <div className="mt-4 space-y-4">
            {goals.slice(0, 3).map(g => {
              const pct = Math.min(100, Math.round((g.saved / g.target) * 100));
              return (
                <div key={g.id}>
                  <div className="flex items-center justify-between text-sm">
                    <div className="font-medium">{g.name}</div>
                    <div className="text-xs" style={{ color: g.color }}>{pct}%</div>
                  </div>
                  <Progress value={pct} className="h-2 mt-2" />
                  <div className="flex justify-between text-xs text-muted-foreground mt-1.5">
                    <span className="cb-num">{INR(g.saved)}</span>
                    <span className="cb-num">{INR(g.target)}</span>
                  </div>
                </div>
              );
            })}
            {goals.length === 0 && <div className="text-xs text-muted-foreground">No goals yet.</div>}
          </div>
        </div>
      </div>
      </> : null}
    </div>
  );
}
