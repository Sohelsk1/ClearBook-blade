import { useEffect, useState, type RefObject } from "react";
import { gsap } from "@/lib/gsap";

function motionOk() {
  return !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** One decorative stroke. The line stays visible if SMIL does not run. */
export function HeroUnderline() {
  const [draw, setDraw] = useState(false);
  useEffect(() => {
    setDraw(motionOk());
  }, []);
  return (
    <svg className="hero-underline" viewBox="0 0 220 14" aria-hidden="true">
      <path d="M2 9 C 46 2, 78 13, 118 7 S 176 2, 218 8" fill="none" stroke="#d7f27c" strokeWidth="2.4" strokeLinecap="round">
        {draw ? <animate attributeName="stroke-dasharray" from="0 240" to="240 0" dur="1.1s" begin="0s" fill="freeze" /> : null}
      </path>
    </svg>
  );
}

/** GSAP owns the only choreographed motion: hero arrival and section cards. */
export function useHomeCinema(scope: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const root = scope.current;
    if (!root || !motionOk()) return;
    const context = gsap.context(() => {
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.from(".hero-copy > *", {
          y: 12,
          autoAlpha: 0,
          duration: 0.55,
          stagger: 0.08,
          ease: "power2.out",
          immediateRender: false,
          clearProps: "opacity,visibility,transform",
        });
        gsap.utils.toArray<HTMLElement>(".home-step-grid").forEach((grid) => {
          gsap.from(grid.querySelectorAll(".home-step-card"), {
            y: 10,
            duration: 0.45,
            stagger: 0.06,
            ease: "power2.out",
            clearProps: "transform",
            immediateRender: false,
            scrollTrigger: { trigger: grid, start: "top 88%", once: true },
          });
        });
      });
    }, root);
    return () => context.revert();
  }, [scope]);
}
