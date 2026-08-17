import { useEffect, useRef, useState } from "react"
import { useMapsLibrary } from "@vis.gl/react-google-maps"

export type PlaceLocation = {
  address: string
  lat?: number
  lng?: number
  placeId?: string
}

type Suggestion = {
  id: string
  label: string
  /** Resolves the full place record (address + coordinates) on selection. */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  prediction: any
}

const DEBOUNCE_MS = 250

/**
 * Address input backed by Google Places Autocomplete when the Maps key is present.
 * Without a key (or before the library loads) it degrades to a plain text field,
 * so the booking still captures a typed address.
 *
 * Built on `places.AutocompleteSuggestion`, not the legacy `places.Autocomplete`
 * widget: as of 2025-03-01 the legacy class is unavailable to Google Cloud
 * projects created after that date, which made the field silently stop
 * suggesting. Rendering our own list also keeps the input controlled, so an
 * address loaded from an existing booking shows up when the dialog reopens.
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
  const [text, setText] = useState(value?.address ?? "")
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const sessionTokenRef = useRef<unknown>(null)
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange

  // Adopt an address set from outside (e.g. reopening a dialog on a saved booking).
  useEffect(() => {
    setText((current) => (value?.address && value.address !== current ? value.address : current))
  }, [value?.address])

  // Close the list when focus moves elsewhere on the page.
  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", onPointerDown)
    return () => document.removeEventListener("mousedown", onPointerDown)
  }, [open])

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const lib = places as any
    const query = text.trim()
    if (!lib?.AutocompleteSuggestion || query.length < 3) {
      setSuggestions([])
      return
    }

    let active = true
    const timer = window.setTimeout(async () => {
      try {
        // One session token per typing session keeps Places billing on the
        // per-session rate rather than per-keystroke.
        if (!sessionTokenRef.current && lib.AutocompleteSessionToken) {
          sessionTokenRef.current = new lib.AutocompleteSessionToken()
        }
        const response = await lib.AutocompleteSuggestion.fetchAutocompleteSuggestions({
          input: query,
          sessionToken: sessionTokenRef.current ?? undefined,
        })
        if (!active) return
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const next: Suggestion[] = (response?.suggestions ?? []).flatMap((item: any) => {
          const prediction = item?.placePrediction
          const label = prediction?.text?.toString?.() ?? prediction?.text?.text ?? ""
          if (!prediction || !label) return []
          return [{ id: prediction.placeId ?? label, label, prediction }]
        })
        setSuggestions(next)
        setOpen(next.length > 0)
      } catch (error) {
        if (active) {
          // A failed lookup shouldn't block a typed address.
          console.error("Places autocomplete failed:", error)
          setSuggestions([])
        }
      }
    }, DEBOUNCE_MS)

    return () => {
      active = false
      window.clearTimeout(timer)
    }
  }, [places, text])

  const handleSelect = async (suggestion: Suggestion) => {
    setOpen(false)
    setText(suggestion.label)
    // A new selection ends the session; the next keystroke starts a fresh one.
    sessionTokenRef.current = null
    try {
      const place = suggestion.prediction.toPlace()
      await place.fetchFields({ fields: ["formattedAddress", "location", "id"] })
      onChangeRef.current({
        address: place.formattedAddress || suggestion.label,
        lat: place.location?.lat?.(),
        lng: place.location?.lng?.(),
        placeId: place.id,
      })
    } catch (error) {
      // Keep the chosen text even if resolving coordinates failed.
      console.error("Place details lookup failed:", error)
      onChangeRef.current({ address: suggestion.label })
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <input
        value={text}
        onChange={(event) => {
          const next = event.target.value
          setText(next)
          onChange(next ? { address: next } : null)
        }}
        onFocus={() => setOpen(suggestions.length > 0)}
        onKeyDown={(event) => {
          if (event.key === "Escape") setOpen(false)
          if (event.key === "Enter" && open && suggestions[0]) {
            event.preventDefault()
            void handleSelect(suggestions[0])
          }
        }}
        placeholder={placeholder}
        className={className}
        autoComplete="off"
        role="combobox"
        aria-expanded={open}
      />
      {open && suggestions.length > 0 && (
        <ul className="absolute left-0 right-0 top-full z-50 mt-1 max-h-64 overflow-y-auto rounded-md border border-[#d6d6d6] bg-white py-1 shadow-lg">
          {suggestions.map((suggestion) => (
            <li key={suggestion.id}>
              <button
                type="button"
                onClick={() => void handleSelect(suggestion)}
                className="block w-full cursor-pointer px-3 py-2 text-left text-sm text-[#20242c] transition hover:bg-[#eafbfb]"
              >
                {suggestion.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
