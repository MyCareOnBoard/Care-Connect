import { useId, useMemo, type CSSProperties } from "react"
import { FullScreenMoment } from "@/components/cowry/moments/FullScreenMoment"

/**
 * Earth Harvest: grey clouds gather over dry earth and the rain comes down hard, splashing
 * where it lands, the soil darkening as it soaks in. Then, as the rain eases, a whole garden
 * comes up out of the ground — stems climbing, leaves unfurling, and every one opening into
 * a flower: daisies, tulips, roses, sunflowers, blossoms. The sun breaks through, the garden
 * sways, petals drift on the air and butterflies come.
 */

export const HARVEST_MS = 5600

type FlowerKind = "daisy" | "tulip" | "rose" | "sunflower" | "blossom"
const KINDS: FlowerKind[] = ["daisy", "tulip", "rose", "sunflower", "blossom"]

/** Colours each kind can come in. */
const PALETTE: Record<FlowerKind, string[]> = {
  daisy: ["#ffffff", "#fde2f3", "#e9d5ff"],
  tulip: ["#ef4444", "#f472b6", "#f59e0b", "#a855f7"],
  rose: ["#e11d48", "#f43f5e", "#fb7185", "#be123c"],
  sunflower: ["#facc15"],
  blossom: ["#f9a8d4", "#fb923c", "#c084fc", "#60a5fa"],
}

/** A flower's head, drawn around (30, 22) — the top of the stem. */
function FlowerHead({ kind, color }: { kind: FlowerKind; color: string }) {
  switch (kind) {
    case "daisy":
      return (
        <>
          {Array.from({ length: 12 }, (_, i) => (
            <ellipse key={i} cx="30" cy="12" rx="3" ry="9" fill={color} stroke="#e5e7eb" strokeWidth="0.5" transform={`rotate(${i * 30} 30 22)`} />
          ))}
          <circle cx="30" cy="22" r="5.5" fill="#facc15" stroke="#ca8a04" strokeWidth="1" />
        </>
      )
    case "tulip":
      return (
        <>
          <path d="M19 26 C 17 13, 22 6, 24 3 L 30 12 L 36 3 C 38 6, 43 13, 41 26 Q 30 33 19 26 Z" fill={color} stroke="#7f1d1d" strokeOpacity="0.35" strokeWidth="1" />
          <path d="M24 26 C 23 16, 27 10, 30 12 C 33 10, 37 16, 36 26 Z" fill="#ffffff" opacity="0.2" />
        </>
      )
    case "rose":
      return (
        <>
          <circle cx="30" cy="20" r="11" fill={color} />
          <circle cx="30" cy="19" r="7.5" fill="#ffffff" opacity="0.18" />
          <path d="M30 20 m -6 0 a 6 6 0 1 1 6 6 a 4 4 0 1 1 -4 -4 a 2 2 0 1 1 2 2" stroke="#4c0519" strokeOpacity="0.45" strokeWidth="1.3" fill="none" />
        </>
      )
    case "sunflower":
      return (
        <>
          {Array.from({ length: 16 }, (_, i) => (
            <ellipse key={i} cx="30" cy="9" rx="3.6" ry="10" fill={color} stroke="#ca8a04" strokeWidth="0.5" transform={`rotate(${i * 22.5} 30 22)`} />
          ))}
          <circle cx="30" cy="22" r="8" fill="#78350f" />
          {[[-3, -3], [3, -3], [0, 0], [-3, 3], [3, 3]].map(([dx, dy], i) => (
            <circle key={i} cx={30 + dx} cy={22 + dy} r="1" fill="#451a03" />
          ))}
        </>
      )
    default:
      return (
        <>
          {[0, 72, 144, 216, 288].map((angle) => (
            <ellipse key={angle} cx="30" cy="13" rx="6" ry="9" fill={color} transform={`rotate(${angle} 30 22)`} />
          ))}
          <circle cx="30" cy="22" r="4.5" fill="#fef08a" stroke="#ca8a04" strokeWidth="1" />
        </>
      )
  }
}

/** One plant: a stem that draws itself up, leaves that unfurl, and a flower that opens. */
function Plant({
  height,
  delay,
  kind,
  color,
  still,
}: {
  height: number
  delay: number
  kind: FlowerKind
  color: string
  still: boolean
}) {
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
      <path d="M30 88 C 18 82, 8 86, 3 76 C 14 70, 26 74, 30 88 Z" fill={`url(#${leaf})`} className={still ? undefined : "harvest-leaf harvest-leaf-left"} style={at(0.35)} />
      <path d="M30 66 C 42 60, 52 64, 57 54 C 46 48, 34 52, 30 66 Z" fill={`url(#${leaf})`} className={still ? undefined : "harvest-leaf harvest-leaf-right"} style={at(0.55)} />
      <g className={still ? undefined : "harvest-bloom"} style={at(0.85)}>
        <FlowerHead kind={kind} color={color} />
      </g>
    </svg>
  )
}

