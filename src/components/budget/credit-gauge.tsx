import { useEffect, useState } from "react";
import { scoreRating } from "@/lib/budget/credit-report";

const STOPS = [
  { until: 549, color: "#c17d88" },
  { until: 649, color: "#c4926a" },
  { until: 749, color: "#b39668" },
  { until: 799, color: "#7d9a78" },
  { until: 900, color: "#6d9a86" },
];

function point(score: number, radius: number) {
  const angle = ((Math.min(900, Math.max(300, score)) - 300) / 600) * Math.PI;
  return { x: 120 - Math.cos(angle) * radius, y: 108 - Math.sin(angle) * radius };
}

export function CreditScoreGauge({ score }: { score: number | null }) {
  const [shown, setShown] = useState(300);
  const rating = scoreRating(score);
  useEffect(() => {
    if (score == null) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setShown(score);
      return;
    }
    let frame = 0;
    const started = performance.now();
    const tick = (now: number) => {
      const progress = Math.min(1, (now - started) / 900);
      setShown(Math.round(300 + (score - 300) * (1 - Math.pow(1 - progress, 3))));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [score]);
  const needle = point(score == null ? 300 : shown, 70);
  return (
    <svg viewBox="0 0 240 132" className="mx-auto w-full max-w-[240px]" role="img" aria-label={score == null ? "No credit score" : `Credit score ${score}, ${rating.label}`}>
      <path d="M 24 108 A 96 96 0 0 1 216 108" fill="none" stroke="currentColor" className="text-border" strokeWidth="12" strokeLinecap="round" />
      {STOPS.map((stop, index) => {
        const from = index === 0 ? 300 : STOPS[index - 1].until;
        const start = point(from, 96);
        const end = point(stop.until, 96);
        return <path key={stop.color} d={`M ${start.x} ${start.y} A 96 96 0 0 1 ${end.x} ${end.y}`} fill="none" stroke={stop.color} strokeWidth="8" />;
      })}
      <line x1="120" y1="108" x2={needle.x} y2={needle.y} stroke="currentColor" className="text-foreground" strokeWidth="2" />
      <circle cx="120" cy="108" r="4" className="fill-foreground" />
      <text x="120" y="96" textAnchor="middle" fontSize="28" fontWeight="600" className="fill-foreground" style={{ fontFamily: "JetBrains Mono, ui-monospace, monospace" }}>{score == null ? "—" : shown}</text>
      <text x="28" y="124" className="fill-muted-foreground text-[10px]">300</text>
      <text x="198" y="124" className="fill-muted-foreground text-[10px]">900</text>
    </svg>
  );
}
