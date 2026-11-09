import type { JSX } from "react"
import { O, SHINE, heart, palette, solid, star, type Colour, type Paint } from "@/components/cowry/treasureIllustrations"
import type { GiftIllustrationKind } from "@/components/cowry/giftIllustrationKinds"

/**
 * The named catalogue gifts (Everyday to Legendary), each drawn as what it is called rather
 * than borrowed from the icon set: Clap is two hands meeting, Kola Nut is kola in a bowl,
 * Zuma Rock is the rock itself. Same hand-shaded 3D, palette and outline as the Treasures
 * (treasureIllustrations.tsx), so the tray reads as one set.
 *
 * Drawn on a 100 × 100 view. Not components (each is called with its gradient prefix), so
 * this file exports only functions and data and React's fast refresh is left alone.
 */

/** A cut gem, its table at the top, pointing down. */
const gem = (x: number, y: number, s: number) => ({
  body: `M${x - 7 * s} ${y - 8 * s} L${x + 7 * s} ${y - 8 * s} L${x + 12 * s} ${y - 2 * s} L${x} ${y + 14 * s} L${x - 12 * s} ${y - 2 * s} Z`,
  facets: `M${x - 12 * s} ${y - 2 * s} H${x + 12 * s} M${x - 7 * s} ${y - 8 * s} L${x - 4 * s} ${y - 2 * s} L${x} ${y + 14 * s} L${x + 4 * s} ${y - 2 * s} L${x + 7 * s} ${y - 8 * s}`,
})

/** A raindrop, point up. */
const drop = (x: number, y: number, s: number) =>
  `M${x} ${y - 6 * s} C ${x + 4 * s} ${y - 1 * s}, ${x + 4 * s} ${y + 4 * s}, ${x} ${y + 4 * s} C ${x - 4 * s} ${y + 4 * s}, ${x - 4 * s} ${y - 1 * s}, ${x} ${y - 6 * s} Z`

/** The swirl at the heart of a rose, seen from above. */
const swirl = (x: number, y: number, r: number) =>
  `M${x - r} ${y} a${r} ${r} 0 1 0 ${2 * r} 0 a${r * 0.65} ${r * 0.65} 0 1 0 ${-1.3 * r} 0`

/** A firework burst: rays from the middle, each ending in a spark. */
function burst(x: number, y: number, r: number, colour: Colour, rays: number) {
  return Array.from({ length: rays }, (_, i) => {
    const a = (i / rays) * Math.PI * 2
    const [cos, sin] = [Math.cos(a), Math.sin(a)]
    return (
      <g key={i}>
        <path d={`M${x + cos * r * 0.35} ${y + sin * r * 0.35} L${x + cos * r} ${y + sin * r}`} stroke={solid(colour)} strokeWidth="3" strokeLinecap="round" />
        <circle cx={x + cos * (r + 3.5)} cy={y + sin * (r + 3.5)} r="2" fill={solid(colour)} />
      </g>
    )
  })
}

/* ── Everyday ───────────────────────────────────────────────────────────────── */

const clap = ({ L }: Paint) => (
  <>
    <path d="M24 22 L16 12 M76 22 L84 12 M36 12 L33 4 M64 12 L67 4" stroke={solid("amber")} strokeWidth="3.5" strokeLinecap="round" />
    <g transform="rotate(14 36 64)">
      <ellipse cx="23" cy="66" rx="5.5" ry="12" transform="rotate(-18 23 66)" fill={L("skin")} {...O} />
      <rect x="25" y="30" width="22" height="54" rx="11" fill={L("skin")} {...O} />
      <path d="M31 33 V44 M36 31 V44 M41 33 V44" stroke="#7a4520" strokeWidth="1.3" opacity="0.5" strokeLinecap="round" />
    </g>
    <g transform="rotate(-14 64 64)">
      <ellipse cx="77" cy="66" rx="5.5" ry="12" transform="rotate(18 77 66)" fill={L("skin")} {...O} />
      <rect x="53" y="30" width="22" height="54" rx="11" fill={L("skin")} {...O} />
      <path d="M59 33 V44 M64 31 V44 M69 33 V44" stroke="#7a4520" strokeWidth="1.3" opacity="0.5" strokeLinecap="round" />
    </g>
    <path d={star(50, 16, 7)} fill={L("amber")} />
    <ellipse cx="33" cy="50" rx="2" ry="8" transform="rotate(14 33 50)" {...SHINE} />
  </>
)

const thumbsUp = ({ L }: Paint) => (
  <>
    <rect x="14" y="48" width="18" height="40" rx="3" fill={L("blue")} {...O} />
    <rect x="30" y="44" width="48" height="44" rx="11" fill={L("skin")} {...O} />
    <rect x="34" y="10" width="17" height="44" rx="8.5" transform="rotate(-8 42 50)" fill={L("skin")} {...O} />
    <path d="M52 56 H77 M52 66 H77 M52 76 H75" stroke="#7a4520" strokeWidth="1.6" opacity="0.5" strokeLinecap="round" />
    <ellipse cx="39" cy="22" rx="2.5" ry="7" transform="rotate(-8 39 22)" {...SHINE} />
  </>
)

const smile = ({ R }: Paint) => (
  <>
    <circle cx="50" cy="50" r="40" fill={R("amber")} {...O} />
    <circle cx="26" cy="60" r="6" fill="#f472b6" opacity="0.45" />
    <circle cx="74" cy="60" r="6" fill="#f472b6" opacity="0.45" />
    <ellipse cx="36" cy="42" rx="5" ry="7.5" fill="#3f2a0a" />
    <ellipse cx="64" cy="42" rx="5" ry="7.5" fill="#3f2a0a" />
    <circle cx="37.6" cy="39" r="1.8" fill="#ffffff" />
    <circle cx="65.6" cy="39" r="1.8" fill="#ffffff" />
    <path d="M28 58 Q 50 82 72 58" stroke="#3f2a0a" strokeWidth="4.5" fill="none" strokeLinecap="round" />
    <ellipse cx="34" cy="24" rx="10" ry="5" transform="rotate(-30 34 24)" {...SHINE} />
  </>
)

/** Kola nuts in a wooden bowl, as they are offered to a guest. */
const kolaNut = ({ L, R }: Paint) => (
  <>
    <ellipse cx="50" cy="56" rx="40" ry="8" fill={L("brown")} {...O} />
    <ellipse cx="50" cy="56" rx="34" ry="5" fill="#4a2c0a" opacity="0.55" />
    <ellipse cx="33" cy="50" rx="15" ry="12" transform="rotate(-20 33 50)" fill={R("red")} {...O} />
    <ellipse cx="67" cy="50" rx="15" ry="12" transform="rotate(20 67 50)" fill={R("cream")} {...O} />
    <ellipse cx="50" cy="40" rx="15" ry="12" fill={R("rose")} {...O} />
    <path d="M50 29 Q 46 40 50 51 M31 40 Q 33 50 37 60 M69 40 Q 67 50 63 60" stroke="#7f1d1d" strokeWidth="1.4" fill="none" opacity="0.55" />
    <path d="M10 56 Q 50 72 90 56 A40 32 0 0 1 10 56 Z" fill={L("wood")} {...O} />
    <path d="M18 70 Q 50 82 82 70" stroke="#5c300b" strokeWidth="1.5" fill="none" opacity="0.5" />
    <ellipse cx="45" cy="35" rx="4.5" ry="2.2" transform="rotate(-20 45 35)" {...SHINE} />
  </>
)

/** The sun half over the water, its light laid across the sea. */
const sunrise = ({ L, R }: Paint) => (
  <>
    <circle cx="50" cy="58" r="40" fill={R("orange")} opacity="0.25" />
    {[-75, -50, -25, 0, 25, 50, 75].map((a) => (
      <path key={a} d="M50 28 L50 18" stroke={solid("orange")} strokeWidth="4" strokeLinecap="round" transform={`rotate(${a} 50 60)`} />
    ))}
    <path d="M25 60 A25 25 0 0 1 75 60 Z" fill={R("amber")} {...O} />
    <path d="M4 60 H96 L96 84 Q 50 96 4 84 Z" fill={L("blue")} {...O} />
    <path d="M34 67 H66 M39 74 H61 M44 81 H56" stroke="#fde68a" strokeWidth="3" strokeLinecap="round" />
    <ellipse cx="40" cy="47" rx="6" ry="3" transform="rotate(-25 40 47)" {...SHINE} />
  </>
)

const handshake = ({ L, R }: Paint) => (
  <>
    <path d={heart(50, 20, 1.05)} fill={R("rose")} {...O} />
    <path d="M2 74 L22 54 L38 70 L18 90 Z" fill={L("teal")} {...O} />
    <path d="M98 74 L78 54 L62 70 L82 90 Z" fill={L("purple")} {...O} />
    {/* The lower hand, palm up, its thumb over the top of the other. */}
    <path d="M26 58 C 34 48, 48 44, 60 46 C 66 47, 68 52, 64 55 L48 58 C 56 62, 62 68, 58 74 C 50 78, 40 76, 32 70 Z" fill={L("skin")} {...O} />
    {/* The upper hand, its fingers wrapped round. */}
    <path d="M74 58 C 68 50, 58 46, 48 48 C 42 50, 40 56, 44 60 C 48 64, 52 66, 54 70 C 56 74, 62 74, 66 70 Z" fill={L("umber")} {...O} />
    <path d="M47 55 C 50 57, 53 62, 52 66 M53 54 C 57 57, 59 62, 58 67 M59 54 C 63 57, 64 62, 63 66" stroke="#3d1f0e" strokeWidth="1.4" fill="none" opacity="0.55" strokeLinecap="round" />
    <path d="M30 60 C 36 54, 44 52, 50 52" stroke="#7a4520" strokeWidth="1.4" fill="none" opacity="0.5" strokeLinecap="round" />
    <ellipse cx="34" cy="56" rx="5" ry="2" transform="rotate(-30 34 56)" {...SHINE} />
  </>
)

