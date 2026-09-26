import { lazy, Suspense } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { gateLocation } from "@/lib/session-gate";
import { publicHomeHead } from "@/lib/seo";

const HomePage = lazy(() => import("@/components/budget/home-page").then((mod) => ({ default: mod.HomePage })));

function HomeRoute() {
  return (
    <Suspense fallback={<main className="mx-auto min-h-screen max-w-6xl px-4 py-10 text-sm">Loading Clearbook…</main>}>
      <HomePage />
    </Suspense>
  );
}

export const Route = createFileRoute("/")({
  head: publicHomeHead,
  beforeLoad: ({ location }) => gateLocation(location.pathname),
  component: HomeRoute,
});
