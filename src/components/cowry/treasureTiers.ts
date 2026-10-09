import type { SoundName } from "@/lib/sound"
import { matchGiftByName, type GiftLike } from "@/components/cowry/giftIcons"

/**
 * How a Treasure arrives, by what it cost.
 *
 * The more a Treasure costs, the bigger its arrival — by its actual price, not its category,
 * so an admin repricing one moves its arrival with it. Because the categories climb in price
 * from Wellness to Human Connection, the arrivals climb with them.
 *
 *   1  under 200        a light shower of its icon
 *   2  200 – 399        a fuller shower, and sparkles bursting from the middle
 *   3  400 – 699        a spotlight: the icon rises large and glowing, confetti in its colours
 *   4  700 – 1,999      a scene themed to its category, about three seconds
 *   5  2,000 and up     Premium: its own video when there is one, a gold scene until then
 *
 * The receiver's screen only. A named legendary with a scene of its own (giftAnimations.ts)
 * keeps that scene whatever it costs.
 */

export type TreasureTier = 1 | 2 | 3 | 4 | 5

export const TIER_FLOORS: Record<TreasureTier, number> = { 1: 0, 2: 200, 3: 400, 4: 700, 5: 2000 }

export function treasureTier(cost: number | null | undefined): TreasureTier {
  const amount = Math.max(0, Number(cost) || 0)
  if (amount >= TIER_FLOORS[5]) return 5
  if (amount >= TIER_FLOORS[4]) return 4
  if (amount >= TIER_FLOORS[3]) return 3
  if (amount >= TIER_FLOORS[2]) return 2
  return 1
}

export type TreasureTheme =
  | "wellness"
  | "heritage"
  | "food"
  | "achievement"
  | "nature"
  | "music"
  | "human"
  | "premium"

/** What floats, falls or pulses through a themed scene. */
export type ParticleKind = "orb" | "diamond" | "steam" | "ray" | "leaf" | "note" | "heart" | "sparkle"

export interface ThemeLook {
  label: string
  /** The scene's band, top to bottom. */
  backdrop: string
  /** What moves through it, and which way. */
  particle: ParticleKind
  drift: "up" | "down"
  /** Confetti and particle colours. */
  colors: string[]
  sound: SoundName
}

export const THEMES: Record<TreasureTheme, ThemeLook> = {
  wellness: {
    label: "Wellness & Emotion",
    backdrop: "linear-gradient(180deg,#0f766e 0%,#14b8a6 45%,#fde68a 100%)",
    particle: "orb",
    drift: "up",
    colors: ["#ccfbf1", "#5eead4", "#fde68a", "#ffffff"],
    sound: "bloom",
  },
  heritage: {
    label: "Heritage",
    backdrop: "linear-gradient(180deg,#431407 0%,#9a3412 50%,#d97706 100%)",
    particle: "diamond",
    drift: "up",
    colors: ["#f3c969", "#c2410c", "#7c2d12", "#fef3c7"],
    sound: "drums",
  },
  food: {
    label: "Food & Table",
    backdrop: "linear-gradient(180deg,#7c2d12 0%,#ea580c 55%,#fdba74 100%)",
    particle: "steam",
    drift: "up",
    colors: ["#fed7aa", "#fb923c", "#dc2626", "#fef3c7"],
    sound: "sunrise",
  },
  achievement: {
    label: "Achievement",
    backdrop: "linear-gradient(180deg,#0b1d4d 0%,#1e40af 55%,#60a5fa 100%)",
    particle: "ray",
    drift: "up",
    colors: ["#f3c969", "#ffffff", "#60a5fa", "#fde68a"],
    sound: "fanfare",
  },
  nature: {
    label: "Nature",
    backdrop: "linear-gradient(180deg,#14532d 0%,#16a34a 55%,#bef264 100%)",
    particle: "leaf",
    drift: "down",
    colors: ["#bbf7d0", "#4ade80", "#facc15", "#ffffff"],
    sound: "harvest",
  },
  music: {
    label: "Music & Expression",
    backdrop: "linear-gradient(180deg,#2e1065 0%,#7c3aed 55%,#f0abfc 100%)",
    particle: "note",
    drift: "up",
    colors: ["#f0abfc", "#c4b5fd", "#facc15", "#ffffff"],
    sound: "city",
  },
  human: {
    label: "Human Connection",
    backdrop: "linear-gradient(180deg,#881337 0%,#e11d48 55%,#fecdd3 100%)",
    particle: "heart",
    drift: "up",
    colors: ["#fecdd3", "#fb7185", "#ffffff", "#fde68a"],
    sound: "pearl",
  },
  premium: {
    label: "Premium",
    backdrop: "linear-gradient(180deg,#2b1a04 0%,#7a5310 45%,#f3c969 100%)",
    particle: "sparkle",
    drift: "up",
    colors: ["#fff7d6", "#f3c969", "#c8963e", "#ffffff"],
    sound: "fanfare",
  },
}

/**
 * Which theme a Treasure's category means. Matched on the words in its key and label, since
 * both are whatever the admin chose ("food_table", "Food & Table"). Anything unrecognised
 * takes the Premium gold if it is that dear, and Wellness otherwise.
 */
export function themeFor(set: string | null | undefined, tier: TreasureTier): TreasureTheme {
  const words = ` ${(set ?? "").toLowerCase().replace(/[_\-&]+/g, " ")} `
  if (/\b(premium|legendary)\b/.test(words)) return "premium"
  if (/\bheritage\b/.test(words)) return "heritage"
  if (/\b(food|table)\b/.test(words)) return "food"
  if (/\bachievement/.test(words)) return "achievement"
  if (/\bnature\b/.test(words)) return "nature"
  if (/\b(music|expression)\b/.test(words)) return "music"
  if (/\b(human|connection|linkup)\b/.test(words)) return "human"
  if (/\b(wellness|emotion)\b/.test(words)) return "wellness"
  return tier === 5 ? "premium" : "wellness"
}

/** The Human Connection Treasures, each with a full-screen scene of its own (HumanMoments.tsx). */
export type HumanScene = "thank-you" | "friendship-thread" | "warm-embrace" | "helping-hand" | "welcome"

export const HUMAN_SCENES: HumanScene[] = ["thank-you", "friendship-thread", "warm-embrace", "helping-hand", "welcome"]

/** Whether an icon rule (the one a Treasure's name selects) is a Human Connection scene. */
export function isHumanScene(ruleKey: string | null | undefined): ruleKey is HumanScene {
  return HUMAN_SCENES.includes(ruleKey as HumanScene)
}

/** Which scene a Human Connection Treasure gets; one this list does not name, the embrace. */
export function humanSceneFor(ruleKey: string | null | undefined): HumanScene {
  return isHumanScene(ruleKey) ? ruleKey : "warm-embrace"
}

/**
 * What a Treasure means, shown under its name on its arrival ("Meaning: Celebration").
 *
 * By the icon rule its name selects, so "The Jollof Table" and "Jollof Table" both find it.
 * The catalogue has a `meaning` field an admin can fill; until the member catalogue sends it,
 * the meanings are kept here — one line each.
 */
const TREASURE_MEANINGS: Record<string, string> = {
  "jollof-table": "Celebration",
}

export function treasureMeaningFor(gift: GiftLike | null | undefined): string | null {
  const key = matchGiftByName(gift)?.key
  return (key && TREASURE_MEANINGS[key]) || null
}
