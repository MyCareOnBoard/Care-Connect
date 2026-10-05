import type { GiftArrival } from "@/components/cowry/giftAnimations"

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
