import { Fragment, type ReactNode } from "react"
import { GiftIcon } from "@/components/cowry/GiftIcon"
import type { GiftLike } from "@/components/cowry/giftIcons"
import { between, moving, scatter, useStill, type SceneStyle } from "@/components/cowry/moments/scene/sceneKit"

/**
 * The pieces every Treasure scene is built from (treasureScenes.tsx): skies, suns and moons,
 * water and rain, horizons, things that rise or fall, light, sound made visible, and the
 * treasure itself.
 *
 * Positions are percentages of the screen. Each part places itself with an outer wrapper and
 * moves an inner one, so no keyframe has to know where on screen it is. All read `useStill`:
 * under reduced motion a part either shows its finished state or, if it is only motion
 * (rain, sparks), is left out.
 *
 * Timings are in seconds from the moment the scene opens; scenes run about five seconds.
 */

type Range = readonly [number, number]

/** Fades a group in at `at` seconds — the light after a door opens, the sky after a wall falls. */
export function Appear({ at, children, slow = false }: { at: number; children: ReactNode; slow?: boolean }) {
  const still = useStill()
  return (
    <div className={`pointer-events-none absolute inset-0 ${moving(still, slow ? "scene-in-slow" : "scene-in")}`} style={{ animationDelay: `${at}s` }}>
      {children}
    </div>
  )
}

/** Fades a group away at `at` seconds — stars at dawn, a wall once broken. Gone when still. */
export function FadeAway({ at, children }: { at: number; children: ReactNode }) {
  const still = useStill()
  if (still) return null
  return (
    <div className="scene-out pointer-events-none absolute inset-0" style={{ animationDelay: `${at}s` }}>
      {children}
    </div>
  )
}

/**
 * A field of Adinkra-style symbols — a spiral, a nested diamond, a cross in a ring, a
 * Sankofa heart — appearing across the screen in a wave from the top left.
 */
export function Symbols({ color = "#fbbf24", delay = 0.3, every = 0.09, opacity = 0.55 }: { color?: string; delay?: number; every?: number; opacity?: number }) {
  const still = useStill()
  const glyphs = [
    "M20 8 a12 12 0 1 1 -0.1 0 M20 14 a6 6 0 1 1 -0.1 0 M20 18 a2 2 0 1 1 -0.1 0",
    "M20 4 L36 20 L20 36 L4 20 Z M20 12 L28 20 L20 28 L12 20 Z",
    "M20 4 A16 16 0 1 1 19.9 4 Z M20 9 V31 M9 20 H31",
    "M20 34 C 6 24, 4 14, 10 9 C 15 5, 20 9, 20 13 C 20 9, 25 5, 30 9 C 36 14, 34 24, 20 34 Z M14 15 C 16 12, 18 13, 18 16",
  ]
  const columns = 7
  const rows = 6
  return (
    <svg viewBox={`0 0 ${columns * 50} ${rows * 50}`} preserveAspectRatio="xMidYMid slice" className="pointer-events-none absolute inset-0 size-full" aria-hidden="true">
      {Array.from({ length: columns * rows }, (_, i) => {
        const column = i % columns
        const row = Math.floor(i / columns)
        return (
          <path
            key={i}
            d={glyphs[(column + row) % glyphs.length]}
            transform={`translate(${column * 50 + 5} ${row * 50 + 5})`}
            fill="none"
            stroke={color}
            strokeWidth="2.2"
            strokeLinecap="round"
            opacity={opacity}
            className={moving(still, "scene-pop")}
            style={{ animationDelay: `${delay + (column + row) * every}s` }}
          />
        )
      })}
    </svg>
  )
}

/** Absolutely placed at a point, centred on it. */
export function At({ x, y, children, className = "", z }: { x: number; y: number; children: ReactNode; className?: string; z?: number }) {
  return (
    <div className={`pointer-events-none absolute ${className}`} style={{ left: `${x}%`, top: `${y}%`, transform: "translate(-50%, -50%)", zIndex: z }}>
      {children}
    </div>
  )
}

/* ── Sky ─────────────────────────────────────────────────────────────────── */

/**
 * The sky, and what it turns into: each later layer fades in over the last, so night can
 * become dawn and dry heat can become rain. `every` is the gap between changes.
 */
export function Sky({ layers, every = 1.4, start = 0.6 }: { layers: string[]; every?: number; start?: number }) {
  const still = useStill()
  const [first, ...rest] = layers
  return (
    <>
      <div className="animate-fadeIn absolute inset-0" style={{ background: first }} />
      {rest.map((background, i) => (
        <div
          key={i}
          className={`absolute inset-0 ${moving(still, "scene-in-slow")}`}
          style={{ background, animationDelay: `${start + i * every}s`, opacity: still && i < rest.length - 1 ? 0 : undefined }}
        />
      ))}
    </>
  )
}

/** A soft wash of light over part of the screen, for warmth or mood. */
export function Wash({ background, delay = 0 }: { background: string; delay?: number }) {
  const still = useStill()
  return <div className={`absolute inset-0 ${moving(still, "scene-in")}`} style={{ background, animationDelay: `${delay}s` }} />
}

/* ── Sun, moon, stars, clouds ────────────────────────────────────────────── */

