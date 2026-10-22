import { afterEach, describe, expect, it, vi } from "vitest"
import {
  MAX_SAVED_SEARCHES,
  describeSearch,
  loadSavedSearches,
  sameSearch,
  storeSavedSearches,
  type SavedJobSearch,
} from "../savedJobSearches"
import { acceptAllCookies, acceptNecessaryOnly } from "@/lib/consent"

const base = { search: "", typeFilter: "all" as const, paidOnly: false, newOnly: false, savedOnly: false }
const saved = (id: string, extra: Partial<SavedJobSearch> = {}): SavedJobSearch => ({ id, name: id, ...base, ...extra })

describe("saved job searches", () => {
  afterEach(() => {
    window.localStorage.clear()
    vi.restoreAllMocks()
  })

  it("names a search after what it filters", () => {
    expect(describeSearch({ ...base, search: " nurse ", paidOnly: true, newOnly: true })).toBe(
      "“nurse” · New this week · Shows pay",
    )
    expect(describeSearch(base)).toBe("All jobs")
  })

  it("treats searches as the same whatever their case or spacing", () => {
    expect(sameSearch({ ...base, search: "Nurse " }, { ...base, search: "nurse" })).toBe(true)
    expect(sameSearch({ ...base, paidOnly: true }, base)).toBe(false)
  })

  it("keeps searches between visits, up to the limit", () => {
    acceptAllCookies() // saved searches are a preference, kept only with consent
    const many = Array.from({ length: MAX_SAVED_SEARCHES + 2 }, (_, i) => saved(`s${i}`))
    storeSavedSearches(many)
    const back = loadSavedSearches()
    expect(back).toHaveLength(MAX_SAVED_SEARCHES)
    expect(back[0].id).toBe("s0")
  })

  it("keeps nothing when preferences are declined", () => {
    acceptNecessaryOnly()
    storeSavedSearches([saved("a")])
    expect(loadSavedSearches()).toEqual([])
  })

  it("comes back empty, without throwing, when storage is blocked or corrupt", () => {
    window.localStorage.setItem("careconnect.savedJobSearches", "{not json")
    expect(loadSavedSearches()).toEqual([])

    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked")
    })
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked")
    })
    expect(loadSavedSearches()).toEqual([])
    expect(() => storeSavedSearches([saved("a")])).not.toThrow()
  })
})
