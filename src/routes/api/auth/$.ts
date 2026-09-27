import { createFileRoute } from "@tanstack/react-router";
import { auth } from "@/lib/auth/server";
import { ensurePasswordResetDelivery } from "@/lib/mail/deliver.server";

async function handle(request: Request) {
  await ensurePasswordResetDelivery(auth);
  try {
    return await auth.handler(request);
  } catch (error) {
    console.error("[clearbook] Better Auth request failed:", error);
    throw error;
  }
}

export const Route = createFileRoute("/api/auth/$")({
  server: {
    handlers: {
      GET: ({ request }) => handle(request),
      POST: ({ request }) => handle(request),
    },
  },
});
