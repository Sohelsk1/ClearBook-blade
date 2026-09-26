/** How long account bootstrap may stay on the loading shell before it becomes an error. */
export const ACCOUNT_BOOTSTRAP_TIMEOUT_MS = 8_000;

/** Runs from the server HTML even if the app bundle never starts. */
export const ACCOUNT_BOOT_FALLBACK_MS = 12_000;

export type LedgerBootStatus = "signed_out" | "loading" | "ready" | "error";

export type AccountShell =
  | "public"
  | "session_loading"
  | "session_error"
  | "signed_out"
  | "ledger_loading"
  | "ledger_error"
  | "ready";

export function resolveAccountShell(input: {
  privateRoute: boolean;
  mounted: boolean;
  sessionPending: boolean;
  sessionTimedOut: boolean;
  hasUser: boolean;
  ledgerStatus: LedgerBootStatus;
}): AccountShell {
  if (!input.privateRoute) return "public";
  if (!input.mounted || (input.sessionPending && !input.sessionTimedOut)) return "session_loading";
  if (!input.hasUser) return input.sessionTimedOut ? "session_error" : "signed_out";
  if (input.ledgerStatus === "error") return "ledger_error";
  if (input.ledgerStatus !== "ready") return "ledger_loading";
  return "ready";
}

/** What the no-JS/no-hydrate fallback may do. A live React app must be left alone. */
export function accountBootFallback(input: { hydrated: boolean; recovered: boolean }): "none" | "recover" | "show" {
  if (input.hydrated) return "none";
  return input.recovered ? "show" : "recover";
}

export const ACCOUNT_BOOT_SCRIPT =
  "setTimeout(function(){if(window.__cbHydrated)return;var n=document.getElementById('account-boot');if(!n||n.dataset.state!=='loading')return;var key='cb-boot-recover';if(!sessionStorage.getItem(key)){sessionStorage.setItem(key,'1');var done=function(){location.reload()};var tasks=[];if(navigator.serviceWorker){tasks.push(navigator.serviceWorker.getRegistrations().then(function(rs){return Promise.all(rs.map(function(r){return r.unregister()}))}))}if(window.caches){tasks.push(caches.keys().then(function(keys){return Promise.all(keys.map(function(k){return caches.delete(k)}))}))}Promise.all(tasks).then(done,done);return;}var d=n.querySelector('[data-boot-detail]');if(d)d.textContent='Clearbook could not finish loading this page. Reload it. If the page looks unstyled, its files did not load.';var a=document.getElementById('account-boot-actions');if(a)a.hidden=false;}," +
  String(ACCOUNT_BOOT_FALLBACK_MS) +
  ")";