/** A butterfly, wings beating. */
function Butterfly({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 40 30" width="40" height="30" className="overflow-visible" aria-hidden="true">
      <g className="harvest-wing" style={{ transformOrigin: "20px 15px" }}>
        <path d="M20 15 C 12 2, 2 4, 4 12 C 5 18, 14 18, 20 15 Z M20 15 C 14 20, 6 26, 10 28 C 14 30, 18 22, 20 15 Z" fill={color} stroke="#1f2937" strokeWidth="0.8" />
        <path d="M20 15 C 28 2, 38 4, 36 12 C 35 18, 26 18, 20 15 Z M20 15 C 26 20, 34 26, 30 28 C 26 30, 22 22, 20 15 Z" fill={color} stroke="#1f2937" strokeWidth="0.8" />
      </g>
      <ellipse cx="20" cy="15" rx="1.4" ry="7" fill="#1f2937" />
    </svg>
  )
}

const pick = <T,>(list: T[]) => list[Math.floor(Math.random() * list.length)]

export function HarvestRain({ onDone }: { onDone: () => void }) {
  // Two rows: a back row, smaller and higher up, then a fuller front row.
  const garden = useMemo(() => {
    const row = (count: number, bottom: number, heights: [number, number], delayFrom: number, layer: number) =>
      Array.from({ length: count }, (_, i) => {
        const kind = KINDS[(i + layer) % KINDS.length]
        return {
          left: 2 + (i / (count - 1)) * 96 + (Math.random() - 0.5) * 3,
          bottom,
          height: heights[0] + Math.random() * (heights[1] - heights[0]),
          delay: delayFrom + Math.random() * 1.2,
          kind,
          color: pick(PALETTE[kind]),
          sway: Math.random() * 1.2,
          layer,
        }
      })
    return [...row(12, 30, [90, 140], 1.8, 0), ...row(14, 22, [130, 210], 2.0, 2)]
  }, [])
  const splashes = useMemo(
    () =>
      Array.from({ length: 26 }, () => ({
        left: Math.random() * 100,
        top: Math.random() * 60,
        delay: 0.5 + Math.random() * 0.6,
      })),
    [],
  )
  const petals = useMemo(
    () =>
      Array.from({ length: 18 }, () => ({
        left: Math.random() * 100,
        delay: 3.4 + Math.random() * 1.4,
        color: pick(["#f9a8d4", "#fda4af", "#fde68a", "#e9d5ff", "#ffffff"]),
        drift: (Math.random() - 0.5) * 30,
      })),
    [],
  )
  const grass = useMemo(() => Array.from({ length: 40 }, (_, i) => ({ left: (i / 39) * 100, height: 14 + Math.random() * 18 })), [])

  return (
    <FullScreenMoment durationMs={HARVEST_MS} sound="harvest" label="Earth Harvest: rain falls and a garden of flowers blooms" onDone={onDone}>
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
          <div className="absolute inset-x-0 bottom-0 h-[30vh] bg-[linear-gradient(180deg,#a87b4f_0%,#8a5f37_40%,#5e3d20_100%)]" aria-hidden="true">
            <div className={`absolute inset-0 bg-[linear-gradient(180deg,#5a3a1e_0%,#3f2814_45%,#24160a_100%)] ${still ? "" : "harvest-wet"}`} />
            {!still &&
              splashes.map((splash, i) => (
                <span
                  key={i}
                  className="harvest-splash absolute h-1.5 w-5 rounded-[50%] border border-white/60"
                  style={{ left: `${splash.left}%`, top: `${splash.top}%`, animationDelay: `${splash.delay}s` }}
                />
              ))}
          </div>

          {/* Grass, greening the soil as the garden comes up. */}
          <div className={`absolute inset-x-0 bottom-[28vh] ${still ? "" : "harvest-grass"}`} aria-hidden="true">
            {grass.map((blade, i) => (
              <span
                key={i}
                className="absolute bottom-0 w-2.5 rounded-t-full bg-[linear-gradient(0deg,#15803d,#4ade80)]"
                style={{ left: `${blade.left}%`, height: blade.height, transform: `rotate(${(i % 5) * 6 - 12}deg)` }}
              />
            ))}
          </div>

          {/* The garden. */}
          {garden.map((plant, i) => (
            <div key={i} className="absolute -translate-x-1/2" style={{ left: `${plant.left}%`, bottom: `${plant.bottom}vh`, zIndex: plant.layer }}>
              <span className={still ? "block" : "harvest-sway block"} style={{ animationDelay: `${plant.sway}s` }}>
                <Plant height={plant.height} delay={plant.delay} kind={plant.kind} color={plant.color} still={still} />
              </span>
            </div>
          ))}

          {/* Petals on the air, and butterflies, once it is in flower. */}
          {!still &&
            petals.map((petal, i) => (
              <span
                key={i}
                className="harvest-petal absolute bottom-[34vh] h-2.5 w-4 rounded-[60%_10%_60%_10%]"
                style={
                  {
                    left: `${petal.left}%`,
                    background: petal.color,
                    animationDelay: `${petal.delay}s`,
                    "--petal-dx": `${petal.drift}vw`,
                  } as CSSProperties
                }
                aria-hidden="true"
              />
            ))}
          {!still &&
            [
              { color: "#f59e0b", delay: "3.5s", top: "40vh" },
              { color: "#60a5fa", delay: "3.9s", top: "30vh" },
            ].map((fly) => (
              <span key={fly.color} className="harvest-butterfly absolute left-0" style={{ top: fly.top, animationDelay: fly.delay }} aria-hidden="true">
                <Butterfly color={fly.color} />
              </span>
            ))}
        </>
      )}
    </FullScreenMoment>
  )
}
