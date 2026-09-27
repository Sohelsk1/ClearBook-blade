import { createFileRoute } from "@tanstack/react-router";
import { auth } from "@/lib/auth/server";
import { ensureDbReady } from "@/lib/db";
import { ensurePasswordResetDelivery } from "@/lib/mail/deliver.server";

async function handle(request: Request) {
  try {
    // Make sure the embedded PGlite database is fully initialized before
    // Better Auth handles sign-up/sign-in. On Neon this resolves immediately.
    await ensureDbReady();
    await ensurePasswordResetDelivery(auth);
    return await auth.handler(request);
  } catch (error) {
    console.error("[clearbook] Better Auth request failed:", {
      method: request.method,
      url: request.url,
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
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
