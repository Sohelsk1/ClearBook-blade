import { useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatCompactMoney, formatDay, formatMoney, type CurrencyCode, type DaySpend, type SpendSlice } from "@/lib/budget/model";

export type ChartSlice = SpendSlice & { fill: string };

const ACCENT = "#3B82F6";
const AXIS = { fill: "#71717A", fontSize: 12, fontFamily: "JetBrains Mono, ui-monospace, monospace" };

type SpendChartProps = {
  slices: ChartSlice[];
  total: number;
  currency: CurrencyCode;
  onSelect?: (categoryId: string) => void;
};

function prefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function DarkTip({ active, label, value }: { active?: boolean; label?: string; value?: string }) {
  if (!active || !label) return null;
  return (
    <div className="chart-tip">
      <p>{label}</p>
      {value ? <p className="chart-tip-value">{value}</p> : null}
    </div>
  );
}

export function SpendChart({ slices, total, currency, onSelect }: SpendChartProps) {
  const reduceMotion = prefersReducedMotion();

  return (
    <div className="chart-surface">
      <div className="relative h-[300px] w-full">
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={slices}
              dataKey="cents"
              nameKey="label"
              innerRadius="64%"
              outerRadius="88%"
              paddingAngle={slices.length > 1 ? 2 : 0}
              stroke="none"
              isAnimationActive={!reduceMotion}
              animationDuration={600}
              animationEasing="ease-out"
              onClick={(slice) => {
                const id = (slice as { categoryId?: string }).categoryId;
                if (id && id !== "other") onSelect?.(id);
              }}
            >
              {slices.map((slice) => (
                <Cell key={slice.categoryId} fill={slice.fill} />
              ))}
            </Pie>
            <Tooltip
              content={({ active, payload }) => {
                const row = payload?.[0]?.payload as ChartSlice | undefined;
                return <DarkTip active={active} label={row?.label} value={row ? formatMoney(row.cents, currency) : undefined} />;
              }}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-10 text-center">
          <span className="text-xs text-muted-foreground">Spent</span>
          <span className="figure-center text-foreground">{formatMoney(total, currency)}</span>
        </div>
      </div>
    </div>
  );
}

type DailyProps = {
  points: DaySpend[];
  currency: CurrencyCode;
  onSelect?: (date: string) => void;
};

export function DailySpendChart({ points, currency, onSelect }: DailyProps) {
  const reduceMotion = prefersReducedMotion();
  const [picked, setPicked] = useState<DaySpend | null>(null);
  const [hover, setHover] = useState<number | null>(null);
  const active = picked ?? points.find((point) => point.cents > 0) ?? null;

  return (
    <div className="chart-surface">
      <div className="h-[300px] w-full">
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={points} margin={{ top: 8, right: 4, left: 0, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.04)" strokeDasharray="3 3" />
            <XAxis dataKey="day" tick={AXIS} axisLine={false} tickLine={false} interval={6} />
            <YAxis width={52} tick={AXIS} axisLine={false} tickLine={false} tickFormatter={(value: number) => formatCompactMoney(value, currency)} />
            <Tooltip
              cursor={{ fill: "rgba(255,255,255,0.04)" }}
              content={({ active, payload }) => {
                const row = payload?.[0]?.payload as DaySpend | undefined;
                return (
                  <DarkTip
                    active={active}
                    label={row ? formatDay(row.date) : undefined}
                    value={row ? (row.cents > 0 ? `${formatMoney(row.cents, currency)} · ${row.count} transaction${row.count === 1 ? "" : "s"}` : "No spending recorded") : undefined}
                  />
                );
              }}
            />
            <Bar
              dataKey="cents"
              radius={[4, 4, 0, 0]}
              maxBarSize={16}
              isAnimationActive={!reduceMotion}
              animationDuration={600}
              animationEasing="ease-out"
              onMouseLeave={() => setHover(null)}
              onMouseEnter={(bar, index) => {
                const point = bar?.payload as DaySpend | undefined;
                setHover(index);
                if (point) setPicked(point);
              }}
              onClick={(bar) => {
                const point = bar?.payload as DaySpend | undefined;
                if (!point) return;
                setPicked(point);
                onSelect?.(point.date);
              }}
            >
              {points.map((point, index) => (
                <Cell key={point.date} fill={ACCENT} fillOpacity={hover === index ? 1 : 0.8} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <p className="mt-3 min-h-10 text-sm" role="status">
        {active ? (
          <>
            <span className="font-medium text-zinc-100">{formatDay(active.date)}</span>
            <span className="text-zinc-400"> · </span>
            <span className="font-semibold tabular-nums text-zinc-100">
              {active.cents > 0
                ? `${formatMoney(active.cents, currency)} · ${active.count} transaction${active.count === 1 ? "" : "s"}`
                : "No spending recorded"}
            </span>
          </>
        ) : (
          <span className="text-zinc-400">Hover or tap a day.</span>
        )}
      </p>
    </div>
  );
}
