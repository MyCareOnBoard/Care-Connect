import type { ReactNode } from "react"
import { CowryIcon } from "@/components/cowry/CowryIcon"
import { matchGiftByName, type GiftLike } from "@/components/cowry/giftIcons"
import type { IllustrationKind } from "@/components/cowry/treasureIllustrationKinds"
import type { HumanScene } from "@/components/cowry/treasureTiers"
import type { SoundName } from "@/lib/sound"
import { Doorway, Equaliser, GoldenRoad, Lighthouse, Scroll } from "@/components/cowry/moments/scene/OneScenePieces"
import {
  Acacias,
  Appear,
  At,
  Balloon,
  Bubble,
  Burst,
  Cap,
  Clouds,
  Confetto,
  Drawn,
  Ember,
  FadeAway,
  Figures,
  Fireworks,
  Flock,
  Footsteps,
  Fruit,
  Glow,
  Grass,
  HeartShape,
  Horizon,
  Moon,
  Note,
  Orb,
  Particles,
  Petal,
  Pulses,
  Rain,
  Rays,
  Ripples,
  Sky,
  Skyline,
  Sparkle,
  Spice,
  Splats,
  Stars,
  Steam,
  Sun,
  Symbols,
  Village,
  Wash,
  Water,
  Weave,
  Words,
  type HeroSpec,
} from "@/components/cowry/moments/scene/SceneParts"

/**
 * Every everyday Treasure's own full-screen arrival — a scene of what it is called and what
 * it means. The Talking Drum beats and the dancers move to it; the First Rain falls on dry
 * ground and the grass comes up; the Breakthrough cracks a wall and bursts through it.
 *
 * THIS IS THE FILE TO EDIT to change how a Treasure arrives. Each entry is keyed by the icon
 * rule its name selects (giftIcons.ts), so "The Baobab" and "Baobab" both find it, and is
 * built from the parts in SceneParts.tsx:
 *
 *   back   everything behind the treasure: sky, land, water, light, what drifts through
 *   hero   how the treasure itself arrives and lives on screen
 *   front  anything over it: rain, petals, confetti, words
 *
 * Human Connection keeps its own scenes (HumanMoments.tsx); Premium plays its films, with
 * the gold scene until a film arrives. A Treasure not listed here keeps the price-band
 * arrival (treasureTiers.ts), so a new one is never left without one.
 */

export interface TreasureScene {
  sound: SoundName
  /** Confetti colours, thrown at the scene's high point. */
  colors: string[]
  /** When the confetti is thrown, in ms; null for none. */
  burstAt?: number | null
  hero?: HeroSpec
  back: () => ReactNode
  front?: () => ReactNode
}

export type SceneKey = Exclude<IllustrationKind, HumanScene>

/* ── Shared colours ──────────────────────────────────────────────────────── */

const NIGHT = "linear-gradient(180deg,#070a1f 0%,#141a45 60%,#2a2860 100%)"
const DAWN = ["#fde68a", "#fb923c", "#f472b6", "#ffffff"]
const TEAL = ["#ccfbf1", "#5eead4", "#fde68a", "#ffffff"]
const HERITAGE = ["#f3c969", "#c2410c", "#7c2d12", "#fef3c7"]
const FOOD = ["#fed7aa", "#fb923c", "#dc2626", "#fef3c7"]
const ACHIEVE = ["#f3c969", "#ffffff", "#60a5fa", "#fde68a"]
const NATURE = ["#bbf7d0", "#4ade80", "#facc15", "#ffffff"]
const MUSIC = ["#f0abfc", "#c4b5fd", "#facc15", "#ffffff"]
const PARTY = ["#f472b6", "#fbbf24", "#38bdf8", "#a78bfa", "#34d399", "#ffffff"]
const FIRE = ["#fed7aa", "#fb923c", "#fde68a", "#ef4444"]
const KENTE = ["#facc15", "#16a34a", "#facc15", "#dc2626", "#111827", "#ea580c"]
const FRUIT = ["#ef4444", "#f97316", "#84cc16", "#f59e0b", "#a855f7"]
const GOLD_DUST = ["#fff7d6", "#f3c969", "#fde68a"]

/** Steam curling up from a point. */
const steamFrom = (x: number, y: number, count = 12) => (
  <Particles way="up" count={count} seed={x + y} from={{ x, y, spread: 8 }} distance={[30, 50]} size={[40, 70]} duration={[2.6, 3.6]} delay={[0.6, 3]} wander={6} opacity={0.6} render={() => <Steam />} />
)

/** Embers flying up from a fire. */
const embersFrom = (x: number, y: number, count = 30) => (
  <Particles way="up" count={count} seed={y * 3} from={{ x, y, spread: 6 }} distance={[40, 80]} size={[5, 10]} duration={[1.8, 3]} delay={[0.3, 4]} wander={14} render={() => <Ember />} />
)

/** Confetti falling over everything, in a palette. */
const confetti = (colors: string[], delay: [number, number] = [1.4, 3.6], count = 50) => (
  <Particles way="down" count={count} seed={31} size={[8, 14]} spin={540} wander={14} duration={[2, 3]} delay={delay} render={(i) => <Confetto color={colors[i % colors.length]} />} />
)

/** Fireflies or motes of light drifting up. */
const motes = (color: string, count = 24, band: [number, number] = [5, 95]) => (
  <Particles way="up" count={count} seed={count + 3} band={band} distance={[30, 60]} size={[5, 11]} duration={[2.4, 3.8]} delay={[0.6, 3.6]} opacity={0.9} render={() => <Orb color={color} />} />
)

/* ── The scenes ──────────────────────────────────────────────────────────── */

