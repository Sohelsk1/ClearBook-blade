import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { BookOpen, ArrowRight, ShieldCheck, LineChart, Target, PiggyBank, FileSpreadsheet, Sparkles, Check } from 'lucide-react';
import { Button } from '../components/ui/button';
import { useTheme } from '../contexts/ThemeContext';
import { INR, yearTrend } from '../mock';
import { AreaChart, Area, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from 'recharts';

const features = [
  { icon: LineChart,   title: 'Understand your month',   desc: 'See income, spend, and savings woven into one clear picture with smart charts.' },
  { icon: PiggyBank,   title: 'Budgets that adapt',      desc: 'Set gentle limits per category. ClearBook nudges you when you drift.' },
  { icon: Target,      title: 'Goals with a countdown',  desc: 'Build funds you actually reach with visual milestones and streaks.' },
  { icon: FileSpreadsheet, title: 'Worksheet mode',       desc: 'A spreadsheet-like sheet for people who love typing amounts fast.' },
  { icon: ShieldCheck, title: 'Yours, on device',        desc: 'Manual entries stay on your device. No bank connection required.' },
  { icon: Sparkles,    title: 'Spend Score',             desc: 'A monthly health score that turns numbers into a friendly signal.' },
];

export default function Landing() {
  const { theme, toggle } = useTheme();
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Nav */}
      <header className="sticky top-0 z-30 backdrop-blur bg-background/80 border-b border-border">
        <div className="max-w-7xl mx-auto px-5 py-3.5 flex items-center gap-4">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-emerald-500 to-indigo-500 grid place-items-center">
              <BookOpen className="h-5 w-5 text-white" />
            </div>
            <div className="font-bold text-lg tracking-tight">ClearBook</div>
          </Link>
          <nav className="hidden md:flex items-center gap-6 ml-8 text-sm text-muted-foreground">
            <a href="#features" className="hover:text-foreground">Features</a>
            <a href="#stats" className="hover:text-foreground">How it works</a>
            <a href="#pricing" className="hover:text-foreground">Pricing</a>
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <button onClick={toggle} className="text-sm text-muted-foreground hover:text-foreground px-3 py-1.5 rounded-md hover:bg-muted">{theme === 'dark' ? 'Light' : 'Dark'} mode</button>
            <Link to="/login"><Button variant="ghost" className="h-9">Log in</Button></Link>
            <Link to="/signup"><Button className="h-9">Create account</Button></Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 cb-grid-bg opacity-70" />
        <div className="absolute inset-0 cb-glow" />
        <div className="relative max-w-7xl mx-auto px-5 pt-16 pb-24 grid lg:grid-cols-12 gap-10 items-center">
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="lg:col-span-6">
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> A personal ledger, rebuilt.
            </span>
            <h1 className="mt-5 text-5xl md:text-6xl font-extrabold tracking-tight leading-[1.05]">
              Your money, <span className="bg-gradient-to-r from-emerald-500 to-indigo-500 bg-clip-text text-transparent">made clear.</span>
            </h1>
            <p className="mt-5 text-lg text-muted-foreground max-w-xl">
              Record income, spending and savings. ClearBook turns your entries into a calm, beautiful monthly picture — with animated charts, budgets and goals.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link to="/signup"><Button size="lg" className="h-11 px-6 group">Create free account <ArrowRight className="h-4 w-4 ml-1 group-hover:translate-x-0.5 transition" /></Button></Link>
              <Link to="/dashboard"><Button size="lg" variant="outline" className="h-11 px-6">View live demo</Button></Link>
            </div>
            <div className="mt-6 flex items-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-emerald-500" /> No bank connection</span>
              <span className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-emerald-500" /> Free forever</span>
              <span className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-emerald-500" /> Export to Excel</span>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.1 }} className="lg:col-span-6">
            <div className="cb-card p-5 md:p-6 relative">
              <div className="flex items-center justify-between">
                <div className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Monthly overview</div>
                <div className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary font-medium">Example data</div>
              </div>
              <div className="mt-2">
                <div className="text-sm text-muted-foreground">Remaining this month</div>
                <div className="cb-num text-4xl md:text-5xl font-bold mt-1">{INR(25000)}</div>
              </div>
              <div className="h-56 mt-3">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={yearTrend.slice(-8)} margin={{ left: -20, right: 6, top: 8, bottom: 0 }}>
                    <defs>
                      <linearGradient id="g1" x1="0" x2="0" y1="0" y2="1">
                        <stop offset="0%" stopColor="hsl(var(--chart-1))" stopOpacity="0.5" />
                        <stop offset="100%" stopColor="hsl(var(--chart-1))" stopOpacity="0" />
                      </linearGradient>
                      <linearGradient id="g2" x1="0" x2="0" y1="0" y2="1">
                        <stop offset="0%" stopColor="hsl(var(--chart-2))" stopOpacity="0.4" />
                        <stop offset="100%" stopColor="hsl(var(--chart-2))" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 10 }} />
                    <Area type="monotone" dataKey="income"   stroke="hsl(var(--chart-1))" strokeWidth={2} fill="url(#g1)" />
                    <Area type="monotone" dataKey="expenses" stroke="hsl(var(--chart-2))" strokeWidth={2} fill="url(#g2)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <div className="grid grid-cols-3 gap-4 mt-2 pt-4 border-t border-border">
                <div><div className="text-[11px] uppercase text-muted-foreground tracking-wider">Income</div><div className="cb-num text-lg font-bold text-emerald-500">{INR(80000)}</div></div>
                <div><div className="text-[11px] uppercase text-muted-foreground tracking-wider">Expenses</div><div className="cb-num text-lg font-bold text-rose-500">{INR(45000)}</div></div>
                <div><div className="text-[11px] uppercase text-muted-foreground tracking-wider">Savings</div><div className="cb-num text-lg font-bold text-indigo-500">{INR(10000)}</div></div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Stats */}
      <section id="stats" className="max-w-7xl mx-auto px-5 py-14 grid md:grid-cols-4 gap-4">
        {[
          { k: '4.9/5',   v: 'User rating' },
          { k: '12K+',    v: 'Active ledgers' },
          { k: '₹18Cr+',  v: 'Recorded this year' },
          { k: '100%',    v: 'Private & offline-first' },
        ].map((s, i) => (
          <motion.div key={s.k} initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.05 }} className="cb-card p-5">
            <div className="text-2xl font-extrabold tracking-tight">{s.k}</div>
            <div className="text-sm text-muted-foreground mt-1">{s.v}</div>
          </motion.div>
        ))}
      </section>

      {/* Features */}
      <section id="features" className="max-w-7xl mx-auto px-5 py-16">
        <div className="max-w-2xl">
          <div className="text-xs font-semibold text-primary uppercase tracking-wider">Everything you need</div>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight mt-2">The essentials, thoughtfully done</h2>
          <p className="text-muted-foreground mt-3">A ledger you actually understand — with delightful motion, quiet colors, and a keyboard-friendly worksheet.</p>
        </div>
        <div className="mt-10 grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map((f, i) => {
            const Icon = f.icon;
            return (
              <motion.div key={f.title} initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.05 }} className="cb-card p-5 group">
                <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary grid place-items-center group-hover:scale-110 transition"><Icon className="h-5 w-5" /></div>
                <div className="mt-4 font-semibold">{f.title}</div>
                <div className="text-sm text-muted-foreground mt-1.5">{f.desc}</div>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* CTA */}
      <section id="pricing" className="max-w-6xl mx-auto px-5 py-16">
        <div className="cb-card p-8 md:p-12 relative overflow-hidden text-center">
          <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
          <div className="absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-accent/10 blur-3xl" />
          <div className="relative">
            <h3 className="text-3xl md:text-4xl font-bold tracking-tight">Ready to make it clear?</h3>
            <p className="text-muted-foreground mt-3 max-w-lg mx-auto">Start with an empty ledger. Add what you spend, see what remains, and end the month with a calmer picture.</p>
            <div className="mt-6 flex justify-center gap-3">
              <Link to="/signup"><Button size="lg" className="h-11 px-7">Create free account</Button></Link>
              <Link to="/dashboard"><Button size="lg" variant="outline" className="h-11 px-7">Try the demo</Button></Link>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-border">
        <div className="max-w-7xl mx-auto px-5 py-8 flex flex-col md:flex-row items-center justify-between gap-3 text-sm text-muted-foreground">
          <div className="flex items-center gap-2"><BookOpen className="h-4 w-4" /> ClearBook © {new Date().getFullYear()}</div>
          <div className="flex items-center gap-5"><a href="#" className="hover:text-foreground">Privacy</a><a href="#" className="hover:text-foreground">Terms</a><a href="#" className="hover:text-foreground">Contact</a></div>
        </div>
      </footer>
    </div>
  );
}