export function Sun({
  x = 50,
  y = 56,
  size = "34vmin",
  motion = "rise",
  core = ["#fffdf2", "#fff1b8", "#ffd166", "#ff9f1c"],
  halo = "rgba(255,190,80,0.6)",
  rays = true,
  delay = 0,
}: {
  x?: number
  y?: number
  size?: string
  motion?: "rise" | "set" | "stay"
  core?: [string, string, string, string]
  halo?: string
  rays?: boolean
  delay?: number
}) {
  const still = useStill()
  const travel = motion === "rise" ? "scene-up" : motion === "set" ? "scene-down" : ""
  return (
    <At x={x} y={y}>
      <div className={moving(still, travel)} style={{ animationDelay: `${delay}s`, "--from": "42vh", "--to": "26vh" } as SceneStyle}>
        {rays && (
          <At x={50} y={50}>
            <div
              className={`size-[150vmax] ${moving(still, "scene-spin")}`}
              style={{
                background: "repeating-conic-gradient(from 0deg, rgba(255,236,170,0.42) 0deg 5deg, transparent 5deg 20deg)",
                maskImage: "radial-gradient(circle, black 0%, transparent 42%)",
                WebkitMaskImage: "radial-gradient(circle, black 0%, transparent 42%)",
              }}
            />
          </At>
        )}
        <At x={50} y={50}>
          <div className="rounded-full" style={{ width: `calc(${size} * 2.2)`, height: `calc(${size} * 2.2)`, background: `radial-gradient(circle, ${halo}, transparent 65%)` }} />
        </At>
        <div
          className="relative rounded-full"
          style={{
            width: size,
            height: size,
            background: `radial-gradient(circle at 40% 35%, ${core[0]} 0%, ${core[1]} 30%, ${core[2]} 62%, ${core[3]} 100%)`,
            boxShadow: `0 0 120px 40px ${halo}`,
          }}
        />
      </div>
    </At>
  )
}

/** A full moon, cratered and glowing, climbing or hanging in the sky. */
export function Moon({ x = 64, y = 34, size = "26vmin", motion = "rise", delay = 0.2 }: { x?: number; y?: number; size?: string; motion?: "rise" | "stay"; delay?: number }) {
  const still = useStill()
  return (
    <At x={x} y={y}>
      <div className={moving(still, motion === "rise" ? "scene-up-slow" : "")} style={{ animationDelay: `${delay}s`, "--from": "55vh" } as SceneStyle}>
        <At x={50} y={50}>
          <div className={`rounded-full ${moving(still, "scene-breathe")}`} style={{ width: `calc(${size} * 2.6)`, height: `calc(${size} * 2.6)`, background: "radial-gradient(circle, rgba(224,231,255,0.5), rgba(165,180,252,0.15) 45%, transparent 68%)" }} />
        </At>
        <div
          className="relative overflow-hidden rounded-full"
          style={{ width: size, height: size, background: "radial-gradient(circle at 38% 34%, #ffffff 0%, #f1f5f9 40%, #cbd5e1 80%, #94a3b8 100%)", boxShadow: "0 0 80px 20px rgba(224,231,255,0.45)" }}
        >
          {[[30, 40, 18], [62, 30, 12], [56, 64, 22], [28, 70, 10]].map(([cx, cy, r]) => (
            <span key={`${cx}${cy}`} className="absolute rounded-full bg-[#94a3b8]/35" style={{ left: `${cx}%`, top: `${cy}%`, width: `${r}%`, height: `${r}%` }} />
          ))}
        </div>
      </div>
    </At>
  )
}

export function Stars({ count = 40, seed = 7, top = 0, height = 60, color = "#ffffff", delay = 0 }: { count?: number; seed?: number; top?: number; height?: number; color?: string; delay?: number }) {
  const still = useStill()
  const stars = scatter(count, seed, (r) => ({ x: r() * 100, y: top + r() * height, size: 1.5 + r() * 3, delay: delay + r() * 1.6, speed: 1.2 + r() * 1.6 }))
  return (
    <>
      {stars.map((star, i) => (
        <span
          key={i}
          className={`absolute rounded-full ${moving(still, "scene-twinkle")}`}
          style={{ left: `${star.x}%`, top: `${star.y}%`, width: star.size, height: star.size, background: color, boxShadow: `0 0 6px ${color}`, animationDelay: `${star.delay}s`, animationDuration: `${star.speed}s` }}
        />
      ))}
    </>
  )
}

/** Soft clouds drifting across. */
export function Clouds({ count = 4, seed = 3, top = 8, height = 30, color = "rgba(255,255,255,0.85)", drift = 14 }: { count?: number; seed?: number; top?: number; height?: number; color?: string; drift?: number }) {
  const still = useStill()
  const clouds = scatter(count, seed, (r) => ({ x: -10 + r() * 100, y: top + r() * height, width: 18 + r() * 22, drift: drift * (0.6 + r() * 0.8) }))
  return (
    <>
      {clouds.map((cloud, i) => (
        <div
          key={i}
          className={`absolute ${moving(still, "scene-drift")}`}
          style={{ left: `${cloud.x}%`, top: `${cloud.y}%`, width: `${cloud.width}vw`, "--drift": `${cloud.drift}vw` } as SceneStyle}
        >
          <svg viewBox="0 0 120 50" className="w-full overflow-visible blur-[1px]" aria-hidden="true">
            <g fill={color}>
              <ellipse cx="38" cy="32" rx="30" ry="16" />
              <ellipse cx="66" cy="22" rx="28" ry="20" />
              <ellipse cx="90" cy="34" rx="24" ry="13" />
              <rect x="14" y="32" width="96" height="16" rx="8" />
            </g>
          </svg>
        </div>
      ))}
    </>
  )
}

/* ── The land ────────────────────────────────────────────────────────────── */

