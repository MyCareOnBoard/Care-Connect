import {
  Apple,
  Cake,
  Candy,
  Coffee,
  Coins,
  Crown,
  Droplet,
  Flame,
  Flower2,
  Gem,
  Gift,
  HandHeart,
  Heart,
  HeartPulse,
  IceCreamCone,
  Leaf,
  Medal,
  Moon,
  Music,
  PartyPopper,
  Pill,
  Rainbow,
  Rocket,
  Sparkles,
  Star,
  Stethoscope,
  Sun,
  Trophy,
  Zap,
  type LucideIcon,
} from "lucide-react"

/**
 * Which icon each gift wears.
 *
 * THIS IS THE FILE TO EDIT when gifts are added or renamed. Gift names come from the
 * backend catalogue, so a gift is matched to an icon by the words in its name (or id):
 * "Water Drop" finds `water`, "Rose Bouquet" finds `rose`, "Cowry Shell" finds `cowry`.
 *
 *   - To change a gift's icon, move its word to another rule, or add a rule above the one
 *     it currently matches (the first matching rule wins).
 *   - To add an icon, add a rule: the words to match, a lucide icon (https://lucide.dev)
 *     or "cowry" for the drawn shell, a colour, and its form (below).
 *   - Every icon is drawn in 3D to match the cowry. `form: "solid"` shades the shape itself
 *     — right for closed shapes like a heart, drop or gem. Anything drawn in lines (a
 *     stethoscope, music notes) would fill oddly, so the default sits it on a glossy 3D coin
 *     in its colour instead. When adding an icon, try "solid"; if it looks blotchy, drop it.
 *   - Words match whole words, plurals included ("star" finds "Stars", not "Starfish").
 *     End a word with * to match its start instead ("celebrat*" finds "Celebration").
 *   - A gift that matches nothing gets the plain gift box, so a new gift is never iconless.
 *
 * The backend can also choose for itself: a catalogue item with an `icon` field set to one
 * of the rule keys below ("drop", "flower", …) — or to an emoji — overrides the matching,
 * so an icon can be changed without a release.
 */

export interface GiftIconRule {
  /** Stable name, usable as `icon` in the catalogue. */
  key: string
  /** Words in the gift's name or id that select this icon. Lowercase. */
  match: string[]
  icon: LucideIcon | "cowry"
  /** The base colour; highlights and shadows are worked out from it. */
  color: string
  /** "solid" shades the shape itself; the default puts the icon on a 3D coin. */
  form?: "solid" | "coin"
}

