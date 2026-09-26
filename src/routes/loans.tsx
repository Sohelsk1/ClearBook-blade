import { createFileRoute } from "@tanstack/react-router";
import { CreditScorePage } from "@/components/budget/credit-score-page";
import { gateLocation } from "@/lib/session-gate";
import { privatePageHead } from "@/lib/seo";

export const Route = createFileRoute("/loans")({
  head: () => privatePageHead("Credit Score Check"),
  beforeLoad: ({ location }) => gateLocation(location.pathname),
  component: CreditScorePage,
});