const HORIZONS = {
  hills: [
    "M0 120 C 150 70, 300 90, 420 110 C 560 135, 700 60, 860 90 C 930 104, 970 100, 1000 96 L1000 200 L0 200 Z",
    "M0 150 C 180 120, 360 140, 520 150 C 700 162, 840 130, 1000 140 L1000 200 L0 200 Z",
  ],
  dunes: [
    "M0 130 C 120 90, 260 90, 380 120 C 500 150, 620 80, 760 96 C 860 108, 940 120, 1000 110 L1000 200 L0 200 Z",
    "M0 160 C 160 132, 320 140, 470 160 C 640 182, 800 140, 1000 150 L1000 200 L0 200 Z",
  ],
  flat: ["M0 140 L1000 136 L1000 200 L0 200 Z", "M0 162 C 300 156, 700 168, 1000 158 L1000 200 L0 200 Z"],
} as const

/** Hills, dunes or open plain across the bottom, in two shades for depth. */
export function Horizon({ shape = "hills", colors, height = 34, children }: { shape?: keyof typeof HORIZONS; colors: [string, string]; height?: number; children?: ReactNode }) {
  const [back, front] = HORIZONS[shape]
  return (
    <svg viewBox="0 0 1000 200" preserveAspectRatio="none" className="absolute inset-x-0 bottom-0 w-full" style={{ height: `${height}vh` }} aria-hidden="true">
      <path d={back} fill={colors[0]} />
      <path d={front} fill={colors[1]} />
      {children}
    </svg>
  )
}

/** Flat-topped acacias on the horizon, the savannah's own silhouette. */
export function Acacias({ color, at = [16, 74] }: { color: string; at?: number[] }) {
  return (
    <>
      {at.map((x, i) => (
        <svg key={x} viewBox="0 0 100 80" className="absolute w-[22vmin]" style={{ left: `${x}%`, bottom: `${20 + (i % 2) * 3}vh` }} aria-hidden="true">
          <path d="M48 80 L50 40 L44 30 M50 44 L58 32" stroke={color} strokeWidth="4" fill="none" strokeLinecap="round" />
          <ellipse cx="50" cy="28" rx="44" ry="9" fill={color} />
          <ellipse cx="36" cy="22" rx="20" ry="6" fill={color} />
          <ellipse cx="64" cy="22" rx="22" ry="6" fill={color} />
        </svg>
      ))}
    </>
  )
}

/** Round huts with thatched roofs: a village in silhouette. */
export function Village({ color, windows }: { color: string; windows?: string }) {
  const still = useStill()
  const huts = [6, 20, 34, 62, 78, 90]
  return (
    <svg viewBox="0 0 1000 200" preserveAspectRatio="xMidYMax slice" className="absolute inset-x-0 bottom-0 h-[30vh] w-full" aria-hidden="true">
      <path d="M0 160 C 250 150, 750 152, 1000 160 L1000 200 L0 200 Z" fill={color} />
      {huts.map((x, i) => {
        const cx = x * 10
        const w = 46 + (i % 3) * 10
        return (
          <g key={x}>
            <rect x={cx - w / 2} y={160 - w * 0.9} width={w} height={w * 0.9} fill={color} />
            <path d={`M${cx - w * 0.7} ${160 - w * 0.85} L${cx} ${160 - w * 1.7} L${cx + w * 0.7} ${160 - w * 0.85} Z`} fill={color} />
            {windows && (
              <rect
                x={cx - 7}
                y={160 - w * 0.6}
                width="14"
                height="16"
                rx="3"
                fill={windows}
                className={moving(still, "scene-pop")}
                style={{ animationDelay: `${0.8 + i * 0.25}s` }}
              />
            )}
          </g>
        )
      })}
    </svg>
  )
}

/** A city skyline, its windows lighting one by one. */
export function Skyline({ color, windows = "#fde68a" }: { color: string; windows?: string }) {
  const still = useStill()
  const towers = scatter(14, 21, (r, i) => ({ x: i * 72 + r() * 10, w: 50 + r() * 20, h: 60 + r() * 110 }))
  return (
    <svg viewBox="0 0 1000 200" preserveAspectRatio="xMidYMax slice" className="absolute inset-x-0 bottom-0 h-[36vh] w-full" aria-hidden="true">
      {towers.map((tower, i) => (
        <g key={i}>
          <rect x={tower.x} y={200 - tower.h} width={tower.w} height={tower.h} fill={color} />
          {Array.from({ length: Math.floor(tower.h / 22) }, (_, row) => (
            <rect
              key={row}
              x={tower.x + 10}
              y={200 - tower.h + 10 + row * 22}
              width={tower.w - 20}
              height="8"
              fill={windows}
              opacity="0.85"
              className={moving(still, "scene-pop")}
              style={{ animationDelay: `${0.5 + ((i * 3 + row) % 9) * 0.2}s` }}
            />
          ))}
        </g>
      ))}
    </svg>
  )
}

/** Grass along the bottom, swaying; with `grow`, it springs up first. */
export function Grass({ count = 60, seed = 11, color = "#4d7c0f", tip = "#a3e635", height = 18, grow = false, delay = 0 }: { count?: number; seed?: number; color?: string; tip?: string; height?: number; grow?: boolean; delay?: number }) {
  const still = useStill()
  const blades = scatter(count, seed, (r, i) => ({ x: (i / count) * 1000 + r() * 12, h: 40 + r() * 60, lean: (r() - 0.5) * 18, speed: 1.6 + r() * 1.2, delay: r() }))
  return (
    <svg viewBox="0 0 1000 100" preserveAspectRatio="none" className="absolute inset-x-0 bottom-0 w-full" style={{ height: `${height}vh` }} aria-hidden="true">
      <defs>
        <linearGradient id="scene-grass" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stopColor={color} />
          <stop offset="100%" stopColor={tip} />
        </linearGradient>
      </defs>
      {blades.map((blade, i) => (
        <g key={i} className={grow ? moving(still, "scene-grow-up") : ""} style={{ animationDelay: `${delay + blade.delay * 0.8}s` }}>
          <path
            d={`M${blade.x - 5} 100 Q${blade.x + blade.lean * 0.4} ${100 - blade.h * 0.6} ${blade.x + blade.lean} ${100 - blade.h} Q${blade.x + 2} ${100 - blade.h * 0.5} ${blade.x + 5} 100 Z`}
            fill="url(#scene-grass)"
            className={moving(still, "scene-sway-svg")}
            style={{ animationDuration: `${blade.speed}s`, animationDelay: `${blade.delay}s` }}
          />
        </g>
      ))}
    </svg>
  )
}