export const GIFT_ICON_RULES: GiftIconRule[] = [
  { key: "cowry", match: ["cowry", "cowrie", "shell"], icon: "cowry", color: "#c8963e" },
  { key: "drop", match: ["water", "drop", "droplet", "dew", "raindrop"], icon: Droplet, color: "#2f8fde", form: "solid" },
  { key: "flower", match: ["flower", "rose", "bouquet", "blossom", "tulip", "lily", "daisy"], icon: Flower2, color: "#e0559a" },
  { key: "heart", match: ["heart", "love"], icon: Heart, color: "#ff3e66", form: "solid" },
  { key: "star", match: ["star"], icon: Star, color: "#f5b301", form: "solid" },
  { key: "sun", match: ["sun", "sunshine"], icon: Sun, color: "#f59e0b", form: "solid" },
  { key: "moon", match: ["moon"], icon: Moon, color: "#8b7fd8", form: "solid" },
  { key: "sparkle", match: ["sparkle", "glitter", "shine", "magic"], icon: Sparkles, color: "#e0a93a", form: "solid" },
  { key: "coffee", match: ["coffee", "tea", "cup", "latte"], icon: Coffee, color: "#8a5a2b" },
  { key: "cake", match: ["cake", "cupcake", "birthday"], icon: Cake, color: "#e879a6" },
  { key: "ice-cream", match: ["ice cream", "icecream", "gelato"], icon: IceCreamCone, color: "#f59ec4" },
  { key: "candy", match: ["candy", "sweet", "lollipop", "chocolate"], icon: Candy, color: "#ec4899" },
  { key: "apple", match: ["apple", "fruit"], icon: Apple, color: "#e0443a", form: "solid" },
  { key: "leaf", match: ["leaf", "plant", "tree", "palm", "seed", "sprout"], icon: Leaf, color: "#3fa45c", form: "solid" },
  { key: "fire", match: ["fire", "flame", "hot"], icon: Flame, color: "#f97316", form: "solid" },
  { key: "bolt", match: ["bolt", "lightning", "energy", "power", "zap"], icon: Zap, color: "#f5b301", form: "solid" },
  { key: "rocket", match: ["rocket", "launch"], icon: Rocket, color: "#6366f1" },
  { key: "trophy", match: ["trophy", "champion", "winner"], icon: Trophy, color: "#e0a93a" },
  { key: "medal", match: ["medal", "award", "badge"], icon: Medal, color: "#d4a017" },
  { key: "crown", match: ["crown", "king", "queen", "royal"], icon: Crown, color: "#e0a93a", form: "solid" },
  { key: "gem", match: ["diamond", "gem", "jewel", "crystal"], icon: Gem, color: "#22b8cf", form: "solid" },
  { key: "gold", match: ["gold", "coin", "treasure"], icon: Coins, color: "#d4a017" },
  { key: "party", match: ["party", "balloon", "confetti", "celebrat*"], icon: PartyPopper, color: "#a855f7" },
  { key: "rainbow", match: ["rainbow"], icon: Rainbow, color: "#f97316" },
  { key: "music", match: ["music", "song", "note", "melody"], icon: Music, color: "#6366f1" },
  { key: "stethoscope", match: ["stethoscope", "doctor"], icon: Stethoscope, color: "#00b4b8" },
  { key: "pulse", match: ["pulse", "health", "care", "nurse", "heal"], icon: HeartPulse, color: "#ff3e66" },
  { key: "pill", match: ["pill", "medicine", "vitamin"], icon: Pill, color: "#8b5cf6" },
  { key: "thanks", match: ["thank", "clap", "applause", "hands", "grateful", "kind"], icon: HandHeart, color: "#00b4b8" },
]

const FALLBACK: GiftIconRule = { key: "gift", match: [], icon: Gift, color: "#00b4b8" }

/** What a gift is drawn as: a rule's icon, or an emoji the backend chose. */
export type ResolvedGiftIcon =
  | { kind: "rule"; rule: GiftIconRule }
  | { kind: "emoji"; emoji: string; color: string }

/** Anything that names a gift: a catalogue item, a received gift, or a hold. */
export interface GiftLike {
  id?: string | null
  label?: string | null
  /** Optional backend override: a rule key, or an emoji. */
  icon?: string | null
}

/** Whole word (plurals allowed), or a word start when it ends in "*". */
function wordPattern(word: string): RegExp {
  const prefix = word.endsWith("*")
  const escaped = (prefix ? word.slice(0, -1) : word).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  return new RegExp(prefix ? `[^a-z]${escaped}` : `[^a-z]${escaped}(?:s|es)?(?=[^a-z])`)
}

const RULES_BY_KEY = new Map(GIFT_ICON_RULES.map((rule) => [rule.key, rule]))

/** Anything that is not plain ASCII text is taken for an emoji. */
const looksLikeEmoji = (value: string) => value.length <= 8 && /[^ -~]/.test(value)

export function resolveGiftIcon(gift: GiftLike | null | undefined): ResolvedGiftIcon {
  const override = gift?.icon?.trim()
  if (override) {
    const rule = RULES_BY_KEY.get(override.toLowerCase())
    if (rule) return { kind: "rule", rule }
    if (looksLikeEmoji(override)) return { kind: "emoji", emoji: override, color: FALLBACK.color }
  }

  // Words from the name and the id ("water_drop" reads as "water drop").
  const text = ` ${gift?.label ?? ""} ${(gift?.id ?? "").replace(/[_\-.]+/g, " ")} `.toLowerCase()
  for (const rule of GIFT_ICON_RULES) {
    if (rule.match.some((word) => wordPattern(word).test(text))) return { kind: "rule", rule }
  }
  return { kind: "rule", rule: FALLBACK }
}

/** The colour that goes with a gift's icon. */
export function giftColor(gift: GiftLike | null | undefined): string {
  const resolved = resolveGiftIcon(gift)
  return resolved.kind === "rule" ? resolved.rule.color : resolved.color
}
