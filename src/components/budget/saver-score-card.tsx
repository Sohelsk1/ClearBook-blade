import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { ChevronLeft, ChevronRight, ShieldAlert, Sparkles, TriangleAlert } from "lucide-react";
import { SAVER_BANDS, saverBand, scoreStatement, type SaverTip } from "@/lib/budget/saver-score";
import type { CurrencyCode, Transaction } from "@/lib/budget/model";

const CX = 160;
const CY = 148;
const RADIUS = 112;
const BURST = [
  { x: 0, y: -78, color: "var(--band-excellent)" },
  { x: 54, y: -58, color: "var(--band-alert)" },
  { x: 78, y: -8, color: "var(--band-excellent-ink)" },
  { x: 48, y: 36, color: "var(--band-alert)" },
  { x: -8, y: 42, color: "var(--band-excellent)" },
  { x: -62, y: 22, color: "var(--band-excellent-ink)" },
  { x: -76, y: -24, color: "var(--band-alert)" },
  { x: -40, y: -64, color: "var(--band-excellent)" },
  { x: 28, y: -86, color: "var(--band-excellent-ink)" },
  { x: 86, y: -36, color: "var(--band-excellent)" },
  { x: -86, y: -46, color: "var(--band-alert)" },
  { x: 12, y: 28, color: "var(--band-excellent)" },
];

function point(score: number, radius: number) {
  const t = Math.min(100, Math.max(0, score)) / 100;
  const angle = Math.PI * (1 - t);
  return { x: CX + Math.cos(angle) * radius, y: CY - Math.sin(angle) * radius };
}

function arc(from: number, to: number) {
  const start = point(from, RADIUS);
  const end = point(to, RADIUS);
  return `M ${start.x} ${start.y} A ${RADIUS} ${RADIUS} 0 0 1 ${end.x} ${end.y}`;
}