/* ── Water ───────────────────────────────────────────────────────────────── */

const WAVE = "M0 20 C 50 0, 100 0, 150 20 S 250 40, 300 20 S 400 0, 450 20 S 550 40, 600 20 L600 60 L0 60 Z"

/** Water from `top` down, its surface rolling in two or three bands. */
export function Water({ top = 62, colors, speed = 7 }: { top?: number; colors: string[]; speed?: number }) {
  const still = useStill()
  return (
    <div className="absolute inset-x-0 bottom-0 overflow-hidden" style={{ top: `${top}%` }}>
      <div className="absolute inset-0" style={{ background: `linear-gradient(180deg, ${colors[0]}, ${colors[colors.length - 1]})` }} />
      {colors.map((color, i) => (
        <svg
          key={i}
          viewBox="0 0 600 60"
          preserveAspectRatio="none"
          className={`absolute left-0 h-[7vh] w-[200%] ${moving(still, "scene-wave")}`}
          style={{ top: `${-3 + i * 14}%`, animationDuration: `${speed + i * 2}s`, animationDirection: i % 2 ? "reverse" : "normal" }}
          aria-hidden="true"
        >
          <path d={WAVE} fill={color} opacity={0.75} />
          <path d={WAVE} transform="translate(600 0)" fill={color} opacity={0.75} />
        </svg>
      ))}
    </div>
  )
}

/** Rings spreading on a still surface; `flat` lays them on water rather than in the air. */
export function Ripples({ x = 50, y = 70, count = 4, every = 0.6, delay = 0.4, color = "rgba(255,255,255,0.7)", size = "60vmin", flat = true, repeat = true }: { x?: number; y?: number; count?: number; every?: number; delay?: number; color?: string; size?: string; flat?: boolean; repeat?: boolean }) {
  const still = useStill()
  if (still) return null
  return (
    <At x={x} y={y}>
      <div style={{ transform: flat ? "scaleY(0.32)" : undefined }}>
        {Array.from({ length: count }, (_, i) => (
          <At key={i} x={50} y={50}>
            <span
              className="scene-ripple block rounded-full border-[3px]"
              style={{ width: size, height: size, borderColor: color, animationDelay: `${delay + i * every}s`, animationIterationCount: repeat ? "infinite" : 1, animationDuration: `${every * count}s` }}
            />
          </At>
        ))}
      </div>
    </At>
  )
}

/** Rain, slanting down; `until` stops it (in seconds) so the sky can clear. */
export function Rain({ count = 70, seed = 5, color = "rgba(219,234,254,0.75)", tilt = 12, delay = 0.3, until }: { count?: number; seed?: number; color?: string; tilt?: number; delay?: number; until?: number }) {
  const still = useStill()
  const drops = scatter(count, seed, (r) => ({ x: -10 + r() * 120, length: 4 + r() * 6, speed: 0.5 + r() * 0.4, delay: delay + r() * 0.9 }))
  if (still) return null
  return (
    <div className={`pointer-events-none absolute inset-0 ${until ? "scene-out" : ""}`} style={{ animationDelay: until ? `${until}s` : undefined }}>
      {drops.map((drop, i) => (
        <span
          key={i}
          className="scene-rain absolute top-0 w-[2px] rounded-full"
          style={{ left: `${drop.x}%`, height: `${drop.length}vh`, background: `linear-gradient(180deg, transparent, ${color})`, animationDuration: `${drop.speed}s`, animationDelay: `${drop.delay}s`, "--tilt": `${tilt}deg` } as SceneStyle}
        />
      ))}
    </div>
  )
}

/* ── Things that rise, fall or blow across ───────────────────────────────── */

export interface Drift {
  /** Which way they travel. */
  way: "up" | "down" | "left" | "right"
  count: number
  seed?: number
  /** A point they all leave from (embers from a fire, steam from a pot) instead of an edge. */
  from?: { x: number; y: number; spread?: number }
  /** Across which band of the screen they start, in % (the x band for up/down, y for left/right). */
  band?: Range
  /** How far they travel, in vh (vw for left/right). */
  distance?: Range
  /** Sideways wander as they go, in vw. */
  wander?: number
  size?: Range
  duration?: Range
  delay?: Range
  spin?: number
  opacity?: number
  /** What each one is: given its index and size. */
  render: (index: number, size: number) => ReactNode
}

