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
 *
 * Every video also has a poster: its first frame, at public/videos/posters/<same name>.webp.
 * It shows the instant the moment opens, while the film is still loading, so the screen is
 * never black. The first frame rather than a later one, so playback starts without a jump.
 * Make it with:
 *   ffmpeg -i Name.mp4 -frames:v 1 -c:v libwebp -quality 72 -compression_level 6 posters/Name.webp
 * A missing poster only means the old black wait.
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
 * film's own subject, so the everyday "The Baobab" or "Jollof Table" keep their drawn scenes,
 * as do "Victory Dance", "Coral Beads", "Rising Moon", "Heart of Love" and "Eternal Flame".
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
  { match: ["masquerade*"], file: "Masquerade-Dance.mp4" },
  { match: ["sahara*"], file: "Sahara-Moon.mp4" },
  { match: ["royal beads", "royal bead"], file: "Royal-Beads.mp4" },
  { match: ["mbira*"], file: "Mbira-Instrument.mp4" },
  { match: ["iron smelt*"], file: "Ancient-Art-Iron-Smelting.mp4" },
  // The usual spelling and the film's own, as a name may use either.
  { match: ["assegai", "assagai", "assigai"], file: "The-Assigai-Spear.mp4" },
  { match: ["queen edea", "queen idia", "edea mask", "idia mask"], file: "Queen-Edea-Mask.mp4" },
  { match: ["oldowan*", "stone chopper"], file: "Oldowan-Stone-Chopper.mp4" },
  { match: ["african love"], file: "African-love.mp4" },
  { match: ["nok"], file: "Ancient-Nok-Terracata-Art.mp4" },
  { match: ["eternal love", "love necklace"], file: "Eternal-Love-Necklace.mp4" },
  // Hyphen or none: names keep their punctuation, ids do not.
  { match: ["igbo ukwu", "igbo-ukwu", "ancient majesty"], file: "Ancient-Majesty-Igbo-Ukwu.mp4" },
]

export function treasureVideoFor(gift: GiftLike | null | undefined): string | null {
  const file = TREASURE_VIDEOS.find((film) => giftNameHas(gift, film.match))?.file
  return file ? `${import.meta.env.BASE_URL}videos/${file}` : null
}

/** The still shown before a video's first frame: `videos/Name.mp4` → `videos/posters/Name.webp`. */
export function videoPosterFor(src: string): string | undefined {
  const poster = src.replace(/\/videos\/([^/]+)\.mp4$/, "/videos/posters/$1.webp")
  return poster === src ? undefined : poster
}
