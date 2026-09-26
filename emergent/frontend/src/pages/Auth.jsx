import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { BookOpen, Mail, Lock, User as UserIcon, ArrowRight, Loader2 } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';

export default function Auth({ mode = 'login' }) {
  const nav = useNavigate();
  const location = useLocation();
  const { login, signup } = useAuth();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === 'signup') {
        await signup(form.name || 'You', form.email, form.password);
        toast.success('Welcome to ClearBook!');
      } else {
        await login(form.email, form.password);
        toast.success('Welcome back!');
      }
      const dest = location.state?.from?.pathname || '/dashboard';
      nav(dest, { replace: true });
    } catch (err) {
      toast.error(err.message || 'Something went wrong');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-background">
      <div className="hidden lg:flex relative overflow-hidden items-center justify-center p-10 bg-gradient-to-br from-emerald-50 to-indigo-50 dark:from-emerald-500/5 dark:to-indigo-500/5">
        <div className="absolute inset-0 cb-grid-bg opacity-60" />
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="relative max-w-md">
          <div className="flex items-center gap-2 mb-6">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-500 to-indigo-500 grid place-items-center"><BookOpen className="h-5 w-5 text-white" /></div>
            <div className="font-bold text-lg">ClearBook</div>
          </div>
          <h2 className="text-4xl font-bold tracking-tight">A calm view of your month, always ready.</h2>
          <p className="text-muted-foreground mt-4">Record spending in seconds. Watch your Spend Score climb. It is that simple.</p>
          <div className="mt-8 cb-card p-4">
            <div className="flex items-center justify-between text-xs text-muted-foreground"><span>REMAINING THIS MONTH</span><span className="text-primary">Live</span></div>
            <div className="cb-num text-3xl font-bold mt-1">₹25,000</div>
            <div className="mt-3 flex gap-1 h-2">
              {[70,45,80,55,90,60,72].map((h,i)=>(<div key={i} className="flex-1 rounded-sm bg-primary/25" style={{ height: `${h}%` }}/>))}
            </div>
          </div>
        </motion.div>
      </div>

      <div className="flex items-center justify-center p-6 lg:p-10">
        <motion.form onSubmit={submit} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm">
          <Link to="/" className="flex items-center gap-2 mb-8 lg:hidden">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-emerald-500 to-indigo-500 grid place-items-center"><BookOpen className="h-4 w-4 text-white" /></div>
            <div className="font-bold">ClearBook</div>
          </Link>
          <h1 className="text-3xl font-bold tracking-tight">{mode === 'signup' ? 'Create your account' : 'Welcome back'}</h1>
          <p className="text-sm text-muted-foreground mt-1.5">{mode === 'signup' ? 'Start with a fresh ledger — we seed it with a few sample entries.' : 'Log in to continue your ledger.'}</p>

          <div className="mt-7 space-y-4">
            {mode === 'signup' && (
              <div>
                <Label className="text-xs text-muted-foreground">Name</Label>
                <div className="relative mt-1.5">
                  <UserIcon className="h-4 w-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                  <Input value={form.name} onChange={e=>setForm({...form, name: e.target.value})} placeholder="Arjun Sharma" className="pl-9 h-11" />
                </div>
              </div>
            )}
            <div>
              <Label className="text-xs text-muted-foreground">Email</Label>
              <div className="relative mt-1.5">
                <Mail className="h-4 w-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                <Input type="email" required value={form.email} onChange={e=>setForm({...form, email: e.target.value})} placeholder="you@clearbook.in" className="pl-9 h-11" />
              </div>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Password</Label>
              <div className="relative mt-1.5">
                <Lock className="h-4 w-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                <Input type="password" required minLength={6} value={form.password} onChange={e=>setForm({...form, password: e.target.value})} placeholder="••••••••" className="pl-9 h-11" />
              </div>
            </div>
          </div>

          <Button type="submit" disabled={busy} className="w-full h-11 mt-6 group">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : (<>{mode === 'signup' ? 'Create account' : 'Log in'} <ArrowRight className="h-4 w-4 ml-1 group-hover:translate-x-0.5 transition" /></>)}
          </Button>

          <p className="mt-6 text-sm text-muted-foreground text-center">
            {mode === 'signup' ? 'Already have an account?' : "Don't have an account?"}{' '}
            <Link to={mode === 'signup' ? '/login' : '/signup'} className="text-primary font-medium hover:underline">{mode === 'signup' ? 'Log in' : 'Create one'}</Link>
          </p>
          <p className="mt-3 text-[11px] text-muted-foreground text-center">By continuing you agree that your ledger is stored on our secure servers so it syncs across devices.</p>
        </motion.form>
      </div>
    </div>
  );
}