/** The one mover behind embers, steam, petals, balloons, notes, caps, confetti and leaves. */
export function Particles({ way, count, seed = 9, from, band = [0, 100], distance, wander = 10, size = [14, 30], duration = [2.4, 3.6], delay = [0, 2.2], spin = 0, opacity = 1, render }: Drift) {
  const still = useStill()
  if (still) return null
  const vertical = way === "up" || way === "down"
  const travel = distance ?? (from ? [30, 60] : [100, 120])
  const sign = way === "up" || way === "left" ? -1 : 1
  const bits = scatter(count, seed, (r, i) => ({
    at: between(r, band),
    size: between(r, size),
    go: between(r, travel) * sign,
    side: (r() - 0.5) * 2 * wander,
    duration: between(r, duration),
    delay: between(r, delay),
    spin: (r() > 0.5 ? 1 : -1) * spin * (0.5 + r()),
    jitter: from ? (r() - 0.5) * 2 * (from.spread ?? 6) : 0,
    i,
  }))
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      {bits.map((bit) => {
        const place = from
          ? { left: `${from.x + bit.jitter}%`, top: `${from.y}%` }
          : way === "up"
            ? { left: `${bit.at}%`, top: "104%" }
            : way === "down"
              ? { left: `${bit.at}%`, top: "-8%" }
              : way === "right"
                ? { left: "-8%", top: `${bit.at}%` }
                : { left: "104%", top: `${bit.at}%` }
        const dx = vertical ? `${bit.side}vw` : `${bit.go}vw`
        const dy = vertical ? `${bit.go}vh` : `${bit.side}vh`
        return (
          <span
            key={bit.i}
            className="scene-travel absolute"
            style={
              {
                ...place,
                width: bit.size,
                height: bit.size,
                marginLeft: -bit.size / 2,
                animationDuration: `${bit.duration}s`,
                animationDelay: `${bit.delay}s`,
                animationTimingFunction: way === "down" ? "cubic-bezier(0.4, 0, 0.8, 0.6)" : "cubic-bezier(0.2, 0.6, 0.4, 1)",
                "--dx": dx,
                "--dy": dy,
                "--spin": `${bit.spin}deg`,
                "--o": opacity,
              } as SceneStyle
            }
          >
            {render(bit.i, bit.size)}
          </span>
        )
      })}
    </div>
  )
}

/** Pieces flying out from a point — sparks, shards, a firework's stars. */
export function Burst({ x = 50, y = 50, count = 18, seed = 13, colors, distance = [18, 40], size = [8, 18], delay = 0.4, shape = "spark", duration = 1.4 }: { x?: number; y?: number; count?: number; seed?: number; colors: string[]; distance?: Range; size?: Range; delay?: number; shape?: "spark" | "shard" | "dot"; duration?: number }) {
  const still = useStill()
  if (still) return null
  const pieces = scatter(count, seed, (r, i) => {
    const angle = (i / count) * Math.PI * 2 + r() * 0.4
    const reach = between(r, distance)
    return { dx: `${Math.cos(angle) * reach}vmin`, dy: `${Math.sin(angle) * reach}vmin`, size: between(r, size), spin: `${(r() - 0.5) * 720}deg`, color: colors[i % colors.length], late: r() * 0.12 }
  })
  return (
    <At x={x} y={y} z={2}>
      {pieces.map((piece, i) => (
        <span
          key={i}
          className="scene-shard absolute left-0 top-0 block"
          style={
            {
              width: piece.size,
              height: shape === "shard" ? piece.size * 1.6 : piece.size,
              animationDelay: `${delay + piece.late}s`,
              animationDuration: `${duration}s`,
              "--dx": piece.dx,
              "--dy": piece.dy,
              "--spin": piece.spin,
            } as SceneStyle
          }
        >
          {shape === "spark" ? (
            <Sparkle color={piece.color} />
          ) : shape === "shard" ? (
            <span className="block size-full" style={{ background: piece.color, clipPath: "polygon(50% 0, 100% 40%, 70% 100%, 0 70%)" }} />
          ) : (
            <span className="block size-full rounded-full" style={{ background: piece.color, boxShadow: `0 0 10px ${piece.color}` }} />
          )}
        </span>
      ))}
    </At>
  )
}

/** Fireworks bursting across the upper sky, one after another. */
export function Fireworks({ count = 5, seed = 17, colors, delay = 0.8, every = 0.55, area = { x: [15, 85], y: [22, 52] } }: { count?: number; seed?: number; colors: string[]; delay?: number; every?: number; area?: { x: Range; y: Range } }) {
  const shots = scatter(count, seed, (r, i) => ({ x: between(r, area.x), y: between(r, area.y), color: colors[i % colors.length], at: delay + i * every }))
  return (
    <>
      {shots.map((shot, i) => (
        <Fragment key={i}>
          <Glow x={shot.x} y={shot.y} size="22vmin" color={`${shot.color}aa`} motion="flash" delay={shot.at} />
          <Burst x={shot.x} y={shot.y} count={16} seed={i + 40} colors={[shot.color, "#ffffff", shot.color]} distance={[12, 20]} size={[5, 8]} shape="dot" delay={shot.at} duration={1.3} />
        </Fragment>
      ))}
    </>
  )
}

/* ── Light ───────────────────────────────────────────────────────────────── */

/** A pool of light: breathing, growing to fill the screen, flickering like flame, or a flash. */
export function Glow({ x = 50, y = 50, size = "60vmin", color = "rgba(255,240,200,0.8)", motion = "breathe", delay = 0 }: { x?: number; y?: number; size?: string; color?: string; motion?: "breathe" | "grow" | "flicker" | "flash" | "stay"; delay?: number }) {
  const still = useStill()
  if (still && motion === "flash") return null
  const className = { breathe: "scene-breathe", grow: "scene-grow", flicker: "scene-flicker", flash: "scene-flash", stay: "" }[motion]
  return (
    <At x={x} y={y}>
      <div className={`rounded-full ${moving(still, className)}`} style={{ width: size, height: size, background: `radial-gradient(circle, ${color}, transparent 68%)`, animationDelay: `${delay}s` }} />
    </At>
  )
}

