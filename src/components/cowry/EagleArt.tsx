import { useId } from "react"
import { cn } from "@/lib/utils"

/**
 * A golden eagle, drawn in the same hand-shaded 3D as the cowry: a gloss highlight, gold
 * that deepens toward the edges, and a strong silhouette so it still reads at icon size.
 *
 * Seen from the side, flying right. With `flapping`, the near wing beats and the far wing
 * follows a half-beat behind (see .eagle-wing-* in index.css), for the Golden Eagle's
 * full-screen flight. Still, it is the gift's icon everywhere else.
 */
export function EagleArt({
  size = 24,
  flapping = false,
  className,
}: {
  /** Width in pixels; height follows the drawing's proportions. */
  size?: number
  flapping?: boolean
  className?: string
}) {
  const id = useId().replace(/:/g, "")
  const body = `eagle-body-${id}`
  const wing = `eagle-wing-${id}`
  const farWing = `eagle-far-${id}`
  const head = `eagle-head-${id}`
  const beak = `eagle-beak-${id}`

  return (
    <svg
      viewBox="0 0 200 130"
      width={size}
      height={(size * 130) / 200}
      className={cn("inline-block shrink-0 overflow-visible", className)}
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <radialGradient id={body} cx="45%" cy="30%" r="80%">
          <stop offset="0%" stopColor="#fff4cf" />
          <stop offset="28%" stopColor="#f3c969" />
          <stop offset="70%" stopColor="#c8963e" />
          <stop offset="100%" stopColor="#6b4410" />
        </radialGradient>
        <linearGradient id={wing} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#8a5a1c" />
          <stop offset="45%" stopColor="#e0b04e" />
          <stop offset="100%" stopColor="#fbe3a0" />
        </linearGradient>
        <linearGradient id={farWing} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#4a2e0a" />
          <stop offset="100%" stopColor="#a8793f" />
        </linearGradient>
        <radialGradient id={head} cx="40%" cy="30%" r="75%">
          <stop offset="0%" stopColor="#fffaf0" />
          <stop offset="45%" stopColor="#f6e2a8" />
          <stop offset="100%" stopColor="#c8963e" />
        </radialGradient>
        <linearGradient id={beak} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#ffe08a" />
          <stop offset="100%" stopColor="#e89a1c" />
        </linearGradient>
      </defs>

      {/* Far wing, behind the body, darker — gives the bird its depth. */}
      <g className={flapping ? "eagle-wing-far" : undefined}>
        <path
          d="M104 58 C 92 34, 70 16, 38 10 C 50 20, 56 26, 60 32 C 50 30, 40 32, 32 36 C 50 42, 64 46, 76 54 Z"
          fill={`url(#${farWing})`}
          stroke="#4a2e0a"
          strokeWidth="1.2"
          strokeLinejoin="round"
        />
      </g>

      {/* Tail fan. */}
      <path
        d="M62 70 L 22 70 L 30 78 L 20 86 L 34 88 L 30 96 L 66 80 Z"
        fill={`url(#${wing})`}
        stroke="#6b4410"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />

      {/* Body. */}
      <path
        d="M58 66 C 70 50, 118 44, 142 54 C 154 60, 150 74, 134 78 C 112 84, 78 82, 58 74 Z"
        fill={`url(#${body})`}
        stroke="#6b4410"
        strokeWidth="1.4"
      />
      {/* Talons, tucked. */}
      <path d="M104 80 l -4 10 m 4 -10 l 2 10 m 6 -11 l -2 10 m 2 -10 l 4 9" stroke="#e89a1c" strokeWidth="2.4" strokeLinecap="round" />

      {/* Head and hooked beak. */}
      <circle cx="150" cy="50" r="15" fill={`url(#${head})`} stroke="#8a5a1c" strokeWidth="1.3" />
      <path d="M161 44 C 176 43, 184 51, 178 61 C 175 56, 170 54, 162 56 Z" fill={`url(#${beak})`} stroke="#a8641a" strokeWidth="1.2" strokeLinejoin="round" />
      <path d="M178 61 C 177 57, 175 55, 172 54" stroke="#6b3a0a" strokeWidth="1.4" fill="none" strokeLinecap="round" />
      <circle cx="155" cy="47" r="2.8" fill="#2a1a05" />
      <circle cx="156" cy="46" r="0.9" fill="#ffffff" />

      {/* Near wing, in front — the one that beats. */}
      <g className={flapping ? "eagle-wing-near" : undefined}>
        <path
          d="M104 60 C 90 32, 62 10, 18 6 C 36 16, 46 22, 52 28 C 40 28, 30 32, 22 38 C 40 40, 52 42, 62 48 C 52 50, 44 54, 40 60 C 62 60, 84 62, 104 66 Z"
          fill={`url(#${wing})`}
          stroke="#6b4410"
          strokeWidth="1.4"
          strokeLinejoin="round"
        />
        {/* Feather lines. */}
        <path d="M52 28 C 66 34, 80 42, 92 52 M62 48 C 74 52, 86 56, 98 60 M36 16 C 58 24, 76 36, 90 46" stroke="#8a5a1c" strokeWidth="1" fill="none" opacity="0.55" />
      </g>

      {/* Gloss, as on the cowry. */}
      <ellipse cx="100" cy="56" rx="22" ry="5" fill="#ffffff" opacity="0.45" transform="rotate(-8 100 56)" />
      <ellipse cx="145" cy="43" rx="5" ry="3" fill="#ffffff" opacity="0.7" transform="rotate(-25 145 43)" />
    </svg>
  )
}
