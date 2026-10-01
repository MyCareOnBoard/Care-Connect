import { useId } from "react"
import { cn } from "@/lib/utils"

/**
 * The Golden Lion, drawn in the same hand-shaded 3D as the cowry: a full mane deepening from
 * amber to brown, a golden face with a cream muzzle, and a gold crown on top.
 *
 * Seen face on. With `roaring`, the mouth opens wide in time with the roar of its
 * full-screen arrival (see .lion-mouth in index.css). Closed, it is the gift's icon.
 */

/** The mane's outline: spiky tufts all round, as a single closed path. */
const MANE = (() => {
  const points: string[] = []
  const tufts = 18
  for (let i = 0; i < tufts * 2; i++) {
    const angle = (i / (tufts * 2)) * Math.PI * 2 - Math.PI / 2
    const radius = i % 2 === 0 ? 46 : 37
    points.push(`${(50 + Math.cos(angle) * radius).toFixed(1)},${(56 + Math.sin(angle) * radius).toFixed(1)}`)
  }
  return `M${points.join(" L")} Z`
})()

export function LionArt({ size = 24, roaring = false, className }: { size?: number; roaring?: boolean; className?: string }) {
  const id = useId().replace(/:/g, "")
  const mane = `lion-mane-${id}`
  const face = `lion-face-${id}`
  const gold = `lion-gold-${id}`

  return (
    <svg viewBox="0 0 100 104" width={size} height={size * 1.04} className={cn("overflow-visible", className)} aria-hidden="true">
      <defs>
        <radialGradient id={mane} cx="45%" cy="40%" r="65%">
          <stop offset="0%" stopColor="#f2b54a" />
          <stop offset="55%" stopColor="#c46f1c" />
          <stop offset="100%" stopColor="#5e2f0b" />
        </radialGradient>
        <radialGradient id={face} cx="40%" cy="32%" r="75%">
          <stop offset="0%" stopColor="#fff1c9" />
          <stop offset="30%" stopColor="#f6cf7a" />
          <stop offset="75%" stopColor="#d99a3c" />
          <stop offset="100%" stopColor="#9a5d1c" />
        </radialGradient>
        <linearGradient id={gold} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#fff4cf" />
          <stop offset="40%" stopColor="#f3c969" />
          <stop offset="100%" stopColor="#8a5a14" />
        </linearGradient>
      </defs>

      {/* Mane. */}
      <path d={MANE} fill={`url(#${mane})`} stroke="#5e2f0b" strokeWidth="1.2" strokeLinejoin="round" />
      <circle cx="50" cy="58" r="31" fill="#8a4512" opacity="0.55" />

      {/* Ears. */}
      <circle cx="31" cy="38" r="7.5" fill={`url(#${face})`} stroke="#7a4410" strokeWidth="1" />
      <circle cx="69" cy="38" r="7.5" fill={`url(#${face})`} stroke="#7a4410" strokeWidth="1" />
      <circle cx="31" cy="38" r="3.5" fill="#9a5d1c" />
      <circle cx="69" cy="38" r="3.5" fill="#9a5d1c" />

      {/* Face. */}
      <ellipse cx="50" cy="60" rx="24" ry="26" fill={`url(#${face})`} stroke="#7a4410" strokeWidth="1" />

      {/* Brows and eyes. */}
      <path d="M36 49 Q42 45 46 49 M54 49 Q58 45 64 49" stroke="#6b3a0e" strokeWidth="2" fill="none" strokeLinecap="round" />
      <ellipse cx="42" cy="54" rx="3.4" ry="3" fill="#2a1505" />
      <ellipse cx="58" cy="54" rx="3.4" ry="3" fill="#2a1505" />
      <circle cx="43" cy="53" r="1" fill="#ffffff" />
      <circle cx="59" cy="53" r="1" fill="#ffffff" />

      {/* Muzzle, nose and whisker spots. */}
      <ellipse cx="50" cy="72" rx="14" ry="10" fill="#fff3d6" />
      <path d="M44.5 64 Q50 61 55.5 64 Q53 69.5 50 70.5 Q47 69.5 44.5 64 Z" fill="#4a230a" />
      <path d="M50 70.5 L50 74" stroke="#4a230a" strokeWidth="1.4" />
      {[41, 44, 56, 59].map((x) => (
        <circle key={x} cx={x} cy="72" r="0.9" fill="#a0703a" />
      ))}

      {/* The mouth: a smile closed, wide with fangs when it roars. */}
      {roaring ? (
        <g className="lion-mouth">
          <ellipse cx="50" cy="80" rx="9" ry="7" fill="#5a0f0f" />
          <ellipse cx="50" cy="84" rx="5" ry="2.5" fill="#d9485a" />
          <path d="M43.5 76 L45.5 81 L47 76 Z M53 76 L54.5 81 L56.5 76 Z" fill="#ffffff" />
        </g>
      ) : (
        <path d="M44 75 Q47 78 50 74.5 Q53 78 56 75" stroke="#4a230a" strokeWidth="1.4" fill="none" strokeLinecap="round" />
      )}

      {/* The crown. */}
      <path d="M31 24 L31 9 L40.5 17 L50 4 L59.5 17 L69 9 L69 24 Z" fill={`url(#${gold})`} stroke="#6b4410" strokeWidth="1.4" strokeLinejoin="round" />
      <rect x="30" y="22" width="40" height="5" rx="1.5" fill={`url(#${gold})`} stroke="#6b4410" strokeWidth="1.2" />
      <circle cx="50" cy="14" r="2.6" fill="#dc2626" stroke="#7f1d1d" strokeWidth="0.6" />
      <circle cx="40" cy="20" r="1.8" fill="#2563eb" />
      <circle cx="60" cy="20" r="1.8" fill="#16a34a" />
      <ellipse cx="38" cy="15" rx="3" ry="1.4" fill="#ffffff" opacity="0.6" transform="rotate(-30 38 15)" />
    </svg>
  )
}
