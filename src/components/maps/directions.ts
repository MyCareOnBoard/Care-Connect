/**
 * Hand off to the viewer's own maps app for navigation.
 *
 * Routing is deliberately not built in-app: the device's maps application already has live
 * traffic, the user's transport preference, and voice guidance, and on mobile these URLs
 * open it natively rather than in a browser tab.
 *
 * Uses Google's documented Maps URLs form (`api=1`), which is stable across platforms —
 * the older path-style `/maps/dir/<a>/<b>` used elsewhere in the org's mileage screens is
 * undocumented and easier to break.
 */

const MAPS_URL = "https://www.google.com/maps"

export type DirectionsTarget = {
  address?: string | null
  lat?: number | null
  lng?: number | null
}

/**
 * Prefer coordinates — an address string can be ambiguous or misspelled, whereas a
 * lat/lng pair resolves to exactly the point the client picked from autocomplete.
 */
function destinationParam(target: DirectionsTarget): string | null {
  if (typeof target.lat === "number" && typeof target.lng === "number") {
    return `${target.lat},${target.lng}`
  }
  const address = (target.address ?? "").trim()
  return address || null
}

/** Turn-by-turn directions to the target, or null when there's nothing to navigate to. */
export function directionsUrl(target: DirectionsTarget): string | null {
  const destination = destinationParam(target)
  if (!destination) return null
  return `${MAPS_URL}/dir/?api=1&destination=${encodeURIComponent(destination)}`
}

/** A dropped pin at the target, for orientation without starting navigation. */
export function mapPinUrl(target: DirectionsTarget): string | null {
  const query = destinationParam(target)
  if (!query) return null
  return `${MAPS_URL}/search/?api=1&query=${encodeURIComponent(query)}`
}
