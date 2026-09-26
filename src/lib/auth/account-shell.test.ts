import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { accountBootFallback, ACCOUNT_BOOT_SCRIPT, resolveAccountShell } from "./account-shell.ts";

const base = {
  privateRoute: true,
  mounted: true,
  sessionPending: false,
  sessionTimedOut: false,
  hasUser: true,
  ledgerStatus: "ready" as const,
};

test("an authenticated ledger stays loading only until the snapshot is ready", () => {
  assert.equal(resolveAccountShell({ ...base, ledgerStatus: "loading" }), "ledger_loading");
  assert.equal(resolveAccountShell({ ...base, ledgerStatus: "ready" }), "ready");
});

test("an empty ready ledger is still the app, not a loading shell", () => {
  assert.equal(resolveAccountShell(base), "ready");
});

test("an invalid session that has finished checking goes to sign-in", () => {
  assert.equal(
    resolveAccountShell({ ...base, hasUser: false, ledgerStatus: "signed_out" }),
    "signed_out",
  );
});

test("a session check that never finishes becomes a recoverable error", () => {
  assert.equal(
    resolveAccountShell({ ...base, sessionPending: true, sessionTimedOut: false, hasUser: false }),
    "session_loading",
  );
  assert.equal(
    resolveAccountShell({ ...base, sessionPending: true, sessionTimedOut: true, hasUser: false }),
    "session_error",
  );
});

test("a failed ledger fetch stays an error instead of an empty account", () => {
  assert.equal(resolveAccountShell({ ...base, ledgerStatus: "error" }), "ledger_error");
});

test("signing out during the initial load does not keep the previous account on screen", () => {
  assert.equal(
    resolveAccountShell({ ...base, hasUser: false, ledgerStatus: "loading" }),
    "signed_out",
  );
});

test("retry after a timeout can reach the ready shell", () => {
  const stalled = resolveAccountShell({
    ...base,
    sessionPending: true,
    sessionTimedOut: true,
    hasUser: false,
    ledgerStatus: "signed_out",
  });
  const recovered = resolveAccountShell(base);
  assert.equal(stalled, "session_error");
  assert.equal(recovered, "ready");
});

test("the bundle marks itself started before React paints, so the fallback cannot replace a live app", () => {
  const frame = readFileSync(new URL("../../components/budget/frame.tsx", import.meta.url), "utf8");
  assert.match(frame, /if \(typeof window !== "undefined"\) window\.__cbHydrated = true/);
  assert.match(frame, /Checking your account/);
  assert.match(frame, /id="account-boot"/);
});

test("a live app is not replaced by the asset fallback, and a dead bundle recovers once", () => {
  assert.equal(accountBootFallback({ hydrated: true, recovered: false }), "none");
  assert.equal(accountBootFallback({ hydrated: false, recovered: false }), "recover");
  assert.equal(accountBootFallback({ hydrated: false, recovered: true }), "show");
  assert.match(ACCOUNT_BOOT_SCRIPT, /__cbHydrated/);
  assert.match(ACCOUNT_BOOT_SCRIPT, /cb-boot-recover/);
});

test("homepage motion is GSAP and SVG only, and reduced motion skips it", () => {
  const stage = readFileSync(new URL("../../components/budget/home-stage.tsx", import.meta.url), "utf8");
  const page = readFileSync(new URL("../../components/budget/home-page.tsx", import.meta.url), "utf8");
  assert.match(stage, /prefers-reduced-motion/);
  assert.match(stage, /gsap\.matchMedia/);
  assert.doesNotMatch(stage + page, /framer-motion|animejs|lottie-react|from \"three\"/);
});
test("settings uses a gear icon in the shared navigation", () => {
  const shell = readFileSync(new URL("../../components/budget/app-shell.tsx", import.meta.url), "utf8");
  assert.match(shell, /icon: Settings/);
  assert.doesNotMatch(shell, /SlidersHorizontal/);
  assert.match(shell, /label: "Settings"/);
  assert.match(shell, /to: "\/settings"/);
  assert.match(shell, /aria-label="Settings"/);
});
test("the transactions page still mounts the statement file input once the shell is ready", () => {
  const page = readFileSync(new URL("../../components/budget/transactions-page.tsx", import.meta.url), "utf8");
  const importer = readFileSync(new URL("../../components/budget/statement-import.tsx", import.meta.url), "utf8");
  assert.match(page, /StatementImport/);
  assert.match(importer, /type="file"/);
  assert.match(importer, /Upload current month bank statement PDF/);
});
