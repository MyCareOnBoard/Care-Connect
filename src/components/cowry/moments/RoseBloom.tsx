import { useId, useMemo, type CSSProperties } from "react"
import { FullScreenMoment } from "@/components/cowry/moments/FullScreenMoment"

/**
 * Blooming Rose: a rose opens in the middle of the screen, ring by ring from the outside in,
 * on a deep wine dusk, while loose petals drift across the whole page.
 */

export const ROSE_MS = 4800

/** One petal: a teardrop from the flower's centre outwards. */
const PETAL = "M100 100 C 78 86, 72 52, 100 30 C 128 52, 122 86, 100 100 Z"

const RINGS = [
  { count: 7, scale: 1, spin: 0, delay: 0.2, colors: ["#ffb3c7", "#e11d48", "#7f1231"] },
  { count: 6, scale: 0.78, spin: 26, delay: 0.7, colors: ["#ffc6d5", "#f43f5e", "#9f1239"] },
  { count: 5, scale: 0.56, spin: 12, delay: 1.2, colors: ["#ffd9e3", "#fb7185", "#be123c"] },
  { count: 4, scale: 0.36, spin: 40, delay: 1.65, colors: ["#ffe6ee", "#fda4af", "#e11d48"] },
]

function Rose({ still }: { still: boolean }) {
  const id = useId().replace(/:/g, "")
  return (
    <svg viewBox="0 0 200 260" className="h-[min(62vh,460px)] drop-shadow-[0_24px_40px_rgba(0,0,0,0.5)]" aria-hidden="true">
      <defs>
        {RINGS.map((ring, i) => (
          <radialGradient key={i} id={`${id}-p${i}`} cx="50%" cy="85%" r="90%">
            <stop offset="0%" stopColor={ring.colors[2]} />
            <stop offset="55%" stopColor={ring.colors[1]} />
            <stop offset="100%" stopColor={ring.colors[0]} />
          </radialGradient>
        ))}
        <linearGradient id={`${id}-stem`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#14532d" />
          <stop offset="50%" stopColor="#22c55e" />
          <stop offset="100%" stopColor="#14532d" />
        </linearGradient>
      </defs>

      {/* Stem and leaves, drawn upward first. */}
      <path d="M100 118 C 96 160, 108 200, 100 256" stroke={`url(#${id}-stem)`} strokeWidth="7" fill="none" strokeLinecap="round" className={still ? undefined : "rose-stem"} pathLength={1} />
      <path d="M101 190 C 128 176, 150 184, 158 170 C 138 164, 116 170, 101 190 Z" fill="#16a34a" stroke="#14532d" strokeWidth="1.5" className={still ? undefined : "rose-leaf"} />
      <path d="M99 214 C 72 200, 50 208, 42 194 C 62 188, 84 194, 99 214 Z" fill="#15803d" stroke="#14532d" strokeWidth="1.5" className={still ? undefined : "rose-leaf rose-leaf-late"} />

      {/* The bloom: outer ring first, each petal unfolding from the centre. */}
      {RINGS.map((ring, r) =>
        Array.from({ length: ring.count }).map((_, i) => {
          const angle = (360 / ring.count) * i + ring.spin
          return (
            <g key={`${r}-${i}`} transform={`rotate(${angle} 100 100)`}>
              <path
                d={PETAL}
                fill={`url(#${id}-p${r})`}
                stroke="#881337"
                strokeWidth="0.8"
                className={still ? undefined : "rose-petal"}
                style={
                  {
                    transform: `scale(${ring.scale})`,
                    "--rose-scale": ring.scale,
                    animationDelay: `${ring.delay + i * 0.05}s`,
                  } as CSSProperties
                }
              />
            </g>
          )
        }),
      )}
      {/* The heart of the rose, and a gloss like the cowry's. */}
      <circle cx="100" cy="100" r="9" fill="#9f1239" className={still ? undefined : "rose-heart"} />
      <ellipse cx="90" cy="70" rx="10" ry="5" fill="#ffffff" opacity="0.35" transform="rotate(-25 90 70)" />
    </svg>
  )
}

export function RoseBloom({ onDone }: { onDone: () => void }) {
  const petals = useMemo(
    () =>
      Array.from({ length: 28 }, (_, i) => ({
        left: Math.random() * 100,
        delay: 0.4 + Math.random() * 3,
        duration: 3.2 + Math.random() * 2,
        size: 12 + Math.random() * 16,
        drift: (Math.random() - 0.3) * 30,
        hue: ["#fb7185", "#e11d48", "#fda4af", "#f43f5e"][i % 4],
      })),
    [],
  )

  return (
    <FullScreenMoment durationMs={ROSE_MS} sound="bloom" label="A Blooming Rose opens" onDone={onDone}>
      {(still) => (
        <>
          <div className="animate-fadeIn absolute inset-0 bg-[radial-gradient(ellipse_at_50%_45%,#6b1030_0%,#2a0714_55%,#12030a_100%)]" />
          <div style={{ transform: "translate(-50%, -50%)" }} className="rose-glow absolute left-1/2 top-[42%] size-[70vmin] rounded-full bg-[radial-gradient(circle,rgba(255,120,160,0.45),transparent_65%)]" />

          {!still &&
            petals.map((petal, i) => (
              <span
                key={i}
                className="rose-drift absolute -top-10"
                style={
                  {
                    left: `${petal.left}%`,
                    animationDelay: `${petal.delay}s`,
                    animationDuration: `${petal.duration}s`,
                    "--rose-dx": `${petal.drift}vw`,
                  } as CSSProperties
                }
                aria-hidden="true"
              >
                <span
                  className="block rounded-[60%_10%_60%_10%] shadow-[0_2px_6px_rgba(0,0,0,0.35)]"
                  style={{ width: petal.size, height: petal.size * 0.8, background: `radial-gradient(circle at 30% 30%, #ffe4ec, ${petal.hue})` }}
                />
              </span>
            ))}

          <div className="absolute inset-0 flex items-center justify-center pb-10">
            <Rose still={still} />
          </div>
        </>
      )}
    </FullScreenMoment>
  )
}
