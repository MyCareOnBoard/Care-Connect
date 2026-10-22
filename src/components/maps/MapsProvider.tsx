import type { ReactNode } from "react"
import { APIProvider } from "@vis.gl/react-google-maps"
import { useCookieConsent } from "@/lib/consent"
import { GOOGLE_MAPS_KEY, hasMaps } from "./mapsConfig"

/**
 * Wraps the app in the Google Maps API provider when a key is set and the person has allowed
 * third-party services in their cookie choices. Otherwise a passthrough: Google's script is
 * never loaded, and address fields fall back to plain text, as they do without a key.
 */
export function MapsProvider({ children }: { children: ReactNode }) {
  const consent = useCookieConsent()
  if (!hasMaps || !consent?.thirdParty) return <>{children}</>
  return <APIProvider apiKey={GOOGLE_MAPS_KEY as string}>{children}</APIProvider>
}