/* ── Warm ───────────────────────────────────────────────────────────────────── */

const bouquet = ({ L, R }: Paint) => (
  <>
    <ellipse cx="24" cy="46" rx="7" ry="15" transform="rotate(-45 24 46)" fill={L("green")} {...O} />
    <ellipse cx="76" cy="46" rx="7" ry="15" transform="rotate(45 76 46)" fill={L("green")} {...O} />
    <circle cx="35" cy="38" r="12" fill={R("pink")} {...O} />
    <circle cx="65" cy="38" r="12" fill={R("pink")} {...O} />
    <circle cx="50" cy="26" r="13" fill={R("rose")} {...O} />
    <circle cx="43" cy="48" r="10" fill={R("red")} {...O} />
    <circle cx="57" cy="48" r="10" fill={R("rose")} {...O} />
    {[[35, 38, 5], [65, 38, 5], [50, 26, 5.5], [43, 48, 4], [57, 48, 4]].map(([x, y, r]) => (
      <path key={`${x}${y}`} d={swirl(x, y, r)} stroke="#9f1239" strokeWidth="1.4" fill="none" opacity="0.6" />
    ))}
    <path d="M28 54 L72 54 L55 95 L45 95 Z" fill={L("cream")} {...O} />
    <path d="M36 56 L48 92 M64 56 L52 92" stroke="#d6b98a" strokeWidth="1.3" />
    <path d="M50 70 C 40 60, 32 70, 40 77 Z M50 70 C 60 60, 68 70, 60 77 Z" fill={L("pink")} {...O} />
    <circle cx="50" cy="70" r="3.5" fill={L("rose")} {...O} />
  </>
)

/** A plate of jollof: the red-orange rice heaped, fried plantain at the side, steam rising. */
const jollof = ({ L, R }: Paint) => (
  <>
    {["M36 30 C 32 22, 40 18, 36 10", "M50 28 C 46 20, 54 16, 50 8", "M64 30 C 60 22, 68 18, 64 10"].map((d) => (
      <path key={d} d={d} stroke={solid("stone")} strokeWidth="2.5" fill="none" strokeLinecap="round" opacity="0.7" />
    ))}
    <ellipse cx="50" cy="66" rx="45" ry="19" fill={L("cream")} {...O} />
    <ellipse cx="50" cy="65" rx="35" ry="13" fill="none" stroke="#d6b98a" strokeWidth="1.5" />
    <path d="M16 64 C 18 57, 22 53, 26 51 C 28 47, 32 45, 36 45 C 38 41, 44 39, 48 41 C 52 37, 58 39, 61 42 C 66 41, 70 45, 72 49 C 76 51, 78 57, 78 64 C 64 72, 30 72, 16 64 Z" fill={R("orange")} {...O} />
    {Array.from({ length: 34 }, (_, i) => {
      // Rice grains scattered over the heap, in a fixed pattern so it looks the same every time.
      const x = 22 + ((i * 37) % 54)
      const y = 48 + ((i * 23) % 19)
      return <ellipse key={i} cx={x} cy={y} rx="1.9" ry="1" fill="#fff1e0" opacity="0.8" transform={`rotate(${(i * 47) % 90 - 45} ${x} ${y})`} />
    })}
    <ellipse cx="80" cy="64" rx="9" ry="5" transform="rotate(-25 80 64)" fill={L("amber")} {...O} />
    <ellipse cx="74" cy="71" rx="9" ry="5" transform="rotate(-10 74 71)" fill={L("amber")} {...O} />
    <path d="M40 42 C 44 36, 50 38, 48 44" stroke={solid("green")} strokeWidth="3" fill="none" strokeLinecap="round" />
  </>
)

/** Aso oke: hand-woven cloth, folded, with its gold stripes and fringe. */
const asoOke = ({ L }: Paint) => (
  <>
    <rect x="14" y="50" width="72" height="30" rx="4" fill={L("purple")} {...O} />
    {[20, 24, 28, 32, 36, 40, 44, 48, 52, 56, 60, 64, 68, 72, 76, 80].map((x) => (
      <path key={x} d={`M${x} 80 V90`} stroke={solid("purple")} strokeWidth="2" strokeLinecap="round" />
    ))}
    <path d="M14 60 H86 M14 70 H86" stroke="#f3c969" strokeWidth="2.5" opacity="0.9" />
    <rect x="20" y="22" width="60" height="32" rx="4" fill={L("purple")} {...O} />
    <path d="M30 22 V54 M36 22 V54 M64 22 V54 M70 22 V54" stroke="#f3c969" strokeWidth="2.5" />
    <rect x="45" y="22" width="10" height="32" fill={L("magenta")} />
    {[28, 34, 40, 46].map((y) => (
      <path key={y} d={`M20 ${y} H80`} stroke="#ffffff" strokeWidth="1" opacity="0.25" />
    ))}
    <rect x="20" y="22" width="60" height="32" rx="4" fill="none" {...O} />
    <path d="M20 54 Q 50 60 80 54" stroke="#6b21a8" strokeWidth="1.6" fill="none" opacity="0.6" />
    <ellipse cx="28" cy="27" rx="5" ry="2" {...SHINE} />
  </>
)

/** A woman in a gele, the head tie folded high into a fan of pleats. */
const gele = ({ L, R }: Paint) => (
  <>
    <path d="M24 96 C 26 84, 38 80, 50 80 C 62 80, 74 84, 76 96 Z" fill={L("magenta")} {...O} />
    <rect x="44" y="70" width="12" height="14" fill={L("umber")} {...O} />
    <ellipse cx="50" cy="61" rx="16" ry="19" fill={R("umber")} {...O} />
    <circle cx="34.5" cy="68" r="2.8" fill={L("gold")} {...O} strokeWidth="1" />
    <circle cx="65.5" cy="68" r="2.8" fill={L("gold")} {...O} strokeWidth="1" />
    <path d="M30 56 C 16 40, 22 14, 40 10 C 46 4, 58 4, 62 10 C 80 12, 86 36, 72 56 C 64 46, 38 46, 30 56 Z" fill={L("magenta")} {...O} />
    <path d="M36 49 C 33 34, 40 20, 48 12 M48 47 C 48 32, 52 20, 58 10 M60 47 C 64 34, 70 24, 76 22" stroke="#701a75" strokeWidth="1.8" fill="none" opacity="0.6" />
    <path d="M32 54 C 42 47, 58 47, 68 54" stroke={solid("gold")} strokeWidth="3" fill="none" strokeLinecap="round" />
    <ellipse cx="36" cy="22" rx="3" ry="8" transform="rotate(-25 36 22)" {...SHINE} />
  </>
)

const palmTree = ({ L, R }: Paint) => (
  <>
    <path d="M2 84 Q 26 78 50 84 T 98 84 L98 96 L2 96 Z" fill={L("sky")} {...O} />
    <ellipse cx="48" cy="83" rx="30" ry="7" fill={L("cream")} {...O} />
    <path d="M46 82 C 48 64, 52 46, 59 30 L66 32 C 60 48, 57 64, 56 82 Z" fill={L("wood")} {...O} />
    {[74, 64, 54, 44, 36].map((y, i) => (
      <path key={y} d={`M${47 + i * 2.6} ${y} L${56 + i * 2} ${y - 2}`} stroke="#5c300b" strokeWidth="1.4" opacity="0.6" />
    ))}
    {[
      "M62 30 C 48 20, 30 22, 16 38 C 32 30, 48 30, 62 30 Z",
      "M62 30 C 52 14, 38 8, 24 12 C 40 14, 52 20, 62 30 Z",
      "M62 30 C 66 14, 78 8, 90 12 C 78 16, 70 22, 62 30 Z",
      "M62 30 C 76 22, 90 26, 96 42 C 86 32, 74 30, 62 30 Z",
      "M62 30 C 58 18, 62 8, 70 4 C 66 14, 66 22, 62 30 Z",
    ].map((d) => (
      <path key={d} d={d} fill={L("green")} {...O} />
    ))}
    <circle cx="58" cy="35" r="4.5" fill={R("brown")} {...O} />
    <circle cx="66" cy="36" r="4.5" fill={R("brown")} {...O} />
  </>
)

