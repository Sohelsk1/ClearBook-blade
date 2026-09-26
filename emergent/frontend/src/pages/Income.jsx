import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, Coins, TrendingUp, Loader2 } from 'lucide-react';
import { INR, INCOME_SOURCES } from '../mock';
import { loadLedger, saveCollection } from '../lib/ledger';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '../components/ui/dialog';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '../components/ui/select';
import { Badge } from '../components/ui/badge';
import { toast } from 'sonner';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';

export default function Income() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ amount: '', source: 'salary', date: new Date().toISOString().slice(0,10), note: '' });

  const refresh = () => { setItems(loadLedger().incomes); setLoading(false); };
  useEffect(() => {
    refresh();
    window.addEventListener('cb-ledger', refresh);
    return () => window.removeEventListener('cb-ledger', refresh);
  }, []);

  const total = items.reduce((s,x)=>s+x.amount, 0);
  const bySource = INCOME_SOURCES.map(s => ({ ...s, amount: items.filter(x=>x.source===s.id).reduce((a,b)=>a+b.amount, 0) })).filter(s => s.amount > 0);
  const trend = useMemo(() => {
    const map = new Map();
    items.forEach(i => { const m = (i.date||'').slice(0,7); if(!m) return; map.set(m, (map.get(m)||0) + i.amount); });
    return Array.from(map.entries()).sort().map(([m,v]) => ({ month: m, amount: v }));
  }, [items]);

  const add = async () => {
    if (!form.amount) return toast.error('Amount is required');
    setBusy(true);
    try {
      const created = { id: crypto.randomUUID(), amount: Number(form.amount), source: form.source, date: form.date, note: form.note, direction: 'income' };
      const next = [created, ...items];
      saveCollection('incomes', next);
      setItems(next);
      setOpen(false); setForm({ amount: '', source: 'salary', date: new Date().toISOString().slice(0,10), note: '' });
      toast.success('Income recorded');
    } catch (e) { toast.error(e.message); } finally { setBusy(false); }
  };
  const remove = async (id) => { try { const next = items.filter(x => x.id !== id); saveCollection('incomes', next); setItems(next); toast('Deleted'); } catch(e){ toast.error(e.message); } };
  const srcLabel = (id) => INCOME_SOURCES.find(s=>s.id===id)?.label || id;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-xs text-muted-foreground font-medium">Ledger</div>
          <h1 className="text-3xl font-bold tracking-tight mt-1">Income</h1>
          <p className="text-sm text-muted-foreground mt-1.5">Track what comes in — salary, freelance and beyond.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button className="h-10"><Plus className="h-4 w-4 mr-1" /> Add income</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>New income</DialogTitle></DialogHeader>
            <div className="grid gap-4 mt-2">
              <div><Label className="text-xs">Amount (₹)</Label><Input type="number" value={form.amount} onChange={e=>setForm({...form, amount: e.target.value})} className="mt-1.5" /></div>
              <div><Label className="text-xs">Source</Label>
                <Select value={form.source} onValueChange={v=>setForm({...form, source: v})}>
                  <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                  <SelectContent>{INCOME_SOURCES.map(s => <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label className="text-xs">Date</Label><Input type="date" value={form.date} onChange={e=>setForm({...form, date: e.target.value})} className="mt-1.5" /></div>
              <div><Label className="text-xs">Note</Label><Input value={form.note} onChange={e=>setForm({...form, note: e.target.value})} className="mt-1.5" /></div>
            </div>
            <DialogFooter><Button variant="outline" onClick={()=>setOpen(false)}>Cancel</Button><Button onClick={add} disabled={busy}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid md:grid-cols-3 gap-3">
        <div className="cb-card p-5 md:col-span-1">
          <div className="flex items-center gap-2 text-xs uppercase text-muted-foreground tracking-wider font-semibold"><Coins className="h-3.5 w-3.5" /> Total income</div>
          <div className="cb-num text-4xl font-extrabold mt-2">{INR(total)}</div>
          <div className="text-xs text-emerald-500 mt-1 flex items-center gap-1"><TrendingUp className="h-3 w-3" /> Recorded across {items.length} entries</div>
          <div className="mt-5 space-y-2">
            {bySource.map(s => (
              <div key={s.id} className="flex items-center gap-2 text-sm">
                <span className="h-2 w-2 rounded-full bg-primary" />
                <span className="flex-1 text-muted-foreground">{s.label}</span>
                <span className="cb-num font-medium">{INR(s.amount)}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="cb-card p-5 md:col-span-2">
          <div className="text-sm font-semibold">Income trend</div>
          <div className="text-xs text-muted-foreground mt-0.5">By month</div>
          <div className="h-56 mt-3">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trend} margin={{ left: -10, right: 6, top: 8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 10, fontSize: 12 }} formatter={(v) => INR(v)} />
                <Line type="monotone" dataKey="amount" stroke="hsl(var(--chart-1))" strokeWidth={2.5} dot={{ r: 4, fill: 'hsl(var(--chart-1))' }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="cb-card p-5">
        <div className="text-sm font-semibold">Recent income</div>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-left text-xs uppercase tracking-wider text-muted-foreground"><th className="py-2 px-2">Date</th><th className="py-2 px-2">Source</th><th className="py-2 px-2">Note</th><th className="py-2 px-2 text-right">Amount</th><th className="py-2 px-2"></th></tr></thead>
            <tbody>
              <AnimatePresence initial={false}>
                {items.slice().sort((a,b)=>(b.date||'').localeCompare(a.date||'')).map(x => (
                  <motion.tr key={x.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="border-t border-border hover:bg-muted/40">
                    <td className="py-3 px-2 text-muted-foreground">{x.date}</td>
                    <td className="py-3 px-2"><Badge variant="secondary" className="bg-emerald-500/10 text-emerald-500 font-normal">{srcLabel(x.source)}</Badge></td>
                    <td className="py-3 px-2">{x.note}</td>
                    <td className="py-3 px-2 text-right cb-num font-semibold text-emerald-500">+{INR(x.amount)}</td>
                    <td className="py-3 px-2 text-right"><button onClick={()=>remove(x.id)} className="p-1.5 rounded-md hover:bg-rose-500/10 text-muted-foreground hover:text-rose-500"><Trash2 className="h-4 w-4" /></button></td>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>
          {loading && <div className="py-8 text-center text-muted-foreground text-sm flex items-center justify-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Loading...</div>}
          {!loading && items.length === 0 && <div className="py-8 text-center text-muted-foreground text-sm">No income yet.</div>}
        </div>
      </div>
    </div>
  );
}
