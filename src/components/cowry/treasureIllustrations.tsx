import type { JSX } from "react"

/**
 * The everyday Treasures — every category but Premium — each drawn as what it is named:
 * a talking drum is a talking drum, akara is three golden fritters, the Welcome is a house
 * with its door open. Drawn in the same hand-shaded 3D as the Premium pieces (TreasureArt):
 * a highlight where the light falls, colour deepening toward the edges, a firm outline so
 * each still reads at tile size. In their own natural colours, so gold stays Premium's.
 *
 * Not components (each is called with its gradient prefix), so this file exports only
 * functions and data and React's fast refresh is left alone.
 */

import type { IllustrationKind } from "@/components/cowry/treasureIllustrationKinds"

/** Light, body and shadow for each colour; every piece is shaded from these. */
const PALETTE = {
  gold: ["#fff4c2", "#f3c969", "#a8741a"],
  amber: ["#fde68a", "#f59e0b", "#92400e"],
  orange: ["#fed7aa", "#f97316", "#9a3412"],
  red: ["#fecaca", "#ef4444", "#991b1b"],
  rose: ["#fecdd3", "#f43f5e", "#9f1239"],
  pink: ["#fbcfe8", "#ec4899", "#9d174d"],
  purple: ["#e9d5ff", "#a855f7", "#6b21a8"],
  blue: ["#bfdbfe", "#3b82f6", "#1e3a8a"],
  sky: ["#e0f2fe", "#38bdf8", "#075985"],
  teal: ["#ccfbf1", "#14b8a6", "#115e59"],
  green: ["#bbf7d0", "#22c55e", "#14532d"],
  lime: ["#ecfccb", "#84cc16", "#3f6212"],
  brown: ["#e7c9a5", "#a16207", "#4a2c0a"],
  wood: ["#f5d0a0", "#b45309", "#5c300b"],
  skin: ["#fde2c4", "#c98552", "#7a4520"],
  cream: ["#ffffff", "#fef3c7", "#d6b98a"],
  stone: ["#f8fafc", "#94a3b8", "#334155"],
  dark: ["#94a3b8", "#334155", "#0f172a"],
  night: ["#a5b4fc", "#3730a3", "#1e1b4b"],
} as const

type Colour = keyof typeof PALETTE

/**
 * A flat colour for strokes. A gradient sized to its shape has nothing to spread across on a
 * perfectly straight line (its box has no width or no height), and the line vanishes — so
 * lines are drawn in each colour's body tone instead.
 */
const solid = (c: Colour) => PALETTE[c][1]

