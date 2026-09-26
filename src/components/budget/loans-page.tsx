import { useEffect, useState, type DragEvent } from "react";
import { CheckCircle, CreditCard, IndianRupee, Landmark, Lock, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CreditScoreGauge } from "@/components/budget/credit-gauge";
import { extractCreditReport } from "@/lib/budget/credit-pdf";
import {
  creditTips,
  formatInr,
  recentEnquiryCount,
  scoreRating,
  type CreditAccount,
  type CreditReport,
} from "@/lib/budget/credit-report";
import { deleteCreditReport, listCreditReports, saveCreditReport } from "@/lib/budget/credit-store";

type Filter = "all" | "active" | "closed";

export function LoansPage() {
  const [reports, setReports] = useState<CreditReport[] | null>(null);
  const [selected, setSelected] = useState(0);
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    let live = true;
    void listCreditReports()
      .then((rows) => { if (live) setReports(rows); })
      .catch(() => { if (live) setError("Could not load saved reports."); setReports([]); });
    return () => { live = false; };
  }, []);

  async function store(report: CreditReport) {
    const saved = await saveCreditReport({ data: report });
    setReports((current) => [saved, ...(current ?? []).filter((item) => item.id !== saved.id)]);
    setSelected(0);
  }

  if (reports === null) return <p className="text-sm text-muted-foreground">Loading credit reports…</p>;
  const report = reports[selected] ?? null;
  return (
    <div className="loans-page grid gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Loans & Credit</h2>
          <p className="mt-1 text-sm text-muted-foreground">Upload a CIBIL report to see loans, cards, and outstanding amounts. Clearbook does not fetch this from a bureau.</p>
        </div>
        {report ? <p className="text-xs text-muted-foreground">Last updated {report.uploadedAt.slice(0, 10)}</p> : null}
      </div>
      {error ? <p className="text-sm text-rose-600" role="alert">{error}</p> : null}
      {report ? <Dashboard report={report} previous={reports[selected + 1] ?? null} reports={reports} selected={selected} onSelect={setSelected} onDelete={async () => {
        await deleteCreditReport({ data: { id: report.id } });
        setReports((current) => (current ?? []).filter((item) => item.id !== report.id));
        setSelected(0);
      }} /> : null}
      <UploadCard busy={uploading} onFile={async (file, password) => {
        setUploading(true);
        setError("");
        try {
          await store(await extractCreditReport(file, password));
        } catch (cause) {
          setError(cause instanceof Error ? cause.message : "Could not parse this credit report.");
        } finally {
          setUploading(false);
        }
      }} />
    </div>
  );
}

export function CreditHomeLink({ report }: { report: CreditReport | null }) {
  return (
    <a href="/loans" className="panel flex items-center justify-between gap-3 p-4">
      <span>
        <span className="block text-sm font-medium">{report?.creditScore ? `Credit score ${report.creditScore}` : "Loans & Credit"}</span>
        <span className="text-xs text-muted-foreground">{report ? `${report.summary.activeAccounts} active accounts` : "Upload a CIBIL report"}</span>
      </span>
      <Landmark className="size-4 text-muted-foreground" aria-hidden="true" />
    </a>
  );
}

