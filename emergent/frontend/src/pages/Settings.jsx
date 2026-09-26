import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Settings as Cog, Sun, Moon, Download, User as UserIcon, Palette, Bell, Loader2, RotateCcw } from 'lucide-react';
import { auth } from '../lib/api';
import { loadLedger } from '../lib/ledger';
import ResetAllDialog from '../components/ResetAllDialog';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Switch } from '../components/ui/switch';
import { toast } from 'sonner';

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const { user, setUser } = useAuth();
  const [form, setForm] = useState(() => ({ name: user?.name || '', email: user?.email || '', currency: user?.currency || 'INR' }));
  const [saving, setSaving] = useState(false);
  const [notify, setNotify] = useState({ weekly: true, over: true, tips: false });

  const saveProfile = async () => {
    setSaving(true);
    try {
      const fresh = { ...user, ...form };
      setUser(fresh); auth.setUser(fresh);
      toast.success('Profile saved');
    } catch (e) { toast.error(e.message); } finally { setSaving(false); }
  };

  const exportAll = async () => {
    try {
      const { expenses, incomes, budgets, goals } = loadLedger();
      const data = { user, expenses, incomes, budgets, goals };
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'clearbook-export.json'; a.click();
      URL.revokeObjectURL(url); toast.success('Exported ledger');
    } catch (e) { toast.error(e.message); }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <div className="text-xs text-muted-foreground font-medium">Account</div>
        <h1 className="text-3xl font-bold tracking-tight mt-1 flex items-center gap-2"><Cog className="h-7 w-7 text-primary" /> Settings</h1>
        <p className="text-sm text-muted-foreground mt-1.5">Tune ClearBook to fit your workflow.</p>
      </div>

      <motion.section initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="cb-card p-6">
        <div className="flex items-center gap-2 text-sm font-semibold"><UserIcon className="h-4 w-4 text-primary" /> Profile</div>
        <div className="grid md:grid-cols-2 gap-4 mt-4">
          <div><Label className="text-xs">Name</Label><Input value={form.name} onChange={e=>setForm({...form, name: e.target.value})} className="mt-1.5" /></div>
          <div><Label className="text-xs">Email</Label><Input value={form.email} onChange={e=>setForm({...form, email: e.target.value})} className="mt-1.5" /></div>
          <div><Label className="text-xs">Currency</Label><Input value={form.currency} onChange={e=>setForm({...form, currency: e.target.value})} className="mt-1.5" /></div>
        </div>
        <Button onClick={saveProfile} disabled={saving} className="mt-5 h-10">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save profile'}</Button>
      </motion.section>

      <motion.section initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="cb-card p-6">
        <div className="flex items-center gap-2 text-sm font-semibold"><Palette className="h-4 w-4 text-primary" /> Appearance</div>
        <div className="mt-4 grid sm:grid-cols-2 gap-3">
          <button onClick={()=>setTheme('light')} className={`p-4 rounded-xl border-2 text-left transition ${theme === 'light' ? 'border-primary bg-primary/5' : 'border-border hover:border-muted-foreground/30'}`}>
            <div className="flex items-center gap-2"><Sun className="h-4 w-4" /> <span className="font-medium">Light</span></div>
            <div className="mt-3 h-10 rounded-md bg-gradient-to-r from-white to-slate-100 border border-border" />
          </button>
          <button onClick={()=>setTheme('dark')} className={`p-4 rounded-xl border-2 text-left transition ${theme === 'dark' ? 'border-primary bg-primary/5' : 'border-border hover:border-muted-foreground/30'}`}>
            <div className="flex items-center gap-2"><Moon className="h-4 w-4" /> <span className="font-medium">Dark</span></div>
            <div className="mt-3 h-10 rounded-md bg-gradient-to-r from-slate-900 to-slate-800 border border-border" />
          </button>
        </div>
      </motion.section>

      <motion.section initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="cb-card p-6">
        <div className="flex items-center gap-2 text-sm font-semibold"><Bell className="h-4 w-4 text-primary" /> Notifications</div>
        <div className="mt-4 space-y-4">
          {[
            { key: 'weekly', label: 'Weekly summary', desc: 'A calm Sunday recap of your week.' },
            { key: 'over',   label: 'Over-budget alerts', desc: 'Nudge me when I cross a category limit.' },
            { key: 'tips',   label: 'Occasional tips',   desc: 'Small ideas to save more next month.' },
          ].map(n => (
            <div key={n.key} className="flex items-center justify-between py-2 border-b border-border last:border-0">
              <div><div className="text-sm font-medium">{n.label}</div><div className="text-xs text-muted-foreground">{n.desc}</div></div>
              <Switch checked={notify[n.key]} onCheckedChange={v=>setNotify({...notify, [n.key]: v})} />
            </div>
          ))}
        </div>
        <p className="text-[11px] text-muted-foreground mt-3">Notification delivery is not connected yet — preferences save locally.</p>
      </motion.section>

      <motion.section initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="cb-card p-6">
        <div className="flex items-center gap-2 text-sm font-semibold"><Download className="h-4 w-4 text-primary" /> Data</div>
        <p className="text-xs text-muted-foreground mt-1">Your ledger is stored securely on our servers and synced across devices.</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button variant="outline" onClick={exportAll}><Download className="h-4 w-4 mr-1" /> Export as JSON</Button>
          <ResetAllDialog trigger={<Button variant="destructive"><RotateCcw className="h-4 w-4 mr-1" /> Reset All Data</Button>} />
        </div>
      </motion.section>
    </div>
  );
}
