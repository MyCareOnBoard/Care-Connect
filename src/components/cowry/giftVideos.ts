import type { GiftArrival } from "@/components/cowry/giftAnimations"
import { giftNameHas, type GiftLike } from "@/components/cowry/giftIcons"

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
  "earth-harvest": "Dry-Earth-Transforms-into-Garden.mp4",
}

export function giftVideoFor(arrival: GiftArrival): string | null {
  const file = VIDEOS[arrival]
  return file ? `${import.meta.env.BASE_URL}videos/${file}` : null
}

/**
 * Treasures with a film of their own, by the words in their name (or id, as giftIcons.ts
 * matches them) — so "The Timeless Treasure", "Timeless Treasure" and its id all find it.
 *
 * A Treasure listed here plays its video whenever it is received, whatever it is priced at,
 * with its price-band scene (treasureTiers.ts) as the fallback. The Special and Premium
 * films go here as they arrive: one line each, first match wins. The names are kept to the
 * film's own subject, so the everyday "The Baobab" or "Jollof Table" keep their drawn scenes.
 */
const TREASURE_VIDEOS: { match: string[]; file: string }[] = [
  { match: ["timeless treasure"], file: "Timeless-Treasure.mp4" },
  // The eagle's flight, for a first flight.
  { match: ["first flight"], file: "Golden-Eagle-Flying-in-Jungle.mp4" },
  { match: ["baobab tree"], file: "Baobab-Tree.mp4" },
  { match: ["masai shield", "maasai shield"], file: "Masai-Shield.mp4" },
  { match: ["dzimba*", "stone house"], file: "Dzimba-Dzamabwe-Stone-House.mp4" },
  { match: ["lake chad"], file: "Lake-Chad-Basin.mp4" },
  { match: ["benin bronze"], file: "Benin-Bronze-Original.mp4" },
  { match: ["nigerian jollof", "jollof rice"], file: "Nigerian-Jollof-Rice.mp4" },
]

export function treasureVideoFor(gift: GiftLike | null | undefined): string | null {
  const file = TREASURE_VIDEOS.find((film) => giftNameHas(gift, film.match))?.file
  return file ? `${import.meta.env.BASE_URL}videos/${file}` : null
}
