export function Skeleton({
  width,
  height,
  className = "",
}: {
  width?: number | string;
  height?: number | string;
  className?: string;
}) {
  return <span className={`skeleton ${className}`.trim()} style={{ width, height }} />;
}

export function StatCardSkeleton() {
  return (
    <div className="skeleton-card" aria-hidden="true">
      <Skeleton width={16} height={16} />
      <Skeleton className="skeleton-line" width="40%" height={12} />
      <Skeleton className="skeleton-line" width="60%" height={32} />
    </div>
  );
}

export function ChartSkeleton() {
  return (
    <div className="skeleton-chart" aria-hidden="true">
      <Skeleton width="28%" height={14} />
      <div className="skeleton-chart-bars">
        {[40, 70, 55, 90, 48, 76, 62].map((height) => (
          <Skeleton key={height} className="skeleton-bar" height={`${height}%`} />
        ))}
      </div>
    </div>
  );
}

export function TableSkeleton({ rows = 6 }: { rows?: number }) {
  const widths = ["72%", "64%", "80%", "58%", "76%", "68%"];
  return (
    <div className="skeleton-table" aria-hidden="true">
      <Skeleton className="skeleton-table-head" height={40} />
      {Array.from({ length: rows }, (_, index) => (
        <Skeleton key={index} className="skeleton-line" width={widths[index % widths.length]} height={16} />
      ))}
    </div>
  );
}

export function SidebarSkeleton() {
  return (
    <div className="skeleton-sidebar" aria-hidden="true">
      <Skeleton width={140} height={22} />
      <div className="skeleton-nav">
        {["78%", "64%", "70%", "60%", "66%"].map((width) => (
          <Skeleton key={width} width={width} height={36} />
        ))}
      </div>
      <Skeleton className="skeleton-user" width="100%" height={36} />
    </div>
  );
}

export function LedgerSkeleton() {
  return (
    <div className="ledger-skeleton" role="status" aria-live="polite">
      <p className="cb-boot-status">Loading your ledger…</p>
      <SidebarSkeleton />
      <div className="ledger-skeleton-main">
        <div className="skeleton-stat-grid">
          <StatCardSkeleton />
          <StatCardSkeleton />
          <StatCardSkeleton />
          <StatCardSkeleton />
        </div>
        <ChartSkeleton />
        <TableSkeleton />
      </div>
    </div>
  );
}
