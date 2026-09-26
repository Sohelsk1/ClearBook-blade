import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import {
  consumeCreditScoreAttempt,
  isApprovedCreditProviderConfigured,
  parseCreditScoreRequest,
  resolveCreditScoreCheck,
  type CreditScoreResponse,
} from "@/lib/budget/credit-score";

const attempts = new Map<string, number[]>();

export const checkCreditScore = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) => {
    const parsed = parseCreditScoreRequest(input);
    if (!parsed.ok) throw new Error(parsed.message);
    return { pan: parsed.pan, dob: parsed.dob, consent: true as const };
  })
  .handler(async ({ context, data }): Promise<CreditScoreResponse> => {
    if (data.consent !== true) return { status: "consent_required", message: "Confirm consent before checking your credit score." };
    const now = Date.now();
    const next = consumeCreditScoreAttempt(attempts.get(context.userId) ?? [], now);
    attempts.set(context.userId, next.stamps);
    if (!next.allowed) return { status: "rate_limited", message: "Too many checks. Wait a while before trying again." };
    const { env } = await import("@/lib/env.server");
    const configured = isApprovedCreditProviderConfigured({
      CREDIT_SCORE_PROVIDER: env("CREDIT_SCORE_PROVIDER"),
      CREDIT_SCORE_API_URL: env("CREDIT_SCORE_API_URL"),
      CREDIT_SCORE_API_KEY: env("CREDIT_SCORE_API_KEY"),
    });
    return resolveCreditScoreCheck(configured);
  });
