import type { GiftArrival } from "@/components/cowry/giftAnimations"
import { matchGiftByName, type GiftLike } from "@/components/cowry/giftIcons"

/**
 * Legendary arrivals that play a filmed sequence instead of a drawn scene.
 *
 * The drawn scene stays as the fallback — for a video that will not load, a connection too
 * slow to start it in time, or a browser that will not play it — so adding a video here can
 * never leave a receiver looking at a blank screen.
 *
 * To give another legendary gift a video: put the MP4 in public/videos (H.264, 720p or more,
 * 10 seconds or so, the action kept to the middle third so a phone's crop keeps it) and add
 * its arrival here.
 */
const VIDEOS: Partial<Record<GiftArrival, string>> = {
  "eagle-flight": "Golden-Eagle-Flying-in-Jungle.mp4",
  "lion-storm": "Crowned-Lion-Roaring-in-Storm.mp4",
  "earth-harvest": "Dry-Earth-Transforms-into-Garden.mp4",
}

export function giftVideoFor(arrival: GiftArrival): string | null {
  const file = VIDEOS[arrival]
  return file ? `${import.meta.env.BASE_URL}videos/${file}` : null
}

/**
 * Treasures with a film of their own, by the icon rule their name selects (giftIcons.ts) —
 * so "The Timeless Treasure", "Timeless Treasure" and its id all find it.
 *
 * A Treasure listed here plays its video whenever it is received, whatever it is priced at,
 * with its price-band scene (treasureTiers.ts) as the fallback. The Premium tier's videos go
 * here as they arrive: one line each.
 */
const TREASURE_VIDEOS: Record<string, string> = {
  "timeless-treasure": "Timeless-Treasure.mp4",
  "jollof-table": "Jollof-Table.mp4",
  // The eagle's flight, for a first flight.
  "first-flight": "Golden-Eagle-Flying-in-Jungle.mp4",
}

export function treasureVideoFor(gift: GiftLike | null | undefined): string | null {
  const key = matchGiftByName(gift)?.key
  const file = key ? TREASURE_VIDEOS[key] : undefined
  return file ? `${import.meta.env.BASE_URL}videos/${file}` : null
}