/** Rays of light turning slowly behind something. */
export function Rays({ x = 50, y = 50, color = "rgba(255,236,170,0.45)", size = "150vmax", delay = 0, reach = 45 }: { x?: number; y?: number; color?: string; size?: string; delay?: number; reach?: number }) {
  const still = useStill()
  return (
    <At x={x} y={y}>
      <div className={moving(still, "scene-in")} style={{ animationDelay: `${delay}s` }}>
        <div
          className={moving(still, "scene-spin")}
          style={{
            width: size,
            height: size,
            background: `repeating-conic-gradient(from 0deg, ${color} 0deg 6deg, transparent 6deg 22deg)`,
            maskImage: `radial-gradient(circle, black 0%, transparent ${reach}%)`,
            WebkitMaskImage: `radial-gradient(circle, black 0%, transparent ${reach}%)`,
          }}
        />
      </div>
    </At>
  )
}

/** Rings thrown out from a point — a drumbeat, a voice, a heartbeat — `count` of them, `every` apart. */
export function Pulses({ x = 50, y = 50, count = 6, every = 0.5, delay = 0.6, color = "rgba(255,255,255,0.7)", size = "40vmin", width = 4 }: { x?: number; y?: number; count?: number; every?: number; delay?: number; color?: string; size?: string; width?: number }) {
  const still = useStill()
  if (still) return null
  return (
    <At x={x} y={y}>
      {Array.from({ length: count }, (_, i) => (
        <At key={i} x={50} y={50}>
          <span className="scene-pulse block rounded-full" style={{ width: size, height: size, border: `${width}px solid ${color}`, animationDelay: `${delay + i * every}s` }} />
        </At>
      ))}
    </At>
  )
}

/* ── Drawn lines ─────────────────────────────────────────────────────────── */

export interface Stroke {
  d: string
  color: string
  width?: number
  delay?: number
  duration?: number
  fill?: string
  /** Fill once drawn (fades in after the line). */
  fillAfter?: boolean
  dash?: string
}

/** Lines drawn across the screen as if by hand — roots, roads, cracks, constellations. */
export function Drawn({ strokes, viewBox = "0 0 1000 600", slice = true, glow = false }: { strokes: Stroke[]; viewBox?: string; slice?: boolean; glow?: boolean }) {
  const still = useStill()
  return (
    <svg viewBox={viewBox} preserveAspectRatio={slice ? "xMidYMid slice" : "none"} className="pointer-events-none absolute inset-0 size-full" aria-hidden="true" style={glow ? { filter: "drop-shadow(0 0 8px rgba(255,240,200,0.6))" } : undefined}>
      {strokes.map((stroke, i) => (
        <path
          key={i}
          d={stroke.d}
          stroke={stroke.color}
          strokeWidth={stroke.width ?? 6}
          fill={stroke.fillAfter ? stroke.fill : stroke.fill ?? "none"}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray={stroke.dash}
          pathLength={stroke.dash ? undefined : 1}
          className={stroke.dash ? "" : moving(still, stroke.fillAfter ? "scene-draw-fill" : "scene-draw")}
          style={{ animationDelay: `${stroke.delay ?? 0}s`, animationDuration: `${stroke.duration ?? 1.6}s` }}
        />
      ))}
    </svg>
  )
}

/* ── Life ────────────────────────────────────────────────────────────────── */

/** Birds crossing the sky in a loose flock, wings beating. */
export function Flock({ count = 6, seed = 19, top = 22, color = "#1f2937", delay = 0.6, size = 34, way = "right" }: { count?: number; seed?: number; top?: number; color?: string; delay?: number; size?: number; way?: "right" | "left" }) {
  const still = useStill()
  if (still) return null
  const birds = scatter(count, seed, (r, i) => ({ y: top + (r() - 0.5) * 12, late: delay + i * 0.18 + r() * 0.3, scale: 0.6 + r() * 0.6, flap: 0.35 + r() * 0.25, rise: -4 - r() * 8 }))
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true" style={{ transform: way === "left" ? "scaleX(-1)" : undefined }}>
      {birds.map((bird, i) => (
        <div key={i} className="scene-fly absolute left-0" style={{ top: `${bird.y}%`, animationDelay: `${bird.late}s`, "--rise": `${bird.rise}vh` } as SceneStyle}>
          <svg viewBox="0 0 40 20" width={size * bird.scale} height={(size * bird.scale) / 2} className="overflow-visible">
            <path d="M0 6 Q10 -2 20 8 Q30 -2 40 6" stroke={color} strokeWidth="3" fill="none" strokeLinecap="round" className="scene-flap" style={{ animationDuration: `${bird.flap}s` }} />
          </svg>
        </div>
      ))}
    </div>
  )
}

/** People in silhouette, dancing or seated round a fire. */
export function Figures({ at, color, motion = "dance", height = "26vh", bottom = 14 }: { at: number[]; color: string; motion?: "dance" | "sway" | "stand"; height?: string; bottom?: number }) {
  const still = useStill()
  return (
    <>
      {at.map((x, i) => (
        <div key={x} className="absolute" style={{ left: `${x}%`, bottom: `${bottom}vh`, height, transform: "translateX(-50%)" }}>
          <svg
            viewBox="0 0 60 120"
            className={`h-full overflow-visible ${moving(still, motion === "dance" ? "scene-dance" : motion === "sway" ? "scene-sway" : "")}`}
            style={{ animationDelay: `${(i % 3) * 0.22}s`, animationDuration: `${1.1 + (i % 4) * 0.15}s` }}
            aria-hidden="true"
          >
            <g fill={color}>
              <circle cx="30" cy="14" r="11" />
              <path d="M18 30 C 24 26, 36 26, 42 30 L46 72 L38 72 L36 116 L28 116 L30 74 L24 116 L16 116 L20 72 L14 72 Z" />
              <path d={i % 2 ? "M18 32 L4 8 L9 5 L24 30 Z M42 32 L56 54 L51 58 L38 36 Z" : "M18 32 L2 50 L6 55 L24 38 Z M42 32 L54 6 L59 9 L46 36 Z"} />
            </g>
          </svg>
        </div>
      ))}
    </>
  )
}

