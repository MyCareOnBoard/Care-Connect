import { Map, AdvancedMarker } from "@vis.gl/react-google-maps"
import { hasMaps } from "./mapsConfig"

/**
 * A marker map for a booking's in-person location. Falls back to the address text
 * when no Maps key is configured or coordinates are missing.
 */
export function LocationMap({
  address,
  lat,
  lng,
  className = "h-48 w-full overflow-hidden rounded-xl",
}: {
  address?: string | null
  lat?: number | null
  lng?: number | null
  className?: string
}) {
  const hasCoords = hasMaps && typeof lat === "number" && typeof lng === "number"

  if (!hasCoords) {
    return (
      <div className={`${className} flex items-center justify-center bg-[#f2f6f8] px-4 text-center text-sm text-[#657080]`}>
        {address || "No location provided."}
      </div>
    )
  }

  const center = { lat: lat as number, lng: lng as number }
  return (
    <div className={className}>
      <Map
        defaultCenter={center}
        defaultZoom={15}
        mapId="careconnect-map"
        disableDefaultUI
        gestureHandling="cooperative"
        style={{ width: "100%", height: "100%" }}
      >
        <AdvancedMarker position={center} />
      </Map>
    </div>
  )
}
