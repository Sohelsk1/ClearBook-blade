import { useEffect, useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { checkCreditScore } from "@/lib/budget/credit-score-check";
import { maskPan, validateDateOfBirth, validatePan, type CreditScoreResponse } from "@/lib/budget/credit-score";

const CONSENT = "I agree that Clearbook may send my PAN and date of birth to an approved credit bureau only to retrieve my credit score. Entering these details is not consent. No bureau is connected until that provider is approved.";

export function CreditScorePage() {
  const panId = useId();
  const dobId = useId();
  const consentId = useId();
  const [pan, setPan] = useState("");
  const [dob, setDob] = useState("");
  const [consent, setConsent] = useState(false);
  const [fieldError, setFieldError] = useState("");
  const [status, setStatus] = useState<CreditScoreResponse | null>(null);
  const [masked, setMasked] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => () => {
    setPan("");
    setDob("");
    setConsent(false);
  }, []);

  async function submit() {
    setFieldError("");
    setStatus(null);
    const panError = validatePan(pan);
    const dobError = validateDateOfBirth(dob);
    if (!consent) {
      setFieldError("Confirm consent before checking your credit score.");
      return;
    }
    if (panError || dobError) {
      setFieldError(panError ?? dobError ?? "");
      return;
    }
    setBusy(true);
    const submitted = pan;
    try {
      const result = await checkCreditScore({ data: { pan: submitted, dob, consent: true } });
      setMasked(maskPan(submitted));
      setPan("");
      setDob("");
      setConsent(false);
      setStatus(result);
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "The credit score service is unavailable. Nothing was retrieved.";
      setFieldError(message.includes(submitted.toUpperCase()) ? "Enter a valid PAN." : message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto grid w-full max-w-lg gap-4">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Credit Score Check</h2>
        <p className="mt-1 text-sm text-muted-foreground">Loans in Clearbook is only this check. A score is shown only after an approved bureau returns one.</p>
      </div>
      <section id="credit-score-privacy" className="panel p-4 text-sm text-muted-foreground">
        <h3 className="text-base font-medium text-foreground">How this check works</h3>
        <p className="mt-2">Clearbook would ask an approved Indian credit bureau for your score. PAN and date of birth identify the file. The bureau, not Clearbook, calculates the score. Nothing here is a loan approval or financial advice.</p>
        <p className="mt-2">Your PAN and date of birth are sent only to Clearbook’s own server, and only after you tick consent. They are not put in the page address, and they are not stored. No bureau provider is configured, so this check cannot retrieve a score yet.</p>
      </section>
      <form className="panel grid gap-4 p-4" onSubmit={(event) => { event.preventDefault(); void submit(); }}>
        <label className="grid gap-1 text-sm font-medium" htmlFor={panId}>
          PAN
          <input id={panId} className="field uppercase" name="pan" autoComplete="off" autoCapitalize="characters" spellCheck={false} maxLength={10} inputMode="text" aria-invalid={fieldError === "Enter a valid PAN."} value={pan} onChange={(event) => setPan(event.target.value.toUpperCase())} />
        </label>
        <label className="grid gap-1 text-sm font-medium" htmlFor={dobId}>
          Date of birth
          <input id={dobId} className="field" name="dob" type="date" autoComplete="bday" aria-invalid={Boolean(fieldError) && fieldError !== "Enter a valid PAN." && fieldError !== CONSENT} value={dob} onChange={(event) => setDob(event.target.value)} />
        </label>
        <label className="flex items-start gap-2 text-sm" htmlFor={consentId}>
          <input id={consentId} className="mt-1" type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} />
          <span>{CONSENT} <a className="underline" href="#credit-score-privacy">Privacy notice</a></span>
        </label>
        <Button type="submit" disabled={busy || !consent}>{busy ? "Checking…" : "Check my credit score"}</Button>
        <p className="sr-only" aria-live="polite">{busy ? "Checking your credit score" : ""}</p>
        {fieldError ? <p className="text-sm text-rose-600" role="alert">{fieldError}</p> : null}
      </form>
      {status ? (
        <section className="panel p-4" aria-live="polite">
          <h3 className="text-base font-medium">{status.status === "score" ? "Credit score" : "Credit score unavailable"}</h3>
          {masked ? <p className="mt-1 text-xs text-muted-foreground">PAN {masked}</p> : null}
          <p className="mt-2 text-sm">{status.status === "score" ? `${status.provider} reported ${status.score} (range ${status.low}–${status.high}). ${status.disclaimer}` : status.message}</p>
        </section>
      ) : null}
    </div>
  );
}
