import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, Wallet, Coins, PiggyBank, Target, FileSpreadsheet,
  Settings as Cog, Sun, Moon, Search, Bell, LogOut, Menu, X, BookOpen, Sparkles
} from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { Button } from './ui/button';
import { Input } from './ui/input';
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator
} from './ui/dropdown-menu';
import { Avatar, AvatarFallback } from './ui/avatar';

const nav = [
  { to: '/dashboard', label: 'Dashboard',  icon: LayoutDashboard },
  { to: '/expenses',  label: 'Expenses',   icon: Wallet },
  { to: '/income',    label: 'Income',     icon: Coins },
  { to: '/budgets',   label: 'Budgets',    icon: PiggyBank },
  { to: '/goals',     label: 'Goals',      icon: Target },
  { to: '/worksheet', label: 'Worksheet',  icon: FileSpreadsheet },
  { to: '/settings',  label: 'Settings',   icon: Cog },
];

export default function AppLayout() {
  const { theme, toggle } = useTheme();
  const { user: authUser, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const user = authUser || { name: 'You', email: '' };
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const initials = (user.name || 'U').split(' ').map(w => w[0]).slice(0,2).join('').toUpperCase();

  return (
    <div className="min-h-screen flex bg-background text-foreground">
      {/* Sidebar */}
      <aside className={`fixed lg:sticky top-0 left-0 h-screen w-72 z-40 bg-card border-r border-border transform transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="px-5 py-5 flex items-center justify-between border-b border-border">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-emerald-500 to-indigo-500 flex items-center justify-center shadow-sm">
              <BookOpen className="h-5 w-5 text-white" />
            </div>
            <div>
              <div className="font-bold text-[15px] tracking-tight">ClearBook</div>
              <div className="text-[11px] text-muted-foreground -mt-0.5">Personal ledger</div>
            </div>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden p-1.5 rounded-md hover:bg-muted">
            <X className="h-4 w-4" />
          </button>
        </div>

        <nav className="px-3 py-4 space-y-1">
          {nav.map(item => {
            const Icon = item.icon;
            return (
              <NavLink key={item.to} to={item.to} onClick={() => setSidebarOpen(false)}
                className={({ isActive }) =>
                  `group flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                  }`
                }>
                {({ isActive }) => (
                  <>
                    <span className={`grid place-items-center h-8 w-8 rounded-md ${isActive ? 'bg-primary/15 text-primary' : 'bg-muted/70 text-muted-foreground group-hover:text-foreground'}`}>
                      <Icon className="h-4 w-4" />
                    </span>
                    <span>{item.label}</span>
                    {isActive && (
                      <motion.span layoutId="navdot" className="ml-auto h-1.5 w-1.5 rounded-full bg-primary" />
                    )}
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>

        <div className="px-4 mt-4">
          <div className="cb-card p-4 relative overflow-hidden">
            <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-primary/10 blur-2xl" />
            <div className="flex items-center gap-2 text-primary text-xs font-semibold">
              <Sparkles className="h-3.5 w-3.5" /> PRO INSIGHTS
            </div>
            <div className="mt-2 text-sm font-medium">Spend Score is up 6 pts this month</div>
            <div className="text-xs text-muted-foreground mt-1">You are saving 24% of your income.</div>
            <Button size="sm" className="mt-3 h-8 text-xs" onClick={() => navigate('/dashboard')}>See report</Button>
          </div>
        </div>
      </aside>

      {sidebarOpen && <div className="fixed inset-0 bg-black/40 z-30 lg:hidden" onClick={() => setSidebarOpen(false)} />}

      {/* Main */}
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="sticky top-0 z-20 bg-background/85 backdrop-blur border-b border-border">
          <div className="h-16 px-4 lg:px-8 flex items-center gap-3">
            <button className="lg:hidden p-2 rounded-md hover:bg-muted" onClick={() => setSidebarOpen(true)}>
              <Menu className="h-5 w-5" />
            </button>
            <div className="relative flex-1 max-w-md">
              <Search className="h-4 w-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
              <Input placeholder="Search transactions, categories..." className="pl-9 h-10 bg-muted/50 border-transparent focus-visible:bg-card focus-visible:border-border" />
            </div>
            <div className="ml-auto flex items-center gap-2">
              <Button variant="ghost" size="icon" onClick={toggle} className="h-10 w-10" aria-label="Toggle theme">
                <AnimatePresence mode="wait" initial={false}>
                  <motion.span key={theme} initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.2 }}>
                    {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
                  </motion.span>
                </AnimatePresence>
              </Button>
              <Button variant="ghost" size="icon" className="h-10 w-10 relative">
                <Bell className="h-5 w-5" />
                <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-primary" />
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-full hover:bg-muted transition">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-gradient-to-br from-emerald-500 to-indigo-500 text-white text-xs font-semibold">{initials}</AvatarFallback>
                    </Avatar>
                    <div className="hidden md:block text-left">
                      <div className="text-xs font-semibold leading-tight">{user.name}</div>
                      <div className="text-[10px] text-muted-foreground leading-tight">{user.email}</div>
                    </div>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>My account</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate('/settings')}><Cog className="h-4 w-4 mr-2" /> Settings</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => { logout(); navigate('/'); }}><LogOut className="h-4 w-4 mr-2" /> Sign out</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>

        <main className="flex-1 px-4 lg:px-8 py-6 lg:py-8">
          <AnimatePresence mode="wait">
            <motion.div key={location.pathname}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25 }}>
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
