import { useEffect, useRef } from "react"
import { useMapsLibrary } from "@vis.gl/react-google-maps"

export type PlaceLocation = {
  address: string
  lat?: number
  lng?: number
  placeId?: string
}

/**
 * Address input backed by Google Places Autocomplete when the Maps key is present.
 * Without a key (or before the library loads) it degrades to a plain text field,
 * so the booking still captures a typed address.
 */
export function AddressAutocomplete({
  value,
  onChange,
  placeholder = "Enter the meeting address",
  className = "h-11 w-full rounded-md border border-[#d6d6d6] bg-white px-3 text-sm outline-none focus:border-[#00b4b8]",
}: {
  value: PlaceLocation | null
  onChange: (location: PlaceLocation | null) => void
  placeholder?: string
  className?: string
}) {
  const places = useMapsLibrary("places")
  const inputRef = useRef<HTMLInputElement>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const autocompleteRef = useRef<any>(null)
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange

  useEffect(() => {
    if (!places || !inputRef.current || autocompleteRef.current) return
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ac = new (places as any).Autocomplete(inputRef.current, {
      fields: ["formatted_address", "geometry", "place_id"],
      types: ["address"],
    })
    autocompleteRef.current = ac
    const listener = ac.addListener("place_changed", () => {
      const place = ac.getPlace()
      const address = place.formatted_address || inputRef.current?.value || ""
      onChangeRef.current(
        address
          ? {
              address,
              lat: place.geometry?.location?.lat?.(),
              lng: place.geometry?.location?.lng?.(),
              placeId: place.place_id,
            }
          : null,
      )
    })
    return () => listener.remove()
  }, [places])

  return (
    <input
      ref={inputRef}
      defaultValue={value?.address ?? ""}
      onChange={(event) => onChange(event.target.value ? { address: event.target.value } : null)}
      placeholder={placeholder}
      className={className}
    />
  )
}
