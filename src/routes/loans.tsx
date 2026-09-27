import { createFileRoute } from "@tanstack/react-router";
import { LoansPage } from "@/components/budget/loans-page";
import { gateLocation } from "@/lib/session-gate";
import { privatePageHead } from "@/lib/seo";

export const Route = createFileRoute("/loans")({
  head: () => privatePageHead("Loans & Credit"),
  beforeLoad: ({ location }) => gateLocation(location.pathname),
  component: LoansPage,
});
