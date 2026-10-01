import { resolveGiftIcon, type GiftLike } from "@/components/cowry/giftIcons"

/**
 * How each gift arrives on the receiver's screen.
 *
 * Most gifts rain their icon down (sized to what they cost). A few top-tier gifts get a
 * full-screen moment of their own instead. Keyed by the icon rule a gift resolves to (see
 * giftIcons.ts), so every name that means an eagle — "Golden Eagle", "Royal Eagle" — gets
 * the eagle's flight.
 *
 * To give another gift a full-screen arrival: build it (EagleFlight.tsx is the pattern),
 * add its name to GiftArrival, map its rule key here, and render it in GiftSplash.
 */

export type GiftArrival =
  | "rain"
  | "eagle-flight"
  | "lion-storm"
  | "earth-harvest"
  | "rose-bloom"
  | "thunder-strike"
  | "eternal-flame"
  | "rising-sun"
  | "ancestral-mark"
  | "city-of-lights"
  | "phoenix-rise"
  | "ocean-pearl"
  | "cowry-throne"

/** The legendary set, and only the legendary set, arrives full screen. */
const ARRIVALS: Record<string, GiftArrival> = {
  "blooming-rose": "rose-bloom",
  "thunder-staff": "thunder-strike",
  "eternal-flame": "eternal-flame",
  "rising-sun": "rising-sun",
  eagle: "eagle-flight",
  "king-lion": "lion-storm",
  "earth-harvest": "earth-harvest",
  "city-of-lights": "city-of-lights",
  // Out of the Legendary tier for now; uncomment to bring a scene back.
  // "ancestral-mark": "ancestral-mark",
  // "phoenix-rise": "phoenix-rise",
  // "ocean-pearl": "ocean-pearl",
  // "cowry-throne": "cowry-throne",
}

export function giftArrivalFor(gift: GiftLike | null | undefined, direction: "received" | "sent"): GiftArrival {
  // The big moment is the receiver's. The sender's tray is still open, and they get the
  // gift's own icon raining down instead.
  if (direction !== "received") return "rain"
  const resolved = resolveGiftIcon(gift)
  return resolved.kind === "rule" ? ARRIVALS[resolved.rule.key] ?? "rain" : "rain"
}
