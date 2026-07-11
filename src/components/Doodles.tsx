/**
 * Ambient floating math doodles that fill the empty side/bottom gutters.
 * Purely decorative: fixed, behind content, pointer-events none, and it
 * disappears under prefers-reduced-motion (handled in CSS). Colours come
 * from the active theme's --accent, so it stays consistent everywhere.
 */
import type { CSSProperties } from "react";

const DOODLES: { c: string; left: string; top: string; size: number; dur: number; delay: number; rot: number }[] = [
  // left gutter
  { c: "+", left: "3%", top: "16%", size: 52, dur: 9, delay: 0, rot: -12 },
  { c: "×", left: "6%", top: "44%", size: 40, dur: 11, delay: 1.2, rot: 10 },
  { c: "√", left: "2.5%", top: "70%", size: 46, dur: 10, delay: 2.1, rot: -6 },
  { c: "7", left: "8%", top: "86%", size: 38, dur: 12, delay: 0.6, rot: 8 },
  { c: "★", left: "10%", top: "28%", size: 30, dur: 8, delay: 1.8, rot: 0 },
  // right gutter
  { c: "÷", left: "94%", top: "20%", size: 50, dur: 10, delay: 0.4, rot: 12 },
  { c: "−", left: "90%", top: "40%", size: 44, dur: 12, delay: 1.5, rot: -8 },
  { c: "π", left: "95%", top: "64%", size: 46, dur: 9, delay: 2.4, rot: 6 },
  { c: "%", left: "88%", top: "82%", size: 38, dur: 11, delay: 0.9, rot: -10 },
  { c: "3", left: "92%", top: "50%", size: 34, dur: 8.5, delay: 2.0, rot: 4 },
  // bottom band
  { c: "=", left: "24%", top: "94%", size: 40, dur: 10.5, delay: 1.0, rot: 6 },
  { c: "△", left: "50%", top: "96%", size: 34, dur: 9.5, delay: 2.2, rot: 0 },
  { c: "○", left: "68%", top: "93%", size: 30, dur: 11.5, delay: 0.3, rot: 0 },
  { c: "9", left: "40%", top: "95%", size: 36, dur: 8.8, delay: 1.6, rot: -6 },
];

export function Doodles() {
  return (
    <div className="fm-doodles" aria-hidden="true">
      {DOODLES.map((d, i) => {
        const style = {
          left: d.left,
          top: d.top,
          fontSize: d.size,
          "--dur": `${d.dur}s`,
          "--delay": `${d.delay}s`,
          "--r0": `${d.rot}deg`,
          "--r1": `${d.rot + (i % 2 ? 10 : -10)}deg`,
        } as CSSProperties;
        return <span key={i} className="fm-doodle" style={style}>{d.c}</span>;
      })}
    </div>
  );
}
