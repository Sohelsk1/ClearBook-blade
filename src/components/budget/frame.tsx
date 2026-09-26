import { Component, lazy, Suspense, useEffect, useState, type ReactNode } from "react";
import { Navigate, useRouterState } from "@tanstack/react-router";
import { RedirectToSignIn } from "@/lib/auth/gates";
import { Button } from "@/components/ui/button";
import { ACCOUNT_BOOTSTRAP_TIMEOUT_MS, ACCOUNT_BOOT_SCRIPT, resolveAccountShell } from "@/lib/auth/account-shell";
import { authClient, signOut } from "@/lib/auth/client";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { loadLedger } from "@/lib/budget/ledger";
import { ledgerRequestSignal, useBudget } from "@/lib/budget/store";
import { isMarketingPath } from "@/lib/seo";
import { LedgerSkeleton } from "@/components/ui/skeleton";

export { useEditor } from "@/components/budget/editor-context";

const FrameInner = lazy(() => import("@/components/budget/app-shell").then((mod) => ({ default: mod.FrameInner })));

declare global {
  interface Window {
    __cbHydrated?: boolean;
  }
}

if (typeof window !== "undefined") window.__cbHydrated = true;

function isResetPath(pathname: string) {
  return pathname === "/reset-password" || pathname.startsWith("/reset-password/");
}

function isCredentialPath(pathname: string) {
  return pathname === "/login" || pathname === "/forgot-password";
}

function isPublicPath(pathname: string) {
  return isCredentialPath(pathname) || isResetPath(pathname);
}

export function Mark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" width="44" height="44" className={className} aria-hidden="true">
      <rect width="32" height="32" rx="8" fill="#203541" />
      <path d="M7 10.6c3.4-1.5 6.2-1.5 8.2.2v12.2c-2 1.5-4.8 1.5-8.2.1V10.6z" fill="#F6F4EF" />
      <path d="M25 10.6c-3.4-1.5-6.2-1.5-8.2.2v12.2c2 1.5 4.8 1.5 8.2.1V10.6z" fill="#E7EEF1" />
      <rect x="15.35" y="9.7" width="1.3" height="13.6" rx="0.45" fill="#1F6B4A" />
      <path d="M20.4 10.4h2.7v5.6l-1.35-1.05-1.35 1.05v-5.6z" fill="#BF6255" />
    </svg>
  );
}

function LoadingScreen({ label }: { label: string }) {
  return (
    <main id="account-boot" data-state="loading" className="cb-boot">
      <div className="cb-boot-brand">
        <span className="cb-boot-mark"><Mark className="size-11 shrink-0" /></span>
        <div>
          <p className="wordmark text-foreground">ClearBook</p>
          <p className="cb-boot-status" data-boot-detail>{label}</p>
        </div>
      </div>
      <div className="cb-boot-layout" aria-hidden="true">
        <div className="cb-boot-side" />
        <div className="cb-boot-main">
          <span /><span /><span />
        </div>
      </div>
      <div id="account-boot-actions" hidden className="mt-4 flex gap-3 text-sm">
        <a href="" className="underline">Reload</a>
        <a href="/login" className="underline">Sign in</a>
      </div>
      <script
        dangerouslySetInnerHTML={{ __html: ACCOUNT_BOOT_SCRIPT }}
      />
    </main>
  );
}

function AccountProblem({
  title,
  detail,
  onRetry,
}: {
  title: string;
  detail: string;
  onRetry: () => void;
}) {
  return (
    <main className="mx-auto min-h-screen w-full max-w-lg px-4 py-10">
      <div className="flex items-center gap-3">
        <Mark className="size-11 shrink-0" />
        <p className="wordmark text-foreground">ClearBook</p>
      </div>
      <h1 className="mt-6 text-xl font-medium">{title}</h1>
      <p className="mt-2 text-sm text-muted-foreground">{detail}</p>
      <div className="mt-4 flex gap-2">
        <Button type="button" onClick={onRetry}>Retry</Button>
        <Button type="button" variant="secondary" onClick={() => void signOut("/login")}>Sign out</Button>
      </div>
    </main>
  );
}

