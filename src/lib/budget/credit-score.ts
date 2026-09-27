/** Credit-score check boundary. No score is invented when a bureau is not approved. */

export const PAN_PATTERN = /^[A-Z]{5}[0-9]{4}[A-Z]$/;

/** Provider ids Clearbook is allowed to call. Empty until a contracted bureau is added. */
export const APPROVED_CREDIT_PROVIDERS: readonly string[] = [];

export type CreditScoreResponse =
  | { status: "not_configured"; message: string }
  | { status: "consent_required"; message: string }
  | { status: "invalid_input"; message: string }
  | { status: "rate_limited"; message: string }
  | { status: "unavailable"; message: string }
  | { status: "no_hit"; message: string }
  | { status: "verification_required"; message: string }
  | { status: "score"; provider: string; retrievedAt: string; score: number; low: number; high: number; disclaimer: string };

const NOT_CONFIGURED = "Credit score service is not configured yet.";

export function maskPan(pan: string): string {
  const value = pan.toUpperCase();
  if (!PAN_PATTERN.test(value)) return "";
  return `${"•".repeat(6)}${value.slice(-4)}`;
}

export function isApprovedCreditProviderConfigured(env: {
  CREDIT_SCORE_PROVIDER?: string;
  CREDIT_SCORE_API_URL?: string;
  CREDIT_SCORE_API_KEY?: string;
} = {}): boolean {
  const id = env.CREDIT_SCORE_PROVIDER?.trim() ?? "";
  const url = env.CREDIT_SCORE_API_URL?.trim() ?? "";
  const key = env.CREDIT_SCORE_API_KEY?.trim() ?? "";
  return APPROVED_CREDIT_PROVIDERS.includes(id) && url.startsWith("https://") && key.length >= 8;
}

function validCalendarDate(year: number, month: number, day: number): boolean {
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

export function validateDateOfBirth(value: string, now = new Date()): string | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) return "Enter a valid date of birth.";
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (!validCalendarDate(year, month, day)) return "Enter a valid date of birth.";
  const dob = new Date(Date.UTC(year, month - 1, day));
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  if (dob.getTime() > today.getTime()) return "Date of birth cannot be in the future.";
  if (year < 1900) return "Enter a valid date of birth.";
  let age = today.getUTCFullYear() - year;
  const beforeBirthday = today.getUTCMonth() < month - 1 || (today.getUTCMonth() === month - 1 && today.getUTCDate() < day);
  if (beforeBirthday) age -= 1;
  if (age < 18) return "Credit score checks are available from age 18.";
  if (age > 120) return "Enter a valid date of birth.";
  return null;
}

export function validatePan(value: string): string | null {
  return PAN_PATTERN.test(value.trim().toUpperCase()) ? null : "Enter a valid PAN.";
}

export function parseCreditScoreRequest(input: unknown, now = new Date()): { ok: true; pan: string; dob: string } | { ok: false; message: string } {
  if (!input || typeof input !== "object") return { ok: false, message: "Enter a valid PAN." };
  const body = input as { pan?: unknown; dob?: unknown; consent?: unknown };
  if (body.consent !== true) return { ok: false, message: "Confirm consent before checking your credit score." };
  if (typeof body.pan !== "string" || typeof body.dob !== "string") return { ok: false, message: "Enter a valid PAN." };
  const panError = validatePan(body.pan);
  if (panError) return { ok: false, message: panError };
  const dobError = validateDateOfBirth(body.dob, now);
  if (dobError) return { ok: false, message: dobError };
  return { ok: true, pan: body.pan.trim().toUpperCase(), dob: body.dob.trim() };
}

export function consumeCreditScoreAttempt(stamps: number[], now: number, limit = 5, windowMs = 60 * 60 * 1000): { allowed: boolean; stamps: number[] } {
  const fresh = stamps.filter((stamp) => now - stamp < windowMs);
  if (fresh.length >= limit) return { allowed: false, stamps: fresh };
  return { allowed: true, stamps: [...fresh, now] };
}

/** Decides the user-visible result. Never fabricates a score. */
export function resolveCreditScoreCheck(providerConfigured: boolean): CreditScoreResponse {
  if (!providerConfigured) return { status: "not_configured", message: NOT_CONFIGURED };
  return { status: "unavailable", message: "The credit score service is unavailable. Nothing was retrieved." };
}