function UploadCard({ busy, onFile }: { busy: boolean; onFile: (file: File, password: string) => Promise<void> }) {
  const [file, setFile] = useState<File | null>(null);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [over, setOver] = useState(false);

  function take(next: File | null) {
    if (next && next.size > 10 * 1024 * 1024) return;
    setFile(next);
  }

  function drop(event: DragEvent) {
    event.preventDefault();
    setOver(false);
    take(event.dataTransfer.files[0] ?? null);
  }

  return (
    <section className="panel mx-auto w-full max-w-lg p-6">
      <label
        className={over ? "loans-drop is-over" : "loans-drop"}
        onDragOver={(event) => { event.preventDefault(); setOver(true); }}
        onDragLeave={() => setOver(false)}
        onDrop={drop}
      >
        <Upload className="mx-auto size-10 text-muted-foreground" aria-hidden="true" />
        <span className="mt-3 block text-sm text-muted-foreground">{busy ? "Analyzing your credit report…" : "Drop your CIBIL report PDF here"}</span>
        <span className="mt-1 block text-xs text-muted-foreground">or click to browse · PDF only, max 10MB</span>
        <input className="sr-only" type="file" accept="application/pdf,.pdf" disabled={busy} onChange={(event) => take(event.target.files?.[0] ?? null)} />
      </label>
      {file ? (
        <div className="mt-4 grid gap-3">
          <p className="flex items-center justify-between text-sm">
            <span>{file.name} · {Math.ceil(file.size / 1024)} KB</span>
            <button type="button" className="text-xs underline" onClick={() => setFile(null)}>Remove</button>
          </p>
          <label className="grid gap-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            PDF password (if protected)
            <span className="flex gap-2 normal-case tracking-normal">
              <input className="field" type={showPassword ? "text" : "password"} value={password} placeholder="Enter PDF password if required" onChange={(event) => setPassword(event.target.value)} />
              <Button type="button" variant="secondary" onClick={() => setShowPassword((value) => !value)}>{showPassword ? "Hide" : "Show"}</Button>
            </span>
          </label>
          <p className="text-xs text-muted-foreground">Most CIBIL reports use your date of birth (DDMMYYYY) or PAN as the password. The password stays in this browser.</p>
          <Button type="button" disabled={busy} onClick={() => void onFile(file, password)}>{busy ? "Parsing your report…" : "Upload report"}</Button>
        </div>
      ) : null}
      <p className="mt-4 flex items-center gap-2 text-xs text-muted-foreground"><Lock className="size-3" aria-hidden="true" /> Your report is stored with your account and only visible to you. The PDF file itself is not kept.</p>
    </section>
  );
}

function Dashboard({
  report, previous, reports, selected, onSelect, onDelete,
}: {
  report: CreditReport;
  previous: CreditReport | null;
  reports: CreditReport[];
  selected: number;
  onSelect: (index: number) => void;
  onDelete: () => Promise<void>;
}) {
  const rating = scoreRating(report.creditScore);
  const delta = report.creditScore != null && previous?.creditScore != null ? report.creditScore - previous.creditScore : null;
  const tips = creditTips(report);
  const enquiries = recentEnquiryCount(report);
  const highestEmi = [...report.accounts].sort((a, b) => (b.emiAmount ?? 0) - (a.emiAmount ?? 0))[0];
  const highestBalance = [...report.accounts].sort((a, b) => b.currentBalance - a.currentBalance)[0];
  return (
    <>
      <div className="flex flex-wrap items-center gap-3">
        {reports.length > 1 ? (
          <label className="text-sm">
            Report{" "}
            <select className="field" value={selected} onChange={(event) => onSelect(Number(event.target.value))}>
              {reports.map((item, index) => <option key={item.id} value={index}>{item.uploadedAt.slice(0, 10)}{item.creditScore ? ` · ${item.creditScore}` : ""}</option>)}
            </select>
          </label>
        ) : null}
        <Button type="button" variant="secondary" onClick={() => downloadCsv(report)}>Download summary</Button>
        <Button type="button" variant="ghost" onClick={() => void onDelete()}>Delete this report</Button>
      </div>
      {delta != null && previous ? <p className={delta >= 0 ? "text-sm text-emerald-600" : "text-sm text-rose-600"}>Score {delta >= 0 ? `+${delta}` : delta} versus the previous report. Outstanding is {report.summary.totalOutstanding >= previous.summary.totalOutstanding ? "up" : "down"} {formatInr(Math.abs(report.summary.totalOutstanding - previous.summary.totalOutstanding))}.</p> : null}
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <section className="panel p-4 md:col-span-2 xl:col-span-1">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Credit score</p>
          <CreditScoreGauge score={report.creditScore} />
          <p className={`text-center text-sm font-medium loans-tone-${rating.tone}`}>{rating.label}</p>
          {report.personalInfo.name ? <p className="mt-2 text-center text-xs text-muted-foreground">{report.personalInfo.name}{report.personalInfo.panMasked ? ` · ${report.personalInfo.panMasked}` : ""}</p> : null}
        </section>
        <Stat icon={Landmark} label="Active loans" value={String(report.accounts.filter((account) => account.isActive && !account.isCreditCard).length)} detail={`${formatInr(report.accounts.filter((account) => !account.isCreditCard).reduce((sum, account) => sum + account.currentBalance, 0))} outstanding`} />
        <Stat icon={CreditCard} label="Credit cards" value={String(report.summary.totalCreditCards)} detail={report.summary.creditUtilizationPercent == null ? "No limit reported" : `${report.summary.creditUtilizationPercent}% utilization`} />
        <Stat icon={CheckCircle} label="On-time payments" value={report.summary.onTimePaymentPercent == null ? "—" : `${report.summary.onTimePaymentPercent}%`} detail="From the DPD values in this file" />
        <Stat icon={IndianRupee} label="Total outstanding" value={formatInr(report.summary.totalOutstanding)} detail={report.summary.totalOverdue > 0 ? `${formatInr(report.summary.totalOverdue)} overdue` : "No overdue"} />
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        <Mini label="Highest EMI" value={highestEmi?.emiAmount ? `${highestEmi.memberName} · ${formatInr(highestEmi.emiAmount)}` : "Not in this report"} />
        <Mini label="Highest outstanding" value={highestBalance ? `${highestBalance.memberName} · ${formatInr(highestBalance.currentBalance)}` : "None"} />
        <Mini label="Total EMI burden" value={report.summary.totalEmi ? `${formatInr(report.summary.totalEmi)}/month` : "Not in this report"} />
      </div>
      <AccountList title="Your loans" accounts={report.accounts.filter((account) => !account.isCreditCard)} />
      <CardList accounts={report.accounts.filter((account) => account.isCreditCard)} />
      <section className="panel p-4">
        <h3 className="text-lg font-semibold">Credit enquiries</h3>
        <p className="text-xs text-muted-foreground">Recent hard enquiries found in the file.</p>
        {enquiries > 3 ? <p className="mt-2 text-xs text-amber-600">Multiple enquiries in the last 6 months can lower a score.</p> : null}
        {report.enquiries.length === 0 ? <p className="mt-3 text-sm text-muted-foreground">No enquiry rows were read.</p> : (
          <ul className="mt-3 grid gap-2 text-sm">
            {report.enquiries.map((enquiry) => <li key={`${enquiry.date}-${enquiry.memberName}`} className="flex flex-wrap justify-between gap-2"><span>{enquiry.date} · {enquiry.memberName}</span><span className="font-mono">{enquiry.purpose} · {formatInr(enquiry.amount)}</span></li>)}
          </ul>
        )}
      </section>
      <section className="grid gap-2">
        <h3 className="text-lg font-semibold">How to improve your score</h3>
        {tips.map((tip) => <p key={tip.text} className={`loans-tip is-${tip.tone}`}>{tip.text}</p>)}
        <p className="text-xs text-muted-foreground">These notes describe this file only. They are not personal financial advice.</p>
      </section>
    </>
  );
}