class ShellBoundary extends Component<{ attempt: number; onRetry: () => void; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidUpdate(prev: { attempt: number }) {
    if (prev.attempt !== this.props.attempt && this.state.failed) this.setState({ failed: false });
  }
  render() {
    if (this.state.failed) {
      return (
        <AccountProblem
          title="This page did not open"
          detail="The screen failed to render. Retry to load it again. Your ledger was not changed."
          onRetry={this.props.onRetry}
        />
      );
    }
    return this.props.children;
  }
}

export function Frame({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const notFound = useRouterState({
    select: (state) => state.matches.some((match) => match.status === "notFound"),
  });
  const { user, isPending } = useCurrentUserState();
  const status = useBudget((state) => state.status);
  const beginSession = useBudget((state) => state.beginSession);
  const applyRemote = useBudget((state) => state.applyRemote);
  const clearSession = useBudget((state) => state.clearSession);
  const [mounted, setMounted] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [sessionTimedOut, setSessionTimedOut] = useState(false);
  const [ledgerError, setLedgerError] = useState(false);
  const privateRoute = !(isMarketingPath(pathname) || notFound || isPublicPath(pathname));

  useEffect(() => {
    window.__cbHydrated = true;
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || !isPending) {
      setSessionTimedOut(false);
      return;
    }
    const timer = window.setTimeout(() => setSessionTimedOut(true), ACCOUNT_BOOTSTRAP_TIMEOUT_MS);
    return () => window.clearTimeout(timer);
  }, [mounted, isPending, attempt]);

  useEffect(() => {
    if (!mounted || isPending) return;
    if (!user) {
      clearSession();
      setLedgerError(false);
      return;
    }
    if (!privateRoute) return;
    const epoch = beginSession(user.id);
    const signal = ledgerRequestSignal();
    let live = true;
    setLedgerError(false);
    const timer = window.setTimeout(() => {
      if (live) setLedgerError(true);
    }, ACCOUNT_BOOTSTRAP_TIMEOUT_MS);
    void loadLedger({ signal })
      .then((snapshot) => {
        if (!live || useBudget.getState().epoch !== epoch) return;
        window.clearTimeout(timer);
        applyRemote(epoch, snapshot);
        setLedgerError(false);
      })
      .catch(() => {
        if (!live || useBudget.getState().epoch !== epoch) return;
        window.clearTimeout(timer);
        setLedgerError(true);
      });
    return () => {
      live = false;
      window.clearTimeout(timer);
    };
  }, [mounted, isPending, user?.id, privateRoute, beginSession, applyRemote, clearSession, attempt]);

  function retryAccount() {
    setSessionTimedOut(false);
    setLedgerError(false);
    setAttempt((value) => value + 1);
    void authClient.getSession().catch(() => {});
  }

  const shell = resolveAccountShell({
    privateRoute,
    mounted,
    sessionPending: isPending,
    sessionTimedOut,
    hasUser: Boolean(user),
    ledgerStatus: ledgerError ? "error" : status,
  });

  if (shell === "public") {
    if ((pathname === "/" || isCredentialPath(pathname)) && mounted && !isPending && user) {
      return <Navigate to="/dashboard" />;
    }
    return <>{children}</>;
  }

  if (shell === "session_loading") {
    return <LoadingScreen label="Checking your account…" />;
  }
  if (shell === "session_error") {
    return (
      <AccountProblem
        title="Could not load your account"
        detail="The sign-in check did not finish. Retry, or sign out and sign in again. Your ledger was not changed."
        onRetry={retryAccount}
      />
    );
  }
  if (shell === "signed_out") {
    if (isPublicPath(pathname)) return <>{children}</>;
    return <RedirectToSignIn />;
  }
  if (shell === "ledger_error") {
    return (
      <AccountProblem
        title="Could not load your ledger"
        detail="The account request failed or took too long. Retry to load it again. Nothing was deleted."
        onRetry={retryAccount}
      />
    );
  }
  if (shell === "ledger_loading" || !user) return <LedgerSkeleton />;
  return (
    <ShellBoundary attempt={attempt} onRetry={retryAccount}>
      <Suspense fallback={<LedgerSkeleton />}>
        <FrameInner userId={user.id}>{children}</FrameInner>
      </Suspense>
    </ShellBoundary>
  );
}
