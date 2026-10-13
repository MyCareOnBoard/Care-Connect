import { useId } from "react"
import { cn } from "@/lib/utils"
import { drawIllustration } from "@/components/cowry/treasureIllustrations"
import { isIllustration, type IllustrationKind } from "@/components/cowry/treasureIllustrationKinds"

/**
 * The Premium Treasures, drawn rather than taken from the icon set, in the same hand-shaded
 * 3D as the cowry, the eagle and the lion: a highlight where the light falls, gold that
 * deepens toward the edges, and a strong silhouette so each still reads at icon size.
 *
 * All six are gold — the Premium tier's colour, as Legendary's was.
 */

/** The six Premium pieces, in gold. */
type PremiumKind =
  | "golden-journey"
  | "54-horizons"
  | "legacy-tree"
  | "time-capsule"
  | "golden-memory"
  | "timeless-treasure"

/** Every drawn Treasure: Premium in gold here, the rest in treasureIllustrations.tsx. */
export type TreasureArtKind = PremiumKind | IllustrationKind

/** The shared gold, so every Premium piece is cut from the same metal. */
function Golds({ id }: { id: string }) {
  return (
    <defs>
      <linearGradient id={`${id}-gold`} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#fff7d6" />
        <stop offset="30%" stopColor="#f3c969" />
        <stop offset="65%" stopColor="#c8963e" />
        <stop offset="100%" stopColor="#6b4410" />
      </linearGradient>
      <radialGradient id={`${id}-shine`} cx="35%" cy="28%" r="75%">
        <stop offset="0%" stopColor="#fffbea" />
        <stop offset="35%" stopColor="#f6d27a" />
        <stop offset="75%" stopColor="#c8963e" />
        <stop offset="100%" stopColor="#7a5310" />
      </radialGradient>
      <linearGradient id={`${id}-deep`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#c8963e" />
        <stop offset="100%" stopColor="#5a3b0c" />
      </linearGradient>
    </defs>
  )
}

const STROKE = "#5a3b0c"

/** A golden compass: the needle pointing the way, the dial marked at the four quarters. */
function Journey({ id }: { id: string }) {
  return (
    <>
      <circle cx="50" cy="52" r="40" fill={`url(#${id}-deep)`} />
      <circle cx="50" cy="50" r="40" fill={`url(#${id}-shine)`} stroke={STROKE} strokeWidth="2" />
      <circle cx="50" cy="50" r="31" fill="#fff4d6" stroke="#c8963e" strokeWidth="2.5" />
      {[0, 90, 180, 270].map((angle) => (
        <rect key={angle} x="48.5" y="21" width="3" height="7" rx="1" fill="#7a5310" transform={`rotate(${angle} 50 50)`} />
      ))}
      {[45, 135, 225, 315].map((angle) => (
        <rect key={angle} x="49" y="22" width="2" height="4" rx="1" fill="#c8963e" transform={`rotate(${angle} 50 50)`} />
      ))}
      {/* The needle: north in red, south in gold. */}
      <g transform="rotate(32 50 50)">
        <path d="M50 24 L56 50 L44 50 Z" fill="#dc2626" stroke="#7f1d1d" strokeWidth="1" />
        <path d="M50 76 L56 50 L44 50 Z" fill={`url(#${id}-gold)`} stroke={STROKE} strokeWidth="1" />
      </g>
      <circle cx="50" cy="50" r="4.5" fill={`url(#${id}-gold)`} stroke={STROKE} strokeWidth="1.2" />
      <rect x="45" y="4" width="10" height="8" rx="3" fill={`url(#${id}-gold)`} stroke={STROKE} strokeWidth="1.5" />
      <ellipse cx="36" cy="28" rx="10" ry="4" fill="#ffffff" opacity="0.55" transform="rotate(-30 36 28)" />
    </>
  )
}

/** A golden globe turned to Africa, with a band of horizon light round it. */
function Horizons({ id }: { id: string }) {
  return (
    <>
      <circle cx="50" cy="52" r="40" fill={`url(#${id}-deep)`} />
      <circle cx="50" cy="50" r="40" fill={`url(#${id}-shine)`} stroke={STROKE} strokeWidth="2" />
      {/* Africa, simplified to read at icon size. */}
      <path
        d="M38 22 C 46 18, 56 20, 62 24 C 66 27, 70 30, 72 36 C 70 40, 66 42, 64 46 C 66 52, 66 58, 62 64 C 58 70, 56 76, 52 80 C 48 78, 47 72, 46 66 C 45 60, 42 56, 38 54 C 32 52, 27 48, 26 42 C 25 36, 30 30, 34 26 Z"
        fill="#7a5310"
        opacity="0.85"
      />
      <path d="M70 64 C 72 62, 74 64, 73 68 C 72 71, 69 70, 70 64 Z" fill="#7a5310" opacity="0.85" />
      {/* Lines of latitude and the meridian. */}
      <ellipse cx="50" cy="50" rx="40" ry="14" fill="none" stroke="#fff4d6" strokeWidth="1" opacity="0.5" />
      <ellipse cx="50" cy="50" rx="16" ry="40" fill="none" stroke="#fff4d6" strokeWidth="1" opacity="0.5" />
      {/* The horizon, glowing across it. */}
      <path d="M10 56 Q 50 66 90 56" fill="none" stroke="#fff7d6" strokeWidth="3" strokeLinecap="round" opacity="0.8" />
      <ellipse cx="34" cy="26" rx="11" ry="5" fill="#ffffff" opacity="0.55" transform="rotate(-30 34 26)" />
    </>
  )
}

/** A golden tree: a broad crown on a strong trunk, its roots spreading into the ground. */
function LegacyTree({ id }: { id: string }) {
  return (
    <>
      <ellipse cx="50" cy="90" rx="30" ry="5" fill="#5a3b0c" opacity="0.25" />
      {/* Roots. */}
      <path d="M44 74 C 38 82, 30 86, 22 88 M56 74 C 62 82, 70 86, 78 88 M50 76 L50 90" stroke={`url(#${id}-deep)`} strokeWidth="5" strokeLinecap="round" fill="none" />
      {/* Trunk. */}
      <path d="M43 78 C 45 64, 44 54, 40 46 L60 46 C 56 54, 55 64, 57 78 Z" fill={`url(#${id}-deep)`} stroke={STROKE} strokeWidth="1.5" />
      <path d="M48 70 C 49 62, 48 56, 46 50" stroke="#f3c969" strokeWidth="1.5" fill="none" opacity="0.6" />
      {/* The crown: overlapping rounds of gold leaves. */}
      {[
        [30, 38, 16], [50, 28, 20], [70, 38, 16], [40, 46, 14], [60, 46, 14],
      ].map(([cx, cy, r], i) => (
        <circle key={i} cx={cx} cy={cy} r={r} fill={`url(#${id}-shine)`} stroke={STROKE} strokeWidth="1.5" />
      ))}
      <ellipse cx="42" cy="20" rx="9" ry="4" fill="#ffffff" opacity="0.55" transform="rotate(-20 42 20)" />
    </>
  )
}

/** A golden hourglass, sand running, kept for a time to come. */
function TimeCapsule({ id }: { id: string }) {
  return (
    <>
      {/* Glass. */}
      <path d="M30 18 C 30 38, 46 44, 46 50 C 46 56, 30 62, 30 82 L70 82 C 70 62, 54 56, 54 50 C 54 44, 70 38, 70 18 Z" fill="#fff7e0" opacity="0.75" stroke="#c8963e" strokeWidth="1.5" />
      {/* Sand: what is left above, the stream, the heap below. */}
      <path d="M36 30 C 40 38, 47 42, 48 48 L52 48 C 53 42, 60 38, 64 30 Z" fill="#e0a93a" />
      <path d="M49.2 48 L50.8 48 L50.8 72 L49.2 72 Z" fill="#e0a93a" />
      <path d="M34 80 C 38 70, 46 66, 50 66 C 54 66, 62 70, 66 80 Z" fill="#c8963e" />
      {/* Gold frame top and bottom, with two posts. */}
      <rect x="22" y="10" width="56" height="10" rx="4" fill={`url(#${id}-gold)`} stroke={STROKE} strokeWidth="1.5" />
      <rect x="22" y="80" width="56" height="10" rx="4" fill={`url(#${id}-gold)`} stroke={STROKE} strokeWidth="1.5" />
      <rect x="24" y="18" width="5" height="64" rx="2" fill={`url(#${id}-deep)`} />
      <rect x="71" y="18" width="5" height="64" rx="2" fill={`url(#${id}-deep)`} />
      <ellipse cx="38" cy="13" rx="9" ry="2.5" fill="#ffffff" opacity="0.6" />
      <path d="M36 24 C 38 34, 42 38, 44 40" stroke="#ffffff" strokeWidth="2" opacity="0.6" fill="none" strokeLinecap="round" />
    </>
  )
}

/** A golden locket on its chain, the shape of a heart, closed on a memory. */
function GoldenMemory({ id }: { id: string }) {
  return (
    <>
      {/* Chain. */}
      <path d="M22 8 C 26 26, 40 34, 50 36 C 60 34, 74 26, 78 8" fill="none" stroke={`url(#${id}-gold)`} strokeWidth="3" strokeDasharray="4 2.5" strokeLinecap="round" />
      <circle cx="50" cy="36" r="4" fill="none" stroke={`url(#${id}-gold)`} strokeWidth="2.5" />
      {/* The locket. */}
      <path d="M50 92 C 30 78, 16 66, 16 52 C 16 42, 24 36, 33 36 C 41 36, 46 41, 50 46 C 54 41, 59 36, 67 36 C 76 36, 84 42, 84 52 C 84 66, 70 78, 50 92 Z" fill={`url(#${id}-deep)`} transform="translate(0 2)" />
      <path d="M50 92 C 30 78, 16 66, 16 52 C 16 42, 24 36, 33 36 C 41 36, 46 41, 50 46 C 54 41, 59 36, 67 36 C 76 36, 84 42, 84 52 C 84 66, 70 78, 50 92 Z" fill={`url(#${id}-shine)`} stroke={STROKE} strokeWidth="2" />
      {/* An engraved inner heart, and a jewel at its centre. */}
      <path d="M50 80 C 36 70, 26 62, 26 53 C 26 47, 31 44, 36 44 C 42 44, 46 48, 50 53 C 54 48, 58 44, 64 44 C 69 44, 74 47, 74 53 C 74 62, 64 70, 50 80 Z" fill="none" stroke="#7a5310" strokeWidth="1.5" opacity="0.6" />
      <circle cx="50" cy="60" r="5" fill="#dc2626" stroke="#7f1d1d" strokeWidth="1" />
      <circle cx="48.5" cy="58.5" r="1.5" fill="#ffffff" opacity="0.8" />
      <ellipse cx="30" cy="48" rx="7" ry="3.5" fill="#ffffff" opacity="0.55" transform="rotate(-35 30 48)" />
    </>
  )
}

/** An open chest, overflowing: coins, a crown of light and gems catching it. */
function TimelessTreasure({ id }: { id: string }) {
  return (
    <>
      <ellipse cx="50" cy="44" rx="40" ry="22" fill="#fff1c7" opacity="0.7" />
      {/* Lid, thrown open behind. */}
      <path d="M16 46 L22 18 C 24 12, 76 12, 78 18 L84 46 Z" fill={`url(#${id}-deep)`} stroke={STROKE} strokeWidth="1.5" />
      <path d="M24 42 L28 22 C 30 18, 70 18, 72 22 L76 42 Z" fill="#5a3b0c" opacity="0.7" />
      {/* The hoard, heaped over the rim. */}
      {[[28, 50], [38, 46], [50, 44], [62, 46], [72, 50], [33, 54], [45, 52], [57, 52], [68, 55]].map(([cx, cy], i) => (
        <ellipse key={i} cx={cx} cy={cy} rx="8" ry="4.5" fill={`url(#${id}-shine)`} stroke={STROKE} strokeWidth="1" />
      ))}
      <path d="M40 40 L45 35 L50 40 L45 46 Z" fill="#2563eb" stroke="#1e3a8a" strokeWidth="1" />
      <path d="M56 38 L61 33 L66 38 L61 44 Z" fill="#16a34a" stroke="#14532d" strokeWidth="1" />
      <circle cx="52" cy="47" r="3.5" fill="#dc2626" stroke="#7f1d1d" strokeWidth="1" />
      {/* The chest. */}
      <rect x="14" y="54" width="72" height="34" rx="4" fill={`url(#${id}-deep)`} stroke={STROKE} strokeWidth="1.5" />
      <rect x="14" y="54" width="72" height="9" rx="3" fill={`url(#${id}-gold)`} stroke={STROKE} strokeWidth="1.5" />
      <rect x="26" y="54" width="7" height="34" fill={`url(#${id}-gold)`} stroke={STROKE} strokeWidth="1" />
      <rect x="67" y="54" width="7" height="34" fill={`url(#${id}-gold)`} stroke={STROKE} strokeWidth="1" />
      <rect x="44" y="60" width="12" height="13" rx="2.5" fill={`url(#${id}-shine)`} stroke={STROKE} strokeWidth="1.2" />
      <circle cx="50" cy="66" r="2" fill="#5a3b0c" />
      {/* Sparkles. */}
      {[[20, 30], [82, 28], [50, 10]].map(([x, y], i) => (
        <path key={i} d={`M${x} ${y - 5} L${x + 1.4} ${y - 1.4} L${x + 5} ${y} L${x + 1.4} ${y + 1.4} L${x} ${y + 5} L${x - 1.4} ${y + 1.4} L${x - 5} ${y} L${x - 1.4} ${y - 1.4} Z`} fill="#fff7d6" />
      ))}
    </>
  )
}

const ART: Record<PremiumKind, (props: { id: string }) => React.JSX.Element> = {
  "golden-journey": Journey,
  "54-horizons": Horizons,
  "legacy-tree": LegacyTree,
  "time-capsule": TimeCapsule,
  "golden-memory": GoldenMemory,
  "timeless-treasure": TimelessTreasure,
}

export function TreasureArt({ kind, size = 24, className }: { kind: TreasureArtKind; size?: number; className?: string }) {
  const id = `ta-${useId().replace(/:/g, "")}`
  const everyday = isIllustration(kind)
  const Art = everyday ? null : ART[kind as PremiumKind]
  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      className={cn(
        "shrink-0 overflow-visible",
        // Premium casts a warm gold shadow; the everyday pieces a neutral one.
        everyday ? "drop-shadow-[0_2px_2px_rgba(15,23,42,0.28)]" : "drop-shadow-[0_2px_2px_rgba(90,59,12,0.35)]",
        className,
      )}
      aria-hidden="true"
      focusable="false"
    >
      {everyday ? (
        drawIllustration(kind as IllustrationKind, id)
      ) : (
        <>
          <Golds id={id} />
          {Art && <Art id={id} />}
        </>
      )}
    </svg>
  )
}
