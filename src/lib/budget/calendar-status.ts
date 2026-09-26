/** How a Google Calendar link is presented. OAuth is not started from this module. */

export type CalendarLinkStatus = "not_connected" | "connected" | "needs_attention" | "disconnected";

export type CalendarCapability = {
  status: CalendarLinkStatus;
  lastSync: string | null;
};

export type CalendarStatusView = {
  connection: string;
  state: string;
  lastSync: string;
  detail: string;
  connectLabel: string;
  connectDisabled: boolean;
  syncDisabled: boolean;
  disconnectDisabled: boolean;
};

const LOCKED = {
  connectLabel: "Connect Google Calendar",
  connectDisabled: true,
  syncDisabled: true,
  disconnectDisabled: true,
} as const;

export function calendarStatusView(input: {
  capability: CalendarCapability | null;
  checkFailed: boolean;
}): CalendarStatusView {
  if (input.checkFailed) {
    return {
      connection: "Unknown",
      state: "Couldn't check",
      lastSync: "None",
      detail:
        "Clearbook could not confirm whether Google Calendar is connected. Nothing was changed, and there is nothing to revoke.",
      ...LOCKED,
    };
  }
  if (!input.capability) {
    return {
      connection: "Checking…",
      state: "Checking…",
      lastSync: "None",
      detail: "Checking whether Google Calendar is connected.",
      ...LOCKED,
    };
  }

  const lastSync = input.capability.lastSync || "None";
  switch (input.capability.status) {
    case "not_connected":
      return {
        connection: "Not connected",
        state: "Not set up",
        lastSync: "None",
        detail:
          "Google Calendar is not set up for this account. Connect, Sync Now, and Disconnect stay off. There is nothing to revoke and no calendar to open.",
        ...LOCKED,
      };
    case "connected":
      return {
        connection: "Connected",
        state: "Connected",
        lastSync,
        detail:
          "Google Calendar is connected and the last check succeeded. You can sync or disconnect. The ledger stays in Clearbook.",
        connectLabel: "Connect Google Calendar",
        connectDisabled: true,
        syncDisabled: false,
        disconnectDisabled: false,
      };
    case "needs_attention":
      return {
        connection: "Connected",
        state: "Needs attention",
        lastSync,
        detail:
          "Google Calendar is connected, but sign-in expired or the last sync failed. Reconnect to retry, or disconnect. This is not shown for an account that was never connected.",
        connectLabel: "Reconnect Google Calendar",
        connectDisabled: false,
        syncDisabled: true,
        disconnectDisabled: false,
      };
    case "disconnected":
      return {
        connection: "Not connected",
        state: "Disconnected",
        lastSync,
        detail:
          "Google Calendar was disconnected. Nothing is syncing, and there is no active calendar to revoke.",
        ...LOCKED,
      };
  }
}
