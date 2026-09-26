import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { PiggyBank, Plus, Trash2, Loader2 } from 'lucide-react';
import { INR, CATEGORIES } from '../mock';
import { loadLedger, saveCollection } from '../lib/ledger';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Progress } from '../components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '../components/ui/dialog';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '../components/ui/select';
import { toast } from 'sonner';

export default function Budgets() {
  const [budgets, setBudgets] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ category: 'food', limit: '' });

  const refresh = () => {
    const ledger = loadLedger();
    setBudgets(ledger.budgets);
    setExpenses(ledger.expenses);
    setLoading(false);
  };
  useEffect(() => {
    refresh();
    window.addEventListener('cb-ledger', refresh);
    return () => window.removeEventListener('cb-ledger', refresh);
  }, []);

  const rows = useMemo(() => budgets.map(b => {
    const cat = CATEGORIES.find(c => c.id === b.category) || CATEGORIES[0];
    const spent = expenses.filter(e => e.category === b.category).reduce((s,x) => s + x.amount, 0);
    const pct = Math.min(100, Math.round((spent / b.limit) * 100));
    const status = pct >= 100 ? 'over' : pct >= 80 ? 'near' : 'good';
    return { ...b, cat, spent, pct, status, remaining: Math.max(0, b.limit - spent) };
  }), [budgets, expenses]);

  const totalLimit = rows.reduce((s,r)=>s+r.limit, 0);
  const totalSpent = rows.reduce((s,r)=>s+r.spent, 0);

  const add = async () => {
    if (!form.limit) return toast.error('Limit is required');
    setBusy(true);
    try {
      const next = [{ id: crypto.randomUUID(), category: form.category, limit: Number(form.limit) }, ...budgets.filter(item => item.category !== form.category)];
      saveCollection('budgets', next);
      setBudgets(next);
      setOpen(false); setForm({ category: 'food', limit: '' });
      toast.success('Budget saved');
    } catch (e) { toast.error(e.message); } finally { setBusy(false); }
  };
  const remove = async (id) => { try { const next = budgets.filter(b=>b.id!==id); saveCollection('budgets', next); setBudgets(next); toast('Removed'); } catch(e){ toast.error(e.message); } };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-xs text-muted-foreground font-medium">Planning</div>
          <h1 className="text-3xl font-bold tracking-tight mt-1">Budgets</h1>
          <p className="text-sm text-muted-foreground mt-1.5">Gentle limits that keep you honest with categories.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button className="h-10"><Plus className="h-4 w-4 mr-1" /> New budget</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Set budget</DialogTitle></DialogHeader>
            <div className="grid gap-4 mt-2">
              <div><Label className="text-xs">Category</Label>
                <Select value={form.category} onValueChange={v=>setForm({...form, category: v})}>
                  <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                  <SelectContent>{CATEGORIES.map(c => <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label className="text-xs">Monthly limit (₹)</Label><Input type="number" value={form.limit} onChange={e=>setForm({...form, limit: e.target.value})} className="mt-1.5" /></div>
            </div>
            <DialogFooter><Button variant="outline" onClick={()=>setOpen(false)}>Cancel</Button><Button onClick={add} disabled={busy}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid md:grid-cols-3 gap-3">
        <div className="cb-card p-5"><div className="text-xs uppercase text-muted-foreground tracking-wider font-semibold">Total budgeted</div><div className="cb-num text-3xl font-bold mt-1">{INR(totalLimit)}</div></div>
        <div className="cb-card p-5"><div className="text-xs uppercase text-muted-foreground tracking-wider font-semibold">Total spent</div><div className="cb-num text-3xl font-bold mt-1">{INR(totalSpent)}</div></div>
        <div className="cb-card p-5"><div className="text-xs uppercase text-muted-foreground tracking-wider font-semibold">Remaining</div><div className="cb-num text-3xl font-bold mt-1 text-primary">{INR(Math.max(0, totalLimit - totalSpent))}</div></div>
      </div>

      {loading ? (
        <div className="py-12 text-center text-muted-foreground text-sm flex items-center justify-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Loading budgets...</div>
      ) : rows.length === 0 ? (
        <div className="cb-card p-12 text-center text-muted-foreground">No budgets yet — create your first one to get gentle nudges.</div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {rows.map(r => (
            <motion.div key={r.id} whileHover={{ y: -3 }} className="cb-card p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl grid place-items-center" style={{ background: `${r.cat.color}1a`, color: r.cat.color }}><PiggyBank className="h-5 w-5" /></div>
                  <div>
                    <div className="font-semibold">{r.cat.label}</div>
                    <div className="text-xs text-muted-foreground">Monthly budget</div>
                  </div>
                </div>
                <button onClick={()=>remove(r.id)} className="p-1.5 rounded-md hover:bg-rose-500/10 text-muted-foreground hover:text-rose-500"><Trash2 className="h-4 w-4" /></button>
              </div>
              <div className="mt-5 flex items-end justify-between">
                <div><div className="text-xs text-muted-foreground">Spent</div><div className="cb-num text-2xl font-bold">{INR(r.spent)}</div></div>
                <div className="text-right"><div className="text-xs text-muted-foreground">Limit</div><div className="cb-num text-2xl font-bold text-muted-foreground">{INR(r.limit)}</div></div>
              </div>
              <div className="mt-3">
                <Progress value={r.pct} className="h-2" />
                <div className="flex justify-between text-xs mt-2">
                  <span className={r.status === 'over' ? 'text-rose-500 font-semibold' : r.status === 'near' ? 'text-amber-500 font-semibold' : 'text-emerald-500 font-semibold'}>
                    {r.status === 'over' ? 'Over budget' : r.status === 'near' ? 'Near limit' : 'On track'} — {r.pct}%
                  </span>
                  <span className="text-muted-foreground cb-num">{INR(r.remaining)} left</span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