function Stat({ icon: Icon, label, value, detail }: { icon: typeof Landmark; label: string; value: string; detail: string }) {
  return (
    <section className="panel p-4">
      <Icon className="size-4 text-muted-foreground" aria-hidden="true" />
      <p className="mt-3 text-2xl font-semibold tabular-nums">{value}</p>
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
    </section>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return <section className="panel p-4"><p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p><p className="mt-1 text-sm">{value}</p></section>;
}

function AccountList({ title, accounts }: { title: string; accounts: CreditAccount[] }) {
  const [filter, setFilter] = useState<Filter>("all");
  const rows = accounts.filter((account) => filter === "all" || (filter === "active" ? account.isActive : !account.isActive));
  return (
    <section>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-lg font-semibold">{title}</h3>
        <div className="flex gap-1">
          {(["all", "active", "closed"] as const).map((item) => (
            <button key={item} type="button" className={filter === item ? "loans-pill is-on" : "loans-pill"} onClick={() => setFilter(item)}>{item}</button>
          ))}
        </div>
      </div>
      {rows.length === 0 ? <p className="text-sm text-muted-foreground">No {title === "Your loans" ? "loans" : title.toLowerCase()} in this report.</p> : rows.map((account) => <AccountCard key={account.id} account={account} />)}
    </section>
  );
}

function CardList({ accounts }: { accounts: CreditAccount[] }) {
  if (!accounts.length) return null;
  return (
    <section>
      <h3 className="mb-2 text-lg font-semibold">Credit cards</h3>
      {accounts.map((account) => {
        const limit = account.creditLimit ?? 0;
        const used = limit > 0 ? Math.min(100, Math.round((account.currentBalance / limit) * 100)) : 0;
        return (
          <article key={account.id} className="panel mb-3 p-4">
            <header className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="text-sm font-semibold">{account.memberName}</p>
                <p className="text-xs text-muted-foreground">{account.accountNumberMasked}</p>
              </div>
              <Status account={account} />
            </header>
            <p className="mt-3 text-sm">Limit {formatInr(limit)} · Balance {formatInr(account.currentBalance)} · Available {formatInr(Math.max(0, limit - account.currentBalance))}</p>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted" aria-hidden="true"><span className={used > 50 ? "loans-bar is-high" : used > 30 ? "loans-bar is-mid" : "loans-bar"} style={{ width: `${used}%` }} /></div>
            <p className="mt-1 text-xs text-muted-foreground">{limit ? `${used}% of the limit` : "No credit limit was read"}</p>
          </article>
        );
      })}
    </section>
  );
}

function AccountCard({ account }: { account: CreditAccount }) {
  const [open, setOpen] = useState(false);
  return (
    <article className="panel mb-3 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold">{account.memberName}</p>
          <p className="mt-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{account.accountType}</p>
          <p className="mt-1 font-mono text-xs text-muted-foreground">{account.accountNumberMasked}{account.dateOpened ? ` · opened ${account.dateOpened}` : ""}</p>
        </div>
        <div className="text-right">
          <p className="font-mono text-lg font-semibold tabular-nums">{formatInr(account.currentBalance)}</p>
          {account.amountOverdue > 0 ? <p className="text-xs text-rose-600">{formatInr(account.amountOverdue)} overdue</p> : null}
          <Status account={account} />
        </div>
      </div>
      <p className="mt-2 text-sm text-muted-foreground">Sanctioned {formatInr(account.sanctionedAmount)}{account.emiAmount ? ` · EMI ${formatInr(account.emiAmount)}` : ""}</p>
      <button type="button" className="mt-2 text-xs underline" aria-expanded={open} onClick={() => setOpen((value) => !value)}>{open ? "Hide payment history" : "Payment history"}</button>
      {open ? (
        <div className="mt-3">
          <div className="flex flex-wrap gap-1" aria-label="Days past due">
            {account.dpdHistory.length === 0 ? <p className="text-xs text-muted-foreground">No DPD row was read.</p> : account.dpdHistory.map((token, index) => (
              <span key={`${token}-${index}`} title={token} className={`loans-dpd ${dpdClass(token)}`}>{token === "XXX" ? "" : ""}</span>
            ))}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">{account.ownership}{account.lastPaymentDate ? ` · last payment ${account.lastPaymentDate}` : ""}{account.repaymentTenure ? ` · ${account.repaymentTenure} months` : ""}</p>
        </div>
      ) : null}
    </article>
  );
}

function Status({ account }: { account: CreditAccount }) {
  const label = account.amountOverdue > 0 ? "Overdue" : /written/i.test(account.paymentStatus) ? "Written off" : account.isActive ? "Active" : "Closed";
  return <p className={`loans-status is-${label.toLowerCase().replace(" ", "-")}`}>{label}</p>;
}

function dpdClass(token: string) {
  if (token === "XXX") return "is-none";
  if (token === "000" || token === "STD") return "is-ok";
  if (token === "030") return "is-30";
  if (token === "060") return "is-60";
  return "is-late";
}

function csvCell(value: string | number) {
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function downloadCsv(report: CreditReport) {
  const lines = ["Section,Name,Type,Opened,Balance,Limit,EMI,Status"];
  lines.push(["Score", "", "", "", report.creditScore ?? "", "", "", ""].map(csvCell).join(","));
  for (const account of report.accounts) {
    lines.push(["Account", account.memberName, account.accountType, account.dateOpened ?? "", account.currentBalance, account.creditLimit ?? "", account.emiAmount ?? "", account.paymentStatus].map(csvCell).join(","));
  }
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "clearbook-credit-summary.csv";
  link.click();
  URL.revokeObjectURL(url);
}

export function useLatestCreditReport() {
  const [report, setReport] = useState<CreditReport | null>(null);
  useEffect(() => {
    let live = true;
    void listCreditReports().then((rows) => { if (live) setReport(rows[0] ?? null); }).catch(() => {});
    return () => { live = false; };
  }, []);
  return report;
}
