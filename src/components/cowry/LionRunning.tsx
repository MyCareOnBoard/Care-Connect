import { useId, type CSSProperties } from "react"
import { cn } from "@/lib/utils"

/**
 * The Golden Lion at full gallop, seen from the side and running right — for its
 * full-screen arrival. Drawn in the same shaded gold as the icon (LionArt), crown and all.
 *
 * Each leg swings from its shoulder or hip (.lion-leg in index.css), far legs half a stride
 * behind the near ones; the tail streams and the mouth opens for the roar (.lion-mouth).
 */

/** A spiky ring of tufts — the mane — around (cx, cy). */
function maneAround(cx: number, cy: number, outer: number, inner: number, tufts = 16) {
  const points: string[] = []
  for (let i = 0; i < tufts * 2; i++) {
    const angle = (i / (tufts * 2)) * Math.PI * 2
    const radius = i % 2 === 0 ? outer : inner
    points.push(`${(cx + Math.cos(angle) * radius).toFixed(1)},${(cy + Math.sin(angle) * radius).toFixed(1)}`)
  }
  return `M${points.join(" L")} Z`
}

const MANE = maneAround(176, 52, 38, 29)

/** One leg hanging from (x, y): a thigh, a shin and a paw. */
function Leg({
  x,
  y,
  fill,
  stroke,
  delay,
  back = false,
}: {
  x: number
  y: number
  fill: string
  stroke: string
  delay: string
  back?: boolean
}) {
  return (
    <g className="lion-leg" style={{ transformOrigin: `${x}px ${y}px`, animationDelay: delay } as CSSProperties}>
      <ellipse cx={x} cy={y + 8} rx={back ? 15 : 11} ry={back ? 18 : 14} fill={fill} stroke={stroke} strokeWidth="1.2" />
      <rect x={x - 6.5} y={y + 10} width="13" height="40" rx="6.5" fill={fill} stroke={stroke} strokeWidth="1.2" />
      <ellipse cx={x + 4} cy={y + 50} rx="10" ry="5" fill={fill} stroke={stroke} strokeWidth="1.2" />
    </g>
  )
}

export function LionRunning({ width = 480, still = false, className }: { width?: number; still?: boolean; className?: string }) {
  const id = useId().replace(/:/g, "")
  const coat = `lr-coat-${id}`
  const far = `lr-far-${id}`
  const mane = `lr-mane-${id}`
  const face = `lr-face-${id}`
  const gold = `lr-gold-${id}`

  return (
    <svg
      viewBox="0 0 240 140"
      width={width}
      height={(width * 140) / 240}
      className={cn("overflow-visible", still ? undefined : "lion-gallop", className)}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={coat} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffe3a1" />
          <stop offset="45%" stopColor="#e9b04f" />
          <stop offset="100%" stopColor="#a8661f" />
        </linearGradient>
        <linearGradient id={far} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#c48a37" />
          <stop offset="100%" stopColor="#6e3f12" />
        </linearGradient>
        <radialGradient id={mane} cx="55%" cy="40%" r="65%">
          <stop offset="0%" stopColor="#f2b54a" />
          <stop offset="55%" stopColor="#c46f1c" />
          <stop offset="100%" stopColor="#5e2f0b" />
        </radialGradient>
        <radialGradient id={face} cx="45%" cy="30%" r="75%">
          <stop offset="0%" stopColor="#fff1c9" />
          <stop offset="35%" stopColor="#f6cf7a" />
          <stop offset="100%" stopColor="#b97a2c" />
        </radialGradient>
        <linearGradient id={gold} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#fff4cf" />
          <stop offset="40%" stopColor="#f3c969" />
          <stop offset="100%" stopColor="#8a5a14" />
        </linearGradient>
      </defs>

      {/* Tail, streaming behind, with its dark tuft. */}
      <g className={still ? undefined : "lion-tail"} style={{ transformOrigin: "56px 58px" } as CSSProperties}>
        <path d="M58 58 C 40 50, 30 34, 12 32" stroke={`url(#${coat})`} strokeWidth="6" fill="none" strokeLinecap="round" />
        <ellipse cx="10" cy="31" rx="8" ry="6" fill="#6b3a0e" />
      </g>

      {/* Far legs, darker, half a stride behind. */}
      <Leg x={72} y={70} fill={`url(#${far})`} stroke="#4a2a0a" delay="-0.24s" back />
      <Leg x={156} y={72} fill={`url(#${far})`} stroke="#4a2a0a" delay="-0.36s" />

      {/* Body. */}
      <path
        d="M54 64 C 54 44, 86 38, 120 40 C 146 41, 168 46, 172 62 C 174 80, 150 90, 118 90 C 86 90, 54 86, 54 64 Z"
        fill={`url(#${coat})`}
        stroke="#7a4410"
        strokeWidth="1.4"
      />
      <path d="M80 86 C 100 92, 140 92, 160 82" stroke="#fff1c9" strokeWidth="4" fill="none" opacity="0.45" strokeLinecap="round" />

      {/* Near legs. */}
      <Leg x={80} y={74} fill={`url(#${coat})`} stroke="#7a4410" delay="0s" back />
      <Leg x={164} y={76} fill={`url(#${coat})`} stroke="#7a4410" delay="-0.12s" />

      {/* Mane, head and face. */}
      <path d={MANE} fill={`url(#${mane})`} stroke="#5e2f0b" strokeWidth="1.2" strokeLinejoin="round" />
      <circle cx="176" cy="30" r="7" fill={`url(#${face})`} stroke="#7a4410" strokeWidth="1" />
      <ellipse cx="192" cy="56" rx="21" ry="19" fill={`url(#${face})`} stroke="#7a4410" strokeWidth="1.1" />
      <path d="M190 44 Q197 40 203 44" stroke="#6b3a0e" strokeWidth="2" fill="none" strokeLinecap="round" />
      <ellipse cx="198" cy="49" rx="3.2" ry="2.8" fill="#2a1505" />
      <circle cx="199" cy="48" r="0.9" fill="#ffffff" />
      <ellipse cx="207" cy="63" rx="12" ry="8" fill="#fff3d6" />
      <path d="M212 55 Q219 55 219 60 Q215 63 211 61 Z" fill="#4a230a" />

      {/* The mouth: open wide with fangs for the roar. */}
      <g className={still ? undefined : "lion-mouth"}>
        <path d="M200 68 Q210 64 220 66 Q216 80 204 78 Z" fill="#5a0f0f" />
        <path d="M209 66 L211 71 L213 66 Z M205 77 L207 72 L209 77 Z" fill="#ffffff" />
      </g>
      <path d="M198 68 Q208 71 219 66" stroke="#4a230a" strokeWidth="1.4" fill="none" strokeLinecap="round" />

      {/* The crown. */}
      <path d="M180 26 L180 12 L188 19 L195 8 L202 19 L210 12 L210 26 Z" fill={`url(#${gold})`} stroke="#6b4410" strokeWidth="1.3" strokeLinejoin="round" />
      <rect x="179" y="24" width="32" height="5" rx="1.5" fill={`url(#${gold})`} stroke="#6b4410" strokeWidth="1.1" />
      <circle cx="195" cy="16" r="2.3" fill="#dc2626" stroke="#7f1d1d" strokeWidth="0.5" />
      <ellipse cx="185" cy="16" rx="2.5" ry="1.2" fill="#ffffff" opacity="0.6" transform="rotate(-30 185 16)" />

      {/* Gloss along the back. */}
      <ellipse cx="112" cy="48" rx="34" ry="5" fill="#ffffff" opacity="0.35" />
    </svg>
  )
}
