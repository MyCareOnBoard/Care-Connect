import { FullScreenMoment } from "@/components/cowry/moments/FullScreenMoment"

/**
 * Thunder Staff: the sky turns to storm, rain slants down, lightning cracks across the
 * screen twice — each strike a white flash — and a golden staff rises in the middle, its orb
 * crackling with charge.
 */

export const THUNDER_MS = 4600

/** Jagged bolts, as polylines across the full height of a 100×100 view. */
const BOLTS = [
  { points: "22,0 30,18 24,20 34,40 27,42 40,66 32,68 44,100", delay: "0.1s", width: 1.6 },
  { points: "78,0 70,22 76,24 64,46 71,48 58,72 65,74 54,100", delay: "1.5s", width: 1.8 },
  { points: "50,0 46,14 52,16 44,32 50,34 42,52", delay: "1.62s", width: 1.1 },
]

function Staff({ still }: { still: boolean }) {
  return (
    <div className={still ? "flex flex-col items-center" : "thunder-staff-rise flex flex-col items-center"}>
      {/* The orb, charged. */}
      <span className="relative flex size-24 items-center justify-center">
        <span className="thunder-orb-glow absolute inset-[-40%] rounded-full bg-[radial-gradient(circle,rgba(160,120,255,0.8),rgba(90,200,255,0.25)_45%,transparent_70%)]" />
        <span className="relative size-20 rounded-full bg-[radial-gradient(circle_at_35%_30%,#ffffff_0%,#d8ccff_20%,#8b5cf6_55%,#3b1a8a_100%)] shadow-[0_0_40px_10px_rgba(139,92,246,0.7)]" />
        {!still && (
          <svg viewBox="0 0 100 100" className="thunder-arcs absolute inset-[-30%]" aria-hidden="true">
            <polyline points="50,10 56,26 46,32 58,46" fill="none" stroke="#e0f2ff" strokeWidth="2" strokeLinejoin="round" />
            <polyline points="88,50 72,54 76,62 60,66" fill="none" stroke="#e0f2ff" strokeWidth="1.6" strokeLinejoin="round" />
            <polyline points="14,58 30,56 26,66 42,68" fill="none" stroke="#e0f2ff" strokeWidth="1.6" strokeLinejoin="round" />
          </svg>
        )}
      </span>
      {/* The staff: carved gold. */}
      <span className="-mt-2 h-[42vh] w-4 rounded-full bg-[linear-gradient(90deg,#6b4410,#f3c969_45%,#fff4cf_55%,#c8963e_70%,#6b4410)] shadow-[0_10px_30px_rgba(0,0,0,0.6)]" />
    </div>
  )
}

export function ThunderStrike({ onDone }: { onDone: () => void }) {
  return (
    <FullScreenMoment durationMs={THUNDER_MS} sound="thunder" label="A Thunder Staff strikes" onDone={onDone}>
      {(still) => (
        <>
          <div className="animate-fadeIn absolute inset-0 bg-[linear-gradient(180deg,#05070f_0%,#111a3a_45%,#1d2550_100%)]" />
          {/* Storm clouds, drifting. */}
          <div className="thunder-clouds absolute -inset-x-1/4 top-0 h-1/2 opacity-80" aria-hidden="true">
            {[10, 35, 60, 82].map((left, i) => (
              <span
                key={i}
                className="absolute rounded-full bg-[#2a3358] blur-2xl"
                style={{ left: `${left}%`, top: `${(i % 2) * 12}%`, width: "38vw", height: "22vh" }}
              />
            ))}
          </div>
          {/* Rain, slanting. */}
          {!still && <div className="thunder-rain absolute inset-0 opacity-40" aria-hidden="true" />}

          {!still && (
            <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 size-full" aria-hidden="true">
              {BOLTS.map((bolt, i) => (
                <polyline
                  key={i}
                  points={bolt.points}
                  fill="none"
                  stroke="#f5f3ff"
                  strokeWidth={bolt.width}
                  strokeLinejoin="round"
                  vectorEffect="non-scaling-stroke"
                  className="thunder-bolt"
                  style={{ animationDelay: bolt.delay, filter: "drop-shadow(0 0 6px #a78bfa) drop-shadow(0 0 14px #60a5fa)" }}
                />
              ))}
            </svg>
          )}

          <div className="absolute inset-x-0 bottom-0 flex justify-center">
            <Staff still={still} />
          </div>

          {/* The white of each strike, over everything. */}
          {!still && <div className="thunder-flash pointer-events-none absolute inset-0 bg-white" aria-hidden="true" />}
        </>
      )}
    </FullScreenMoment>
  )
}
