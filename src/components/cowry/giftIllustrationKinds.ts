/**
 * Every named catalogue gift — the Everyday, Warm, Bold, Rare and Legendary sets — and the
 * Treasures with no drawn scene of their own, each with a drawing (giftIllustrations.tsx).
 * Each kind is the gift's rule key in giftIcons.ts.
 *
 * Kept apart from the Treasures' own list (treasureIllustrationKinds.ts) because every
 * Treasure there also has a full-screen scene of its own; these arrive as they did (a film
 * where they have one, their price band's scene otherwise).
 */
export const GIFT_ILLUSTRATION_KINDS = [
  // Everyday
  "clap", "thumbs-up", "smile", "kola-nut", "sunrise", "handshake",
  // Warm
  "bouquet", "jollof", "aso-oke", "gele", "palm-tree", "lantern", "drum-beat", "hibiscus",
  // Bold
  "fireworks", "bronze-head", "harmattan", "market-day", "golden-staff", "victory-dance",
  // Rare
  "zuma-rock", "river-niger", "coral-beads", "benin-bronze", "hornbill", "sapphire-tide", "emerald-grove",
  // Legendary
  "blooming-rose", "eternal-flame", "rising-sun", "ancestral-mark", "thunder-staff", "city-of-lights",
  "phoenix-rise", "earth-harvest",
  // Treasures without a scene of their own
  "mbira", "oldowan-chopper", "healing-horizon", "breath-of-morning",
  "nubian-jewellery", "mossi-horseman", "swahili-incense-burner", "kissi-figure", "fontomfrom-drum",
  "timbuktu-manuscripts",
] as const

export type GiftIllustrationKind = (typeof GIFT_ILLUSTRATION_KINDS)[number]

export function isGiftIllustration(kind: string): kind is GiftIllustrationKind {
  return (GIFT_ILLUSTRATION_KINDS as readonly string[]).includes(kind)
}
