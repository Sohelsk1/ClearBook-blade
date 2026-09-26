import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Target, Plus, Trash2, CheckCircle2, Loader2 } from 'lucide-react';
import { INR } from '../mock';
import { loadLedger, saveCollection } from '../lib/ledger';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Progress } from '../components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '../components/ui/dialog';
import { toast } from 'sonner';

const COLORS = ['#10b981', '#6366f1', '#f59e0b', '#0ea5e9', '#ec4899', '#8b5cf6'];

export default function Goals() {
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [contribOpen, setContribOpen] = useState(null);
  const [form, setForm] = useState({ name: '', target: '', saved: '', deadline: '', color: COLORS[0] });
  const [contrib, setContrib] = useState('');

  const refresh = () => { setGoals(loadLedger().goals); setLoading(false); };
  useEffect(() => {
    refresh();
    window.addEventListener('cb-ledger', refresh);
    return () => window.removeEventListener('cb-ledger', refresh);
  }, []);

  const add = async () => {
    if (!form.name || !form.target) return toast.error('Name and target are required');
    setBusy(true);
    try {
      const created = { id: crypto.randomUUID(), name: form.name, target: Number(form.target), saved: Number(form.saved || 0), deadline: form.deadline || '', color: form.color };
      const next = [created, ...goals];
      saveCollection('goals', next);
      setGoals(next);
      setOpen(false); setForm({ name: '', target: '', saved: '', deadline: '', color: COLORS[0] });
      toast.success('Goal created');
    } catch (e) { toast.error(e.message); } finally { setBusy(false); }
  };

  const addContribution = async (goalId) => {
    const val = Number(contrib);
    if (!val) return toast.error('Enter an amount');
    const g = goals.find(x => x.id === goalId); if (!g) return;
    try {
      const updated = { ...g, saved: Math.min(g.target, g.saved + val) };
      const next = goals.map(x => x.id === goalId ? updated : x);
      saveCollection('goals', next);
      setGoals(next);
      setContribOpen(null); setContrib('');
      toast.success(`Added ${INR(val)} to goal`);
    } catch (e) { toast.error(e.message); }
  };
  const remove = async (id) => { try { const next = goals.filter(x=>x.id!==id); saveCollection('goals', next); setGoals(next); toast('Removed'); } catch(e){ toast.error(e.message); } };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-xs text-muted-foreground font-medium">Savings</div>
          <h1 className="text-3xl font-bold tracking-tight mt-1">Goals</h1>
          <p className="text-sm text-muted-foreground mt-1.5">Build funds you actually reach.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button className="h-10"><Plus className="h-4 w-4 mr-1" /> New goal</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Create goal</DialogTitle></DialogHeader>
            <div className="grid gap-4 mt-2">
              <div><Label className="text-xs">Name</Label><Input value={form.name} onChange={e=>setForm({...form, name: e.target.value})} placeholder="e.g. Emergency Fund" className="mt-1.5" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label className="text-xs">Target (₹)</Label><Input type="number" value={form.target} onChange={e=>setForm({...form, target: e.target.value})} className="mt-1.5" /></div>
                <div><Label className="text-xs">Starting saved (₹)</Label><Input type="number" value={form.saved} onChange={e=>setForm({...form, saved: e.target.value})} className="mt-1.5" /></div>
              </div>
              <div><Label className="text-xs">Deadline</Label><Input type="date" value={form.deadline} onChange={e=>setForm({...form, deadline: e.target.value})} className="mt-1.5" /></div>
              <div><Label className="text-xs">Color</Label>
                <div className="flex gap-2 mt-2">
                  {COLORS.map(c => (
                    <button key={c} type="button" onClick={()=>setForm({...form, color: c})} className={`h-7 w-7 rounded-full border-2 transition ${form.color === c ? 'border-foreground scale-110' : 'border-transparent'}`} style={{ background: c }} />
                  ))}
                </div>
              </div>
            </div>
            <DialogFooter><Button variant="outline" onClick={()=>setOpen(false)}>Cancel</Button><Button onClick={add} disabled={busy}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create goal'}</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="py-12 text-center text-muted-foreground text-sm flex items-center justify-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Loading goals...</div>
      ) : goals.length === 0 ? (
        <div className="cb-card p-12 text-center text-muted-foreground">No goals yet — add your first target.</div>
      ) : (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          {goals.map(g => {
            const pct = Math.min(100, Math.round((g.saved / g.target) * 100));
            const done = pct >= 100;
            return (
              <motion.div key={g.id} whileHover={{ y: -3 }} className="cb-card p-5 relative overflow-hidden">
                <div className="absolute -top-16 -right-16 h-40 w-40 rounded-full opacity-20 blur-2xl" style={{ background: g.color }} />
                <div className="relative">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-11 w-11 rounded-xl grid place-items-center" style={{ background: `${g.color}1a`, color: g.color }}>
                        {done ? <CheckCircle2 className="h-5 w-5" /> : <Target className="h-5 w-5" />}
                      </div>
                      <div>
                        <div className="font-semibold">{g.name}</div>
                        <div className="text-xs text-muted-foreground">Deadline {g.deadline || '—'}</div>
                      </div>
                    </div>
                    <button onClick={()=>remove(g.id)} className="p-1.5 rounded-md hover:bg-rose-500/10 text-muted-foreground hover:text-rose-500"><Trash2 className="h-4 w-4" /></button>
                  </div>
                  <div className="mt-5">
                    <div className="flex items-end justify-between">
                      <div className="cb-num text-2xl font-bold">{INR(g.saved)}</div>
                      <div className="text-sm text-muted-foreground cb-num">of {INR(g.target)}</div>
                    </div>
                    <Progress value={pct} className="h-2 mt-3" />
                    <div className="flex justify-between text-xs mt-2">
                      <span className="font-semibold" style={{ color: g.color }}>{pct}% complete</span>
                      <span className="text-muted-foreground cb-num">{INR(Math.max(0, g.target - g.saved))} to go</span>
                    </div>
                  </div>
                  <Button onClick={()=>setContribOpen(g.id)} disabled={done} className="w-full mt-4 h-9" variant={done ? 'secondary' : 'default'}>
                    {done ? 'Goal reached 🎉' : 'Add contribution'}
                  </Button>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      <Dialog open={!!contribOpen} onOpenChange={(v)=>{ if(!v){ setContribOpen(null); setContrib(''); } }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add contribution</DialogTitle></DialogHeader>
          <div className="mt-2"><Label className="text-xs">Amount (₹)</Label><Input type="number" value={contrib} onChange={e=>setContrib(e.target.value)} className="mt-1.5" placeholder="e.g. 2500" /></div>
          <DialogFooter><Button variant="outline" onClick={()=>setContribOpen(null)}>Cancel</Button><Button onClick={()=>addContribution(contribOpen)}>Add</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
