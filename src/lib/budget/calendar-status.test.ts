import assert from "node:assert/strict";
import test from "node:test";
import { calendarStatusView, type CalendarCapability } from "./calendar-status.ts";

function view(capability: CalendarCapability | null, checkFailed = false) {
  return calendarStatusView({ capability, checkFailed });
}

test("never-connected calendar is neutral, not an error", () => {
  const status = view({ status: "not_connected", lastSync: null });
  assert.equal(status.connection, "Not connected");
  assert.equal(status.state, "Not set up");
  assert.equal(status.lastSync, "None");
  assert.equal(status.connectDisabled, true);
  assert.equal(status.syncDisabled, true);
  assert.equal(status.disconnectDisabled, true);
  assert.doesNotMatch(status.state, /attention/i);
  assert.match(status.detail, /not set up/i);
});

test("healthy connection can sync and disconnect, and does not ask to connect again", () => {
  const status = view({ status: "connected", lastSync: "2026-09-01" });
  assert.equal(status.connection, "Connected");
  assert.equal(status.state, "Connected");
  assert.equal(status.lastSync, "2026-09-01");
  assert.equal(status.connectDisabled, true);
  assert.equal(status.syncDisabled, false);
  assert.equal(status.disconnectDisabled, false);
  assert.doesNotMatch(status.state, /attention/i);
});

test("a connected sync or auth failure is the only needs-attention state", () => {
  const status = view({ status: "needs_attention", lastSync: "2026-08-01" });
  assert.equal(status.connection, "Connected");
  assert.equal(status.state, "Needs attention");
  assert.equal(status.lastSync, "2026-08-01");
  assert.equal(status.connectLabel, "Reconnect Google Calendar");
  assert.equal(status.connectDisabled, false);
  assert.equal(status.syncDisabled, true);
  assert.equal(status.disconnectDisabled, false);
  assert.match(status.detail, /expired|failed/i);
});

test("revoked calendar is disconnected, not a sync error", () => {
  const status = view({ status: "disconnected", lastSync: "2026-07-01" });
  assert.equal(status.connection, "Not connected");
  assert.equal(status.state, "Disconnected");
  assert.equal(status.lastSync, "2026-07-01");
  assert.equal(status.connectDisabled, true);
  assert.equal(status.syncDisabled, true);
  assert.equal(status.disconnectDisabled, true);
  assert.doesNotMatch(status.state, /attention/i);
  assert.match(status.detail, /disconnected/i);
});

test("a failed status check does not pretend the calendar needs attention", () => {
  const status = view(null, true);
  assert.equal(status.state, "Couldn't check");
  assert.equal(status.connectDisabled, true);
  assert.doesNotMatch(status.state, /attention/i);
});
