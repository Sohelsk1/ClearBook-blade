import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, Search, Filter, Wallet, Loader2 } from 'lucide-react';
import { INR, CATEGORIES } from '../mock';
import { loadLedger, saveCollection } from '../lib/ledger';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '../components/ui/dialog';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '../components/ui/select';
import { Badge } from '../components/ui/badge';
import { toast } from 'sonner';

export default function Expenses() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('all');
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ amount: '', category: 'food', date: new Date().toISOString().slice(0,10), note: '' });

  const refresh = () => { setItems(loadLedger().expenses); setLoading(false); };
  useEffect(() => {
    refresh();
    window.addEventListener('cb-ledger', refresh);
    return () => window.removeEventListener('cb-ledger', refresh);
  }, []);

  const filtered = useMemo(() => items
    .filter(x => cat === 'all' || x.category === cat)
    .filter(x => !q || (x.note || '').toLowerCase().includes(q.toLowerCase()))
    .sort((a,b) => (b.date || '').localeCompare(a.date || '')),
    [items, q, cat]
  );
  const total = filtered.reduce((s,x)=>s+x.amount, 0);
  const catOf = (id) => CATEGORIES.find(c => c.id === id) || CATEGORIES[CATEGORIES.length-1];

  const add = async () => {
    if (!form.amount) return toast.error('Amount is required');
    setBusy(true);
    try {
      const created = { id: crypto.randomUUID(), amount: Number(form.amount), category: form.category, date: form.date, note: form.note, direction: 'expense' };
      const next = [created, ...items];
      saveCollection('expenses', next);
      setItems(next);
      setOpen(false); setForm({ amount: '', category: 'food', date: new Date().toISOString().slice(0,10), note: '' });
      toast.success('Expense added');
    } catch (e) { toast.error(e.message); } finally { setBusy(false); }
  };
  const remove = async (id) => {
    try { const next = items.filter(x => x.id !== id); saveCollection('expenses', next); setItems(next); toast('Deleted'); }
    catch (e) { toast.error(e.message); }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-xs text-muted-foreground font-medium">Ledger</div>
          <h1 className="text-3xl font-bold tracking-tight mt-1">Expenses</h1>
          <p className="text-sm text-muted-foreground mt-1.5">Every entry, sorted and searchable.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button className="h-10"><Plus className="h-4 w-4 mr-1" /> Add expense</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>New expense</DialogTitle></DialogHeader>
            <div className="grid gap-4 mt-2">
              <div><Label className="text-xs">Amount (₹)</Label><Input type="number" value={form.amount} onChange={e=>setForm({...form, amount: e.target.value})} placeholder="e.g. 450" className="mt-1.5" /></div>
              <div><Label className="text-xs">Category</Label>
                <Select value={form.category} onValueChange={v=>setForm({...form, category: v})}>
                  <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                  <SelectContent>{CATEGORIES.map(c => <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label className="text-xs">Date</Label><Input type="date" value={form.date} onChange={e=>setForm({...form, date: e.target.value})} className="mt-1.5" /></div>
              <div><Label className="text-xs">Note</Label><Input value={form.note} onChange={e=>setForm({...form, note: e.target.value})} placeholder="optional" className="mt-1.5" /></div>
            </div>
            <DialogFooter><Button variant="outline" onClick={()=>setOpen(false)}>Cancel</Button><Button onClick={add} disabled={busy}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid md:grid-cols-3 gap-3">
        <div className="cb-card p-5"><div className="text-xs uppercase text-muted-foreground tracking-wider font-semibold">Total (filtered)</div><div className="cb-num text-3xl font-bold mt-1">{INR(total)}</div></div>
        <div className="cb-card p-5"><div className="text-xs uppercase text-muted-foreground tracking-wider font-semibold">Entries</div><div className="cb-num text-3xl font-bold mt-1">{filtered.length}</div></div>
        <div className="cb-card p-5"><div className="text-xs uppercase text-muted-foreground tracking-wider font-semibold">Top category</div><div className="text-lg font-bold mt-1">{catOf(filtered[0]?.category || 'other').label}</div></div>
      </div>

      <div className="cb-card p-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="h-4 w-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
            <Input placeholder="Search note..." value={q} onChange={e=>setQ(e.target.value)} className="pl-9 h-10 bg-muted/40 border-transparent focus-visible:bg-card" />
          </div>
          <Select value={cat} onValueChange={setCat}>
            <SelectTrigger className="w-[200px] h-10"><Filter className="h-4 w-4 mr-1" /><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {CATEGORIES.map(c => <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-left text-xs uppercase tracking-wider text-muted-foreground"><th className="py-2 px-2">Date</th><th className="py-2 px-2">Category</th><th className="py-2 px-2">Note</th><th className="py-2 px-2 text-right">Amount</th><th className="py-2 px-2"></th></tr></thead>
            <tbody>
              <AnimatePresence initial={false}>
                {filtered.map(x => {
                  const c = catOf(x.category);
                  return (
                    <motion.tr key={x.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="border-t border-border hover:bg-muted/40">
                      <td className="py-3 px-2 text-muted-foreground">{x.date}</td>
                      <td className="py-3 px-2"><Badge variant="secondary" className="font-normal" style={{ backgroundColor: `${c.color}1a`, color: c.color }}>{c.label}</Badge></td>
                      <td className="py-3 px-2">{x.note}</td>
                      <td className="py-3 px-2 text-right cb-num font-semibold">{INR(x.amount)}</td>
                      <td className="py-3 px-2 text-right"><button onClick={()=>remove(x.id)} className="p-1.5 rounded-md hover:bg-rose-500/10 text-muted-foreground hover:text-rose-500"><Trash2 className="h-4 w-4" /></button></td>
                    </motion.tr>
                  );
                })}
              </AnimatePresence>
            </tbody>
          </table>
          {loading && <div className="py-8 text-center text-muted-foreground text-sm flex items-center justify-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Loading...</div>}
          {!loading && filtered.length === 0 && (
            <div className="py-12 text-center text-muted-foreground">
              <Wallet className="h-8 w-8 mx-auto mb-2 opacity-50" />
              No expenses yet — add your first one.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