/** Bare footprints appearing one after another along a path. */
export function Footsteps({ delay = 0.3, every = 0.16, color = "rgba(255,255,255,0.75)", count = 14, y = 74 }: { delay?: number; every?: number; color?: string; count?: number; y?: number }) {
  const still = useStill()
  return (
    <>
      {Array.from({ length: count }, (_, i) => {
        const x = 6 + (i / (count - 1)) * 88
        const top = y + Math.sin(i * 0.6) * 3 + (i % 2 ? 2.4 : -2.4)
        return (
          <svg
            key={i}
            viewBox="0 0 20 34"
            className={`absolute w-[3.4vmin] ${moving(still, "scene-pop")}`}
            style={{ left: `${x}%`, top: `${top}%`, transform: `rotate(${90 + (i % 2 ? 8 : -8)}deg) scaleX(${i % 2 ? -1 : 1})`, animationDelay: `${delay + i * every}s` }}
            aria-hidden="true"
          >
            <g fill={color}>
              <ellipse cx="10" cy="22" rx="6.5" ry="10" />
              {[[4, 6, 2.4], [8.4, 3.4, 2.2], [12.6, 3.6, 2], [16, 6, 1.8]].map(([cx, cy, r]) => (
                <circle key={cx} cx={cx} cy={cy} r={r} />
              ))}
            </g>
          </svg>
        )
      })}
    </>
  )
}

/** Paint flung onto the screen in blobs. */
export function Splats({ colors, count = 9, seed = 23, delay = 0.3, every = 0.18 }: { colors: string[]; count?: number; seed?: number; delay?: number; every?: number }) {
  const still = useStill()
  const blobs = scatter(count, seed, (r, i) => ({ x: 6 + r() * 88, y: 14 + r() * 72, size: 14 + r() * 18, spin: `${r() * 360}deg`, color: colors[i % colors.length] }))
  return (
    <>
      {blobs.map((blob, i) => (
        <svg
          key={i}
          viewBox="0 0 100 100"
          className={`absolute ${moving(still, "scene-splat")}`}
          style={{ left: `${blob.x}%`, top: `${blob.y}%`, width: `${blob.size}vmin`, marginLeft: `-${blob.size / 2}vmin`, marginTop: `-${blob.size / 2}vmin`, animationDelay: `${delay + i * every}s`, "--spin": blob.spin } as SceneStyle}
          aria-hidden="true"
        >
          <path d="M50 8 C 64 10, 70 24, 84 22 C 96 26, 92 44, 88 52 C 96 66, 86 80, 72 82 C 64 94, 44 96, 36 86 C 22 90, 8 80, 12 66 C 2 56, 6 38, 18 34 C 18 18, 36 6, 50 8 Z" fill={blob.color} />
          <circle cx="92" cy="12" r="5" fill={blob.color} />
          <circle cx="8" cy="90" r="4" fill={blob.color} />
        </svg>
      ))}
    </>
  )
}

/**
 * A woven cloth across the whole screen or a band of it, its stripes sliding — kente's
 * blocks of colour in the spirit of a printed cloth.
 */
export function Weave({ colors, opacity = 0.35, top = 0, height = 100 }: { colors: string[]; opacity?: number; top?: number; height?: number }) {
  const still = useStill()
  const stops = colors.flatMap((color, i) => [`${color} ${i * 14}px`, `${color} ${(i + 1) * 14}px`]).join(", ")
  const span = colors.length * 14
  return (
    <div
      className={`absolute inset-x-0 ${moving(still, "scene-weave")}`}
      style={{
        top: `${top}%`,
        height: `${height}%`,
        opacity,
        backgroundImage: `repeating-linear-gradient(90deg, ${stops}), repeating-linear-gradient(0deg, rgba(0,0,0,0.25) 0 6px, transparent 6px ${span}px)`,
        backgroundBlendMode: "multiply",
        "--weave": `${span * 2}px`,
      } as SceneStyle}
    />
  )
}

/* ── Words ───────────────────────────────────────────────────────────────── */

/** A line of words across the lower screen — "Happy Birthday", "Victory". */
export function Words({ text, delay = 1.8, y = 80, className = "font-serif italic", color = "#fff7d6" }: { text: string; delay?: number; y?: number; className?: string; color?: string }) {
  const still = useStill()
  return (
    <p
      className={`pointer-events-none absolute inset-x-4 z-[5] text-center text-4xl font-bold drop-shadow-[0_4px_16px_rgba(0,0,0,0.55)] sm:text-6xl ${className} ${moving(still, "scene-words")}`}
      style={{ top: `${y}%`, color, animationDelay: `${delay}s` }}
    >
      {text}
    </p>
  )
}

/* ── Shapes the movers carry ─────────────────────────────────────────────── */

export function Sparkle({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 20 20" className="block size-full" aria-hidden="true">
      <path d="M10 0 L12.2 7.8 L20 10 L12.2 12.2 L10 20 L7.8 12.2 L0 10 L7.8 7.8 Z" fill={color} />
    </svg>
  )
}

export function Ember({ color = "#fdba74" }: { color?: string }) {
  return <span className="block size-full rounded-full" style={{ background: `radial-gradient(circle, #fffbeb, ${color} 45%, transparent 72%)` }} />
}

export function Orb({ color }: { color: string }) {
  return <span className="block size-full rounded-full blur-[1px]" style={{ background: `radial-gradient(circle, #ffffff, ${color} 55%, transparent 72%)` }} />
}

export function Steam() {
  return <span className="block h-[220%] w-full -translate-y-1/2 rounded-full bg-white/45 blur-md" />
}

