import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import type { CalendarCapability } from "@/lib/budget/calendar-status";

export type { CalendarCapability } from "@/lib/budget/calendar-status";

export const getCalendarCapability = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async (): Promise<CalendarCapability> => {
    return { status: "not_connected", lastSync: null };
  });
