import {
  Anchor,
  Apple,
  AudioWaveform,
  Award,
  Bird,
  Building2,
  Cake,
  CakeSlice,
  Candy,
  Car,
  Castle,
  Cherry,
  Citrus,
  CloudLightning,
  Clover,
  Coffee,
  Coins,
  Cookie,
  Crown,
  Droplet,
  Drum,
  Egg,
  Feather,
  Fingerprint,
  Fish,
  Flame,
  Flower,
  Flower2,
  Footprints,
  Gem,
  Globe,
  Grape,
  Guitar,
  Hand,
  HandHeart,
  Handshake,
  Heart,
  HeartPulse,
  IceCreamCone,
  Key,
  Lamp,
  Leaf,
  Medal,
  Mic,
  Moon,
  Mountain,
  Music,
  Nut,
  PartyPopper,
  PawPrint,
  Pill,
  Pizza,
  Plane,
  Popcorn,
  Rabbit,
  Rainbow,
  Ribbon,
  Rocket,
  Sailboat,
  Shield,
  Shirt,
  Smile,
  Snowflake,
  Soup,
  Sparkles,
  Sprout,
  Star,
  Stethoscope,
  Store,
  Sun,
  Sunrise,
  ThumbsUp,
  TreePalm,
  Trees,
  Trophy,
  Turtle,
  Umbrella,
  UserRound,
  Wand,
  Waves,
  Wind,
  Zap,
  type LucideIcon,
  ShoppingBasket,
  Amphora,
  Shapes,
  Armchair,
  UtensilsCrossed,
  CookingPot,
  Wheat,
  Route,
  DoorOpen,
  TreeDeciduous,
  ScrollText,
  Sunset,
  CloudRain,
  MoonStar,
  PersonStanding,
  Palette,
  BookOpen,
  Spool,
  HeartHandshake,
  HandHelping,
  House,
} from "lucide-react"
import { TreasureChest } from "@/components/cowry/TreasureChest"
import type { TreasureArtKind } from "@/components/cowry/TreasureArt"

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
 *     or one of the drawn ones ("cowry", "eagle"), a colour, and its form (below).
 *   - A gift can also have its own full-screen arrival — see giftAnimations.ts.
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
  /** A lucide icon, or one of the hand-drawn ones. */
  icon: LucideIcon | "cowry" | "eagle" | "lion" | "pearl" | "cowry-throne" | "art"
  /** Which drawn Premium piece, when `icon` is "art" — see TreasureArt. */
  art?: TreasureArtKind
  /** A finish for the drawn cowry: silver or diamond instead of its natural ivory and gold. */
  tint?: "silver" | "diamond"
  /** Legendary gifts sit on a gold-rimmed coin with a moving shine — see GiftIcon. */
  legendary?: boolean
  /** The base colour; highlights and shadows are worked out from it. */
  color: string
  /** "solid" shades the shape itself; the default puts the icon on a 3D coin. */
  form?: "solid" | "coin"
}

