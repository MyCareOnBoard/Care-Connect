import { useMemo, type CSSProperties } from "react"
import { FullScreenMoment } from "@/components/cowry/moments/FullScreenMoment"

/**
 * Ancestral Mark: on an earth-and-ochre dusk, marks of heritage draw themselves in glowing
 * gold — three bold strokes at the centre, and around them the lines and symbols of old
 * patterns — while rings pulse out from the middle like a heartbeat and dust drifts up.
 */

export const ANCESTRAL_MS = 4800

/** The central three strokes, and the symbols around them (drawn as single-stroke paths). */
const MARKS = [
  { d: "M-60 -90 C -52 -20, -52 20, -60 90", delay: 0.3, width: 9 },
  { d: "M0 -110 C 8 -30, 8 30, 0 110", delay: 0.5, width: 11 },
  { d: "M60 -90 C 52 -20, 52 20, 60 90", delay: 0.7, width: 9 },
]

const SYMBOLS = [
  // A spiral, a sun-mark, a zigzag river, a diamond, an eye, crossed paths — patterns in
  // the spirit of traditional marks, placed around the centre.
  { d: "M0 0 m -18 0 a 18 18 0 1 0 36 0 a 14 14 0 1 0 -28 0 a 9 9 0 1 0 18 0 a 4 4 0 1 0 -8 0", x: -300, y: -150 },
  { d: "M0 -26 L 0 26 M -26 0 L 26 0 M -18 -18 L 18 18 M 18 -18 L -18 18", x: 300, y: -150 },
  { d: "M-40 0 L -20 -16 L 0 0 L 20 -16 L 40 0", x: -320, y: 120 },
  { d: "M0 -28 L 22 0 L 0 28 L -22 0 Z M0 -12 L 9 0 L 0 12 L -9 0 Z", x: 320, y: 120 },
  { d: "M-30 0 C -15 -18, 15 -18, 30 0 C 15 18, -15 18, -30 0 Z M0 0 m -6 0 a 6 6 0 1 0 12 0 a 6 6 0 1 0 -12 0", x: 0, y: -220 },
  { d: "M-24 -24 L 24 24 M 24 -24 L -24 24 M -24 0 L 24 0", x: 0, y: 220 },
]

export function AncestralMark({ onDone }: { onDone: () => void }) {
  const dust = useMemo(
    () =>
      Array.from({ length: 30 }, () => ({
        left: Math.random() * 100,
        delay: Math.random() * 3,
        duration: 3 + Math.random() * 2,
        size: 2 + Math.random() * 4,
      })),
    [],
  )

  return (
    <FullScreenMoment durationMs={ANCESTRAL_MS} sound="drums" label="An Ancestral Mark is drawn" onDone={onDone}>
      {(still) => (
        <>
          <div className="animate-fadeIn absolute inset-0 bg-[radial-gradient(ellipse_at_50%_50%,#5a2d12_0%,#2b140a_55%,#120804_100%)]" />
          {/* Rings pulsing out like a heartbeat. */}
          {!still &&
            [0, 0.45, 0.9, 1.35].map((delay) => (
              <span
                key={delay}
                className="ancestral-ring absolute left-1/2 top-1/2 size-[40vmin] rounded-full border-2 border-[#f3c969]/60"
                style={{ animationDelay: `${delay}s`, transform: "translate(-50%, -50%)" }}
                aria-hidden="true"
              />
            ))}

          {/* Dust rising. */}
          {!still &&
            dust.map((mote, i) => (
              <span
                key={i}
                className="ancestral-dust absolute bottom-0 rounded-full bg-[#f3c969]/70"
                style={{ left: `${mote.left}%`, width: mote.size, height: mote.size, animationDelay: `${mote.delay}s`, animationDuration: `${mote.duration}s` }}
                aria-hidden="true"
              />
            ))}

          <svg viewBox="-400 -300 800 600" className="absolute inset-0 size-full" aria-hidden="true">
            <defs>
              <filter id="ancestral-glow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="4" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>
            <g filter="url(#ancestral-glow)" fill="none" stroke="#f3c969" strokeLinecap="round" strokeLinejoin="round">
              {MARKS.map((mark, i) => (
                <path
                  key={i}
                  d={mark.d}
                  strokeWidth={mark.width}
                  pathLength={1}
                  className={still ? undefined : "ancestral-draw"}
                  style={{ animationDelay: `${mark.delay}s` } as CSSProperties}
                />
              ))}
              {SYMBOLS.map((symbol, i) => (
                <path
                  key={i}
                  d={symbol.d}
                  transform={`translate(${symbol.x} ${symbol.y})`}
                  strokeWidth={4}
                  pathLength={1}
                  opacity={0.85}
                  className={still ? undefined : "ancestral-draw"}
                  style={{ animationDelay: `${1.1 + i * 0.25}s`, animationDuration: "0.9s" } as CSSProperties}
                />
              ))}
            </g>
          </svg>
        </>
      )}
    </FullScreenMoment>
  )
}
