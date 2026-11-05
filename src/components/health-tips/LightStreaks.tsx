import type { CSSProperties } from "react"

/**
 * Streaks of light falling down either side of the Health Tips column, on large screens only.
 *
 * Pure decoration: it sits behind the content, takes no clicks, is hidden from assistive tech,
 * and is not drawn at all below lg (the column fills a phone) or with reduced motion. Each
 * streak's lane, length, speed and head start are fixed here rather than random, so the pattern
 * is the same on every visit and never clumps. Negative delays mean the streaks are already
 * mid-fall when the page opens, instead of all starting at the top together.
 */

type Streak = { x: string; h: number; w: number; dur: number; delay: number; dim?: boolean }

const LEFT: Streak[] = [
  { x: "18%", h: 140, w: 1, dur: 7.5, delay: -1.2 },
  { x: "36%", h: 90, w: 1, dur: 9.5, delay: -6.1, dim: true },
  { x: "55%", h: 180, w: 2, dur: 6.2, delay: -3.4 },
  { x: "72%", h: 110, w: 1, dur: 8.4, delay: -0.4, dim: true },
  { x: "88%", h: 150, w: 1, dur: 10.5, delay: -7.8 },
]

const RIGHT: Streak[] = [
  { x: "12%", h: 120, w: 1, dur: 8.8, delay: -4.6 },
  { x: "30%", h: 170, w: 2, dur: 6.8, delay: -2.1 },
  { x: "48%", h: 95, w: 1, dur: 10.2, delay: -8.3, dim: true },
  { x: "66%", h: 145, w: 1, dur: 7.1, delay: -5.5 },
  { x: "84%", h: 105, w: 1, dur: 9.1, delay: -1.9, dim: true },
]

function Gutter({ streaks, side }: { streaks: Streak[]; side: "left" | "right" }) {
  return (
    <div className={`ht-gutter ht-gutter-${side}`}>
      {streaks.map((streak, index) => (
        <span
          key={index}
          className={`ht-streak${streak.dim ? " ht-streak-dim" : ""}`}
          style={
            {
              "--x": streak.x,
              "--h": `${streak.h}px`,
              "--w": `${streak.w}px`,
              "--dur": `${streak.dur}s`,
              "--delay": `${streak.delay}s`,
            } as CSSProperties
          }
        />
      ))}
    </div>
  )
}

export function LightStreaks() {
  return (
    <div className="ht-streaks hidden lg:block" aria-hidden="true">
      <Gutter streaks={LEFT} side="left" />
      <Gutter streaks={RIGHT} side="right" />
    </div>
  )
}