export const GIFT_ICON_RULES: GiftIconRule[] = [
  /* ── Treasures ──────────────────────────────────────────────────────────────
     First of all, so a Treasure's own name always wins: "The Harvest Basket" is a basket of
     food, not the Earth Harvest legendary, and "The Golden Sunset" is not the old Sunrise.
     None is legendary and none has a full-screen arrival yet — those come with the new
     legendary tier. Prices are the admin's; only names are matched here. */

  // Wellness & Emotion
  { key: "new-dawn", match: ["new dawn"], icon: Sunrise, color: "#f59e0b" },
  { key: "strong-root", match: ["strong root", "strong roots"], icon: Sprout, color: "#4d7c0f" },
  { key: "calm-water", match: ["calm water", "calm waters"], icon: Waves, color: "#0ea5e9" },
  { key: "open-hand", match: ["open hand"], icon: Hand, color: "#e0a93a" },
  { key: "family-basket", match: ["family basket"], icon: ShoppingBasket, color: "#0d9488" },
  { key: "light-within", match: ["light within"], icon: Sparkles, color: "#eab308" },
  { key: "safe-harbour", match: ["safe harbour", "safe harbor"], icon: Anchor, color: "#1e5b8a" },

  // Heritage
  { key: "calabash", match: ["calabash"], icon: Amphora, color: "#b8834a" },
  { key: "heritage-basket", match: ["heritage basket"], icon: ShoppingBasket, color: "#a16207" },
  { key: "village-lantern", match: ["village lantern"], icon: Lamp, color: "#e0a93a" },
  { key: "story-fire", match: ["story fire"], icon: Flame, color: "#ea580c" },
  { key: "ancestral-pattern", match: ["ancestral pattern"], icon: Shapes, color: "#9a3412" },
  { key: "golden-stool", match: ["golden stool"], icon: Armchair, color: "#d4a017" },

  // Food & Table
  { key: "shared-bowl", match: ["shared bowl"], icon: Soup, color: "#e4572e" },
  { key: "jollof-table", match: ["jollof table"], icon: UtensilsCrossed, color: "#dc2626" },
  { key: "morning-akara", match: ["morning akara", "akara"], icon: Cookie, color: "#c2410c" },
  { key: "family-pot", match: ["family pot"], icon: CookingPot, color: "#57534e" },
  { key: "harvest-basket", match: ["harvest basket"], icon: Wheat, color: "#ca8a04" },
  { key: "spice-trail", match: ["spice trail"], icon: Route, color: "#b45309" },
  { key: "tea-circle", match: ["tea circle"], icon: Coffee, color: "#78350f" },

  // Achievement
  { key: "barefoot-victory", match: ["barefoot victory"], icon: Footprints, color: "#a855f7" },
  { key: "first-flight", match: ["first flight"], icon: Plane, color: "#0d8de0" },
  { key: "breakthrough", match: ["breakthrough"], icon: Zap, color: "#f59e0b" },
  { key: "golden-mile", match: ["golden mile"], icon: Medal, color: "#d4a017" },
  { key: "open-door", match: ["open door"], icon: DoorOpen, color: "#0f766e" },
  // Before "legacy" on its own, so the tree is the tree.
  { key: "legacy-tree", match: ["legacy tree"], icon: "art", art: "legacy-tree", color: "#d4a017", legendary: true },
  { key: "legacy", match: ["legacy"], icon: ScrollText, color: "#7c2d12" },

  // Nature
  { key: "baobab", match: ["baobab"], icon: TreeDeciduous, color: "#65a30d" },
  { key: "golden-sunset", match: ["golden sunset"], icon: Sunset, color: "#ea580c" },
  { key: "first-rain", match: ["first rain"], icon: CloudRain, color: "#2563eb" },
  { key: "rising-moon", match: ["rising moon"], icon: MoonStar, color: "#6366f1" },
  { key: "golden-savannah", match: ["golden savannah", "savannah", "savanna"], icon: Trees, color: "#ca8a04" },
  { key: "ocean-breeze", match: ["ocean breeze"], icon: Wind, color: "#0891b2" },

  // Music & Expression
  { key: "rhythm", match: ["rhythm"], icon: Music, color: "#7c3aed" },
  { key: "dancing-shadow", match: ["dancing shadow"], icon: PersonStanding, color: "#334155" },
  { key: "voice", match: ["the voice", "voice"], icon: Mic, color: "#6366f1" },
  { key: "painters-sun", match: ["painter's sun", "painters sun", "painter s sun"], icon: Palette, color: "#f97316" },
  { key: "storyteller", match: ["storyteller", "story teller"], icon: BookOpen, color: "#9a3412" },

  // Human Connection
  { key: "thank-you", match: ["thank you"], icon: HandHeart, color: "#00b4b8" },
  { key: "friendship-thread", match: ["friendship thread"], icon: Spool, color: "#db2777" },
  { key: "warm-embrace", match: ["warm embrace"], icon: HeartHandshake, color: "#e11d48" },
  { key: "helping-hand", match: ["helping hand"], icon: HandHelping, color: "#0d9488" },
  { key: "welcome", match: ["the welcome", "welcome"], icon: House, color: "#0ea5e9" },

  // Premium — drawn in gold (TreasureArt), with the gold rim and shine the top tier wears.
  { key: "golden-journey", match: ["golden journey"], icon: "art", art: "golden-journey", color: "#d4a017", legendary: true },
  { key: "54-horizons", match: ["54 horizons", "horizons"], icon: "art", art: "54-horizons", color: "#d4a017", legendary: true },
  { key: "time-capsule", match: ["time capsule"], icon: "art", art: "time-capsule", color: "#d4a017", legendary: true },
  { key: "golden-memory", match: ["golden memory"], icon: "art", art: "golden-memory", color: "#d4a017", legendary: true },
  { key: "timeless-treasure", match: ["timeless treasure"], icon: "art", art: "timeless-treasure", color: "#d4a017", legendary: true },

  /* ── The catalogue, by name ────────────────────────────────────────────────
     First, so an exact gift name always wins over the general word rules further down
     ("Fire Works" is fireworks, not fire; "Thunder Staff" is thunder, not a staff). */

  // Everyday
  { key: "clap", match: ["clap", "claps", "applause"], icon: Hand, color: "#f59e0b" },
  { key: "thumbs-up", match: ["thumbs up", "thumb up", "thumb"], icon: ThumbsUp, color: "#0d8de0" },
  { key: "smile", match: ["smile", "smiley"], icon: Smile, color: "#f5b301", form: "solid" },
  { key: "kola-nut", match: ["kola nut", "kola", "nut"], icon: Nut, color: "#b8834a", form: "solid" },
  { key: "sunrise", match: ["sunrise", "sunset", "dawn"], icon: Sunrise, color: "#f97316" },
  { key: "handshake", match: ["handshake"], icon: Handshake, color: "#00a3a7" },

  // Warm
  { key: "bouquet", match: ["bouquet"], icon: Flower2, color: "#e0559a" },
  { key: "jollof", match: ["jollof plate", "jollof", "rice"], icon: Soup, color: "#e4572e" },
  { key: "aso-oke", match: ["aso oke", "asooke", "fabric", "cloth"], icon: Shirt, color: "#7a4fd1", form: "solid" },
  { key: "talking-drum", match: ["talking drum"], icon: Drum, color: "#a8641a" },
  { key: "gele", match: ["gele", "headtie", "head tie", "headwrap"], icon: Ribbon, color: "#c026d3" },
  { key: "palm-tree", match: ["palm tree"], icon: TreePalm, color: "#2f9e5b" },
  { key: "lantern", match: ["lantern"], icon: Lamp, color: "#e0a93a" },
  { key: "drum-beat", match: ["drum beat"], icon: AudioWaveform, color: "#6366f1" },
  { key: "hibiscus", match: ["hibiscus"], icon: Flower, color: "#e11d48" },

  // Bold
  { key: "fireworks", match: ["fire works", "fireworks", "firework"], icon: Sparkles, color: "#ec4899" },
  { key: "bronze-head", match: ["bronze head", "ife head"], icon: UserRound, color: "#b87333", form: "solid" },
  { key: "harmattan", match: ["harmattan wind", "harmattan", "wind"], icon: Wind, color: "#8a9bb0" },
  { key: "market-day", match: ["market day", "market"], icon: Store, color: "#ef7a6b" },
  { key: "golden-staff", match: ["golden staff"], icon: Wand, color: "#d4a017" },
  { key: "victory-dance", match: ["victory dance", "victory", "dance"], icon: Footprints, color: "#a855f7" },

  // Rare
  { key: "zuma-rock", match: ["zuma rock", "rock"], icon: Mountain, color: "#8a7a6b", form: "solid" },
  { key: "river-niger", match: ["river niger", "river"], icon: Waves, color: "#0d8de0" },
  { key: "coral-beads", match: ["coral beads", "coral", "beads"], icon: Gem, color: "#ff6f61", form: "solid" },
  { key: "benin-bronze", match: ["benin bronze", "bronze"], icon: Shield, color: "#b87333", form: "solid" },
  { key: "hornbill", match: ["great hornbill", "hornbill", "horn bill"], icon: Bird, color: "#e0a93a" },
  { key: "silver-cowry", match: ["silver cowry"], icon: "cowry", tint: "silver", color: "#9aa4b2" },
  { key: "diamond-cowry", match: ["diamond cowry"], icon: "cowry", tint: "diamond", color: "#5ad1e6" },
  { key: "sapphire-tide", match: ["sapphire tide", "sapphire", "tide"], icon: Waves, color: "#1d4ed8" },
  { key: "emerald-grove", match: ["emerald grove", "emerald", "grove"], icon: Trees, color: "#059669" },

  // Legendary — gold-rimmed, given the most presence in the tray, and each arriving with a
  // full-screen moment of its own (giftAnimations.ts).
  { key: "blooming-rose", match: ["blooming rose"], icon: Flower2, color: "#e11d48", legendary: true },
  { key: "eternal-flame", match: ["eternal flame"], icon: Flame, color: "#f97316", legendary: true },
  { key: "rising-sun", match: ["rising sun"], icon: Sun, color: "#f59e0b", legendary: true },
  // Ancestral Mark, Phoenix Rise, Ocean Pearl and Cowry Throne are out of the Legendary tier
  // for now: their own icons, without the gold-rimmed legendary finish.
  { key: "ancestral-mark", match: ["ancestral mark", "ancestral"], icon: Fingerprint, color: "#c8963e" },
  { key: "thunder-staff", match: ["thunder staff", "thunder"], icon: CloudLightning, color: "#7c3aed", legendary: true },
  { key: "city-of-lights", match: ["city of lights", "city of light"], icon: Building2, color: "#f59e0b", legendary: true },
  { key: "phoenix-rise", match: ["phoenix rise", "phoenix"], icon: Bird, color: "#ef4444" },
  { key: "ocean-pearl", match: ["ocean pearl", "pearl"], icon: "pearl", color: "#c7b8e6" },
  { key: "cowry-throne", match: ["cowry throne", "throne"], icon: "cowry-throne", color: "#c8963e" },
  // Earth Harvest (100,000): rain on the earth and new growth rising.
  { key: "earth-harvest", match: ["earth harvest", "harvest rain", "harvest"], icon: Sprout, color: "#16a34a", legendary: true },
  // Golden Lion (90,000). Golden Eagle (80,000) is the eagle rule below.
  { key: "king-lion", match: ["golden lion king", "golden lion", "lion king", "king lion"], icon: "lion", color: "#d99a3c", legendary: true },

  /* ── General word rules, for anything not named above ───────────────────── */
  { key: "cowry", match: ["cowry", "cowrie"], icon: "cowry", color: "#c8963e" },
  // Before the general bird rule, so an eagle is the drawn eagle rather than a small bird.
  { key: "eagle", match: ["eagle", "hawk", "falcon"], icon: "eagle", color: "#c8963e", legendary: true },
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

  /* Animals and birds. */
  { key: "bird", match: ["bird", "dove", "parrot", "peacock", "swan", "robin", "sparrow"], icon: Bird, color: "#5a8dee" },
  { key: "feather", match: ["feather", "plume"], icon: Feather, color: "#a782d8" },
  { key: "big-cat", match: ["lion", "tiger", "leopard", "cheetah", "paw", "elephant", "bear"], icon: PawPrint, color: "#d97a2b" },
  { key: "rabbit", match: ["rabbit", "bunny"], icon: Rabbit, color: "#e879a6" },
  { key: "turtle", match: ["turtle", "tortoise"], icon: Turtle, color: "#3fa45c" },
  { key: "fish", match: ["fish", "dolphin", "whale"], icon: Fish, color: "#2f8fde", form: "solid" },
  { key: "egg", match: ["egg"], icon: Egg, color: "#e0b872", form: "solid" },
  { key: "shell", match: ["shell", "seashell"], icon: "cowry", color: "#c8963e" },

  /* Nature and weather. */
  { key: "palm", match: ["palm", "coconut", "island"], icon: TreePalm, color: "#3fa45c" },
  { key: "clover", match: ["clover", "luck", "lucky"], icon: Clover, color: "#1f9c4c" },
  { key: "mountain", match: ["mountain", "summit", "peak"], icon: Mountain, color: "#5a6b7d" },
  { key: "snow", match: ["snow", "snowflake", "frost", "ice"], icon: Snowflake, color: "#5ab8f5" },
  { key: "umbrella", match: ["umbrella"], icon: Umbrella, color: "#6366f1" },

  /* Food and treats. */
  { key: "cake-slice", match: ["slice", "pastry", "dessert"], icon: CakeSlice, color: "#e879a6" },
  { key: "cookie", match: ["cookie", "biscuit"], icon: Cookie, color: "#b8834a" },
  { key: "pizza", match: ["pizza"], icon: Pizza, color: "#e0a93a" },
  { key: "popcorn", match: ["popcorn", "movie", "cinema"], icon: Popcorn, color: "#ef7a6b" },
  { key: "cherry", match: ["cherry", "cherries", "berry", "berries"], icon: Cherry, color: "#d8442a" },
  { key: "grape", match: ["grape", "grapes"], icon: Grape, color: "#8b5cf6" },
  { key: "citrus", match: ["orange", "lemon", "lime", "citrus", "mango"], icon: Citrus, color: "#f59e0b" },

  /* Music and celebration. */
  { key: "drum", match: ["drum", "talking drum", "beat"], icon: Drum, color: "#b8834a" },
  { key: "guitar", match: ["guitar"], icon: Guitar, color: "#d97a2b" },
  { key: "mic", match: ["mic", "microphone", "karaoke", "shoutout", "shout"], icon: Mic, color: "#6366f1" },
  { key: "ribbon", match: ["ribbon", "bow"], icon: Ribbon, color: "#e0559a" },
  { key: "award", match: ["honour", "honor", "prize", "recognition"], icon: Award, color: "#d4a017" },

  /* Grand gestures. */
  { key: "castle", match: ["castle", "palace", "kingdom"], icon: Castle, color: "#8b7fd8" },
  { key: "car", match: ["car", "ride", "sportscar"], icon: Car, color: "#ef4444" },
  { key: "plane", match: ["plane", "jet", "flight", "trip"], icon: Plane, color: "#0d8de0" },
  { key: "boat", match: ["yacht", "boat", "sailboat", "cruise"], icon: Sailboat, color: "#2f8fde" },
  { key: "anchor", match: ["anchor", "harbour", "harbor"], icon: Anchor, color: "#1e5b8a" },
  { key: "globe", match: ["globe", "world", "earth"], icon: Globe, color: "#1f9c4c" },
  { key: "key", match: ["key", "keys"], icon: Key, color: "#d4a017" },
]

