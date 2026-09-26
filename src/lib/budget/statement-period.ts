export type StatementPeriod = { start: string; end: string };

const DAY = /^\d{4}-\d{2}-\d{2}$/;

export function statementPeriodFrom(value: unknown): StatementPeriod | null {
  if (!value || typeof value !== "object") return null;
  const row = value as { start?: unknown; end?: unknown };
  if (typeof row.start !== "string" || typeof row.end !== "string") return null;
  if (!DAY.test(row.start) || !DAY.test(row.end) || row.start > row.end) return null;
  return { start: row.start, end: row.end };
}

export function periodFromCalendarJson(raw: string | null | undefined): StatementPeriod | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as { statementPeriod?: unknown };
    return statementPeriodFrom(parsed.statementPeriod);
  } catch {
    return null;
  }
}

/** Keep an imported statement range when profile settings are saved again. */
export function calendarJsonWithPeriod(calendar: unknown, period: StatementPeriod | null): string {
  const base = calendar && typeof calendar === "object" ? { ...(calendar as Record<string, unknown>) } : {};
  if (period) base.statementPeriod = period;
  else delete base.statementPeriod;
  return JSON.stringify(base);
}