export function Bubble({ color = "rgba(255,255,255,0.8)" }: { color?: string }) {
  return <span className="block size-full rounded-full border-2" style={{ borderColor: color, background: "radial-gradient(circle at 35% 30%, rgba(255,255,255,0.7), transparent 45%)" }} />
}

export function Petal({ color }: { color: string }) {
  return <span className="block h-[70%] w-full rounded-[60%_8%_60%_8%]" style={{ background: `linear-gradient(135deg, #ffffff88, ${color})` }} />
}

export function LeafShape({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 20 20" className="block size-full" aria-hidden="true">
      <path d="M2 18 C 2 8, 8 2, 18 2 C 18 12, 12 18, 2 18 Z" fill={color} />
      <path d="M2 18 L14 6" stroke="rgba(0,0,0,0.25)" strokeWidth="1.2" />
    </svg>
  )
}

export function Confetto({ color }: { color: string }) {
  return <span className="block h-[45%] w-full rounded-[2px]" style={{ background: color }} />
}

export function HeartShape({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 24 22" className="block size-full drop-shadow-[0_2px_6px_rgba(0,0,0,0.25)]" aria-hidden="true">
      <path d="M12 21 C 2 13, 0 8, 3 4 C 6 0, 10 1, 12 5 C 14 1, 18 0, 21 4 C 24 8, 22 13, 12 21 Z" fill={color} />
      <ellipse cx="7" cy="7" rx="2.4" ry="1.4" fill="#ffffff" opacity="0.5" transform="rotate(-30 7 7)" />
    </svg>
  )
}

export function Note({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 24 24" className="block size-full drop-shadow-[0_2px_6px_rgba(0,0,0,0.3)]" aria-hidden="true">
      <path d="M9 18 V5 L20 3 V16" stroke={color} strokeWidth="2.4" fill="none" strokeLinejoin="round" />
      <ellipse cx="6.5" cy="18" rx="3.5" ry="2.8" fill={color} />
      <ellipse cx="17.5" cy="16" rx="3.5" ry="2.8" fill={color} />
    </svg>
  )
}

export function Balloon({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 30 60" className="block h-[200%] w-full overflow-visible" aria-hidden="true">
      <path d="M15 36 C 14 44, 18 48, 14 60" stroke="rgba(255,255,255,0.7)" strokeWidth="1" fill="none" />
      <ellipse cx="15" cy="17" rx="13" ry="16" fill={color} />
      <path d="M12 33 L18 33 L15 37 Z" fill={color} />
      <ellipse cx="10" cy="10" rx="3.5" ry="5.5" fill="#ffffff" opacity="0.45" transform="rotate(-20 10 10)" />
    </svg>
  )
}

/** A graduate's cap, thrown. */
export function Cap({ color = "#111827" }: { color?: string }) {
  return (
    <svg viewBox="0 0 40 30" className="block size-full overflow-visible" aria-hidden="true">
      <path d="M20 2 L40 10 L20 18 L0 10 Z" fill={color} />
      <path d="M8 13 L8 21 C 14 26, 26 26, 32 21 L32 13 L20 18 Z" fill={color} opacity="0.85" />
      <path d="M33 11 L33 22" stroke="#fbbf24" strokeWidth="1.8" />
      <circle cx="33" cy="23" r="2" fill="#fbbf24" />
    </svg>
  )
}

export function Spice({ color }: { color: string }) {
  return <span className="block size-[45%] rounded-full" style={{ background: color, boxShadow: `0 0 4px ${color}` }} />
}

export function Fruit({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 20 22" className="block size-full drop-shadow-[0_3px_4px_rgba(0,0,0,0.3)]" aria-hidden="true">
      <circle cx="10" cy="12" r="9" fill={color} />
      <path d="M10 4 C 10 2, 11 1, 12 0" stroke="#4a2c0a" strokeWidth="1.4" fill="none" />
      <path d="M11 3 C 14 0, 17 2, 17 3 C 14 4, 12 4, 11 3 Z" fill="#22c55e" />
      <ellipse cx="6.5" cy="9" rx="2.4" ry="3" fill="#ffffff" opacity="0.45" />
    </svg>
  )
}

/* ── The treasure itself ─────────────────────────────────────────────────── */

export type HeroEntrance = "rise" | "drop" | "grow" | "spin" | "swing" | "fly" | "burst" | "float-in"
export type HeroIdle = "none" | "bob" | "beat" | "sway" | "glow"

export interface HeroSpec {
  entrance?: HeroEntrance
  idle?: HeroIdle
  /** Where it sits, in % of the screen. */
  x?: number
  y?: number
  size?: number
  delay?: number
  /** The light behind it. */
  halo?: string
}

/** The treasure, large: arriving the way its scene asks, then living there until the end. */
export function Hero({ gift, entrance = "rise", idle = "bob", x = 50, y = 54, size = 176, delay = 0.3, halo = "rgba(255,247,214,0.85)" }: HeroSpec & { gift: GiftLike }) {
  const still = useStill()
  return (
    <At x={x} y={y} z={3}>
      <div className={moving(still, `scene-hero-${entrance}`)} style={{ animationDelay: `${delay}s` }}>
        <div className={moving(still, idle === "none" ? "" : `scene-idle-${idle}`)} style={{ animationDelay: `${delay + 1.6}s` }}>
          <At x={50} y={50}>
            <div className={`rounded-full ${moving(still, "treasure-halo")}`} style={{ width: size * 1.9, height: size * 1.9, background: `radial-gradient(circle, ${halo}, transparent 66%)` }} />
          </At>
          <GiftIcon gift={gift} size={size} className="relative" />
        </div>
      </div>
    </At>
  )
}
