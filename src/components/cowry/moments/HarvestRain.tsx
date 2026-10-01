import { useId, useMemo, type CSSProperties } from "react"
import { FullScreenMoment } from "@/components/cowry/moments/FullScreenMoment"

/**
 * Earth Harvest: grey clouds gather over dry earth and the rain comes down hard, splashing
 * where it lands, the soil darkening as it soaks in. Then, as the rain eases, green shoots
 * push up out of the ground — stems climbing, leaves unfurling, a few opening into flowers —
 * and sunlight breaks through the clouds onto the new growth.
 */

export const HARVEST_MS = 5600

/** One sprouting plant: a stem that draws itself up, leaves that unfurl, maybe a flower. */
function Plant({ height, delay, flower, still }: { height: number; delay: number; flower?: string; still: boolean }) {
  const id = useId().replace(/:/g, "")
  const leaf = `harvest-leaf-${id}`
  const at = (offset: number): CSSProperties => ({ animationDelay: `${delay + offset}s` })
  return (
    <svg viewBox="0 0 60 120" width={height / 2} height={height} className="overflow-visible" aria-hidden="true">
      <defs>
        <linearGradient id={leaf} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#bef264" />
          <stop offset="55%" stopColor="#22c55e" />
          <stop offset="100%" stopColor="#14532d" />
        </linearGradient>
      </defs>
      {/* Stem. */}
      <path
        d="M30 120 C 27 98, 34 76, 30 50 C 28 40, 31 30, 30 22"
        stroke="#15803d"
        strokeWidth="4"
        strokeLinecap="round"
        fill="none"
        pathLength={1}
        className={still ? undefined : "harvest-stem"}
        style={at(0)}
      />
      {/* Leaves, unfurling from the stem. */}
      <path d="M30 88 C 18 82, 8 86, 3 76 C 14 70, 26 74, 30 88 Z" fill={`url(#${leaf})`} className={still ? undefined : "harvest-leaf harvest-leaf-left"} style={at(0.35)} />
      <path d="M30 66 C 42 60, 52 64, 57 54 C 46 48, 34 52, 30 66 Z" fill={`url(#${leaf})`} className={still ? undefined : "harvest-leaf harvest-leaf-right"} style={at(0.55)} />
      <path d="M30 44 C 20 40, 13 42, 9 35 C 18 30, 27 34, 30 44 Z" fill={`url(#${leaf})`} className={still ? undefined : "harvest-leaf harvest-leaf-left"} style={at(0.75)} />
      {/* The top: a flower, or a pair of young leaves. */}
      {flower ? (
        <g className={still ? undefined : "harvest-bloom"} style={at(1)}>
          {[0, 72, 144, 216, 288].map((angle) => (
            <ellipse key={angle} cx="30" cy="13" rx="5" ry="9" fill={flower} transform={`rotate(${angle} 30 22)`} />
          ))}
          <circle cx="30" cy="22" r="5" fill="#facc15" stroke="#a16207" strokeWidth="1" />
        </g>
      ) : (
        <g className={still ? undefined : "harvest-bloom"} style={at(0.9)}>
          <path d="M30 24 C 22 16, 16 18, 12 10 C 22 8, 29 14, 30 24 Z" fill={`url(#${leaf})`} />
          <path d="M30 24 C 38 16, 44 18, 48 10 C 38 8, 31 14, 30 24 Z" fill={`url(#${leaf})`} />
        </g>
      )}
    </svg>
  )
}

const FLOWERS = ["#f472b6", "#fb923c", "#facc15", "#c084fc", "#f87171"]

export function HarvestRain({ onDone }: { onDone: () => void }) {
  const plants = useMemo(
    () =>
      Array.from({ length: 15 }, (_, i) => ({
        left: 3 + (i / 14) * 92 + (Math.random() - 0.5) * 4,
        height: 110 + Math.random() * 130,
        delay: 1.9 + Math.random() * 1.4,
        flower: Math.random() < 0.45 ? FLOWERS[i % FLOWERS.length] : undefined,
      })),
    [],
  )
  const splashes = useMemo(
    () =>
      Array.from({ length: 26 }, () => ({
        left: Math.random() * 100,
        top: Math.random() * 60,
        delay: 0.5 + Math.random() * 0.6,
      })),
    [],
  )

  return (
    <FullScreenMoment durationMs={HARVEST_MS} sound="harvest" label="Earth Harvest: rain falls and the earth turns green" onDone={onDone}>
      {(still) => (
        <>
          {/* Sky: grey storm light, warming as the sun breaks through. */}
          <div className="animate-fadeIn absolute inset-0 bg-[linear-gradient(180deg,#2b3340_0%,#4a5563_55%,#6b6a5e_100%)]" />
          <div className={`absolute inset-0 bg-[linear-gradient(180deg,#7cc4f0_0%,#cde9f7_45%,#f7e7b5_100%)] ${still ? "opacity-80" : "harvest-sky"}`} />
          <div
            className={`absolute -top-[20vh] left-1/2 size-[90vmax] rounded-full bg-[radial-gradient(circle,rgba(255,236,170,0.85),rgba(255,214,120,0.25)_35%,transparent_60%)] ${still ? "opacity-80" : "harvest-sun"}`}
            style={{ transform: "translateX(-50%)" }}
            aria-hidden="true"
          />

          {/* Clouds, parting at the end. */}
          <div className={`absolute -inset-x-1/4 top-0 h-1/2 ${still ? "opacity-30" : "harvest-clouds"}`} aria-hidden="true">
            {[6, 30, 55, 78].map((left, i) => (
              <span
                key={i}
                className="absolute rounded-full bg-[#3b4452] blur-2xl"
                style={{ left: `${left}%`, top: `${(i % 2) * 10}%`, width: "40vw", height: "22vh" }}
              />
            ))}
          </div>

          {/* Rain, heavy, then easing off. */}
          {!still && (
            <div className="harvest-rainfall absolute inset-0" aria-hidden="true">
              <div className="thunder-rain absolute inset-0 opacity-60" />
              <div className="lion-rain absolute inset-0 opacity-40" />
            </div>
          )}

          {/* The earth: dry, then dark with rain. */}
          <div className="absolute inset-x-0 bottom-0 h-[28vh] bg-[linear-gradient(180deg,#a87b4f_0%,#8a5f37_40%,#5e3d20_100%)]" aria-hidden="true">
            <div className={`absolute inset-0 bg-[linear-gradient(180deg,#5a3a1e_0%,#3f2814_45%,#24160a_100%)] ${still ? "" : "harvest-wet"}`} />
            {/* Splashes where the rain lands. */}
            {!still &&
              splashes.map((splash, i) => (
                <span
                  key={i}
                  className="harvest-splash absolute h-1.5 w-5 rounded-[50%] border border-white/60"
                  style={{ left: `${splash.left}%`, top: `${splash.top}%`, animationDelay: `${splash.delay}s` }}
                />
              ))}
          </div>

          {/* The new growth, rising out of the soil. */}
          {plants.map((plant, i) => (
            <div
              key={i}
              className="absolute bottom-[26vh] -translate-x-1/2"
              style={{ left: `${plant.left}%` }}
            >
              <Plant height={plant.height} delay={plant.delay} flower={plant.flower} still={still} />
            </div>
          ))}
        </>
      )}
    </FullScreenMoment>
  )
}