/** A linear (top-left lit) and a radial (sphere-lit) gradient for every colour. */
function palette(id: string) {
  return (
    <defs>
      {(Object.entries(PALETTE) as Array<[Colour, readonly string[]]>).map(([name, [light, body, shadow]]) => (
        <g key={name}>
          <linearGradient id={`${id}-${name}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={light} />
            <stop offset="45%" stopColor={body} />
            <stop offset="100%" stopColor={shadow} />
          </linearGradient>
          <radialGradient id={`${id}-${name}-r`} cx="35%" cy="30%" r="75%">
            <stop offset="0%" stopColor={light} />
            <stop offset="55%" stopColor={body} />
            <stop offset="100%" stopColor={shadow} />
          </radialGradient>
        </g>
      ))}
    </defs>
  )
}

type Paint = { L: (c: Colour) => string; R: (c: Colour) => string }

/** The outline every piece shares: firm enough to hold its shape at 26 pixels. */
const O = { stroke: "rgba(40,22,10,0.45)", strokeWidth: 1.6, strokeLinejoin: "round" as const }
const SHINE = { fill: "#ffffff", opacity: 0.55 }

const star = (x: number, y: number, r: number) =>
  `M${x} ${y - r} L${x + r * 0.28} ${y - r * 0.28} L${x + r} ${y} L${x + r * 0.28} ${y + r * 0.28} L${x} ${y + r} L${x - r * 0.28} ${y + r * 0.28} L${x - r} ${y} L${x - r * 0.28} ${y - r * 0.28} Z`

const heart = (x: number, y: number, s: number) =>
  `M${x} ${y + 9 * s} C ${x - 12 * s} ${y + 1 * s}, ${x - 10 * s} ${y - 9 * s}, ${x - 4 * s} ${y - 9 * s} C ${x - 1 * s} ${y - 9 * s}, ${x} ${y - 6 * s}, ${x} ${y - 5 * s} C ${x} ${y - 6 * s}, ${x + 1 * s} ${y - 9 * s}, ${x + 4 * s} ${y - 9 * s} C ${x + 10 * s} ${y - 9 * s}, ${x + 12 * s} ${y + 1 * s}, ${x} ${y + 9 * s} Z`

/* ── Wellness & Emotion ─────────────────────────────────────────────────────── */

const newDawn = ({ L, R }: Paint) => (
  <>
    {[-70, -45, -20, 0, 20, 45, 70].map((a) => (
      <path key={a} d="M50 62 L50 20" stroke={solid("amber")} strokeWidth="4.5" strokeLinecap="round" transform={`rotate(${a} 50 62)`} />
    ))}
    <path d="M24 62 A26 26 0 0 1 76 62 Z" fill={R("orange")} {...O} />
    <path d="M4 62 Q 28 50 50 62 T 96 62 L96 84 Q50 94 4 84 Z" fill={L("green")} {...O} />
    <path d="M16 72 H40 M56 76 H84" stroke="#ffffff" strokeWidth="2" opacity="0.5" strokeLinecap="round" />
    <ellipse cx="40" cy="48" rx="7" ry="3" transform="rotate(-25 40 48)" {...SHINE} />
  </>
)

const strongRoot = ({ L, R }: Paint) => (
  <>
    {["M50 64 C 44 74, 34 80, 20 86", "M50 64 C 46 76, 42 84, 38 94", "M50 64 C 54 76, 58 84, 62 94", "M50 64 C 56 74, 66 80, 80 86"].map((d) => (
      <path key={d} d={d} stroke={solid("wood")} strokeWidth="4" strokeLinecap="round" fill="none" />
    ))}
    <ellipse cx="50" cy="64" rx="40" ry="8" fill={L("brown")} {...O} />
    <path d="M46 64 L47 34 L53 34 L54 64 Z" fill={L("wood")} {...O} />
    <circle cx="36" cy="30" r="14" fill={R("green")} {...O} />
    <circle cx="64" cy="30" r="14" fill={R("green")} {...O} />
    <circle cx="50" cy="18" r="15" fill={R("green")} {...O} />
    <ellipse cx="44" cy="12" rx="6" ry="3" transform="rotate(-25 44 12)" {...SHINE} />
  </>
)

const calmWater = ({ L, R }: Paint) => (
  <>
    <ellipse cx="50" cy="62" rx="45" ry="24" fill={R("sky")} {...O} />
    <ellipse cx="50" cy="62" rx="32" ry="15" fill="none" stroke="#ffffff" strokeWidth="1.6" opacity="0.6" />
    <ellipse cx="50" cy="62" rx="18" ry="8" fill="none" stroke="#ffffff" strokeWidth="1.6" opacity="0.6" />
    <path d="M30 64 m -13 0 a 13 8 0 1 0 26 0 L30 64 Z" fill={L("green")} {...O} />
    {[0, 72, 144, 216, 288].map((a) => (
      <ellipse key={a} cx="64" cy="44" rx="5.5" ry="11" fill={L("pink")} {...O} transform={`rotate(${a} 64 52)`} />
    ))}
    <circle cx="64" cy="52" r="4.5" fill={L("amber")} />
  </>
)

const openHand = ({ L, R }: Paint) => (
  <>
    {[[30, 22, 34], [41, 14, 42], [52, 14, 42], [63, 20, 36]].map(([x, y, h]) => (
      <rect key={x} x={x} y={y} width="10" height={h} rx="5" fill={L("skin")} {...O} />
    ))}
    <path d="M30 50 L74 50 L74 74 C 74 86, 64 92, 52 92 C 40 92, 30 86, 30 74 Z" fill={L("skin")} {...O} />
    <path d="M30 62 C 20 58, 14 50, 16 44 C 18 40, 24 42, 28 48 L32 56 Z" fill={L("skin")} {...O} />
    <path d={heart(52, 68, 1)} fill={R("rose")} {...O} />
    <ellipse cx="38" cy="30" rx="2.5" ry="7" {...SHINE} />
  </>
)

const familyBasket = ({ L, R }: Paint) => (
  <>
    <path d="M22 48 C 22 8, 78 8, 78 48" stroke={solid("wood")} strokeWidth="6" fill="none" strokeLinecap="round" />
    <circle cx="35" cy="40" r="11" fill={R("red")} {...O} />
    <circle cx="52" cy="35" r="12" fill={R("orange")} {...O} />
    <circle cx="67" cy="41" r="10" fill={R("lime")} {...O} />
    {[[44, 44], [49, 47], [54, 44]].map(([x, y]) => (
      <circle key={x} cx={x} cy={y} r="4" fill={R("purple")} />
    ))}
    <path d="M14 48 L86 48 L77 86 Q50 94 23 86 Z" fill={L("wood")} {...O} />
    {[58, 68, 78].map((y) => (
      <path key={y} d={`M${18 + (y - 48) * 0.2} ${y} L${82 - (y - 48) * 0.2} ${y}`} stroke="#5c300b" strokeWidth="1.5" opacity="0.6" />
    ))}
    {[30, 42, 54, 66].map((x) => (
      <path key={x} d={`M${x} 50 L${x + 1} 88`} stroke="#5c300b" strokeWidth="1.5" opacity="0.5" />
    ))}
  </>
)

const lightWithin = ({ L, R }: Paint) => (
  <>
    <circle cx="50" cy="58" r="36" fill={R("amber")} opacity="0.35" />
    <path d="M24 92 C 24 62, 36 48, 50 48 C 64 48, 76 62, 76 92 Z" fill={L("teal")} {...O} />
    <circle cx="50" cy="30" r="13" fill={R("teal")} {...O} />
    {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => (
      <path key={a} d="M50 58 L50 47" stroke="#fde68a" strokeWidth="2.4" strokeLinecap="round" transform={`rotate(${a} 50 68)`} />
    ))}
    <path d={heart(50, 68, 0.95)} fill={R("amber")} stroke="#fff7d6" strokeWidth="1.5" />
    <ellipse cx="44" cy="24" rx="5" ry="2.5" transform="rotate(-25 44 24)" {...SHINE} />
  </>
)

const safeHarbour = ({ L, R }: Paint) => (
  <>
    <path d="M47 22 L4 6 L4 30 Z M53 22 L96 6 L96 30 Z" fill="#fde68a" opacity="0.5" />
    <path d="M2 82 Q 14 76 26 82 T 50 82 T 74 82 T 98 82 L98 96 L2 96 Z" fill={L("sky")} {...O} />
    <ellipse cx="50" cy="82" rx="22" ry="6" fill={L("stone")} {...O} />
    <path d="M40 80 L44 30 L56 30 L60 80 Z" fill={L("red")} {...O} />
    <path d="M42.5 50 L57.5 50 L58.4 60 L41.6 60 Z M41 68 L59 68 L59.6 76 L40.4 76 Z M43.6 36 L56.4 36 L56.9 42 L43.1 42 Z" fill={L("cream")} />
    <rect x="41" y="20" width="18" height="10" rx="2" fill={R("amber")} {...O} />
    <path d="M38 20 L50 8 L62 20 Z" fill={L("red")} {...O} />
  </>
)

/* ── Heritage ───────────────────────────────────────────────────────────────── */

const talkingDrum = ({ L }: Paint) => (
  <>
    <path d="M72 30 C 80 22, 84 16, 88 8" stroke={solid("wood")} strokeWidth="4" strokeLinecap="round" fill="none" />
    <circle cx="89" cy="7" r="4" fill={L("brown")} />
    <path d="M28 20 C 42 40, 42 60, 28 80 L72 80 C 58 60, 58 40, 72 20 Z" fill={L("wood")} {...O} />
    {[32, 38, 44, 50, 56, 62, 68].map((x) => (
      <path key={x} d={`M${x} 22 Q ${50 + (x - 50) * 0.35} 50 ${x} 78`} stroke="#fef3c7" strokeWidth="1.3" fill="none" opacity="0.85" />
    ))}
    <ellipse cx="50" cy="20" rx="22" ry="7" fill={L("cream")} {...O} />
    <ellipse cx="50" cy="80" rx="22" ry="7" fill={L("cream")} {...O} />
  </>
)

const calabash = ({ L, R }: Paint) => (
  <>
    <path d="M10 44 A40 36 0 0 0 90 44 Z" fill={R("amber")} {...O} />
    <ellipse cx="50" cy="44" rx="40" ry="11" fill={L("brown")} {...O} />
    <ellipse cx="50" cy="45" rx="34" ry="7" fill="#5c300b" opacity="0.6" />
    <path d="M16 60 L24 54 L32 62 L40 54 L48 62 L56 54 L64 62 L72 54 L80 62" stroke="#5c300b" strokeWidth="2" fill="none" strokeLinejoin="round" />
    <path d="M24 70 Q 50 82 76 70" stroke="#5c300b" strokeWidth="1.5" fill="none" opacity="0.6" />
    <ellipse cx="28" cy="58" rx="5" ry="2.5" transform="rotate(30 28 58)" {...SHINE} />
  </>
)

const heritageBasket = ({ L }: Paint) => (
  <>
    <path d="M36 40 Q50 8 64 40 Z" fill={L("amber")} {...O} />
    <path d="M16 46 L84 46 L78 86 Q50 94 22 86 Z" fill={L("amber")} {...O} />
    <path d="M19 58 L27 52 L35 58 L43 52 L51 58 L59 52 L67 58 L75 52 L82 58" stroke={solid("red")} strokeWidth="3.5" fill="none" strokeLinejoin="round" />
    <path d="M21 72 L29 66 L37 72 L45 66 L53 72 L61 66 L69 72 L77 66 L80 70" stroke={solid("green")} strokeWidth="3.5" fill="none" strokeLinejoin="round" />
    <path d="M24 80 H76" stroke="#5c300b" strokeWidth="2" opacity="0.5" />
    <ellipse cx="50" cy="44" rx="36" ry="9" fill={L("amber")} {...O} />
    <ellipse cx="50" cy="44" rx="28" ry="5" fill="none" stroke="#92400e" strokeWidth="1.2" opacity="0.6" />
  </>
)

const villageLantern = ({ L, R }: Paint) => (
  <>
    <circle cx="50" cy="54" r="34" fill={R("amber")} opacity="0.3" />
    <path d="M38 22 C 38 6, 62 6, 62 22" stroke={solid("dark")} strokeWidth="3.5" fill="none" />
    <path d="M34 30 L40 22 L60 22 L66 30 Z" fill={L("dark")} {...O} />
    <rect x="34" y="30" width="32" height="44" rx="6" fill="#fff7e0" opacity="0.85" {...O} />
    <path d="M50 42 C 58 52, 58 62, 50 66 C 42 62, 42 52, 50 42 Z" fill={R("orange")} />
    <path d="M50 52 C 54 58, 54 62, 50 64 C 46 62, 46 58, 50 52 Z" fill="#fef3c7" />
    <path d="M36 30 V74 M64 30 V74" stroke={solid("dark")} strokeWidth="3" />
    <path d="M30 74 L70 74 L66 84 L34 84 Z" fill={L("dark")} {...O} />
    <ellipse cx="40" cy="38" rx="2" ry="7" {...SHINE} />
  </>
)

const storyFire = ({ L, R }: Paint) => (
  <>
    <ellipse cx="50" cy="60" rx="40" ry="30" fill={R("amber")} opacity="0.3" />
    <path d="M50 14 C 68 32, 74 48, 66 66 C 62 74, 56 78, 50 78 C 40 78, 30 70, 30 58 C 30 46, 40 40, 42 28 C 46 36, 48 40, 50 14 Z" fill={R("orange")} {...O} />
    <path d="M50 38 C 60 50, 62 60, 56 70 C 54 74, 52 76, 50 76 C 44 76, 40 70, 40 64 C 40 56, 46 52, 50 38 Z" fill={R("amber")} />
    <path d="M50 56 C 54 62, 54 68, 50 72 C 46 68, 46 62, 50 56 Z" fill="#fef3c7" />
    <rect x="16" y="76" width="68" height="10" rx="5" fill={L("wood")} {...O} transform="rotate(12 50 81)" />
    <rect x="16" y="76" width="68" height="10" rx="5" fill={L("wood")} {...O} transform="rotate(-12 50 81)" />
    {[[24, 30], [76, 26], [70, 12], [30, 16]].map(([x, y]) => (
      <circle key={`${x}${y}`} cx={x} cy={y} r="2" fill="#fde68a" />
    ))}
  </>
)

const ancestralPattern = ({ L }: Paint) => (
  <>
    <rect x="12" y="12" width="76" height="76" rx="8" fill={L("brown")} {...O} />
    <g stroke="#fef3c7" strokeWidth="2.2" fill="none" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 26 H82 M18 74 H82" />
      <path d="M18 34 L26 42 L34 34 L42 42 L50 34 L58 42 L66 34 L74 42 L82 34" />
      <path d="M18 66 L26 58 L34 66 L42 58 L50 66 L58 58 L66 66 L74 58 L82 66" />
      <path d="M50 42 L60 50 L50 58 L40 50 Z" />
    </g>
    {[22, 34, 46, 58, 70, 82].map((x) => (
      <circle key={x} cx={x - 4} cy="19" r="1.8" fill="#fef3c7" />
    ))}
    {[22, 34, 46, 58, 70, 82].map((x) => (
      <circle key={x} cx={x - 4} cy="81" r="1.8" fill="#fef3c7" />
    ))}
    <circle cx="50" cy="50" r="3" fill="#fef3c7" />
  </>
)

const goldenStool = ({ L, R }: Paint) => (
  <>
    <path d="M24 82 Q50 74 76 82 L74 90 Q50 84 26 90 Z" fill={L("gold")} {...O} />
    <path d="M40 80 C 36 66, 64 66, 60 80 Z" fill={L("gold")} {...O} />
    <path d="M42 66 C 40 56, 60 56, 58 66 Z" fill={R("gold")} {...O} />
    <path d="M30 80 L36 50 M70 80 L64 50" stroke={solid("gold")} strokeWidth="5" strokeLinecap="round" />
    <path d="M44 56 L42 46 M56 56 L58 46" stroke={solid("gold")} strokeWidth="4" strokeLinecap="round" />
    <path d="M12 30 Q50 52 88 30 L84 42 Q50 62 16 42 Z" fill={L("gold")} {...O} />
    <ellipse cx="30" cy="38" rx="7" ry="2.5" transform="rotate(18 30 38)" {...SHINE} />
  </>
)

/* ── Food & Table ───────────────────────────────────────────────────────────── */

const steam = (xs: number[], y: number) =>
  xs.map((x) => (
    <path key={x} d={`M${x} ${y} C ${x - 5} ${y - 6}, ${x + 5} ${y - 12}, ${x} ${y - 18}`} stroke="#cbd5e1" strokeWidth="2.5" fill="none" strokeLinecap="round" opacity="0.8" />
  ))

const sharedBowl = ({ L, R }: Paint) => (
  <>
    {steam([38, 50, 62], 34)}
    <rect x="10" y="20" width="8" height="34" rx="4" fill={L("wood")} {...O} transform="rotate(-30 14 37)" />
    <rect x="82" y="20" width="8" height="34" rx="4" fill={L("wood")} {...O} transform="rotate(30 86 37)" />
    <path d="M12 46 A38 34 0 0 0 88 46 Z" fill={R("blue")} {...O} />
    <path d="M18 62 Q50 72 82 62" stroke="#fef3c7" strokeWidth="2.5" fill="none" opacity="0.8" />
    <ellipse cx="50" cy="46" rx="38" ry="9" fill={L("orange")} {...O} />
    <circle cx="40" cy="45" r="3" fill={L("green")} />
    <circle cx="58" cy="46" r="3" fill={L("red")} />
  </>
)

const jollofTable = ({ L, R }: Paint) => (
  <>
    <ellipse cx="50" cy="60" rx="46" ry="28" fill={L("cream")} {...O} />
    <ellipse cx="50" cy="58" rx="36" ry="20" fill="#ffffff" opacity="0.8" />
    <ellipse cx="42" cy="54" rx="24" ry="14" fill={R("orange")} {...O} />
    {[[32, 52], [38, 47], [44, 52], [50, 48], [36, 58], [48, 58], [42, 62]].map(([x, y]) => (
      <ellipse key={`${x}${y}`} cx={x} cy={y} rx="1.6" ry="0.9" fill="#fff7ed" opacity="0.9" />
    ))}
    <ellipse cx="70" cy="50" rx="11" ry="8" fill={R("brown")} {...O} transform="rotate(-20 70 50)" />
    <rect x="76" y="38" width="10" height="5" rx="2.5" fill={L("cream")} {...O} transform="rotate(-40 81 40)" />
    <circle cx="66" cy="68" r="7" fill={R("red")} {...O} />
    <circle cx="66" cy="68" r="3.5" fill="none" stroke="#fecaca" strokeWidth="1.2" />
    {[[30, 66], [35, 69], [54, 64]].map(([x, y]) => (
      <circle key={`${x}${y}`} cx={x} cy={y} r="2.4" fill={L("green")} />
    ))}
  </>
)

const morningAkara = ({ L, R }: Paint) => (
  <>
    <ellipse cx="50" cy="72" rx="44" ry="17" fill={L("cream")} {...O} />
    {[[32, 60, 15], [66, 60, 15], [49, 40, 15]].map(([x, y, r]) => (
      <g key={`${x}${y}`}>
        <circle cx={x} cy={y} r={r} fill={R("amber")} {...O} />
        {[[-5, -3], [4, -6], [6, 4], [-4, 6], [0, 1]].map(([dx, dy]) => (
          <circle key={`${dx}${dy}`} cx={x + dx} cy={y + dy} r="1.6" fill="#92400e" opacity="0.55" />
        ))}
        <ellipse cx={x - 5} cy={y - 7} rx="4" ry="2" {...SHINE} />
      </g>
    ))}
  </>
)

const familyPot = ({ L, R }: Paint) => (
  <>
    {steam([40, 52, 64], 24)}
    <path d="M30 92 C 36 84, 42 88, 40 80 M50 92 C 54 84, 46 82, 52 78 M70 92 C 64 84, 60 88, 62 80" stroke={solid("orange")} strokeWidth="4" fill="none" strokeLinecap="round" />
    <path d="M26 82 L22 92 M50 84 V94 M74 82 L78 92" stroke={solid("dark")} strokeWidth="4" strokeLinecap="round" />
    <path d="M16 42 Q 14 84 50 84 Q 86 84 84 42 Z" fill={R("dark")} {...O} />
    <path d="M12 46 C 6 46, 6 56, 14 56 M88 46 C 94 46, 94 56, 86 56" stroke={solid("dark")} strokeWidth="4" fill="none" />
    <path d="M20 42 Q50 22 80 42 Z" fill={L("stone")} {...O} />
    <circle cx="50" cy="28" r="4" fill={L("dark")} />
    <ellipse cx="32" cy="58" rx="4" ry="9" {...SHINE} opacity={0.3} />
  </>
)

const harvestBasket = ({ L, R }: Paint) => (
  <>
    {[34, 44, 56, 66].map((x, i) => (
      <g key={x}>
        <path d={`M${x} 52 L${x + (i - 1.5) * 4} 10`} stroke={solid("amber")} strokeWidth="2" />
        <ellipse cx={x + (i - 1.5) * 4} cy="12" rx="3" ry="7" fill={L("amber")} />
      </g>
    ))}
    {[[38, -14], [62, 14]].map(([x, rot]) => (
      <g key={x} transform={`rotate(${rot} ${x} 40)`}>
        <ellipse cx={x} cy="34" rx="8" ry="20" fill={R("gold")} {...O} />
        <path d={`M${x - 8} 40 C ${x - 14} 30, ${x - 10} 18, ${x - 4} 14 M${x + 8} 40 C ${x + 14} 30, ${x + 10} 18, ${x + 4} 14`} stroke={solid("green")} strokeWidth="3" fill="none" />
      </g>
    ))}
    <path d="M14 50 L86 50 L77 88 Q50 95 23 88 Z" fill={L("wood")} {...O} />
    {[60, 70, 80].map((y) => (
      <path key={y} d={`M${17 + (y - 50) * 0.2} ${y} L${83 - (y - 50) * 0.2} ${y}`} stroke="#5c300b" strokeWidth="1.5" opacity="0.6" />
    ))}
  </>
)

const spiceTrail = ({ L, R }: Paint) => (
  <>
    <path d="M8 90 C 30 80, 40 94, 60 86 S 88 82, 94 88" stroke="#b45309" strokeWidth="2.5" strokeDasharray="1 5" strokeLinecap="round" fill="none" />
    <ellipse cx="50" cy="72" rx="44" ry="10" fill={L("wood")} {...O} />
    <path d="M10 70 C 14 50, 34 50, 38 70 Z" fill={R("red")} {...O} />
    <path d="M36 68 C 40 42, 64 42, 66 68 Z" fill={R("amber")} {...O} />
    <path d="M62 70 C 66 52, 86 52, 90 70 Z" fill={R("orange")} {...O} />
    <path d="M30 26 C 46 22, 66 30, 74 42 C 64 40, 50 34, 30 34 Z" fill={R("red")} {...O} />
    <path d="M30 26 C 24 24, 22 30, 26 32 L30 34" stroke={solid("green")} strokeWidth="4" fill="none" strokeLinecap="round" />
  </>
)

const teaCircle = ({ L, R }: Paint) => (
  <>
    {steam([22, 82], 52)}
    <path d="M60 50 C 72 44, 76 34, 80 30" stroke={solid("teal")} strokeWidth="6" strokeLinecap="round" fill="none" />
    <path d="M26 46 C 14 46, 14 66, 26 66" stroke={solid("teal")} strokeWidth="5" fill="none" />
    <ellipse cx="44" cy="56" rx="22" ry="18" fill={R("teal")} {...O} />
    <path d="M30 40 Q44 30 58 40 Z" fill={L("teal")} {...O} />
    <circle cx="44" cy="31" r="3.5" fill={L("teal")} />
    {[[18, 82], [82, 82]].map(([x, y]) => (
      <g key={x}>
        <path d={`M${x - 11} ${y - 10} L${x + 11} ${y - 10} L${x + 8} ${y + 4} Q${x} ${y + 8} ${x - 8} ${y + 4} Z`} fill={L("cream")} {...O} />
        <ellipse cx={x} cy={y - 10} rx="11" ry="3" fill={L("brown")} />
      </g>
    ))}
    <ellipse cx="36" cy="50" rx="5" ry="3" transform="rotate(-30 36 50)" {...SHINE} />
  </>
)

/* ── Achievement ────────────────────────────────────────────────────────────── */

const laurel = (L: Paint["L"]) => (
  <>
    {Array.from({ length: 7 }, (_, i) => {
      const t = (i / 6) * 1.6 + 0.3
      const lx = 50 - Math.sin(t) * 38
      const ly = 54 + Math.cos(t) * 36
      const rx = 50 + Math.sin(t) * 38
      return (
        <g key={i}>
          <ellipse cx={lx} cy={ly} rx="4" ry="8" fill={L("green")} transform={`rotate(${-(t * 57)} ${lx} ${ly})`} />
          <ellipse cx={rx} cy={ly} rx="4" ry="8" fill={L("green")} transform={`rotate(${t * 57} ${rx} ${ly})`} />
        </g>
      )
    })}
  </>
)

const barefootVictory = ({ L }: Paint) => (
  <>
    {laurel(L)}
    <path d="M50 86 C 38 86, 36 72, 38 62 C 40 52, 36 44, 42 38 C 48 32, 60 34, 60 46 C 60 56, 58 62, 60 72 C 62 82, 58 86, 50 86 Z" fill={L("skin")} {...O} />
    {[[42, 27, 5], [50, 24, 4.6], [57, 25, 4.2], [63, 29, 3.6], [67, 34, 3]].map(([x, y, r]) => (
      <circle key={x} cx={x} cy={y} r={r} fill={L("skin")} {...O} />
    ))}
  </>
)

const firstFlight = ({ L, R }: Paint) => (
  <>
    {[[8, 60], [12, 70], [6, 80]].map(([x, y]) => (
      <path key={y} d={`M${x} ${y} H${x + 18}`} stroke="#94a3b8" strokeWidth="3" strokeLinecap="round" />
    ))}
    <path d="M40 58 C 30 34, 36 14, 52 6 C 50 22, 54 34, 60 46 Z" fill={L("sky")} {...O} />
    <path d="M30 66 C 34 58, 48 50, 66 50 C 80 50, 88 58, 86 66 C 74 74, 50 76, 30 66 Z" fill={R("blue")} {...O} />
    <path d="M44 62 C 58 38, 74 22, 92 16 C 84 32, 76 46, 64 58 Z" fill={L("blue")} {...O} />
    <path d="M86 60 L96 62 L86 66 Z" fill={L("amber")} />
    <circle cx="80" cy="58" r="1.8" fill="#0f172a" />
    <path d="M30 66 L16 60 L22 72 Z" fill={L("blue")} {...O} />
  </>
)

const breakthrough = ({ L, R }: Paint) => (
  <>
    {[[8, 40], [30, 40], [52, 40], [74, 40], [19, 54], [41, 54], [63, 54], [8, 68], [30, 68], [52, 68], [74, 68], [19, 82], [63, 82]].map(([x, y]) => (
      <rect key={`${x}${y}`} x={x} y={y} width="20" height="12" rx="1.5" fill={L("red")} {...O} />
    ))}
    <path d="M36 50 L44 44 L52 52 L60 44 L66 54 L60 66 L64 76 L50 72 L40 78 L38 64 Z" fill={R("amber")} {...O} />
    <path d="M44 70 L74 24" stroke={solid("blue")} strokeWidth="8" strokeLinecap="round" />
    <path d="M66 18 L86 10 L80 32 Z" fill={L("blue")} {...O} />
    {[[30, 30], [86, 44], [26, 20]].map(([x, y]) => (
      <rect key={x} x={x} y={y} width="7" height="5" rx="1" fill={L("red")} transform={`rotate(25 ${x} ${y})`} />
    ))}
  </>
)

const goldenMile = ({ L, R }: Paint) => (
  <>
    <path d="M2 50 Q 26 38 50 46 T 98 44 L98 96 L2 96 Z" fill={L("green")} {...O} />
    <path d="M30 96 C 40 76, 62 70, 54 58 C 48 50, 58 42, 62 34 L66 34 C 64 42, 56 50, 62 58 C 72 72, 52 80, 58 96 Z" fill={L("dark")} {...O} />
    <path d="M44 92 C 50 80, 62 72, 58 62 M58 56 C 56 50, 62 44, 64 38" stroke="#fef3c7" strokeWidth="2" strokeDasharray="4 4" fill="none" />
    <path d="M64 34 V6" stroke={solid("dark")} strokeWidth="2.5" />
    <path d="M64 6 L86 12 L64 20 Z" fill={L("gold")} {...O} />
    <path d="M14 82 L14 68 Q20 62 26 68 L26 82 Z" fill={R("gold")} {...O} />
  </>
)

const openDoor = ({ L, R }: Paint) => (
  <>
    <path d="M28 88 L72 88 L94 98 L6 98 Z" fill="#fde68a" opacity="0.55" />
    <rect x="24" y="10" width="52" height="80" rx="3" fill={L("wood")} {...O} />
    <rect x="30" y="16" width="40" height="72" fill={R("amber")} />
    <path d="M30 16 L52 22 L52 94 L30 88 Z" fill={L("brown")} {...O} />
    <circle cx="47" cy="56" r="2.6" fill="#fde68a" />
    <path d="M36 28 L48 31 L48 48 L36 45 Z M36 58 L48 61 L48 80 L36 77 Z" fill="none" stroke="#5c300b" strokeWidth="1.2" opacity="0.6" />
  </>
)

const legacyScroll = ({ L, R }: Paint) => (
  <>
    <rect x="22" y="16" width="56" height="68" fill={L("cream")} {...O} />
    {[28, 36, 44, 52, 60].map((y) => (
      <path key={y} d={`M30 ${y} H${y === 60 ? 54 : 70}`} stroke="#a16207" strokeWidth="2" strokeLinecap="round" opacity="0.6" />
    ))}
    <rect x="16" y="8" width="68" height="12" rx="6" fill={L("wood")} {...O} />
    <rect x="16" y="80" width="68" height="12" rx="6" fill={L("wood")} {...O} />
    <path d="M58 76 L54 92 M66 76 L70 92" stroke={solid("red")} strokeWidth="4" strokeLinecap="round" />
    <circle cx="62" cy="72" r="9" fill={R("red")} {...O} />
    <path d="M58 72 L62 68 L66 72 L62 76 Z" fill="#fecaca" opacity="0.8" />
  </>
)

/* ── Nature ─────────────────────────────────────────────────────────────────── */

const baobab = ({ L, R }: Paint) => (
  <>
    <ellipse cx="50" cy="90" rx="42" ry="6" fill={L("lime")} {...O} />
    {["M44 34 L26 18", "M48 32 L40 12", "M52 32 L60 12", "M56 34 L76 18", "M46 36 L18 32", "M54 36 L84 32"].map((d) => (
      <path key={d} d={d} stroke={solid("brown")} strokeWidth="5" strokeLinecap="round" />
    ))}
    {[[26, 16], [40, 10], [60, 10], [76, 16], [16, 30], [86, 30]].map(([x, y]) => (
      <circle key={`${x}${y}`} cx={x} cy={y} r="7" fill={R("green")} {...O} />
    ))}
    <path d="M34 90 C 26 70, 30 46, 42 34 L58 34 C 70 46, 74 70, 66 90 Z" fill={L("brown")} {...O} />
    <path d="M42 50 C 40 62, 42 74, 44 84" stroke="#e7c9a5" strokeWidth="2" fill="none" opacity="0.5" />
  </>
)

const goldenSunset = ({ L, R }: Paint) => (
  <>
    <circle cx="50" cy="56" r="26" fill={R("orange")} {...O} />
    <rect x="4" y="56" width="92" height="34" rx="10" fill={L("purple")} {...O} />
    {[[50, 64, 22], [50, 72, 16], [50, 80, 10]].map(([x, y, w]) => (
      <path key={y} d={`M${x - w} ${y} H${x + w}`} stroke="#fdba74" strokeWidth="3" strokeLinecap="round" />
    ))}
    <path d="M18 24 q4 -4 8 0 q4 -4 8 0 M64 18 q3 -3 6 0 q3 -3 6 0" stroke="#4c1d95" strokeWidth="2" fill="none" strokeLinecap="round" />
  </>
)

const firstRain = ({ L, R }: Paint) => (
  <>
    <path d="M22 44 C 10 44, 10 26, 24 26 C 26 12, 46 10, 52 20 C 60 12, 78 16, 76 30 C 90 30, 90 46, 78 46 Z" fill={L("stone")} {...O} />
    {[[30, 56], [46, 62], [62, 54], [74, 64], [38, 72]].map(([x, y]) => (
      <path key={`${x}${y}`} d={`M${x} ${y - 8} C ${x + 4} ${y - 2}, ${x + 4} ${y + 2}, ${x} ${y + 2} C ${x - 4} ${y + 2}, ${x - 4} ${y - 2}, ${x} ${y - 8} Z`} fill={R("sky")} {...O} />
    ))}
    <path d="M14 94 Q50 80 86 94 Z" fill={L("brown")} {...O} />
    <path d="M56 88 C 56 82, 58 78, 58 74" stroke={solid("green")} strokeWidth="2.5" />
    <path d="M58 78 C 64 72, 70 74, 70 76 C 66 80, 60 80, 58 78 Z M58 80 C 52 74, 46 76, 46 78 C 50 82, 56 82, 58 80 Z" fill={L("green")} {...O} />
  </>
)

const risingMoon = ({ L, R }: Paint) => (
  <>
    <circle cx="50" cy="50" r="46" fill={L("night")} {...O} />
    <circle cx="56" cy="42" r="22" fill={R("cream")} />
    <circle cx="65" cy="35" r="19" fill="#312e81" />
    {[[24, 24, 4], [30, 46, 2.5], [76, 64, 3], [40, 18, 2]].map(([x, y, r]) => (
      <path key={`${x}${y}`} d={star(x, y, r)} fill="#fef3c7" />
    ))}
    <path d="M6 70 Q 30 56 50 68 T 94 66 L 92 78 Q 70 94 50 96 Q 24 94 8 78 Z" fill={L("dark")} />
  </>
)

const goldenSavannah = ({ L, R }: Paint) => (
  <>
    <circle cx="74" cy="30" r="14" fill={R("amber")} />
    <path d="M48 76 L50 40 L54 40 L56 76 Z" fill={L("wood")} {...O} />
    <path d="M50 44 L36 34 M54 44 L68 34" stroke={solid("wood")} strokeWidth="3" strokeLinecap="round" />
    <ellipse cx="52" cy="32" rx="34" ry="9" fill={R("green")} {...O} />
    <path d="M2 74 Q 26 64 50 72 T 98 70 L98 96 L2 96 Z" fill={L("amber")} {...O} />
    {[10, 20, 30, 64, 74, 84, 92].map((x, i) => (
      <path key={x} d={`M${x} 82 L${x - 3 + (i % 2) * 6} 66`} stroke="#a16207" strokeWidth="2" strokeLinecap="round" />
    ))}
  </>
)

const oceanBreeze = ({ L }: Paint) => (
  <>
    <path d="M6 90 C 6 54, 36 34, 60 40 C 76 44, 80 60, 68 66 C 60 70, 52 62, 58 56 C 46 54, 36 70, 44 90 Z" fill={L("blue")} {...O} />
    <path d="M60 40 C 74 42, 82 56, 70 64" stroke="#ffffff" strokeWidth="3.5" fill="none" strokeLinecap="round" />
    <path d="M4 90 L 96 90 L96 96 L4 96 Z" fill={L("sky")} />
    {["M58 18 H82 C 92 18, 92 6, 84 8", "M64 28 H90 C 98 28, 98 40, 90 38", "M8 22 H34 C 42 22, 42 12, 36 14"].map((d) => (
      <path key={d} d={d} stroke="#94a3b8" strokeWidth="3" fill="none" strokeLinecap="round" />
    ))}
  </>
)

/* ── Music & Expression ─────────────────────────────────────────────────────── */

const soundArcs = (stroke: string) => (
  <>
    <path d="M14 30 C 6 40, 6 56, 14 66 M8 24 C -2 38, -2 58, 8 72" stroke={stroke} strokeWidth="3" fill="none" strokeLinecap="round" />
    <path d="M86 30 C 94 40, 94 56, 86 66 M92 24 C 102 38, 102 58, 92 72" stroke={stroke} strokeWidth="3" fill="none" strokeLinecap="round" />
  </>
)

const rhythm = ({ L }: Paint) => (
  <>
    {soundArcs("#a855f7")}
    <path d="M42 58 L36 90 L64 90 L58 58 Z" fill={L("wood")} {...O} />
    <path d="M24 24 C 24 46, 40 52, 42 58 L58 58 C 60 52, 76 46, 76 24 Z" fill={L("wood")} {...O} />
    <path d="M26 34 H74" stroke={solid("red")} strokeWidth="3" />
    <path d="M27 38 H73" stroke={solid("gold")} strokeWidth="2.5" />
    <path d="M30 26 L38 54 L46 26 L54 54 L62 26 L70 50" stroke="#fef3c7" strokeWidth="1.5" fill="none" opacity="0.85" />
    <ellipse cx="50" cy="24" rx="26" ry="7" fill={L("cream")} {...O} />
  </>
)

const dancer = (L: Paint["L"], dx: number, dy: number, faded: boolean) => (
  <g transform={`translate(${dx} ${dy})`} opacity={faded ? 0.3 : 1}>
    <g stroke={faded ? "#1e1b4b" : solid("purple")} strokeWidth="7" strokeLinecap="round" fill="none">
      <path d="M54 30 L72 12" />
      <path d="M52 32 L36 40 L28 30" />
      <path d="M48 70 L40 92" />
      <path d="M56 70 L76 82" />
    </g>
    <path d="M54 26 L48 50 L36 72 L66 72 L56 50 Z" fill={faded ? "#1e1b4b" : L("rose")} {...(faded ? {} : O)} />
    <circle cx="56" cy="18" r="8" fill={faded ? "#1e1b4b" : L("purple")} />
  </g>
)

const dancingShadow = ({ L }: Paint) => (
  <>
    {dancer(L, 10, 4, true)}
    {dancer(L, -4, 0, false)}
  </>
)

const voice = ({ L, R }: Paint) => (
  <>
    {soundArcs("#6366f1")}
    <path d="M30 44 C 30 66, 70 66, 70 44" stroke={solid("dark")} strokeWidth="4" fill="none" />
    <path d="M50 62 V82" stroke={solid("dark")} strokeWidth="4" />
    <ellipse cx="50" cy="86" rx="16" ry="5" fill={L("dark")} {...O} />
    <rect x="36" y="8" width="28" height="44" rx="14" fill={R("stone")} {...O} />
    {[18, 24, 30, 36, 42].map((y) => (
      <path key={y} d={`M39 ${y} H61`} stroke="#334155" strokeWidth="1.2" opacity="0.5" />
    ))}
    <ellipse cx="44" cy="16" rx="3" ry="6" {...SHINE} />
  </>
)

const paintersSun = ({ L, R }: Paint) => (
  <>
    <path d="M50 14 C 20 14, 6 36, 10 56 C 14 76, 34 88, 54 86 C 66 85, 64 74, 58 70 C 52 66, 56 58, 64 58 C 80 58, 94 52, 92 36 C 90 22, 74 14, 50 14 Z" fill={L("wood")} {...O} />
    <circle cx="36" cy="40" r="10" fill={R("amber")} {...O} />
    {[0, 60, 120, 180, 240, 300].map((a) => (
      <path key={a} d="M36 26 V22" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round" transform={`rotate(${a} 36 40)`} />
    ))}
    <circle cx="62" cy="30" r="6" fill={R("red")} {...O} />
    <circle cx="78" cy="40" r="6" fill={R("blue")} {...O} />
    <circle cx="30" cy="66" r="6" fill={R("green")} {...O} />
    <ellipse cx="60" cy="62" rx="7" ry="5" fill="#ffffff" opacity="0.35" />
    <path d="M70 92 L92 64" stroke={solid("wood")} strokeWidth="4" strokeLinecap="round" />
    <path d="M90 66 L96 58" stroke={solid("stone")} strokeWidth="5" />
    <path d="M95 59 L99 52" stroke={solid("amber")} strokeWidth="5" strokeLinecap="round" />
  </>
)

const storyteller = ({ L, R }: Paint) => (
  <>
    {[[30, 30, 5], [50, 16, 6], [70, 28, 4.5], [40, 8, 3], [62, 8, 3.5]].map(([x, y, r]) => (
      <path key={`${x}${y}`} d={star(x, y, r)} fill={R("amber")} />
    ))}
    <path d="M50 44 C 46 40, 44 36, 48 34" stroke="#fde68a" strokeWidth="2" fill="none" strokeLinecap="round" />
    <path d="M50 52 C 36 44, 20 44, 8 48 L8 86 C 20 82, 36 82, 50 90 Z" fill={L("cream")} {...O} />
    <path d="M50 52 C 64 44, 80 44, 92 48 L92 86 C 80 82, 64 82, 50 90 Z" fill={L("cream")} {...O} />
    {[58, 66, 74].map((y) => (
      <g key={y} stroke="#a16207" strokeWidth="1.6" opacity="0.55" strokeLinecap="round">
        <path d={`M16 ${y} C 26 ${y - 2}, 36 ${y - 2}, 44 ${y + 2}`} fill="none" />
        <path d={`M56 ${y + 2} C 64 ${y - 2}, 74 ${y - 2}, 84 ${y}`} fill="none" />
      </g>
    ))}
    <path d="M50 52 V90" stroke={solid("brown")} strokeWidth="2.5" />
  </>
)

/* ── Human Connection ───────────────────────────────────────────────────────── */

const thankYou = ({ L, R }: Paint) => (
  <>
    <circle cx="50" cy="52" r="38" fill={R("rose")} opacity="0.22" />
    <path d={heart(50, 12, 0.6)} fill={R("rose")} {...O} />
    <path d="M50 22 C 44 28, 40 44, 40 58 L 32 74 L 44 86 L 50 86 Z" fill={L("skin")} {...O} />
    <path d="M50 22 C 56 28, 60 44, 60 58 L 68 74 L 56 86 L 50 86 Z" fill={L("skin")} {...O} />
    <path d="M30 76 L44 88 L40 96 L24 84 Z M70 76 L56 88 L60 96 L76 84 Z" fill={L("teal")} {...O} />
    <ellipse cx="45" cy="40" rx="1.8" ry="8" {...SHINE} />
  </>
)

const friendshipThread = ({ L, R }: Paint) => (
  <>
    <path d="M40 46 C 58 50, 60 34, 72 30 C 82 28, 92 34, 88 46 C 86 54, 78 60, 72 70 C 66 60, 56 54, 56 44" stroke={solid("pink")} strokeWidth="3.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    <ellipse cx="32" cy="22" rx="20" ry="6" fill={L("wood")} {...O} />
    <rect x="16" y="22" width="32" height="54" fill={R("pink")} {...O} />
    {[30, 38, 46, 54, 62, 70].map((y) => (
      <path key={y} d={`M16 ${y} Q32 ${y + 3} 48 ${y}`} stroke="#9d174d" strokeWidth="1.2" fill="none" opacity="0.5" />
    ))}
    <ellipse cx="32" cy="78" rx="20" ry="6" fill={L("wood")} {...O} />
    {[[78, 40], [86, 54], [64, 42]].map(([x, y]) => (
      <circle key={x} cx={x} cy={y} r="3.2" fill={R("amber")} {...O} />
    ))}
  </>
)

const warmEmbrace = ({ L, R }: Paint) => (
  <>
    <path d={heart(50, 14, 0.6)} fill={R("rose")} {...O} />
    <path d="M18 92 C 18 64, 28 46, 40 46 C 50 46, 54 56, 54 64 L54 92 Z" fill={L("teal")} {...O} />
    <circle cx="38" cy="32" r="11" fill={R("skin")} {...O} />
    <path d="M82 92 C 82 64, 72 46, 60 46 C 50 46, 46 56, 46 64 L46 92 Z" fill={L("rose")} {...O} />
    <circle cx="62" cy="32" r="11" fill={R("skin")} {...O} />
    <path d="M30 62 C 44 54, 62 54, 72 64" stroke={solid("teal")} strokeWidth="8" strokeLinecap="round" fill="none" />
    <path d="M70 70 C 56 62, 40 64, 28 72" stroke={solid("rose")} strokeWidth="8" strokeLinecap="round" fill="none" />
  </>
)

const helpingHand = ({ L, R }: Paint) => (
  <>
    <circle cx="50" cy="50" r="26" fill={R("amber")} opacity="0.35" />
    {/* One arm reaching down, one reaching up, the hands gripping at the wrist. */}
    <path d="M90 10 L66 34" stroke={solid("purple")} strokeWidth="16" strokeLinecap="round" />
    <path d="M10 90 L34 66" stroke={solid("teal")} strokeWidth="16" strokeLinecap="round" />
    <path d="M70 26 C 82 34, 82 50, 70 60 L56 72 C 48 78, 36 72, 40 62 L52 42 C 56 34, 62 28, 70 26 Z" fill={L("skin")} {...O} />
    <path d="M30 74 C 18 66, 18 50, 30 40 L44 28 C 52 22, 64 28, 60 38 L48 58 C 44 66, 38 72, 30 74 Z" fill={L("brown")} {...O} />
    <path d="M46 46 L60 60 M42 52 L54 64 M50 40 L64 54" stroke="rgba(40,22,10,0.45)" strokeWidth="1.8" strokeLinecap="round" />
    <ellipse cx="36" cy="46" rx="5" ry="2.5" transform="rotate(-40 36 46)" {...SHINE} />
  </>
)

const welcome = ({ L, R }: Paint) => (
  <>
    <path d="M14 46 L50 14 L86 46 Z" fill={L("red")} {...O} />
    <rect x="20" y="44" width="60" height="44" rx="2" fill={L("cream")} {...O} />
    <rect x="40" y="58" width="20" height="30" fill={R("amber")} {...O} />
    <path d="M40 58 L30 62 L30 92 L40 88 Z" fill={L("wood")} {...O} />
    <path d={heart(50, 34, 0.55)} fill={R("rose")} {...O} />
    <rect x="25" y="52" width="10" height="10" rx="1" fill={L("sky")} {...O} />
    <rect x="65" y="52" width="10" height="10" rx="1" fill={L("sky")} {...O} />
    <path d="M30 94 L70 94" stroke={solid("brown")} strokeWidth="4" strokeLinecap="round" />
  </>
)

const DRAW: Record<IllustrationKind, (paint: Paint) => JSX.Element> = {
  "new-dawn": newDawn,
  "strong-root": strongRoot,
  "calm-water": calmWater,
  "open-hand": openHand,
  "family-basket": familyBasket,
  "light-within": lightWithin,
  "safe-harbour": safeHarbour,
  "talking-drum": talkingDrum,
  calabash,
  "heritage-basket": heritageBasket,
  "village-lantern": villageLantern,
  "story-fire": storyFire,
  "ancestral-pattern": ancestralPattern,
  "golden-stool": goldenStool,
  "shared-bowl": sharedBowl,
  "jollof-table": jollofTable,
  "morning-akara": morningAkara,
  "family-pot": familyPot,
  "harvest-basket": harvestBasket,
  "spice-trail": spiceTrail,
  "tea-circle": teaCircle,
  "barefoot-victory": barefootVictory,
  "first-flight": firstFlight,
  breakthrough,
  "golden-mile": goldenMile,
  "open-door": openDoor,
  legacy: legacyScroll,
  baobab,
  "golden-sunset": goldenSunset,
  "first-rain": firstRain,
  "rising-moon": risingMoon,
  "golden-savannah": goldenSavannah,
  "ocean-breeze": oceanBreeze,
  rhythm,
  "dancing-shadow": dancingShadow,
  voice,
  "painters-sun": paintersSun,
  storyteller,
  "thank-you": thankYou,
  "friendship-thread": friendshipThread,
  "warm-embrace": warmEmbrace,
  "helping-hand": helpingHand,
  welcome,
}


/** The drawing for one Treasure, its gradients prefixed with `id` so many can share a page. */
export function drawIllustration(kind: IllustrationKind, id: string): JSX.Element {
  const paint: Paint = { L: (c) => `url(#${id}-${c})`, R: (c) => `url(#${id}-${c}-r)` }
  return (
    <>
      {palette(id)}
      {DRAW[kind](paint)}
    </>
  )
}