export const TREASURE_SCENES: Record<SceneKey, TreasureScene> = {
  /* Wellness & Emotion */

  // Night turns to morning: the sky warms, the sun climbs over the hills, birds go up.
  "new-dawn": {
    sound: "sunrise",
    colors: DAWN,
    burstAt: 2200,
    hero: { entrance: "rise", y: 48, delay: 1.4 },
    back: () => (
      <>
        <Sky layers={[NIGHT, "linear-gradient(180deg,#3b2a6b 0%,#c2416f 55%,#f59e0b 100%)", "linear-gradient(180deg,#fbbf24 0%,#fde68a 45%,#fff7d6 100%)"]} every={1.6} start={0.3} />
        <FadeAway at={1}>
          <Stars count={40} height={55} />
        </FadeAway>
        <Sun y={64} motion="rise" delay={0.2} />
        <Flock top={34} delay={2} color="#4a1d1d" />
        <Horizon shape="hills" colors={["#3b1f4a", "#1f1030"]} />
      </>
    ),
  },

  // The tree comes up out of the ground and its roots spread down through the earth.
  "strong-root": {
    sound: "harvest",
    colors: NATURE,
    burstAt: 1900,
    hero: { entrance: "grow", y: 40, delay: 0.2, idle: "sway" },
    back: () => (
      <>
        <Sky layers={["linear-gradient(180deg,#7dd3fc 0%,#e0f2fe 52%,#5c3a12 52%,#2b1906 100%)"]} />
        <Clouds count={3} top={8} height={14} />
        <Drawn
          strokes={[
            "M500 312 C 480 380, 420 420, 330 470 S 180 540, 120 600",
            "M500 312 C 520 380, 580 420, 670 470 S 820 540, 880 600",
            "M500 312 C 490 400, 470 470, 460 600",
            "M500 312 C 515 400, 540 480, 560 600",
            "M410 430 C 380 470, 330 500, 260 600",
            "M590 430 C 620 470, 670 500, 740 600",
          ].map((d, i) => ({ d, color: "#c48a4a", width: 14 - i, delay: 0.8 + i * 0.12, duration: 1.8 }))}
        />
        {motes("#fde68a", 18, [15, 85])}
      </>
    ),
  },

  // A still lake at dusk, rings spreading from the lotus as it settles, fireflies rising.
  "calm-water": {
    sound: "pearl",
    colors: TEAL,
    burstAt: 2000,
    hero: { entrance: "float-in", y: 58, idle: "bob", delay: 0.4 },
    back: () => (
      <>
        <Sky layers={["radial-gradient(ellipse at 50% 30%, #99f6e4 0%, #0f766e 55%, #042f2e 100%)"]} />
        <Water top={58} colors={["#14b8a6", "#0d9488", "#115e59"]} speed={12} />
        <Ripples x={50} y={68} count={4} every={0.8} delay={0.8} />
        {motes("#fde68a", 26)}
      </>
    ),
  },

  // Light opens out behind the hand, and hearts lift out of it.
  "open-hand": {
    sound: "bloom",
    colors: ["#fecdd3", "#fb7185", "#fde68a", "#ffffff"],
    burstAt: 1700,
    hero: { entrance: "rise", y: 58, delay: 0.3 },
    back: () => (
      <>
        <Sky layers={["radial-gradient(ellipse at 50% 60%, #fde68a 0%, #f59e0b 35%, #7c2d12 100%)"]} />
        <Rays y={58} delay={0.8} />
        <Glow y={58} size="90vmin" motion="grow" delay={0.4} />
      </>
    ),
    front: () => (
      <Particles
        way="up"
        count={20}
        seed={4}
        from={{ x: 50, y: 50, spread: 10 }}
        distance={[40, 70]}
        size={[16, 30]}
        wander={20}
        delay={[1.2, 3.4]}
        render={(i) => <HeartShape color={["#fb7185", "#f43f5e", "#fda4af", "#fde68a"][i % 4]} />}
      />
    ),
  },

  // Fruit drops from above into the basket, gathered for the whole family.
  "family-basket": {
    sound: "harvest",
    colors: ["#fecaca", "#fed7aa", "#d9f99d", "#fde68a"],
    burstAt: 2600,
    hero: { entrance: "rise", y: 64, delay: 0.1 },
    back: () => (
      <>
        <Sky layers={["linear-gradient(180deg,#134e4a 0%,#0d9488 55%,#fef3c7 100%)"]} />
        <Glow y={68} size="80vmin" color="rgba(254,243,199,0.7)" />
      </>
    ),
    front: () => (
      <Particles way="down" count={16} seed={8} band={[34, 66]} distance={[56, 64]} size={[28, 42]} wander={3} spin={80} duration={[1.1, 1.6]} delay={[0.7, 2.6]} render={(i) => <Fruit color={FRUIT[i % FRUIT.length]} />} />
    ),
  },

  // Out of darkness, a light inside grows until it fills the whole screen.
  "light-within": {
    sound: "spotlight",
    colors: ["#fef9c3", "#fde047", "#ffffff", "#fbbf24"],
    burstAt: 2200,
    hero: { entrance: "float-in", y: 54, idle: "glow", delay: 0.2 },
    back: () => (
      <>
        <Sky layers={["#05060f"]} />
        <Glow y={54} size="170vmax" color="rgba(253,224,71,0.8)" motion="grow" delay={0.8} />
        <Pulses y={54} count={3} every={0.8} delay={1} color="rgba(254,240,138,0.8)" />
        <Rays y={54} delay={1.8} />
        <Particles way="up" count={30} seed={12} from={{ x: 50, y: 54, spread: 30 }} distance={[30, 70]} size={[6, 12]} delay={[1, 3.4]} render={() => <Orb color="#fde047" />} />
      </>
    ),
  },

  // Storm, then calm: the rain stops, the lighthouse sweeps the water, the boat comes home.
  "safe-harbour": {
    sound: "pearl",
    colors: ["#bfdbfe", "#fde68a", "#ffffff", "#60a5fa"],
    burstAt: 2600,
    hero: { entrance: "fly", x: 42, y: 62, idle: "bob", delay: 0.9 },
    back: () => (
      <>
        <Sky layers={["linear-gradient(180deg,#0f172a 0%,#1e293b 60%,#334155 100%)", "linear-gradient(180deg,#1e3a8a 0%,#3b82f6 50%,#fde68a 100%)"]} start={1.8} />
        <Rain count={60} until={1.8} />
        <Lighthouse />
        <Water top={66} colors={["#1e40af", "#1d4ed8", "#172554"]} speed={9} />
      </>
    ),
  },

  /* Heritage */

  // The drum beats — the screen pulses with it — and the dancers move to the rhythm.
  "talking-drum": {
    sound: "drums",
    colors: HERITAGE,
    burstAt: 1800,
    hero: { entrance: "rise", y: 50, idle: "beat", delay: 0.2 },
    back: () => (
      <>
        <Sky layers={["radial-gradient(ellipse at 50% 60%, #c2410c 0%, #7c2d12 45%, #2a0e05 100%)"]} />
        <Weave colors={KENTE} top={84} height={16} opacity={0.6} />
        <Pulses y={50} count={8} every={0.45} delay={0.9} color="rgba(253,230,138,0.7)" />
        <Figures at={[10, 24, 76, 90]} color="#1c0a03" height="24vh" bottom={10} />
      </>
    ),
  },

  // The calabash of plenty: cowries pour down around it, the wealth that is shared.
  calabash: {
    sound: "coins",
    colors: HERITAGE,
    burstAt: 1800,
    hero: { entrance: "rise", y: 56, idle: "sway", delay: 0.2 },
    back: () => (
      <>
        <Sky layers={["linear-gradient(180deg,#431407 0%,#9a3412 55%,#f59e0b 100%)"]} />
        <Rays y={56} delay={0.6} />
        <Glow y={58} size="70vmin" />
      </>
    ),
    front: () => <Particles way="down" count={26} seed={14} spin={260} size={[22, 36]} duration={[1.8, 2.8]} delay={[0.6, 3]} render={(_, size) => <CowryIcon size={size} />} />,
  },

  // A woven cloth fills the screen and the basket settles into the middle of it.
  "heritage-basket": {
    sound: "drums",
    colors: HERITAGE,
    burstAt: 1500,
    hero: { entrance: "drop", y: 56, delay: 0.3 },
    back: () => (
      <>
        <Sky layers={["#3b1406"]} />
        <Weave colors={["#a16207", "#ca8a04", "#78350f", "#fde68a", "#78350f"]} opacity={0.5} />
        <Wash background="radial-gradient(circle at 50% 56%, transparent 0%, rgba(20,8,2,0.78) 70%)" />
        <Particles way="up" count={18} seed={16} size={[10, 18]} delay={[1, 3.4]} render={(i) => <Sparkle color={GOLD_DUST[i % 3]} />} />
      </>
    ),
  },

  // Night over the village: the lantern swings in, every window lights, fireflies rise.
  "village-lantern": {
    sound: "city",
    colors: ["#fde68a", "#fbbf24", "#ffffff", "#f59e0b"],
    burstAt: 2000,
    hero: { entrance: "swing", y: 44, idle: "glow", delay: 0.2 },
    back: () => (
      <>
        <Sky layers={["linear-gradient(180deg,#0b1026 0%,#1e1b4b 60%,#312e81 100%)"]} />
        <Stars count={50} height={55} />
        <Moon x={84} y={18} size="12vmin" motion="stay" />
        <Village color="#0a0a1a" windows="#fbbf24" />
        {motes("#fde68a", 24)}
      </>
    ),
  },

  // Round the fire at night: embers rise, the circle of listeners sways in its light.
  "story-fire": {
    sound: "flame",
    colors: FIRE,
    burstAt: 2000,
    hero: { entrance: "rise", y: 64, idle: "glow", delay: 0.2 },
    back: () => (
      <>
        <Sky layers={["linear-gradient(180deg,#020617 0%,#111827 60%,#1c1917 100%)"]} />
        <Stars count={60} height={50} />
        <Glow y={74} size="100vmin" color="rgba(251,146,60,0.7)" motion="flicker" />
        <Figures at={[14, 28, 72, 86]} color="#0c0a09" motion="sway" height="22vh" bottom={6} />
        {embersFrom(50, 60)}
      </>
    ),
  },

  // The old symbols appear across the screen one by one, and the pattern spins into place.
  "ancestral-pattern": {
    sound: "drums",
    colors: HERITAGE,
    burstAt: 1800,
    hero: { entrance: "spin", y: 54, idle: "glow", delay: 0.6 },
    back: () => (
      <>
        <Sky layers={["linear-gradient(180deg,#431407 0%,#7c2d12 100%)"]} />
        <Symbols />
        <Wash background="radial-gradient(circle at 50% 54%, rgba(67,20,7,0.9) 0%, transparent 45%)" />
      </>
    ),
  },

  // The royal seat comes down from on high to rest on its kente, gold falling round it.
  "golden-stool": {
    sound: "fanfare",
    colors: [...HERITAGE, "#facc15"],
    burstAt: 1300,
    hero: { entrance: "drop", y: 56, idle: "glow", delay: 0.4, halo: "rgba(253,224,71,0.9)" },
    back: () => (
      <>
        <Sky layers={["radial-gradient(ellipse at 50% 55%, #b45309 0%, #78350f 45%, #1c0a03 100%)"]} />
        <Rays y={56} color="rgba(253,224,71,0.4)" delay={0.4} />
        <Weave colors={KENTE} top={82} height={18} opacity={0.75} />
        <Pulses y={62} count={2} every={0.3} delay={1.2} color="rgba(253,224,71,0.8)" size="50vmin" />
      </>
    ),
    front: () => <Particles way="down" count={22} seed={18} size={[10, 18]} spin={180} delay={[1.2, 3.2]} render={(i) => <Sparkle color={GOLD_DUST[i % 3]} />} />,
  },

  /* Food & Table */

  // A warm bowl in the middle, steam rising, everyone gathered round to share it.
  "shared-bowl": {
    sound: "sunrise",
    colors: FOOD,
    burstAt: 2000,
    hero: { entrance: "rise", y: 60, delay: 0.2 },
    back: () => (
      <>
        <Sky layers={["radial-gradient(ellipse at 50% 62%, #fdba74 0%, #ea580c 40%, #431407 100%)"]} />
        <Glow y={62} size="80vmin" />
        <Figures at={[12, 26, 74, 88]} color="#2a0e05" motion="sway" height="24vh" bottom={4} />
        {steamFrom(50, 52)}
      </>
    ),
  },

  // A feast: the dish lands steaming and the celebration comes down round it.
  "jollof-table": {
    sound: "fanfare",
    colors: FOOD,
    burstAt: 1500,
    hero: { entrance: "drop", y: 58, delay: 0.3 },
    back: () => (
      <>
        <Sky layers={["radial-gradient(ellipse at 50% 60%, #f97316 0%, #dc2626 45%, #450a0a 100%)"]} />
        <Glow y={60} size="80vmin" />
        {steamFrom(50, 50)}
      </>
    ),
    front: () => confetti(FOOD),
  },

  // Morning: the sun comes up, the akara sizzles and steams.
  "morning-akara": {
    sound: "sunrise",
    colors: FOOD,
    burstAt: 2000,
    hero: { entrance: "rise", y: 60, delay: 0.3 },
    back: () => (
      <>
        <Sky layers={["linear-gradient(180deg,#fde68a 0%,#fdba74 50%,#c2410c 100%)"]} />
        <Sun x={78} y={22} size="18vmin" rays={false} />
        {steamFrom(50, 50, 10)}
        <Particles way="up" count={30} seed={20} from={{ x: 50, y: 62, spread: 14 }} distance={[8, 20]} size={[8, 16]} duration={[0.8, 1.4]} delay={[0.4, 4]} wander={4} render={() => <Bubble />} />
      </>
    ),
  },

  // The pot on its fire, simmering, the family round it in the glow.
  "family-pot": {
    sound: "flame",
    colors: FOOD,
    burstAt: 2000,
    hero: { entrance: "rise", y: 58, delay: 0.2 },
    back: () => (
      <>
        <Sky layers={["linear-gradient(180deg,#1c1917 0%,#44403c 60%,#292524 100%)"]} />
        <Glow y={80} size="90vmin" color="rgba(249,115,22,0.75)" motion="flicker" />
        <Figures at={[10, 22, 78, 90]} color="#0c0a09" motion="sway" height="22vh" bottom={4} />
        {embersFrom(50, 76, 16)}
        {steamFrom(50, 44, 14)}
      </>
    ),
  },

  // Under a clear sky, over the golden field, the harvest falls into the basket.
  "harvest-basket": {
    sound: "harvest",
    colors: NATURE,
    burstAt: 2400,
    hero: { entrance: "rise", y: 62, delay: 0.2 },
    back: () => (
      <>
        <Sky layers={["linear-gradient(180deg,#38bdf8 0%,#bae6fd 55%,#fef3c7 100%)"]} />
        <Sun x={80} y={20} size="16vmin" motion="stay" />
        <Clouds count={3} top={6} height={16} />
        <Horizon shape="hills" colors={["#65a30d", "#3f6212"]} height={30} />
        <Grass color="#a16207" tip="#facc15" height={16} />
      </>
    ),
    front: () => (
      <Particles way="down" count={18} seed={22} band={[32, 68]} distance={[54, 62]} size={[26, 40]} wander={3} spin={90} duration={[1.1, 1.6]} delay={[0.8, 3]} render={(i) => <Fruit color={FRUIT[i % FRUIT.length]} />} />
    ),
  },

  // Spices blown across the dunes on a warm wind, the trail they have always travelled.
  "spice-trail": {
    sound: "harvest",
    colors: ["#dc2626", "#f59e0b", "#65a30d", "#fde68a"],
    burstAt: 2200,
    hero: { entrance: "fly", y: 52, delay: 0.3 },
    back: () => (
      <>
        <Sky layers={["linear-gradient(180deg,#78350f 0%,#d97706 55%,#fde68a 100%)"]} />
        <Sun y={38} size="30vmin" motion="stay" rays={false} />
        <Horizon shape="dunes" colors={["#b45309", "#92400e"]} height={32} />
        <Particles way="right" count={70} seed={24} band={[28, 82]} distance={[110, 125]} size={[6, 14]} wander={8} duration={[2, 3]} delay={[0, 3.4]} render={(i) => <Spice color={["#dc2626", "#f59e0b", "#65a30d", "#7c2d12", "#facc15"][i % 5]} />} />
      </>
    ),
  },

  // Dusk, the circle sitting close, the tea steaming between them.
  "tea-circle": {
    sound: "pearl",
    colors: ["#fde68a", "#d97706", "#fef3c7", "#ffffff"],
    burstAt: 2200,
    hero: { entrance: "rise", y: 60, delay: 0.3 },
    back: () => (
      <>
        <Sky layers={["linear-gradient(180deg,#1e1b4b 0%,#7c2d12 70%,#451a03 100%)"]} />
        <Stars count={30} height={40} />
        <Glow y={64} size="80vmin" color="rgba(253,186,116,0.6)" />
        <Figures at={[14, 28, 72, 86]} color="#1c0a03" motion="sway" height="20vh" bottom={6} />
        {steamFrom(50, 48, 14)}
      </>
    ),
  },

  /* Achievement */

  // Bare feet running the track, and the treasure bursts up at the finish: Victory.
  "barefoot-victory": {
    sound: "fanfare",
    colors: ACHIEVE,
    burstAt: 2000,
    hero: { entrance: "burst", y: 46, delay: 1.9 },
    back: () => (
      <>
        <Sky layers={["linear-gradient(180deg,#1e3a8a 0%,#3b82f6 50%,#fbbf24 100%)"]} />
        <Rays y={46} delay={1.9} />
        <Horizon shape="flat" colors={["#b45309", "#92400e"]} height={32} />
        <Footsteps y={78} delay={0.2} every={0.12} />
      </>
    ),
    front: () => (
      <>
        {confetti(ACHIEVE, [2, 3.6])}
        <Words text="Victory!" delay={2.1} y={66} className="font-black uppercase tracking-wider" />
      </>
    ),
  },

  // Into open sky: the treasure flies up through the clouds with the birds.
  "first-flight": {
    sound: "eagle",
    colors: ACHIEVE,
    burstAt: 2000,
    hero: { entrance: "fly", y: 48, idle: "bob", delay: 0.3 },
    back: () => (
      <>
        <Sky layers={["linear-gradient(180deg,#0ea5e9 0%,#7dd3fc 60%,#e0f2fe 100%)"]} />
        <Clouds count={6} top={10} height={70} drift={30} />
        <Flock top={30} count={8} color="#0c4a6e" delay={0.2} />
      </>
    ),
  },

  // A wall shakes and cracks, light bleeding through — then it bursts and the light pours in.
  breakthrough: {
    sound: "thunder",
    colors: ACHIEVE,
    burstAt: 1800,
    hero: { entrance: "burst", y: 52, idle: "glow", delay: 1.7 },
    back: () => (
      <>
        <Sky layers={["#0b1220"]} />
        <Appear at={1.6}>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_52%,#fef3c7_0%,#fbbf24_28%,#1e40af_80%)]" />
          <Rays y={52} />
        </Appear>
        <FadeAway at={1.6}>
          <div className="scene-shake absolute inset-0" style={{ animationDelay: "0.3s" }}>
            <div
              className="absolute inset-0"
              style={{ background: "repeating-linear-gradient(0deg, #1e293b 0 2px, #334155 2px 60px), #334155", backgroundBlendMode: "multiply" }}
            />
            <div className="absolute inset-0 opacity-60" style={{ background: "repeating-linear-gradient(90deg, #1e293b 0 2px, transparent 2px 120px)" }} />
            <Drawn
              glow
              strokes={[
                "M500 300 L460 220 L480 160 L430 60 L450 0",
                "M500 300 L580 250 L610 180 L700 150 L760 60",
                "M500 300 L560 360 L540 440 L620 520 L640 600",
                "M500 300 L420 340 L360 320 L280 400 L180 420",
                "M500 300 L470 400 L400 460 L380 600",
                "M500 300 L620 300 L720 340 L860 320 L1000 360",
              ].map((d, i) => ({ d, color: "#fde68a", width: 4, delay: 0.3 + i * 0.15, duration: 0.7 }))}
            />
          </div>
        </FadeAway>
        <Glow y={52} size="160vmax" color="rgba(255,250,235,0.95)" motion="flash" delay={1.5} />
        <Burst y={52} count={28} colors={["#475569", "#64748b", "#334155", "#94a3b8"]} distance={[40, 90]} size={[16, 34]} shape="shard" delay={1.55} duration={1.6} />
      </>
    ),
  },

  // The long road to the horizon, the miles running by, the treasure waiting at its end.
  "golden-mile": {
    sound: "fanfare",
    colors: ACHIEVE,
    burstAt: 2400,
    hero: { entrance: "rise", y: 48, size: 150, idle: "glow", delay: 1 },
    back: () => (
      <>
        <Sky layers={["linear-gradient(180deg,#1e3a8a 0%,#f59e0b 60%,#fde68a 100%)"]} />
        <Sun y={52} size="22vmin" />
        <Horizon shape="flat" colors={["#7c2d12", "#451a03"]} height={44} />
        <GoldenRoad />
      </>
    ),
  },

  // In the dark, a door swings open; light spills across the floor and the way is through.
  "open-door": {
    sound: "spotlight",
    colors: ACHIEVE,
    burstAt: 2000,
    hero: { entrance: "rise", y: 50, size: 130, idle: "glow", delay: 1.6 },
    back: () => (
      <>
        <Sky layers={["#0b0f1a"]} />
        <Appear at={1.1}>
          <div className="absolute inset-x-0 bottom-0 top-[64%] bg-[linear-gradient(180deg,rgba(254,243,199,0.9),rgba(251,191,36,0.15))]" style={{ clipPath: "polygon(40% 0, 60% 0, 100% 100%, 0 100%)" }} />
          <Rays y={46} />
        </Appear>
        <Doorway />
        <Particles way="up" count={20} seed={26} from={{ x: 50, y: 56, spread: 10 }} distance={[30, 60]} size={[6, 12]} delay={[1.6, 3.6]} render={() => <Orb color="#fde68a" />} />
      </>
    ),
  },

  // A scroll unrolls, its lines written in light, gold dust settling — what is handed down.
  legacy: {
    sound: "drums",
    colors: HERITAGE,
    burstAt: 2200,
    hero: { entrance: "rise", y: 36, size: 150, delay: 1.2 },
    back: () => (
      <>
        <Sky layers={["radial-gradient(ellipse at 50% 50%, #92400e 0%, #451a03 60%, #1c0a03 100%)"]} />
        <Scroll />
      </>
    ),
    front: () => <Particles way="down" count={26} seed={28} size={[8, 14]} spin={180} delay={[1, 3.6]} render={(i) => <Sparkle color={GOLD_DUST[i % 3]} />} />,
  },

  /* Nature */

  // The great tree rises against a huge setting sun, birds crossing its crown.
  baobab: {
    sound: "harvest",
    colors: NATURE,
    burstAt: 2000,
    hero: { entrance: "grow", y: 52, size: 210, idle: "sway", delay: 0.2 },
    back: () => (
      <>
        <Sky layers={["linear-gradient(180deg,#7c2d12 0%,#ea580c 45%,#fde68a 100%)"]} />
        <Sun y={54} size="48vmin" motion="stay" rays={false} />
        <Horizon shape="flat" colors={["#78350f", "#431407"]} height={28} />
        <Acacias color="#431407" at={[6, 84]} />
        <Flock top={26} color="#431407" delay={0.8} />
      </>
    ),
  },

  // The sun sinks into the water, the sky going from gold to violet, the first stars out.
  "golden-sunset": {
    sound: "sunrise",
    colors: DAWN,
    burstAt: 2400,
    hero: { entrance: "float-in", y: 50, size: 150, delay: 1 },
    back: () => (
      <>
        <Sky layers={["linear-gradient(180deg,#f59e0b 0%,#fdba74 50%,#fde68a 100%)", "linear-gradient(180deg,#4c1d95 0%,#be185d 50%,#f97316 100%)"]} start={1.4} every={1} />
        <Appear at={3} slow>
          <Stars count={20} height={30} />
        </Appear>
        <Sun y={46} size="32vmin" motion="set" rays={false} />
        <Water top={62} colors={["#c2410c", "#9a3412", "#431407"]} speed={12} />
        <Flock top={30} color="#3b0764" delay={1} />
      </>
    ),
  },

  // Dry heat, then cloud, then rain on the earth — and the grass springs up green.
  "first-rain": {
    sound: "harvest",
    colors: NATURE,
    burstAt: 3000,
    hero: { entrance: "rise", y: 50, delay: 0.6 },
    back: () => (
      <>
        <Sky
          layers={["linear-gradient(180deg,#a16207 0%,#ca8a04 55%,#fde68a 100%)", "linear-gradient(180deg,#334155 0%,#475569 60%,#64748b 100%)", "linear-gradient(180deg,#0ea5e9 0%,#7dd3fc 55%,#bbf7d0 100%)"]}
          start={0.3}
          every={2.2}
        />
        <FadeAway at={3}>
          <Clouds count={5} top={0} height={16} color="rgba(71,85,105,0.9)" drift={6} />
        </FadeAway>
        <Horizon shape="flat" colors={["#854d0e", "#713f12"]} height={22} />
        <Ripples x={30} y={88} count={3} every={0.5} delay={1.2} size="24vmin" />
        <Ripples x={72} y={90} count={3} every={0.5} delay={1.5} size="24vmin" />
        <Grass grow delay={2.4} color="#15803d" tip="#86efac" height={20} />
      </>
    ),
    front: () => <Rain count={90} delay={0.8} until={3.2} />,
  },

  // Night sky full of stars, the moon climbing out over the hills.
  "rising-moon": {
    sound: "pearl",
    colors: ["#e0e7ff", "#a5b4fc", "#ffffff", "#fde68a"],
    burstAt: 2600,
    hero: { entrance: "float-in", y: 64, size: 140, idle: "glow", delay: 1.8 },
    back: () => (
      <>
        <Sky layers={["linear-gradient(180deg,#020617 0%,#1e1b4b 60%,#312e81 100%)"]} />
        <Stars count={70} height={80} />
        <Moon x={50} y={36} size="30vmin" />
        <Clouds count={3} top={46} height={16} color="rgba(148,163,184,0.35)" />
        <Horizon shape="hills" colors={["#111036", "#05051a"]} height={26} />
      </>
    ),
  },

  // Tall golden grass rippling in the wind under the acacias.
  "golden-savannah": {
    sound: "harvest",
    colors: ["#fde68a", "#facc15", "#ca8a04", "#ffffff"],
    burstAt: 2200,
    hero: { entrance: "rise", y: 50, delay: 0.4 },
    back: () => (
      <>
        <Sky layers={["linear-gradient(180deg,#f59e0b 0%,#fcd34d 50%,#fef3c7 100%)"]} />
        <Sun x={28} y={42} size="24vmin" motion="stay" />
        <Horizon shape="flat" colors={["#ca8a04", "#a16207"]} height={26} />
        <Acacias color="#78350f" at={[6, 70, 88]} />
        <Flock top={30} color="#78350f" delay={1} />
        <Grass count={90} color="#a16207" tip="#fde047" height={24} />
      </>
    ),
  },

  // Sea and sky, the wind streaming across, gulls riding it.
  "ocean-breeze": {
    sound: "pearl",
    colors: ["#cffafe", "#67e8f9", "#ffffff", "#0891b2"],
    burstAt: 2200,
    hero: { entrance: "float-in", y: 48, idle: "sway", delay: 0.4 },
    back: () => (
      <>
        <Sky layers={["linear-gradient(180deg,#0ea5e9 0%,#67e8f9 55%,#ecfeff 100%)"]} />
        <Sun x={80} y={18} size="14vmin" motion="stay" />
        <Clouds count={4} top={6} height={22} drift={22} />
        <Water top={60} colors={["#06b6d4", "#0891b2", "#155e75"]} speed={4} />
        <Flock top={24} color="#164e63" delay={0.4} />
      </>
    ),
    front: () => (
      <Particles way="right" count={22} seed={30} band={[10, 60]} distance={[110, 130]} size={[40, 90]} wander={2} duration={[1, 1.6]} delay={[0, 3.6]} opacity={0.8} render={() => <span className="mt-[50%] block h-[2px] w-full rounded-full bg-white/80" />} />
    ),
  },

  /* Music & Expression */

  // The beat: the screen pulses, the bars jump, the notes fly.
  rhythm: {
    sound: "drums",
    colors: MUSIC,
    burstAt: 1800,
    hero: { entrance: "rise", y: 50, idle: "beat", delay: 0.2 },
    back: () => (
      <>
        <Sky layers={["radial-gradient(ellipse at 50% 60%, #7c3aed 0%, #3b0764 55%, #0f0420 100%)"]} />
        <Equaliser />
        <Pulses y={50} count={9} every={0.45} delay={0.6} color="rgba(240,171,252,0.7)" />
        <Particles way="up" count={20} seed={32} size={[18, 30]} wander={14} delay={[0.4, 3.4]} render={(i) => <Note color={MUSIC[i % MUSIC.length]} />} />
      </>
    ),
  },

  // Firelight behind, and the dancers' shadows leaping across the screen.
  "dancing-shadow": {
    sound: "drums",
    colors: FIRE,
    burstAt: 2000,
    hero: { entrance: "rise", y: 38, size: 150, idle: "sway", delay: 0.4 },
    back: () => (
      <>
        <Sky layers={["linear-gradient(180deg,#1c1917 0%,#7c2d12 70%,#ea580c 100%)"]} />
        <Glow y={92} size="130vmin" color="rgba(251,146,60,0.8)" motion="flicker" />
        <Figures at={[8, 22, 36, 64, 78, 92]} color="#0c0a09" height="34vh" bottom={2} />
        <Particles way="up" count={24} seed={34} band={[30, 70]} distance={[50, 90]} size={[5, 10]} delay={[0.3, 4]} render={() => <Ember />} />
      </>
    ),
  },

  // A spotlight from above, the voice going out in waves, the crowd below, notes rising.
  voice: {
    sound: "city",
    colors: MUSIC,
    burstAt: 2000,
    hero: { entrance: "rise", y: 48, idle: "bob", delay: 0.4 },
    back: () => (
      <>
        <Sky layers={["linear-gradient(180deg,#0f0420 0%,#312e81 100%)"]} />
        <Appear at={0.2}>
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.55),rgba(199,210,254,0.05))]" style={{ clipPath: "polygon(44% 0, 56% 0, 82% 100%, 18% 100%)" }} />
        </Appear>
        <Pulses y={48} count={8} every={0.4} delay={0.8} color="rgba(199,210,254,0.8)" width={3} />
        <Figures at={[6, 18, 30, 70, 82, 94]} color="#0b0420" motion="sway" height="20vh" bottom={-4} />
        <Particles way="up" count={20} seed={36} from={{ x: 50, y: 42, spread: 10 }} distance={[30, 60]} size={[18, 28]} wander={30} delay={[1, 3.6]} render={(i) => <Note color={MUSIC[i % MUSIC.length]} />} />
      </>
    ),
  },

  // A blank canvas: paint flung onto it, then a sun painted in broad strokes.
  "painters-sun": {
    sound: "sparkle",
    colors: ["#ef4444", "#3b82f6", "#22c55e", "#f59e0b"],
    burstAt: 2600,
    hero: { entrance: "burst", y: 74, size: 130, delay: 0.2 },
    back: () => (
      <>
        <Sky layers={["#fffbeb"]} />
        <Splats colors={["#ef4444", "#3b82f6", "#22c55e", "#f59e0b", "#a855f7", "#ec4899"]} count={12} />
        <Drawn
          strokes={[
            { d: "M500 140 a 120 120 0 1 0 0.1 0", color: "#ea580c", width: 16, fill: "#f59e0b", fillAfter: true, delay: 1.1, duration: 1.4 },
            ...Array.from({ length: 12 }, (_, i) => {
              const angle = (i / 12) * Math.PI * 2
              const from = [500 + Math.cos(angle) * 150, 260 + Math.sin(angle) * 150]
              const to = [500 + Math.cos(angle) * 210, 260 + Math.sin(angle) * 210]
              return { d: `M${from[0]} ${from[1]} L${to[0]} ${to[1]}`, color: "#f59e0b", width: 14, delay: 2 + i * 0.06, duration: 0.4 }
            }),
          ]}
        />
      </>
    ),
  },

  // The book opens under the stars; sparks rise from its pages and draw a constellation.
  storyteller: {
    sound: "pearl",
    colors: ["#fde68a", "#c4b5fd", "#ffffff", "#facc15"],
    burstAt: 2400,
    hero: { entrance: "rise", y: 62, idle: "glow", delay: 0.2 },
    back: () => (
      <>
        <Sky layers={["linear-gradient(180deg,#020617 0%,#1e1b4b 70%,#3b0764 100%)"]} />
        <Stars count={50} height={60} />
        <Drawn
          glow
          strokes={[{ d: "M160 120 L300 80 L420 150 L560 100 L700 160 L840 90", color: "rgba(253,230,138,0.85)", width: 3, delay: 1.4, duration: 1.6 }]}
        />
        {[[160, 120], [300, 80], [420, 150], [560, 100], [700, 160], [840, 90]].map(([x, y], i) => (
          <At key={x} x={x / 10} y={(y / 600) * 100}>
            <span className="scene-pop block size-3 rounded-full bg-[#fef3c7] shadow-[0_0_12px_#fde68a]" style={{ animationDelay: `${1.4 + i * 0.26}s` }} />
          </At>
        ))}
        <Glow y={62} size="70vmin" color="rgba(253,230,138,0.55)" />
        <Particles way="up" count={30} seed={38} from={{ x: 50, y: 56, spread: 6 }} distance={[20, 50]} size={[8, 14]} wander={24} delay={[0.6, 3.6]} render={(i) => <Sparkle color={GOLD_DUST[i % 3]} />} />
      </>
    ),
  },

  /* Celebrations */

  // Wine-dark night, fireworks overhead, hearts rising, and the glasses raised: Happy Anniversary.
  anniversary: {
    sound: "bloom",
    colors: ["#fecdd3", "#fb7185", "#fde68a", "#ffffff"],
    burstAt: 1500,
    hero: { entrance: "rise", y: 52, delay: 0.3 },
    back: () => (
      <>
        <Sky layers={["radial-gradient(ellipse at 50% 50%, #9f1239 0%, #4c0519 60%, #1a0208 100%)"]} />
        <Fireworks colors={["#fda4af", "#fde68a", "#ffffff", "#fb7185"]} count={5} delay={1.1} />
        <Pulses y={52} count={3} every={0.5} delay={1.3} color="rgba(253,164,175,0.7)" />
        <Particles way="up" count={20} seed={40} size={[16, 28]} wander={12} delay={[0.6, 3.6]} render={(i) => <HeartShape color={["#fb7185", "#f43f5e", "#fda4af"][i % 3]} />} />
      </>
    ),
    front: () => <Words text="Happy Anniversary" delay={1.8} y={74} />,
  },

  // Balloons up, confetti down, the cake in the middle: Happy Birthday.
  birthday: {
    sound: "fanfare",
    colors: PARTY,
    burstAt: 1500,
    hero: { entrance: "rise", y: 50, delay: 0.3 },
    back: () => (
      <>
        <Sky layers={["linear-gradient(180deg,#4c1d95 0%,#be185d 55%,#f472b6 100%)"]} />
        <Glow y={46} size="60vmin" color="rgba(253,224,71,0.55)" />
        <Particles way="up" count={16} seed={42} size={[36, 56]} distance={[110, 130]} wander={8} duration={[3, 4.2]} delay={[0, 1.6]} render={(i) => <Balloon color={PARTY[i % 5]} />} />
      </>
    ),
    front: () => (
      <>
        {confetti(PARTY, [1.2, 3.4])}
        <Words text="Happy Birthday" delay={1.6} y={74} />
      </>
    ),
  },

  // A soft sky of clouds and little stars, pastel balloons, the pram rocking: welcome, little one.
  "new-baby": {
    sound: "bloom",
    colors: ["#bfdbfe", "#fbcfe8", "#fde68a", "#ffffff"],
    burstAt: 1800,
    hero: { entrance: "float-in", y: 52, idle: "sway", delay: 0.3 },
    back: () => (
      <>
        <Sky layers={["linear-gradient(180deg,#bae6fd 0%,#fbcfe8 60%,#fef3c7 100%)"]} />
        <Clouds count={6} top={4} height={70} />
        <Stars count={18} color="#fde68a" height={70} />
        <Particles way="up" count={8} seed={44} size={[32, 46]} distance={[110, 130]} wander={6} duration={[3.4, 4.4]} delay={[0.2, 1.8]} render={(i) => <Balloon color={["#93c5fd", "#f9a8d4", "#fde68a", "#a7f3d0"][i % 4]} />} />
      </>
    ),
    front: () => <Words text="Welcome, little one" delay={1.8} y={74} color="#9d174d" className="font-serif italic drop-shadow-[0_2px_8px_rgba(255,255,255,0.8)]" />,
  },

  // Evening over the neighbourhood, windows lighting one by one, the new house glowing: home.
  "new-home": {
    sound: "sunrise",
    colors: ["#fde68a", "#5eead4", "#ffffff", "#fb923c"],
    burstAt: 1900,
    hero: { entrance: "grow", y: 50, idle: "glow", delay: 0.3 },
    back: () => (
      <>
        <Sky layers={["linear-gradient(180deg,#1e1b4b 0%,#7c3aed 45%,#fb923c 100%)"]} />
        <Stars count={24} height={30} />
        <Glow y={52} size="80vmin" color="rgba(253,230,138,0.6)" />
        <Village color="#1e1b4b" windows="#fde68a" />
        <Particles way="up" count={16} seed={46} from={{ x: 50, y: 50, spread: 16 }} distance={[20, 50]} size={[10, 16]} delay={[1.4, 3.6]} render={(i) => <Sparkle color={GOLD_DUST[i % 3]} />} />
      </>
    ),
    front: () => <Words text="Home Sweet Home" delay={1.8} y={74} />,
  },

  // Morning over the city: a staircase drawn upward and the briefcase arriving at the top.
  "new-job": {
    sound: "fanfare",
    colors: ACHIEVE,
    burstAt: 2000,
    hero: { entrance: "burst", x: 66, y: 34, size: 140, idle: "bob", delay: 1.7 },
    back: () => (
      <>
        <Sky layers={["linear-gradient(180deg,#0ea5e9 0%,#7dd3fc 50%,#fef3c7 100%)"]} />
        <Sun x={22} y={26} size="16vmin" />
        <Skyline color="#1e3a8a" />
        <Drawn glow strokes={[{ d: "M80 560 H200 V500 H320 V440 H440 V380 H560 V320 H680 V260 H800", color: "#ffffff", width: 8, delay: 0.3, duration: 1.6 }]} />
      </>
    ),
    front: () => (
      <>
        {confetti(ACHIEVE, [1.8, 3.6])}
        <Words text="New Beginnings" delay={2} y={74} />
      </>
    ),
  },

  // Caps thrown high together, confetti coming down: Congratulations, Graduate.
  graduation: {
    sound: "fanfare",
    colors: ACHIEVE,
    burstAt: 1800,
    hero: { entrance: "rise", y: 50, delay: 0.3 },
    back: () => (
      <>
        <Sky layers={["linear-gradient(180deg,#1e3a8a 0%,#3b82f6 55%,#bfdbfe 100%)"]} />
        <Rays y={50} delay={1} />
        <Particles way="up" count={14} seed={48} size={[34, 54]} distance={[60, 95]} wander={22} spin={540} duration={[1.6, 2.4]} delay={[1, 1.6]} render={() => <Cap />} />
      </>
    ),
    front: () => (
      <>
        {confetti(ACHIEVE, [1.8, 3.6])}
        <Words text="Congratulations, Graduate" delay={2} y={74} />
      </>
    ),
  },

  // Soft light, petals falling, hearts rising, the two rings glowing together.
  wedding: {
    sound: "bloom",
    colors: ["#fecdd3", "#fde68a", "#ffffff", "#fb7185"],
    burstAt: 2000,
    hero: { entrance: "float-in", y: 50, idle: "glow", delay: 0.3 },
    back: () => (
      <>
        <Sky layers={["radial-gradient(ellipse at 50% 45%, #fff7ed 0%, #fecdd3 45%, #be123c 100%)"]} />
        <Rays y={50} color="rgba(255,255,255,0.5)" />
        <Particles way="up" count={10} seed={50} size={[14, 22]} delay={[1, 3.6]} render={(i) => <HeartShape color={["#fb7185", "#f43f5e"][i % 2]} />} />
      </>
    ),
    front: () => (
      <>
        <Particles way="down" count={40} seed={52} size={[12, 20]} spin={540} wander={18} delay={[0, 3.6]} render={(i) => <Petal color={["#fecdd3", "#fda4af", "#ffffff", "#fde68a"][i % 4]} />} />
        <Words text="Two hearts, one journey" delay={1.8} y={74} />
      </>
    ),
  },
}

/** The scene a Treasure's name selects, if it has one of its own. */
export function treasureSceneFor(gift: GiftLike | null | undefined): TreasureScene | null {
  const key = matchGiftByName(gift)?.key
  return key && key in TREASURE_SCENES ? TREASURE_SCENES[key as SceneKey] : null
}
