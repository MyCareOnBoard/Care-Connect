import type { ReactNode } from "react"
import { APIProvider } from "@vis.gl/react-google-maps"
import { GOOGLE_MAPS_KEY, hasMaps } from "./mapsConfig"

/**
 * Wraps the app in the Google Maps API provider when a key is set; otherwise a
 * passthrough so the app runs fine without maps (address falls back to plain text).
 */
export function MapsProvider({ children }: { children: ReactNode }) {
  if (!hasMaps) return <>{children}</>
  return <APIProvider apiKey={GOOGLE_MAPS_KEY as string}>{children}</APIProvider>
}