const FALLBACK: GiftIconRule = { key: "gift", match: [], icon: TreasureChest, color: "#00b4b8" }

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

  return { kind: "rule", rule: matchGiftByName(gift) ?? FALLBACK }
}

/**
 * The rule a gift's own words select — its name and id — ignoring any icon override.
 *
 * What a gift *is* (and so how it arrives) comes from here; an override only changes the
 * picture. Otherwise choosing a different icon for "Earth Harvest" would quietly cost it
 * its full-screen arrival.
 */
export function matchGiftByName(gift: GiftLike | null | undefined): GiftIconRule | null {
  // The name first, the id only if the name says nothing. An id cannot change once a gift is
  // saved, so a gift renamed in the catalogue keeps its old id — "Earth Harvest" stored as
  // cowry_throne — and reading the two together let the old id win.
  return matchWords(gift?.label ?? "") ?? matchWords((gift?.id ?? "").replace(/[_\-.]+/g, " "))
}

function matchWords(words: string): GiftIconRule | null {
  const text = ` ${words} `.toLowerCase()
  if (!text.trim()) return null
  for (const rule of GIFT_ICON_RULES) {
    if (rule.match.some((word) => wordPattern(word).test(text))) return rule
  }
  return null
}

/** The rule an icon override names, if it names one ("earth-harvest", "flower"…). */
export function overrideRule(gift: GiftLike | null | undefined): GiftIconRule | null {
  const override = gift?.icon?.trim().toLowerCase()
  return override ? RULES_BY_KEY.get(override) ?? null : null
}

/** The colour that goes with a gift's icon. */
export function giftColor(gift: GiftLike | null | undefined): string {
  const resolved = resolveGiftIcon(gift)
  return resolved.kind === "rule" ? resolved.rule.color : resolved.color
}