function SaverGauge({ score, label, ink }: { score: number | null; label: string; ink?: string }) {
  const [shown, setShown] = useState(0);
  const shownRef = useRef(0);
  useEffect(() => {
    if (score == null) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const from = shownRef.current;
    if (reduce) {
      shownRef.current = score;
      setShown(score);
      return;
    }
    const started = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const progress = Math.min(1, (now - started) / 700);
      const eased = 1 - (1 - progress) ** 3;
      const value = Math.round(from + (score - from) * eased);
      shownRef.current = value;
      setShown(value);
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [score]);

  const needle = point(score == null ? 0 : shown, 78);
  return (
    <div className="saver-gauge mx-auto w-full max-w-[320px]">
      <svg viewBox="0 0 320 176" className="w-full" role="img" aria-label={score == null ? "Spend score waiting for a statement" : `Spend score ${score} of 100, ${label}`}>
        <path d={arc(0, 100)} fill="none" stroke="var(--border)" strokeWidth="18" />
        {SAVER_BANDS.map((band) => {
          const from = band.from === 0 ? 0 : band.from + 1.2;
          const to = band.to === 100 ? 100 : band.to - 1.2;
          return <path key={band.id} d={arc(from, to)} fill="none" stroke={band.color} strokeWidth="16" />;
        })}
        {score != null ? (
          <>
            <line x1={CX} y1={CY} x2={needle.x} y2={needle.y} stroke="currentColor" className="text-foreground" strokeWidth="3" strokeLinecap="round" />
            <circle cx={CX} cy={CY} r="7" className="fill-foreground" />
            <circle cx={CX} cy={CY} r="3" style={{ fill: "var(--color-card)" }} />
          </>
        ) : null}
        <text x="28" y="168" className="fill-muted-foreground" fontSize="12">0</text>
        <text x="276" y="168" className="fill-muted-foreground" fontSize="12">100</text>
      </svg>
      <div className="saver-gauge-readout">
        <p className="font-mono text-5xl font-semibold leading-none tabular-nums text-foreground">{score == null ? "—" : shown}</p>
        <p className={`mt-1 text-sm font-semibold tracking-wide ${score == null ? "text-muted-foreground" : "uppercase"}`} style={score == null ? undefined : { color: ink }}>
          {score == null ? "No score yet" : label}
        </p>
      </div>
    </div>
  );
}

function Burst() {
  return (
    <div className="saver-burst" aria-hidden="true">
      {BURST.map((bit, index) => (
        <i key={index} style={{ "--x": `${bit.x}px`, "--y": `${bit.y}px`, background: bit.color, animationDelay: `${index * 35}ms` } as CSSProperties} />
      ))}
    </div>
  );
}

function TipDeck({ tips, onPreview }: { tips: SaverTip[]; onPreview: (score: number | null) => void }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [armed, setArmed] = useState<string | null>(null);
  const count = tips.length;
  const tip = tips[index] ?? tips[0];

  useEffect(() => {
    if (paused || count < 2) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = window.setInterval(() => setIndex((current) => (current + 1) % count), 4200);
    return () => window.clearInterval(timer);
  }, [paused, count]);

  if (!tip) return null;
  const Icon = tip.tone === "good" ? Sparkles : tip.tone === "bad" ? ShieldAlert : TriangleAlert;
  const go = (next: number) => {
    setPaused(true);
    setArmed(null);
    onPreview(null);
    setIndex((next + count) % count);
  };

  return (
    <div className="saver-deck">
      <article key={tip.id} className={`saver-alert is-${tip.tone}`} aria-live="polite">
        <div className="flex items-start gap-2">
          <Icon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium uppercase tracking-wide opacity-80">{index + 1} of {count}</p>
            <h3 className="mt-1 text-base font-semibold">{tip.title}</h3>
            <p className="mt-1 text-sm font-medium opacity-90">{tip.detail}</p>
          </div>
        </div>
        {tip.whatIfScore != null ? (
          <button
            type="button"
            className="saver-whatif"
            onClick={() => {
              setPaused(true);
              if (armed === tip.id) {
                setArmed(null);
                onPreview(null);
              } else {
                setArmed(tip.id);
                onPreview(tip.whatIfScore);
              }
            }}
          >
            {armed === tip.id ? "Back to your score" : tip.whatIfLabel || "See the needle move"}
          </button>
        ) : null}
      </article>
      {count > 1 ? (
        <div className="saver-deck-nav">
          <button type="button" className="saver-nav-btn" aria-label="Previous tip" onClick={() => go(index - 1)}>
            <ChevronLeft className="size-4" aria-hidden="true" />
          </button>
          <div className="flex gap-1.5" role="tablist" aria-label="Tips">
            {tips.map((item, dot) => (
              <button key={item.id} type="button" role="tab" aria-selected={dot === index} aria-label={`Tip ${dot + 1}`} className={`saver-dot ${dot === index ? "is-on" : ""}`} onClick={() => go(dot)} />
            ))}
          </div>
          <button type="button" className="saver-nav-btn" aria-label="Next tip" onClick={() => go(index + 1)}>
            <ChevronRight className="size-4" aria-hidden="true" />
          </button>
        </div>
      ) : null}
    </div>
  );
}

export function SaverScoreCard({
  transactions,
  start,
  end,
  currency,
  hasStatement,
}: {
  transactions: Transaction[];
  start: string;
  end: string;
  currency: CurrencyCode;
  hasStatement: boolean;
}) {
  const result = useMemo(() => scoreStatement(transactions, start, end, currency), [transactions, start, end, currency]);
  const [preview, setPreview] = useState<number | null>(null);
  useEffect(() => {
    setPreview(null);
  }, [result?.score]);
  const tone = result?.celebrate ? "is-great" : result?.level === "critical" ? "is-critical" : "";
  const shownScore = preview ?? result?.score ?? null;
  const shownBand = shownScore == null ? null : saverBand(shownScore);

  return (
    <section className={`panel saver-score mb-4 p-4 sm:p-6 ${tone}`} aria-labelledby="saver-score-heading">
      <div className="relative mx-auto max-w-md text-center">
        {result?.celebrate && preview == null ? <Burst /> : null}
        <SaverGauge score={shownScore} label={preview != null ? "If you fix this" : (result?.bandLabel ?? "")} ink={shownBand?.ink ?? result?.ink} />
        <ul className="mt-3 flex flex-wrap justify-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          {SAVER_BANDS.map((band) => (
            <li key={band.id} className="inline-flex items-center gap-1">
              <span className="size-2 rounded-full" style={{ background: band.color }} aria-hidden="true" />
              {band.label}
            </li>
          ))}
        </ul>
        <h2 id="saver-score-heading" className={`mt-4 ${result?.celebrate ? "saver-congrats" : result?.level === "critical" ? "saver-critical-line" : "text-2xl font-medium tracking-tight text-foreground"}`}>
          {result?.celebrate ? "Congratulations" : result?.level === "critical" ? "Critical" : result ? result.personaLabel : "Upload a statement"}
        </h2>
        {result?.celebrate ? (
          <p className="text-sm font-medium" style={{ color: "var(--band-excellent-ink)" }}>Low spender</p>
        ) : result?.level === "critical" ? (
          <p className="text-sm font-medium" style={{ color: "var(--band-critical-ink)" }}>High spender</p>
        ) : (
          <p className="mt-1 text-sm text-muted-foreground">
            {hasStatement ? "This period has no spending yet." : "Upload a statement. 0 is excellent. 100 is critical."}
          </p>
        )}
        {result ? <TipDeck tips={result.tips} onPreview={setPreview} /> : null}
      </div>
    </section>
  );
}
