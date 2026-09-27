import { createFileRoute } from "@tanstack/react-router";
import { auth, ensureAuthSchema } from "@/lib/auth/server";

async function handle(request: Request) {
  await ensureAuthSchema();
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
