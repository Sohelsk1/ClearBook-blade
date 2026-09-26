import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { FileSpreadsheet, Plus, Save, Download, Loader2 } from 'lucide-react';
import { INR, CATEGORIES } from '../mock';
import { loadLedger, saveCollection } from '../lib/ledger';
import { Button } from '../components/ui/button';
import { toast } from 'sonner';

const tempId = () => 'new-' + Math.random().toString(36).slice(2, 9);

export default function Worksheet() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const exp = loadLedger().expenses;
        exp.sort((a,b) => (b.date||'').localeCompare(a.date||''));
        setRows(exp.slice(0, 10).map(e => ({ id: e.id, date: e.date, category: e.category, amount: e.amount, note: e.note || '', dirty: false })));
      } finally { setLoading(false); }
    })();
  }, []);

  const update = (id, field, value) => setRows(rows.map(r => r.id === id ? { ...r, [field]: value, dirty: true } : r));
  const addRow = () => setRows([{ id: tempId(), date: new Date().toISOString().slice(0,10), category: 'other', amount: '', note: '', dirty: true, isNew: true }, ...rows]);

  const saveAll = async () => {
    setSaving(true);
    try {
      const kept = loadLedger().expenses.filter((item) => !rows.some((row) => row.id === item.id));
      const savedRows = [];
      let saved = 0;
      for (const r of rows) {
        if (!r.amount) { savedRows.push(r); continue; }
        const entry = { id: r.isNew ? crypto.randomUUID() : r.id, amount: Number(r.amount), category: r.category, date: r.date, note: r.note, direction: 'expense' };
        savedRows.push({ ...entry, dirty: false });
        if (r.isNew || r.dirty) saved += 1;
      }
      saveCollection('expenses', [...savedRows.map(({ dirty, isNew, ...entry }) => entry), ...kept]);
      setRows(savedRows);
      toast.success(`Saved ${saved} ${saved === 1 ? 'entry' : 'entries'}`);
    } catch (e) { toast.error(e.message); } finally { setSaving(false); }
  };

  const exportCSV = () => {
    const csv = ['date,category,amount,note', ...rows.map(r => `${r.date},${r.category},${r.amount},"${(r.note||'').replace(/"/g,'""')}"`)].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'clearbook-worksheet.csv'; a.click();
    URL.revokeObjectURL(url); toast.success('Exported CSV');
  };

  const total = rows.reduce((s,r) => s + Number(r.amount || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-xs text-muted-foreground font-medium">Fast entry</div>
          <h1 className="text-3xl font-bold tracking-tight mt-1 flex items-center gap-2"><FileSpreadsheet className="h-7 w-7 text-primary" /> Worksheet</h1>
          <p className="text-sm text-muted-foreground mt-1.5">A spreadsheet-like sheet for typing entries fast.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportCSV} className="h-10"><Download className="h-4 w-4 mr-1" /> Export</Button>
          <Button onClick={saveAll} disabled={saving} className="h-10">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : (<><Save className="h-4 w-4 mr-1" /> Save all</>)}</Button>
        </div>
      </div>

      {loading ? (
        <div className="py-12 text-center text-muted-foreground text-sm flex items-center justify-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Loading worksheet...</div>
      ) : (
        <>
          <div className="cb-card p-1 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground bg-muted/40">
                    <th className="py-3 px-4 w-40">Date</th>
                    <th className="py-3 px-4 w-48">Category</th>
                    <th className="py-3 px-4 w-40 text-right">Amount (₹)</th>
                    <th className="py-3 px-4">Note</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => (
                    <motion.tr key={r.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }} className={`border-t border-border ${r.dirty ? 'bg-amber-500/5' : ''}`}>
                      <td className="px-2"><input type="date" value={r.date} onChange={e=>update(r.id,'date',e.target.value)} className="w-full bg-transparent px-2 py-2.5 outline-none rounded focus:bg-muted/50" /></td>
                      <td className="px-2">
                        <select value={r.category} onChange={e=>update(r.id,'category',e.target.value)} className="w-full bg-transparent px-2 py-2.5 outline-none rounded focus:bg-muted/50">
                          {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                        </select>
                      </td>
                      <td className="px-2"><input type="number" value={r.amount} onChange={e=>update(r.id,'amount',e.target.value)} placeholder="0" className="w-full bg-transparent px-2 py-2.5 outline-none rounded focus:bg-muted/50 text-right cb-num font-semibold" /></td>
                      <td className="px-2"><input value={r.note} onChange={e=>update(r.id,'note',e.target.value)} placeholder="add a note..." className="w-full bg-transparent px-2 py-2.5 outline-none rounded focus:bg-muted/50" /></td>
                    </motion.tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-border bg-muted/30">
                    <td colSpan={2} className="py-3 px-4 text-sm text-muted-foreground">Total ({rows.length} rows)</td>
                    <td className="py-3 px-4 text-right cb-num font-bold text-lg">{INR(total)}</td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          <Button variant="outline" onClick={addRow} className="w-full h-11 border-dashed"><Plus className="h-4 w-4 mr-1" /> Add row</Button>
          <p className="text-xs text-muted-foreground">Rows highlighted in amber are unsaved. Click “Save all” to sync.</p>
        </>
      )}
    </div>
  );
}