/** A hurricane lantern: glass globe, wire guard, tank and bail. */
const lantern = ({ L, R }: Paint) => (
  <>
    <circle cx="50" cy="52" r="36" fill={R("amber")} opacity="0.3" />
    <path d="M30 34 C 30 6, 70 6, 70 34" stroke={solid("dark")} strokeWidth="3" fill="none" />
    <path d="M40 28 L60 28 L57 20 L43 20 Z" fill={L("red")} {...O} />
    <ellipse cx="50" cy="52" rx="17" ry="22" fill="#fff7e0" opacity="0.9" {...O} />
    <path d="M50 40 C 57 49, 57 58, 50 63 C 43 58, 43 49, 50 40 Z" fill={R("orange")} />
    <path d="M50 50 C 53 55, 53 59, 50 62 C 47 59, 47 55, 50 50 Z" fill="#fef3c7" />
    <path d="M36 32 C 29 44, 29 60, 36 72 M64 32 C 71 44, 71 60, 64 72" stroke={solid("red")} strokeWidth="2.5" fill="none" />
    <rect x="33" y="28" width="34" height="5" rx="2" fill={L("red")} {...O} />
    <rect x="33" y="70" width="34" height="6" rx="2" fill={L("red")} {...O} />
    <path d="M30 76 L70 76 L74 88 Q 50 94 26 88 Z" fill={L("red")} {...O} />
    <circle cx="74" cy="80" r="3" fill={L("gold")} {...O} strokeWidth="1" />
    <ellipse cx="42" cy="44" rx="2" ry="7" {...SHINE} />
  </>
)

/** A djembe, struck: the beat ringing out beside it. */
const drumBeat = ({ L }: Paint) => (
  <>
    <path d="M78 30 Q 86 40 78 50 M85 22 Q 97 40 85 58" stroke={solid("purple")} strokeWidth="3.5" fill="none" strokeLinecap="round" />
    <path d="M34 8 L37 15 M44 4 V13 M54 8 L51 15" stroke={solid("purple")} strokeWidth="3" strokeLinecap="round" />
    <path d="M16 24 C 16 44, 30 52, 34 58 L30 90 L58 90 L54 58 C 58 52, 72 44, 72 24 Z" fill={L("wood")} {...O} />
    <path d="M20 30 L28 44 L36 30 L44 44 L52 30 L60 44 L68 30" stroke="#fef3c7" strokeWidth="1.6" fill="none" strokeLinejoin="round" />
    <path d="M32 80 H56" stroke="#fef3c7" strokeWidth="2" opacity="0.8" />
    <ellipse cx="44" cy="24" rx="28" ry="8" fill={L("cream")} {...O} />
    <ellipse cx="34" cy="22" rx="7" ry="2" {...SHINE} />
  </>
)

const hibiscus = ({ L, R }: Paint) => (
  <>
    <ellipse cx="22" cy="76" rx="9" ry="18" transform="rotate(55 22 76)" fill={L("green")} {...O} />
    <ellipse cx="80" cy="80" rx="9" ry="18" transform="rotate(-55 80 80)" fill={L("green")} {...O} />
    {[0, 72, 144, 216, 288].map((a) => (
      <ellipse key={a} cx="50" cy="29" rx="17" ry="22" transform={`rotate(${a} 50 50)`} fill={R("red")} {...O} />
    ))}
    {[0, 72, 144, 216, 288].map((a) => (
      <path key={a} d="M50 46 L50 18" stroke="#fecaca" strokeWidth="1.3" opacity="0.6" transform={`rotate(${a} 50 50)`} />
    ))}
    <circle cx="50" cy="50" r="9" fill="#7f1d1d" opacity="0.75" />
    <path d="M50 50 C 58 40, 66 30, 72 22" stroke={solid("amber")} strokeWidth="2.6" fill="none" strokeLinecap="round" />
    {[[72, 21], [76, 18], [69, 17], [75, 24]].map(([x, y]) => (
      <circle key={`${x}${y}`} cx={x} cy={y} r="2.4" fill={L("amber")} />
    ))}
  </>
)

/* ── Bold ───────────────────────────────────────────────────────────────────── */

const fireworks = ({ L }: Paint) => (
  <>
    <path d="M24 96 Q 30 76 34 60" stroke={solid("amber")} strokeWidth="2" strokeDasharray="3 4" fill="none" strokeLinecap="round" />
    {burst(36, 36, 22, "pink", 12)}
    {burst(72, 26, 16, "amber", 10)}
    {burst(68, 66, 14, "sky", 9)}
    <circle cx="36" cy="36" r="5" fill="#ffffff" stroke={solid("pink")} strokeWidth="2" />
    <circle cx="72" cy="26" r="3.5" fill="#ffffff" stroke={solid("amber")} strokeWidth="2" />
    <circle cx="68" cy="66" r="3" fill="#ffffff" stroke={solid("sky")} strokeWidth="2" />
    <path d={star(14, 14, 5)} fill={L("amber")} />
    <path d={star(90, 52, 4)} fill={L("pink")} />
  </>
)

/** An Ife bronze head: the beaded crown and crest, the fine lines down the face. */
const bronzeHead = ({ L }: Paint) => (
  <>
    <path d="M37 76 L38 90 L62 90 L63 76 Z" fill={L("bronze")} {...O} />
    <ellipse cx="50" cy="91" rx="20" ry="4" fill={L("bronze")} {...O} />
    <path d="M30 38 C 30 22, 70 22, 70 38 L70 56 C 70 72, 60 82, 50 82 C 40 82, 30 72, 30 56 Z" fill={L("bronze")} {...O} />
    {[35, 39, 43, 47, 51, 55, 59, 63, 67].map((x) => (
      <path key={x} d={`M${x} 44 V${x < 40 || x > 60 ? 68 : 78}`} stroke="#5a2e12" strokeWidth="0.9" opacity="0.35" />
    ))}
    <path d="M36 51 Q 41 47 46 51 Q 41 54 36 51 Z M54 51 Q 59 47 64 51 Q 59 54 54 51 Z" fill="#3a1a08" opacity="0.75" />
    <path d="M50 53 L47 64 L53 64" stroke="#5a2e12" strokeWidth="1.6" fill="none" strokeLinejoin="round" />
    <path d="M43 70 Q 50 75 57 70" stroke="#5a2e12" strokeWidth="2.4" fill="none" strokeLinecap="round" />
    <path d="M27 42 C 25 14, 75 14, 73 42 C 64 35, 36 35, 27 42 Z" fill={L("bronze")} {...O} />
    <path d="M31 36 C 40 29, 60 29, 69 36 M33 28 C 42 21, 58 21, 67 28" stroke="#f3c6a0" strokeWidth="2.6" strokeDasharray="0.1 4.6" strokeLinecap="round" fill="none" />
    <path d="M44 16 L50 5 L56 16 Z" fill={L("bronze")} {...O} />
    <ellipse cx="38" cy="24" rx="5" ry="2.2" transform="rotate(-20 38 24)" {...SHINE} />
  </>
)

