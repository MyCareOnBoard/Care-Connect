export const GOOGLE_MAPS_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined

/** Whether a Google Maps key is configured — gates the live map/autocomplete. */
export const hasMaps = Boolean(GOOGLE_MAPS_KEY)
