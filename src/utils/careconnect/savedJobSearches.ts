import { EMPLOYMENT_TYPE_LABELS, type EmploymentType } from "@/utils/careconnect/types"
import { preferenceStorage } from "@/lib/consent"

/**
 * Job searches you have saved, kept on this device.
 *
 * There is no endpoint for them yet, so they live in local storage: a convenience for one
 * person on one browser, and nothing breaks when storage is blocked — the list is just empty.
 */
export interface SavedJobSearch {
  id: string
  name: string
  search: string
  typeFilter: EmploymentType | "all"
  paidOnly: boolean
  newOnly: boolean
  savedOnly: boolean
}

const KEY = "careconnect.savedJobSearches"
/** Enough for the handful of searches anyone repeats; the oldest drops off past this. */
export const MAX_SAVED_SEARCHES = 6

export function loadSavedSearches(): SavedJobSearch[] {
  try {
    const raw = window.localStorage.getItem(KEY)
    const list = raw ? (JSON.parse(raw) as SavedJobSearch[]) : []
    return Array.isArray(list) ? list.slice(0, MAX_SAVED_SEARCHES) : []
  } catch {
    return []
  }
}

export function storeSavedSearches(list: SavedJobSearch[]): void {
  try {
    preferenceStorage.setItem(KEY, JSON.stringify(list.slice(0, MAX_SAVED_SEARCHES)))
  } catch {
    // Storage blocked or full: the searches last until the page closes.
  }
}

/** A name that says what the search is, e.g. "nurse · Full-time · Shows pay". */
export function describeSearch(s: Omit<SavedJobSearch, "id" | "name">): string {
  const parts = [
    s.search.trim() && `“${s.search.trim()}”`,
    s.typeFilter !== "all" && (EMPLOYMENT_TYPE_LABELS[s.typeFilter] ?? s.typeFilter),
    s.newOnly && "New this week",
    s.paidOnly && "Shows pay",
    s.savedOnly && "Saved",
  ].filter(Boolean)
  return parts.join(" · ") || "All jobs"
}

/** Two searches are the same when every filter matches, whatever they are called. */
export function sameSearch(a: Omit<SavedJobSearch, "id" | "name">, b: Omit<SavedJobSearch, "id" | "name">): boolean {
  return (
    a.search.trim().toLowerCase() === b.search.trim().toLowerCase() &&
    a.typeFilter === b.typeFilter &&
    a.paidOnly === b.paidOnly &&
    a.newOnly === b.newOnly &&
    a.savedOnly === b.savedOnly
  )
}
