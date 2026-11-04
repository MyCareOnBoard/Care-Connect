import { useCallback, useState } from "react"

/** Kept in this browser only. Never sent anywhere. */
export const RECENT_SEARCHES_KEY = "careconnect.healthTips.recent"
export const MAX_RECENT = 5

function read(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_SEARCHES_KEY)
    const parsed: unknown = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === "string").slice(0, MAX_RECENT)
      : []
  } catch {
    return []
  }
}

function write(items: string[]) {
  try {
    if (items.length === 0) localStorage.removeItem(RECENT_SEARCHES_KEY)
    else localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(items))
  } catch {
    // Storage blocked (private window, site data off): recents just aren't remembered.
  }
}

/**
 * The last few Health Tips searches, newest first, so a person can get back to one in a tap.
 *
 * These are health-related words on a possibly shared device, so the page only adds a search
 * that came back with a tip (never an emergency), and offers a one-tap clear.
 */
export function useRecentSearches() {
  const [recent, setRecent] = useState<string[]>(read)

  const add = useCallback((query: string) => {
    const text = query.trim()
    if (!text) return
    setRecent((current) => {
      const next = [text, ...current.filter((item) => item.toLowerCase() !== text.toLowerCase())].slice(
        0,
        MAX_RECENT,
      )
      write(next)
      return next
    })
  }, [])

  const clear = useCallback(() => {
    write([])
    setRecent([])
  }, [])

  return { recent, add, clear }
}
