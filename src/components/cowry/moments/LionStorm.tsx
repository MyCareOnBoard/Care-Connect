import { LionRunning } from "@/components/cowry/LionRunning"
import { FullScreenMoment } from "@/components/cowry/moments/FullScreenMoment"

/**
 * Golden Lion: the sky turns to storm and heavy rain sweeps across the screen. Lightning
 * cracks twice; on the second strike the crowned lion comes galloping in from the left,
 * full body, roars as it passes the middle — the screen shakes — and runs off the right.
 */

export const LION_MS = 5200

/** The lion's width: most of a phone screen, capped on large ones. */
const LION_WIDTH = typeof window === "undefined" ? 560 : Math.min(window.innerWidth * 0.85, 620)

/** Jagged bolts, as polylines across the full height of a 100×100 view. */
const BOLTS = [
  { points: "18,0 26,18 20,20 30,40 23,42 34,66 27,68 38,100", delay: "0.1s", width: 1.6 },
  { points: "82,0 74,22 80,24 68,46 75,48 62,72 69,74 58,100", delay: "1.4s", width: 1.8 },
  { points: "50,0 46,14 52,16 44,32 50,34 42,52", delay: "1.52s", width: 1.1 },
]

export function LionStorm({ onDone }: { onDone: () => void }) {
  return (
    <FullScreenMoment durationMs={LION_MS} sound="roar" label="The Golden Lion roars" onDone={onDone}>
      {(still) => (
        <div className={still ? "absolute inset-0" : "lion-shake absolute inset-0"}>
          <div className="animate-fadeIn absolute inset-0 bg-[linear-gradient(180deg,#04060c_0%,#121a33_45%,#2a2212_100%)]" />

          {/* Storm clouds, drifting. */}
          <div className="thunder-clouds absolute -inset-x-1/4 top-0 h-1/2 opacity-80" aria-hidden="true">
            {[8, 32, 58, 80].map((left, i) => (
              <span
                key={i}
                className="absolute rounded-full bg-[#262d4a] blur-2xl"
                style={{ left: `${left}%`, top: `${(i % 2) * 12}%`, width: "40vw", height: "24vh" }}
              />
            ))}
          </div>

          {/* Heavy rain: two layers at different speeds for depth. */}
          {!still && <div className="thunder-rain absolute inset-0 opacity-50" aria-hidden="true" />}
          {!still && <div className="lion-rain absolute inset-0 opacity-35" aria-hidden="true" />}

          {!still && (
            <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 size-full" aria-hidden="true">
              {BOLTS.map((bolt, i) => (
                <polyline
                  key={i}
                  points={bolt.points}
                  fill="none"
                  stroke="#fffbea"
                  strokeWidth={bolt.width}
                  strokeLinejoin="round"
                  vectorEffect="non-scaling-stroke"
                  className="thunder-bolt"
                  style={{ animationDelay: bolt.delay, filter: "drop-shadow(0 0 6px #fcd34d) drop-shadow(0 0 14px #f59e0b)" }}
                />
              ))}
            </svg>
          )}

          {/* Wet ground, catching the lightning. */}
          <div className="absolute inset-x-0 bottom-0 h-[22vh] bg-[linear-gradient(180deg,rgba(60,48,30,0.0)_0%,#2a2214_35%,#14100a_100%)]" aria-hidden="true" />

          {/* The lion, at full gallop across the screen, roaring as it passes the middle. */}
          {still ? (
            <div className="absolute inset-x-0 bottom-[12vh] flex justify-center">
              <LionRunning width={LION_WIDTH} still className="drop-shadow-[0_20px_30px_rgba(0,0,0,0.7)]" />
            </div>
          ) : (
            <div className="lion-run absolute bottom-[12vh] left-0" style={{ width: LION_WIDTH }}>
              <span className="absolute inset-x-[10%] -bottom-2 h-5 rounded-[50%] bg-black/50 blur-md" aria-hidden="true" />
              <span className="absolute inset-[-20%] rounded-full bg-[radial-gradient(circle,rgba(243,201,105,0.35),transparent_65%)]" aria-hidden="true" />
              <LionRunning width={LION_WIDTH} className="relative drop-shadow-[0_20px_30px_rgba(0,0,0,0.7)]" />
            </div>
          )}

          {/* The white of each strike, over everything. */}
          {!still && <div className="thunder-flash pointer-events-none absolute inset-0 bg-white" aria-hidden="true" />}
        </div>
      )}
    </FullScreenMoment>
  )
}
