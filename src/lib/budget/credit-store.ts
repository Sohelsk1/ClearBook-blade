import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import { isCreditReport, type CreditReport } from "@/lib/budget/credit-report";

export const listCreditReports = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<CreditReport[]> => {
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    const rows = await sql<{ payload: string }>`
      select payload from credit_reports
      where user_id = ${context.userId}
      order by uploaded_at desc
      limit 12
    `;
    return rows.flatMap((row) => {
      try {
        const parsed = JSON.parse(row.payload) as unknown;
        return isCreditReport(parsed) ? [parsed] : [];
      } catch {
        return [];
      }
    });
  });

export const saveCreditReport = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) => {
    if (!isCreditReport(input)) throw new Error("Could not parse this credit report. Please ensure it is a CIBIL/TransUnion report.");
    if (JSON.stringify(input).length > 200_000) throw new Error("File size exceeds 10MB limit");
    return input;
  })
  .handler(async ({ context, data }) => {
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    await sql`
      insert into credit_reports (id, user_id, uploaded_at, report_date, payload)
      values (${data.id}, ${context.userId}, ${data.uploadedAt}, ${data.reportDate}, ${JSON.stringify(data)})
      on conflict (user_id, id) do update set payload = excluded.payload, report_date = excluded.report_date
    `;
    return data;
  });

export const deleteCreditReport = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) => {
    if (!input || typeof input !== "object" || typeof (input as { id?: unknown }).id !== "string") throw new Error("Missing report");
    const id = (input as { id: string }).id;
    if (id.length < 4 || id.length > 80) throw new Error("Missing report");
    return { id };
  })
  .handler(async ({ context, data }) => {
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    await sql`delete from credit_reports where user_id = ${context.userId} and id = ${data.id}`;
    return { ok: true };
  });