/** The Harmattan: dust on a dry wind, the sun gone pale behind it. */
const harmattan = ({ L, R }: Paint) => (
  <>
    <circle cx="68" cy="30" r="16" fill={R("amber")} opacity="0.45" />
    <path d="M4 82 Q 50 74 96 82 L96 92 Q 50 97 4 92 Z" fill={L("brown")} {...O} />
    <path d="M24 82 C 24 72, 28 66, 36 62" stroke={solid("wood")} strokeWidth="3" fill="none" strokeLinecap="round" />
    <ellipse cx="38" cy="62" rx="7" ry="4" transform="rotate(-20 38 62)" fill={L("lime")} {...O} />
    <ellipse cx="32" cy="68" rx="6" ry="3.5" transform="rotate(-30 32 68)" fill={L("lime")} {...O} />
    {["M6 40 H52 C 62 40, 64 28, 56 26 C 50 24, 48 32, 54 32", "M12 54 H72 C 84 54, 86 40, 76 38 C 70 37, 69 44, 74 45", "M8 68 H48 C 56 68, 58 60, 52 58"].map((d) => (
      <path key={d} d={d} stroke={solid("stone")} strokeWidth="4.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    ))}
    {[[20, 30], [84, 52], [62, 66], [88, 70], [16, 78], [78, 18], [40, 48]].map(([x, y]) => (
      <circle key={`${x}${y}`} cx={x} cy={y} r="2" fill={solid("brown")} opacity="0.55" />
    ))}
  </>
)

/** A market stall: striped awning, the table heaped with tomatoes, oranges and peppers. */
const marketDay = ({ L, R }: Paint) => (
  <>
    <path d="M18 34 V90 M82 34 V90" stroke={solid("wood")} strokeWidth="4" strokeLinecap="round" />
    <path d="M8 22 L50 8 L92 22 Z" fill={L("red")} {...O} />
    <rect x="10" y="22" width="80" height="14" fill={L("red")} />
    {[20, 40, 60, 80].map((x) => (
      <rect key={x} x={x - 10} y="22" width="10" height="14" fill={L("cream")} />
    ))}
    {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
      <path key={i} d={`M${10 + i * 10} 36 a5 5 0 0 0 10 0 Z`} fill={i % 2 ? L("red") : L("cream")} {...O} strokeWidth="1" />
    ))}
    <rect x="10" y="22" width="80" height="14" fill="none" {...O} />
    <rect x="12" y="64" width="76" height="9" rx="2" fill={L("wood")} {...O} />
    <rect x="16" y="73" width="68" height="16" fill={L("wood")} opacity="0.8" {...O} />
    {[[26, 58], [35, 58], [30.5, 51]].map(([x, y]) => (
      <circle key={`${x}${y}`} cx={x} cy={y} r="5.5" fill={R("red")} {...O} strokeWidth="1" />
    ))}
    {[[50, 58], [59, 58], [54.5, 51]].map(([x, y]) => (
      <circle key={`${x}${y}`} cx={x} cy={y} r="5.5" fill={R("orange")} {...O} strokeWidth="1" />
    ))}
    <path d="M68 64 L84 64 L82 54 L70 54 Z" fill={L("amber")} {...O} strokeWidth="1" />
    {[71, 76, 81].map((x) => (
      <ellipse key={x} cx={x} cy="52" rx="2.6" ry="5" fill={L("green")} {...O} strokeWidth="1" />
    ))}
  </>
)

/** A staff of office in gold, its finial a bird looking back over its shoulder. */
const goldenStaff = ({ L, R }: Paint) => (
  <>
    <circle cx="50" cy="24" r="22" fill={R("amber")} opacity="0.3" />
    <rect x="46" y="32" width="8" height="62" rx="4" fill={L("gold")} {...O} />
    {[48, 66, 84].map((y) => (
      <rect key={y} x="43" y={y} width="14" height="5" rx="2" fill={L("gold")} {...O} />
    ))}
    <path d="M40 34 L60 34 L56 28 L44 28 Z" fill={L("gold")} {...O} />
    <path d="M38 20 C 40 12, 56 10, 62 18 C 66 22, 66 28, 58 28 L42 28 C 36 28, 34 24, 38 20 Z" fill={R("gold")} {...O} />
    <path d="M58 18 C 62 12, 58 6, 52 8 C 48 9, 48 14, 52 15" fill={R("gold")} {...O} />
    <path d="M38 20 L28 16 L34 24 Z" fill={L("gold")} {...O} />
    <circle cx="53" cy="10" r="1.4" fill="#5a3b0c" />
    <circle cx="48" cy="14" r="2.8" fill={L("cream")} {...O} strokeWidth="1" />
    <path d={star(24, 40, 5)} fill={L("amber")} />
    <path d={star(76, 44, 4)} fill={L("amber")} />
  </>
)

const victoryDance = ({ L, R }: Paint) => (
  <>
    {[[18, 20, "pink", 20], [82, 16, "amber", -30], [86, 44, "sky", 15], [14, 50, "green", -20], [76, 70, "pink", 40], [22, 74, "amber", 10]].map(([x, y, c, a]) => (
      <rect key={`${x}${y}`} x={Number(x) - 3} y={Number(y) - 1.6} width="6" height="3.2" rx="1" fill={solid(c as Colour)} transform={`rotate(${a} ${x} ${y})`} />
    ))}
    <path d="M44 44 L30 22 M56 44 L70 22" stroke={solid("umber")} strokeWidth="6" strokeLinecap="round" />
    <circle cx="30" cy="21" r="3.6" fill={L("umber")} />
    <circle cx="70" cy="21" r="3.6" fill={L("umber")} />
    <path d="M44 74 L40 92 M56 74 L68 86" stroke={solid("umber")} strokeWidth="6" strokeLinecap="round" />
    <path d="M42 42 L58 42 L68 76 L32 76 Z" fill={L("purple")} {...O} />
    <path d="M36 64 L64 64" stroke="#f3c969" strokeWidth="2.4" />
    <circle cx="50" cy="32" r="9" fill={R("umber")} {...O} />
    <path d="M24 48 Q 19 57 24 66 M76 48 Q 81 57 76 66" stroke={solid("purple")} strokeWidth="2.5" fill="none" strokeLinecap="round" />
  </>
)

/* ── Rare ───────────────────────────────────────────────────────────────────── */

/** Zuma Rock, rising out of the savannah, streaked down its face. */
const zumaRock = ({ L, R }: Paint) => (
  <>
    <path d="M2 80 Q 50 72 98 80 L98 92 Q 50 98 2 92 Z" fill={L("lime")} {...O} />
    <path d="M14 82 C 14 50, 26 18, 54 16 C 78 16, 88 44, 88 82 Z" fill={L("stone")} {...O} />
    {["M34 28 C 30 46, 30 64, 32 80", "M48 18 C 46 36, 46 60, 48 80", "M62 18 C 66 36, 66 60, 64 80", "M76 32 C 80 48, 80 66, 78 80", "M24 46 C 22 60, 22 70, 24 80"].map((d) => (
      <path key={d} d={d} stroke="#334155" strokeWidth="1.6" fill="none" opacity="0.3" />
    ))}
    <path d="M40 46 Q 44 43 48 46 M56 46 Q 60 43 64 46 M46 60 Q 52 63 58 60" stroke="#334155" strokeWidth="2" fill="none" opacity="0.35" strokeLinecap="round" />
    <path d="M10 80 V72" stroke={solid("wood")} strokeWidth="2.4" />
    <circle cx="10" cy="68" r="6" fill={R("green")} {...O} />
    <path d="M92 80 V73" stroke={solid("wood")} strokeWidth="2.4" />
    <circle cx="92" cy="69" r="5" fill={R("green")} {...O} />
    <ellipse cx="40" cy="26" rx="8" ry="3" transform="rotate(-30 40 26)" {...SHINE} />
  </>
)

/** The Niger winding through green land, a canoe on the water. */
const riverNiger = ({ L, R }: Paint) => (
  <>
    <rect x="6" y="10" width="88" height="80" rx="14" fill={L("lime")} {...O} />
    <path d="M44 10 C 40 28, 60 36, 54 52 C 48 68, 26 72, 22 90 L62 90 C 62 76, 80 66, 76 50 C 72 34, 54 28, 58 10 Z" fill={L("blue")} {...O} />
    <path d="M52 22 C 54 28, 62 34, 64 42 M60 56 C 56 64, 46 70, 40 76" stroke="#ffffff" strokeWidth="1.6" fill="none" opacity="0.55" strokeLinecap="round" />
    <path d="M36 66 Q 47 76 60 66 L58 64 Q 47 71 38 64 Z" fill={L("wood")} {...O} />
    {[[18, 26], [26, 44], [84, 28], [86, 70], [16, 64]].map(([x, y]) => (
      <circle key={`${x}${y}`} cx={x} cy={y} r="5" fill={R("green")} {...O} strokeWidth="1" />
    ))}
  </>
)

/** Strands of coral beads, gathered on a gold cord, a gold bead at the centre. */
const coralBeads = ({ R }: Paint) => {
  const strand = (r: number, count: number, size: number) =>
    Array.from({ length: count }, (_, i) => {
      const a = Math.PI * (0.12 + (0.76 * i) / (count - 1))
      return <circle key={`${r}-${i}`} cx={50 - r * Math.cos(a)} cy={22 + r * Math.sin(a) * 0.95} r={size} fill={R("coral")} {...O} strokeWidth="1" />
    })
  return (
    <>
      <path d="M14 35 C 18 10, 82 10, 86 35" stroke={solid("gold")} strokeWidth="2.4" fill="none" />
      {strand(36, 15, 4.6)}
      {strand(26, 11, 4.2)}
      {strand(16, 8, 3.8)}
      <circle cx="50" cy="56" r="6" fill={R("gold")} {...O} />
      <ellipse cx="48" cy="54" rx="2" ry="1.2" {...SHINE} />
    </>
  )
}

/** A Benin bronze plaque: a figure cast in relief, rosettes at the corners. */
const beninBronze = ({ L, R }: Paint) => (
  <>
    <rect x="16" y="8" width="68" height="84" rx="4" fill={L("bronze")} {...O} />
    <rect x="22" y="14" width="56" height="72" rx="2" fill="#5a2e12" opacity="0.28" />
    {[[28, 20], [72, 20], [28, 80], [72, 80]].map(([x, y]) => (
      <g key={`${x}${y}`} fill="#f3c6a0" opacity="0.9">
        <circle cx={x - 2.6} cy={y} r="2" />
        <circle cx={x + 2.6} cy={y} r="2" />
        <circle cx={x} cy={y - 2.6} r="2" />
        <circle cx={x} cy={y + 2.6} r="2" />
      </g>
    ))}
    <ellipse cx="34" cy="56" rx="7" ry="11" fill={R("bronze")} {...O} />
    <path d="M64 76 L68 26" stroke="#f3c6a0" strokeWidth="2.4" strokeLinecap="round" />
    <path d="M40 76 L43 46 L57 46 L60 76 Z" fill={R("bronze")} {...O} />
    <path d="M43 46 C 44 42, 56 42, 57 46" stroke="#f3c6a0" strokeWidth="2.4" strokeDasharray="0.1 3.6" strokeLinecap="round" fill="none" />
    <path d="M57 52 L65 44" stroke={solid("bronze")} strokeWidth="4" strokeLinecap="round" />
    <circle cx="50" cy="34" r="8" fill={R("bronze")} {...O} />
    <path d="M42 30 C 42 20, 58 20, 58 30 Z" fill={L("bronze")} {...O} />
    <ellipse cx="30" cy="16" rx="5" ry="2" {...SHINE} />
  </>
)

/** A great hornbill on a branch: the long curved bill and the casque above it. */
const hornbill = ({ L, R }: Paint) => (
  <>
    <path d="M6 82 Q 50 72 94 84" stroke={solid("wood")} strokeWidth="6" fill="none" strokeLinecap="round" />
    <path d="M30 64 L10 88 L22 90 L38 70 Z" fill={L("dark")} {...O} />
    <path d="M42 70 L40 78 M50 68 L50 77" stroke={solid("amber")} strokeWidth="2.4" strokeLinecap="round" />
    <ellipse cx="44" cy="56" rx="20" ry="15" transform="rotate(-25 44 56)" fill={R("dark")} {...O} />
    <path d="M30 63 C 40 67, 52 63, 58 54" stroke="#ffffff" strokeWidth="4" fill="none" opacity="0.85" strokeLinecap="round" />
    <circle cx="59" cy="34" r="11" fill={R("dark")} {...O} />
    <path d="M66 30 C 78 30, 91 38, 96 52 C 86 45, 77 43, 67 40 Z" fill={L("amber")} {...O} />
    <path d="M60 24 C 70 17, 85 21, 90 32 C 82 28, 72 28, 66 30 Z" fill={L("orange")} {...O} />
    <circle cx="61" cy="33" r="2.8" fill="#ffffff" />
    <circle cx="61.6" cy="33" r="1.4" fill="#0f172a" />
  </>
)

/** A deep-blue wave rolling over, a sapphire riding its crest. */
const sapphireTide = ({ L }: Paint) => {
  const g = gem(80, 18, 0.95)
  return (
    <>
      <path d="M2 84 Q 26 78 50 84 T 98 84 L98 94 L2 94 Z" fill={L("night")} {...O} />
      <path d="M6 84 C 10 60, 26 40, 48 32 C 68 25, 86 34, 86 50 C 86 60, 72 63, 68 55 C 65 49, 71 44, 76 48 C 73 40, 61 39, 54 47 C 45 57, 47 74, 60 84 Z" fill={L("blue")} {...O} />
      <path d="M14 70 C 18 54, 30 42, 48 36 C 64 31, 80 36, 84 46" stroke="#ffffff" strokeWidth="2.4" fill="none" opacity="0.6" strokeLinecap="round" />
      <path d={g.body} fill={L("blue")} {...O} />
      <path d={g.facets} stroke="#ffffff" strokeWidth="1.1" fill="none" opacity="0.6" />
      <path d={star(66, 10, 3.5)} fill="#ffffff" />
    </>
  )
}

/** A grove of emerald-green trees, an emerald set before them. */
const emeraldGrove = ({ L, R }: Paint) => {
  const g = gem(50, 74, 0.9)
  return (
    <>
      <ellipse cx="50" cy="86" rx="42" ry="8" fill={L("lime")} {...O} />
      {[[28, 84, 66], [72, 84, 66], [50, 84, 58]].map(([x, y, top]) => (
        <rect key={x} x={x - 3} y={top} width="6" height={y - top} rx="2" fill={L("wood")} {...O} strokeWidth="1" />
      ))}
      <ellipse cx="28" cy="48" rx="13" ry="22" fill={R("emerald")} {...O} />
      <ellipse cx="72" cy="48" rx="13" ry="22" fill={R("emerald")} {...O} />
      <ellipse cx="50" cy="36" rx="16" ry="28" fill={R("emerald")} {...O} />
      <path d={g.body} fill={L("emerald")} {...O} />
      <path d={g.facets} stroke="#ffffff" strokeWidth="1.1" fill="none" opacity="0.6" />
      <ellipse cx="44" cy="20" rx="4" ry="8" transform="rotate(-20 44 20)" {...SHINE} />
    </>
  )
}

/* ── Legendary ──────────────────────────────────────────────────────────────── */

const bloomingRose = ({ L, R }: Paint) => (
  <>
    <path d="M50 54 C 48 68, 52 80, 50 96" stroke={solid("green")} strokeWidth="4" fill="none" strokeLinecap="round" />
    <ellipse cx="38" cy="76" rx="6" ry="13" transform="rotate(-55 38 76)" fill={L("green")} {...O} />
    <ellipse cx="62" cy="84" rx="6" ry="13" transform="rotate(55 62 84)" fill={L("green")} {...O} />
    <path d="M18 32 C 14 52, 32 64, 50 62 C 68 64, 86 52, 82 32 C 72 42, 60 44, 50 44 C 40 44, 28 42, 18 32 Z" fill={R("rose")} {...O} />
    <path d="M30 32 C 30 16, 42 8, 50 11 C 58 8, 70 16, 70 32 C 70 46, 60 54, 50 54 C 40 54, 30 46, 30 32 Z" fill={R("red")} {...O} />
    <path d="M30 32 C 38 40, 62 40, 70 32" stroke="#9f1239" strokeWidth="1.6" fill="none" opacity="0.7" />
    <path d="M50 20 C 59 20, 61 31, 52 33 C 45 34, 43 26, 50 25" stroke="#7f1d1d" strokeWidth="1.8" fill="none" strokeLinecap="round" />
    <path d={drop(36, 46, 0.6)} fill={L("sky")} />
    <path d={star(82, 14, 5)} fill={L("gold")} />
    <ellipse cx="40" cy="20" rx="5" ry="2.4" transform="rotate(-35 40 20)" {...SHINE} />
  </>
)

/** The flame that does not go out, burning in a gold bowl on its stand. */
const eternalFlame = ({ L, R }: Paint) => (
  <>
    <circle cx="50" cy="40" r="36" fill={R("amber")} opacity="0.3" />
    <path d="M50 4 C 66 22, 74 36, 70 50 C 68 58, 60 62, 50 62 C 40 62, 32 58, 30 50 C 26 38, 38 30, 40 18 C 44 26, 46 30, 50 4 Z" fill={R("orange")} {...O} />
    <path d="M50 26 C 60 38, 62 48, 58 56 C 56 60, 53 62, 50 62 C 44 62, 40 57, 40 51 C 40 44, 46 40, 50 26 Z" fill={R("amber")} />
    <path d="M50 44 C 54 50, 54 56, 50 60 C 46 56, 46 50, 50 44 Z" fill="#fef3c7" />
    <path d="M24 58 L76 58 C 74 70, 64 76, 50 76 C 36 76, 26 70, 24 58 Z" fill={L("gold")} {...O} />
    <ellipse cx="50" cy="58" rx="26" ry="5" fill={L("gold")} {...O} />
    <path d="M46 76 L44 88 L56 88 L54 76 Z" fill={L("gold")} {...O} />
    <ellipse cx="50" cy="90" rx="16" ry="4" fill={L("gold")} {...O} />
    <ellipse cx="34" cy="64" rx="4" ry="2" {...SHINE} />
  </>
)

/** The sun breaking through the clouds, its beams fanned across the sky. */
const risingSun = ({ L, R }: Paint) => (
  <>
    {Array.from({ length: 11 }, (_, i) => {
      const a = ((-170 + i * 16) * Math.PI) / 180
      const len = i % 2 ? 34 : 45
      const w = (4 * Math.PI) / 180
      const p = (angle: number, r: number) => `${50 + Math.cos(angle) * r} ${58 + Math.sin(angle) * r}`
      return <path key={i} d={`M${p(a - w, 24)} L${p(a, len)} L${p(a + w, 24)} Z`} fill={solid("amber")} opacity="0.75" />
    })}
    <circle cx="50" cy="58" r="22" fill={R("amber")} {...O} />
    <ellipse cx="42" cy="47" rx="7" ry="3.5" transform="rotate(-30 42 47)" {...SHINE} />
    <path d="M4 74 C 4 64, 18 62, 24 68 C 28 58, 44 58, 48 66 C 54 58, 70 60, 72 68 C 80 62, 96 66, 96 76 L96 84 Q 50 92 4 84 Z" fill={L("cream")} {...O} />
  </>
)

/** Three gold strokes drawn on ochre earth, the old symbols around them. */
const ancestralMark = ({ R }: Paint) => (
  <>
    <circle cx="50" cy="50" r="43" fill={R("earth")} {...O} />
    <circle cx="50" cy="50" r="35" fill="none" stroke="#f3c969" strokeWidth="1.4" opacity="0.4" />
    <path d="M37 28 C 40 42, 40 58, 37 72" stroke={solid("gold")} strokeWidth="5" fill="none" strokeLinecap="round" />
    <path d="M50 22 C 53 40, 53 60, 50 78" stroke={solid("gold")} strokeWidth="6" fill="none" strokeLinecap="round" />
    <path d="M63 28 C 60 42, 60 58, 63 72" stroke={solid("gold")} strokeWidth="5" fill="none" strokeLinecap="round" />
    <g stroke="#f3c969" strokeWidth="1.8" fill="none" opacity="0.85" strokeLinecap="round">
      <path d="M22 50 L26 45 L30 50 L26 55 Z" />
      <path d="M74 50 H82 M78 46 V54" />
      <path d="M44 12 L47 9 L50 12 L53 9 L56 12" />
      <path d="M44 88 L56 88" />
    </g>
  </>
)

/** The golden staff of the storm, its orb charged, lightning out of the cloud behind. */
const thunderStaff = ({ L, R }: Paint) => (
  <>
    <path d="M14 34 C 4 34, 4 20, 14 18 C 14 8, 30 4, 36 12 C 42 2, 62 4, 64 14 C 76 10, 88 20, 82 32 Z" fill={L("night")} {...O} />
    <path d="M72 32 L62 50 L70 50 L60 72" stroke="#fde68a" strokeWidth="3.5" fill="none" strokeLinejoin="round" strokeLinecap="round" />
    <path d="M22 34 L16 46 L22 46 L16 58" stroke="#fde68a" strokeWidth="2.6" fill="none" strokeLinejoin="round" strokeLinecap="round" />
    <circle cx="44" cy="44" r="15" fill={R("purple")} opacity="0.35" />
    <rect x="40" y="52" width="8" height="42" rx="4" fill={L("gold")} {...O} />
    {[64, 80].map((y) => (
      <rect key={y} x="37" y={y} width="14" height="5" rx="2" fill={L("gold")} {...O} />
    ))}
    <path d="M35 46 C 35 56, 53 56, 53 46" stroke={solid("gold")} strokeWidth="4" fill="none" strokeLinecap="round" />
    <circle cx="44" cy="44" r="8.5" fill={R("purple")} {...O} />
    <path d="M30 36 L34 39 L31 42 M58 36 L54 39 L57 42" stroke="#c4b5fd" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    <ellipse cx="41" cy="40" rx="2.6" ry="1.6" {...SHINE} />
  </>
)

/** A skyline at night, its windows lit, under the moon and stars. */
const cityOfLights = ({ L }: Paint) => {
  const towers = [
    { x: 14, y: 54, w: 14 },
    { x: 26, y: 40, w: 14 },
    { x: 41, y: 26, w: 17 },
    { x: 58, y: 46, w: 12 },
    { x: 69, y: 36, w: 17 },
  ]
  return (
    <>
      <rect x="6" y="8" width="88" height="84" rx="14" fill={L("night")} {...O} />
      <circle cx="74" cy="22" r="6" fill="#fef3c7" />
      <circle cx="77" cy="20" r="5" fill="#3730a3" />
      {[[20, 18], [34, 26], [58, 14], [86, 34], [14, 38]].map(([x, y]) => (
        <circle key={`${x}${y}`} cx={x} cy={y} r="1.3" fill="#fef3c7" />
      ))}
      {towers.map(({ x, y, w }) => (
        <g key={x}>
          <rect x={x} y={y} width={w} height={92 - y} fill={L("dark")} {...O} strokeWidth="1" />
          {Array.from({ length: Math.floor((88 - y) / 7) }, (_, row) =>
            Array.from({ length: Math.floor((w - 4) / 5) }, (_, col) =>
              (row + col + x) % 3 === 0 ? null : (
                <rect key={`${row}-${col}`} x={x + 3 + col * 5} y={y + 4 + row * 7} width="2.6" height="3.4" fill="#fde68a" />
              ),
            ),
          )}
        </g>
      ))}
      <rect x="6" y="8" width="88" height="84" rx="14" fill="none" {...O} />
    </>
  )
}

/** The phoenix rising from its flames, wings of fire spread wide. */
const phoenixRise = ({ L, R }: Paint) => {
  const wing = (
    <>
      <path d="M46 48 C 34 30, 18 22, 4 24 C 12 30, 16 34, 18 40 C 10 40, 7 44, 7 50 C 20 47, 32 50, 46 58 Z" fill={L("red")} {...O} />
      <path d="M44 50 C 36 40, 26 34, 16 33 C 22 38, 26 42, 28 48 C 34 48, 40 51, 44 54 Z" fill={L("amber")} />
    </>
  )
  return (
    <>
      <circle cx="50" cy="50" r="40" fill={R("amber")} opacity="0.25" />
      <path d="M48 60 C 40 72, 30 80, 18 84 C 32 86, 42 78, 49 66 Z" fill={L("amber")} {...O} />
      <path d="M52 60 C 60 72, 70 80, 82 84 C 68 86, 58 78, 51 66 Z" fill={L("amber")} {...O} />
      <path d="M50 58 C 44 72, 46 86, 50 97 C 54 86, 56 72, 50 58 Z" fill={L("orange")} {...O} />
      {wing}
      <g transform="translate(100 0) scale(-1 1)">{wing}</g>
      <ellipse cx="50" cy="50" rx="8" ry="14" fill={R("amber")} {...O} />
      <path d="M46 26 C 44 18, 48 14, 50 10 C 52 16, 56 18, 54 26 Z" fill={L("orange")} {...O} />
      <circle cx="50" cy="32" r="7" fill={R("orange")} {...O} />
      <path d="M50 35 L47 41 L53 41 Z" fill={L("amber")} {...O} strokeWidth="1" />
      <circle cx="52.4" cy="31" r="1.4" fill="#1e1b4b" />
    </>
  )
}

/** Rain falling on the earth, and new shoots rising out of it. */
const earthHarvest = ({ L }: Paint) => (
  <>
    <path d="M22 32 C 12 32, 10 20, 20 18 C 22 8, 38 6, 44 14 C 50 6, 68 8, 68 20 C 80 18, 86 32, 74 34 Z" fill={L("stone")} {...O} />
    {[[26, 44], [40, 50], [54, 44], [68, 50], [33, 58], [61, 60]].map(([x, y]) => (
      <path key={`${x}${y}`} d={drop(x, y, 0.75)} fill={L("sky")} {...O} strokeWidth="1" />
    ))}
    <path d="M6 74 Q 50 64 94 74 L94 88 Q 50 96 6 88 Z" fill={L("earth")} {...O} />
    {[[30, 70, 58], [50, 68, 50], [70, 70, 58]].map(([x, base, top]) => (
      <g key={x}>
        <path d={`M${x} ${base} V${top}`} stroke={solid("green")} strokeWidth="3" strokeLinecap="round" />
        <ellipse cx={x - 5} cy={top + 2} rx="6" ry="3.2" transform={`rotate(-25 ${x - 5} ${top + 2})`} fill={L("green")} {...O} strokeWidth="1" />
        <ellipse cx={x + 5} cy={top - 1} rx="6" ry="3.2" transform={`rotate(25 ${x + 5} ${top - 1})`} fill={L("green")} {...O} strokeWidth="1" />
      </g>
    ))}
  </>
)

/* ── Treasures without a scene of their own ────────────────────────────────── */

/** The mbira: metal keys fanned over a wooden board, set in a carved gourd resonator. */
const mbira = ({ L, R }: Paint) => (
  <>
    <rect x="24" y="12" width="52" height="52" rx="6" fill={L("wood")} {...O} />
    {Array.from({ length: 9 }, (_, i) => {
      // The longest keys at the middle, shorter toward the edges, as the instrument is tuned.
      const x = 30 + i * 5
      const top = 18 + Math.abs(i - 4) * 3.2
      return <rect key={i} x={x - 1.5} y={top} width="3" height={58 - top} rx="1.5" fill={L("stone")} stroke="rgba(40,22,10,0.35)" strokeWidth="0.6" />
    })}
    <rect x="26" y="38" width="48" height="5" rx="2" fill={L("dark")} {...O} strokeWidth="1" />
    <path d="M8 52 Q 50 66 92 52 A42 40 0 0 1 8 52 Z" fill={R("brown")} {...O} />
    <path d="M16 66 L22 61 L28 66 L34 61 L40 66 L46 61 L52 66 L58 61 L64 66 L70 61 L76 66 L82 61 L86 64" stroke="#4a2c0a" strokeWidth="1.6" fill="none" opacity="0.55" strokeLinejoin="round" />
    {[[30, 78], [50, 82], [70, 78]].map(([x, y]) => (
      <circle key={x} cx={x} cy={y} r="4" fill="none" stroke="#4a2c0a" strokeWidth="1.4" opacity="0.5" />
    ))}
    {[18, 34, 50, 66, 82].map((x) => (
      <circle key={x} cx={x} cy={x === 50 ? 58.5 : x === 34 || x === 66 ? 57.5 : 55} r="2.2" fill={L("gold")} {...O} strokeWidth="0.8" />
    ))}
    <ellipse cx="26" cy="68" rx="4" ry="2" transform="rotate(35 26 68)" {...SHINE} />
  </>
)

/** An Oldowan chopper: a cobble with one edge knapped sharp, on a plinth in a spotlight. */
const oldowanChopper = ({ L }: Paint) => (
  <>
    <path d="M40 0 L60 0 L86 70 L14 70 Z" fill="#fde68a" opacity="0.2" />
    {[[16, 20], [84, 26], [24, 44], [78, 52], [12, 60], [90, 12]].map(([x, y]) => (
      <circle key={`${x}${y}`} cx={x} cy={y} r="1.6" fill={solid("amber")} />
    ))}
    <path d="M14 70 L86 70 L80 92 L20 92 Z" fill={L("dark")} {...O} />
    <path d="M14 70 L86 70 L80 64 L20 64 Z" fill={L("stone")} {...O} />
    {/* The cobble: smooth on the left where the hand held it, flaked to an edge on the right. */}
    <path d="M20 56 C 18 44, 28 30, 44 26 C 58 22, 74 26, 80 36 L75 43 L80 50 L73 56 L76 62 C 62 70, 28 70, 20 56 Z" fill={L("flint")} {...O} />
    {/* Flake scars, each a shallow scoop catching the light or the shade in turn. */}
    <path d="M80 36 C 69 36, 65 43, 75 43 Z" fill="#ffffff" opacity="0.32" />
    <path d="M75 43 C 64 45, 66 51, 80 50 Z" fill="#4a3f33" opacity="0.28" />
    <path d="M80 50 C 67 52, 65 57, 73 56 Z" fill="#ffffff" opacity="0.32" />
    <path d="M73 56 C 64 58, 65 63, 76 62 Z" fill="#4a3f33" opacity="0.28" />
    <path d="M58 24 C 58 34, 70 36, 80 36 C 74 28, 66 24, 58 24 Z" fill="#ffffff" opacity="0.22" />
    <path d="M80 36 L75 43 L80 50 L73 56 L76 62" stroke="#ffffff" strokeWidth="1.3" fill="none" opacity="0.75" strokeLinejoin="round" />
    <ellipse cx="34" cy="42" rx="7" ry="3" transform="rotate(-35 34 42)" {...SHINE} />
  </>
)

/** A heart rising like the sun over green hills, a healing cross on it. */
const healingHorizon = ({ L, R }: Paint) => (
  <>
    <circle cx="50" cy="56" r="42" fill={R("teal")} opacity="0.2" />
    {[-70, -45, -20, 0, 20, 45, 70].map((a) => (
      <path key={a} d="M50 22 L50 12" stroke={solid("amber")} strokeWidth="3.5" strokeLinecap="round" transform={`rotate(${a} 50 52)`} />
    ))}
    <path d={heart(50, 45, 2.1)} fill={R("rose")} {...O} />
    <path d="M50 34 V50 M42 42 H58" stroke="#ffffff" strokeWidth="4.5" strokeLinecap="round" />
    <path d="M8 66 Q 28 50 54 64 T 92 60 Q 96 80 80 88 Q 50 98 20 88 Q 4 80 8 66 Z" fill={L("teal")} {...O} />
    <path d="M10 78 Q 34 62 62 74 T 90 72 Q 88 86 72 92 Q 50 98 28 92 Q 12 88 10 78 Z" fill={L("green")} {...O} />
    <ellipse cx="40" cy="31" rx="4" ry="2" transform="rotate(-35 40 31)" {...SHINE} />
  </>
)

/** Morning air: a soft breeze curling past a low sun, dew on a fresh leaf. */
const breathOfMorning = ({ L, R }: Paint) => (
  <>
    <circle cx="50" cy="50" r="44" fill={R("sky")} opacity="0.35" />
    <circle cx="70" cy="30" r="13" fill={R("amber")} {...O} />
    <ellipse cx="66" cy="25" rx="4" ry="2" transform="rotate(-30 66 25)" {...SHINE} />
    {[
      "M8 44 C 24 36, 40 50, 56 44 C 66 40, 66 30, 58 30 C 52 30, 52 38, 58 38",
      "M14 58 C 32 50, 50 64, 70 56 C 80 52, 82 44, 76 42",
      "M22 70 C 36 64, 48 72, 60 68",
    ].map((d) => (
      <path key={d} d={d} stroke={solid("sky")} strokeWidth="4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    ))}
    <path d="M30 92 C 28 82, 30 76, 36 72" stroke={solid("green")} strokeWidth="3" fill="none" strokeLinecap="round" />
    <path d="M34 74 C 40 62, 56 58, 66 62 C 60 74, 46 80, 34 74 Z" fill={L("green")} {...O} />
    <path d="M36 73 C 46 68, 54 65, 64 63" stroke="#14532d" strokeWidth="1.2" fill="none" opacity="0.5" />
    <path d={drop(56, 74, 0.7)} fill={L("sky")} {...O} strokeWidth="1" />
  </>
)

/** One band of a broad collar: an arc under the neck, outlined, in its own colour. */
const collarBand = (r: number, colour: Colour, width: number) => {
  const d = `M${50 - r} 26 A${r} ${r * 0.9} 0 0 0 ${50 + r} 26`
  return (
    <g key={r}>
      <path d={d} stroke="rgba(40,22,10,0.5)" strokeWidth={width + 1.6} fill="none" />
      <path d={d} stroke={solid(colour)} strokeWidth={width} fill="none" />
    </g>
  )
}

/** A Nubian broad collar in gold, turquoise and lapis, a winged scarab hanging at its centre. */
const nubianJewellery = ({ L, R }: Paint) => (
  <>
    <circle cx="50" cy="50" r="44" fill={R("dark")} {...O} />
    {collarBand(16, "gold", 5)}
    {collarBand(22, "teal", 5)}
    {collarBand(28, "gold", 5)}
    {collarBand(34, "blue", 5)}
    {Array.from({ length: 13 }, (_, i) => {
      // Gold drops along the outer edge, as the collar's fringe.
      const a = Math.PI * (i / 12)
      return <circle key={i} cx={50 - 40 * Math.cos(a)} cy={26 + 40 * 0.9 * Math.sin(a)} r="3" fill={R("gold")} {...O} strokeWidth="0.8" />
    })}
    <path d="M50 62 C 40 56, 28 58, 24 64 C 32 66, 40 68, 46 70 Z M50 62 C 60 56, 72 58, 76 64 C 68 66, 60 68, 54 70 Z" fill={L("gold")} {...O} />
    <circle cx="50" cy="58" r="4" fill={R("red")} {...O} strokeWidth="1" />
    <ellipse cx="50" cy="72" rx="6.5" ry="9" fill={R("teal")} {...O} />
    <path d="M50 64 V81 M44 70 H56" stroke="#115e59" strokeWidth="1.2" opacity="0.6" />
    <ellipse cx="47" cy="68" rx="1.6" ry="2.6" {...SHINE} />
  </>
)

/** A Mossi horseman in bronze: the rider upright with his spear, on a horse at the walk. */
const mossiHorseman = ({ L, R }: Paint) => (
  <>
    <rect x="18" y="86" width="64" height="8" rx="2" fill={L("bronze")} {...O} />
    <path d="M31 52 C 22 58, 20 68, 22 78" stroke={solid("bronze")} strokeWidth="4" fill="none" strokeLinecap="round" />
    {[[34, 60, 86], [41, 62, 86], [63, 62, 86], [70, 60, 86]].map(([x, top, foot]) => (
      <rect key={x} x={x - 2.4} y={top} width="4.8" height={foot - top} rx="2" fill={L("bronze")} {...O} strokeWidth="1" />
    ))}
    <ellipse cx="52" cy="56" rx="22" ry="11" fill={R("bronze")} {...O} />
    <path d="M62 50 L70 32 L78 34 L74 56 Z" fill={L("bronze")} {...O} />
    <path d="M70 32 C 74 27, 80 27, 84 33 L91 46 C 91 50, 86 52, 83 49 L76 41 Z" fill={R("bronze")} {...O} />
    <path d="M71 29 L72 22 L76 28" fill={L("bronze")} {...O} strokeWidth="1" />
    <path d="M64 48 C 65 42, 67 36, 70 32" stroke="#5a2e12" strokeWidth="2.2" fill="none" opacity="0.55" strokeLinecap="round" />
    <circle cx="79" cy="35" r="1.3" fill="#3a1a08" />
    <path d="M50 46 L54 64" stroke={solid("bronze")} strokeWidth="5" strokeLinecap="round" />
    <path d="M60 2 V62" stroke={solid("bronze")} strokeWidth="2.4" strokeLinecap="round" />
    <path d="M60 0 L63 9 L57 9 Z" fill={L("bronze")} {...O} strokeWidth="1" />
    <path d="M44 46 L46 28 L56 28 L56 46 Z" fill={L("bronze")} {...O} />
    <path d="M55 32 L60 38" stroke={solid("bronze")} strokeWidth="4" strokeLinecap="round" />
    <circle cx="51" cy="22" r="5.5" fill={R("bronze")} {...O} />
    <path d="M45 20 C 46 13, 56 13, 57 20 Z" fill={L("bronze")} {...O} strokeWidth="1" />
    <ellipse cx="46" cy="52" rx="7" ry="2.4" transform="rotate(-10 46 52)" {...SHINE} />
  </>
)

/** A Swahili incense burner in brass: a footed bowl, its pierced dome lid, smoke rising. */
const swahiliIncenseBurner = ({ L, R }: Paint) => (
  <>
    {["M44 18 C 36 10, 46 6, 40 0", "M56 18 C 64 10, 54 6, 60 0", "M50 16 C 46 10, 54 6, 50 0"].map((d) => (
      <path key={d} d={d} stroke={solid("stone")} strokeWidth="2.6" fill="none" strokeLinecap="round" opacity="0.6" />
    ))}
    <path d="M24 54 C 10 54, 10 68, 26 66 M76 54 C 90 54, 90 68, 74 66" stroke={solid("brass")} strokeWidth="3.5" fill="none" strokeLinecap="round" />
    <path d="M36 92 L64 92 L58 80 L42 80 Z" fill={L("brass")} {...O} />
    <ellipse cx="50" cy="92" rx="16" ry="3" fill={L("brass")} {...O} />
    <rect x="46" y="70" width="8" height="12" fill={L("brass")} {...O} />
    <path d="M24 52 L76 52 C 74 66, 64 73, 50 73 C 36 73, 26 66, 24 52 Z" fill={L("brass")} {...O} />
    <path d="M28 60 Q 50 66 72 60" stroke="#6b4a12" strokeWidth="1.4" fill="none" opacity="0.55" />
    <path d="M28 52 C 28 32, 72 32, 72 52 Z" fill={R("brass")} {...O} />
    {[[38, 46], [50, 44], [62, 46], [44, 40], [56, 40]].map(([x, y]) => (
      <path key={`${x}${y}`} d={drop(x, y, 0.55)} fill="#6b4a12" opacity="0.7" />
    ))}
    <ellipse cx="50" cy="52" rx="26" ry="3.5" fill={L("brass")} {...O} />
    <path d="M46 36 L50 22 L54 36 Z" fill={L("brass")} {...O} />
    <circle cx="50" cy="20" r="3.2" fill={R("brass")} {...O} strokeWidth="1" />
    <ellipse cx="38" cy="40" rx="4" ry="2" transform="rotate(-35 38 40)" {...SHINE} />
  </>
)

/** A Kissi pomdo: a small soapstone figure, seated, its head large, eyes wide. */
const kissiFigure = ({ L, R }: Paint) => (
  <>
    <circle cx="50" cy="50" r="42" fill={R("amber")} opacity="0.18" />
    <ellipse cx="50" cy="90" rx="26" ry="5" fill={L("soapstone")} {...O} />
    <path d="M37 50 C 35 62, 37 76, 41 88 L59 88 C 63 76, 65 62, 63 50 Z" fill={L("soapstone")} {...O} />
    <circle cx="40" cy="74" r="8" fill={R("soapstone")} {...O} />
    <circle cx="60" cy="74" r="8" fill={R("soapstone")} {...O} />
    <path d="M38 54 C 32 62, 34 70, 41 69 M62 54 C 68 62, 66 70, 59 69" stroke={solid("soapstone")} strokeWidth="5" fill="none" strokeLinecap="round" />
    <ellipse cx="50" cy="30" rx="17" ry="19" fill={R("soapstone")} {...O} />
    <path d="M33 26 C 34 12, 66 12, 67 26 C 58 20, 42 20, 33 26 Z" fill={L("soapstone")} {...O} />
    <ellipse cx="43" cy="31" rx="4.5" ry="3" fill="#2f3a2c" opacity="0.6" />
    <ellipse cx="57" cy="31" rx="4.5" ry="3" fill="#2f3a2c" opacity="0.6" />
    <path d="M50 32 L48 40 L52 40" stroke="#2f3a2c" strokeWidth="1.4" fill="none" opacity="0.6" strokeLinejoin="round" />
    <path d="M42 42 C 44 50, 56 50, 58 42" fill={L("soapstone")} {...O} strokeWidth="1" />
    <ellipse cx="50" cy="44" rx="3" ry="1.4" fill="#2f3a2c" opacity="0.55" />
    <ellipse cx="40" cy="22" rx="4" ry="2" transform="rotate(-30 40 22)" {...SHINE} />
  </>
)

/** The fontomfrom: a tall royal drum, pegged and carved, a kente band round it, two sticks. */
const fontomfromDrum = ({ L, R }: Paint) => (
  <>
    <circle cx="50" cy="56" r="42" fill={R("amber")} opacity="0.2" />
    <path d="M16 6 C 28 12, 36 20, 40 30 M84 6 C 72 12, 64 20, 60 30" stroke={solid("wood")} strokeWidth="4" fill="none" strokeLinecap="round" />
    <path d="M28 30 C 23 50, 23 74, 30 92 L70 92 C 77 74, 77 50, 72 30 Z" fill={L("wood")} {...O} />
    <path d="M26 44 C 42 47, 58 47, 74 44 M26 80 C 42 83, 58 83, 74 80" stroke="#fef3c7" strokeWidth="1.6" fill="none" opacity="0.8" />
    {[[36, 72], [50, 74], [64, 72]].map(([x, y]) => (
      <path key={x} d={`M${x} ${y - 4} L${x + 4} ${y} L${x} ${y + 4} L${x - 4} ${y} Z`} stroke="#fef3c7" strokeWidth="1.4" fill="none" opacity="0.8" />
    ))}
    <path d="M24.5 56 C 41 59, 59 59, 75.5 56 L75.5 64 C 59 67, 41 67, 24.5 64 Z" fill={L("red")} {...O} strokeWidth="1" />
    {[30, 40, 50, 60, 70].map((x) => (
      <rect key={x} x={x - 2} y="57.5" width="4" height="7" fill={x % 20 === 10 ? solid("gold") : solid("green")} />
    ))}
    {[30, 37, 44, 50, 56, 63, 70].map((x) => (
      <path key={x} d={`M${x} 32 L${x + (x < 50 ? -1.5 : 1.5)} 40`} stroke={solid("wood")} strokeWidth="3" strokeLinecap="round" />
    ))}
    <ellipse cx="50" cy="30" rx="22" ry="6" fill={L("cream")} {...O} />
    <ellipse cx="40" cy="28.5" rx="6" ry="1.6" {...SHINE} />
  </>
)

/** The Timbuktu manuscripts: an open leather-bound book, its pages in close script. */
const timbuktuManuscripts = ({ L, R }: Paint) => {
  const script = (x: number, y: number) =>
    `M${x} ${y} q 2.5 -3 5 0 t 5 0 t 5 0 t 5 0 t 5 0 t 5 0`
  return (
    <>
      <path d="M50 34 C 40 28, 20 28, 6 32 L6 86 C 20 82, 40 82, 50 88 C 60 82, 80 82, 94 86 L94 32 C 80 28, 60 28, 50 34 Z" fill={L("wood")} {...O} />
      <path d="M50 30 C 40 24, 22 24, 11 28 L11 80 C 22 76, 40 76, 50 82 Z" fill={L("cream")} {...O} />
      <path d="M50 30 C 60 24, 78 24, 89 28 L89 80 C 78 76, 60 76, 50 82 Z" fill={L("cream")} {...O} />
      {[40, 48, 56, 64].map((y) => (
        <g key={y} stroke="#4a2c0a" strokeWidth="1.3" fill="none" opacity="0.7" strokeLinecap="round">
          <path d={script(15, y)} />
          <path d={script(55, y)} />
        </g>
      ))}
      <path d={script(15, 34)} stroke={solid("red")} strokeWidth="1.5" fill="none" strokeLinecap="round" />
      <path d={script(55, 34)} stroke={solid("red")} strokeWidth="1.5" fill="none" strokeLinecap="round" />
      <circle cx="70" cy="70" r="4.5" fill={R("gold")} {...O} strokeWidth="1" />
      <path d="M70 66 L72 70 L70 74 L68 70 Z" fill="#a8741a" />
      <path d="M50 30 V82" stroke="#d6b98a" strokeWidth="1.4" />
      <ellipse cx="22" cy="31" rx="6" ry="1.6" {...SHINE} />
    </>
  )
}

const DRAW: Record<GiftIllustrationKind, (paint: Paint) => JSX.Element> = {
  clap,
  "thumbs-up": thumbsUp,
  smile,
  "kola-nut": kolaNut,
  sunrise,
  handshake,
  bouquet,
  jollof,
  "aso-oke": asoOke,
  gele,
  "palm-tree": palmTree,
  lantern,
  "drum-beat": drumBeat,
  hibiscus,
  fireworks,
  "bronze-head": bronzeHead,
  harmattan,
  "market-day": marketDay,
  "golden-staff": goldenStaff,
  "victory-dance": victoryDance,
  "zuma-rock": zumaRock,
  "river-niger": riverNiger,
  "coral-beads": coralBeads,
  "benin-bronze": beninBronze,
  hornbill,
  "sapphire-tide": sapphireTide,
  "emerald-grove": emeraldGrove,
  "blooming-rose": bloomingRose,
  "eternal-flame": eternalFlame,
  "rising-sun": risingSun,
  "ancestral-mark": ancestralMark,
  "thunder-staff": thunderStaff,
  "city-of-lights": cityOfLights,
  "phoenix-rise": phoenixRise,
  "earth-harvest": earthHarvest,
  mbira,
  "oldowan-chopper": oldowanChopper,
  "healing-horizon": healingHorizon,
  "breath-of-morning": breathOfMorning,
  "nubian-jewellery": nubianJewellery,
  "mossi-horseman": mossiHorseman,
  "swahili-incense-burner": swahiliIncenseBurner,
  "kissi-figure": kissiFigure,
  "fontomfrom-drum": fontomfromDrum,
  "timbuktu-manuscripts": timbuktuManuscripts,
}

/** The drawing for one catalogue gift, its gradients prefixed with `id` so many can share a page. */
export function drawGiftIllustration(kind: GiftIllustrationKind, id: string): JSX.Element {
  const paint: Paint = { L: (c) => `url(#${id}-${c})`, R: (c) => `url(#${id}-${c}-r)` }
  return (
    <>
      {palette(id)}
      {DRAW[kind](paint)}
    </>
  )
}
