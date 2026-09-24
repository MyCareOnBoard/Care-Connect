import { describe, it, expect } from "vitest"
import {
  COWRY_PAGE_KEYS,
  COWRY_PAGE_PATHS,
  isCowryPageKey,
  parseCowryPages,
  resolveEnabledCowryPages,
} from "@/utils/careconnect/cowryPages"

/**
 * The rule worth defending is what an *unset* variable means.
 *
 * Absence must mean "everything is on". If it meant "nothing", any environment that had
 * never heard of these variables would lose its whole Cowry menu the moment this shipped —
 * a deployment silently losing navigation because of a variable nobody knew to set.
 * Turning a page off has to be a thing somebody did deliberately.
 */

const ALL = [...COWRY_PAGE_KEYS]

describe("resolveEnabledCowryPages", () => {
  it("turns everything on when nothing is configured", () => {
    expect([...resolveEnabledCowryPages({})]).toEqual(ALL)
    expect([...resolveEnabledCowryPages({ list: undefined, enableAll: undefined })]).toEqual(ALL)
  })

  it("treats an empty or whitespace list as unset, not as nothing", () => {
    // A hosting dashboard writes "" for a variable left blank, and a CI template often
    // writes the key with no value. Neither is a request to hide the entire feature.
    expect([...resolveEnabledCowryPages({ list: "" })]).toEqual(ALL)
    expect([...resolveEnabledCowryPages({ list: "   " })]).toEqual(ALL)
    expect([...resolveEnabledCowryPages({ list: ",,," })]).toEqual(ALL)
  })

  it("enables exactly what the list names", () => {
    const enabled = resolveEnabledCowryPages({ list: "wallet,history" })
    expect([...enabled].sort()).toEqual(["history", "wallet"])
    expect(enabled.has("redeem")).toBe(false)
    expect(enabled.has("withdraw")).toBe(false)
  })

  it("survives the way people actually type into a dashboard", () => {
    const enabled = resolveEnabledCowryPages({ list: " Wallet , EARN,, redeem , " })
    expect([...enabled].sort()).toEqual(["earn", "redeem", "wallet"])
  })

  it("ignores a typo rather than taking the whole feature down with it", () => {
    // One misspelling should cost one page, not the app.
    const enabled = resolveEnabledCowryPages({ list: "wallet,walet,history" })
    expect([...enabled].sort()).toEqual(["history", "wallet"])
  })

  it("falls back to everything when every key in the list is a typo", () => {
    // Nothing parseable is indistinguishable from nothing configured, and the safe
    // reading of both is the same.
    expect([...resolveEnabledCowryPages({ list: "walet,earnn" })]).toEqual(ALL)
  })

  it("lets the override win over a restrictive list", () => {
    const enabled = resolveEnabledCowryPages({ list: "wallet", enableAll: "true" })
    expect([...enabled]).toEqual(ALL)
  })

  it("accepts the other ways people write a boolean", () => {
    for (const value of ["true", "TRUE", " True ", "1", "yes"]) {
      expect([...resolveEnabledCowryPages({ list: "wallet", enableAll: value })]).toEqual(ALL)
    }
  })

  it("does not treat the string \"false\" as an override", () => {
    // A CI template that always writes the variable produces "false", and that must
    // leave the list in charge rather than quietly enabling everything.
    for (const value of ["false", "FALSE", "0", "no", "", "   "]) {
      const enabled = resolveEnabledCowryPages({ list: "wallet", enableAll: value })
      expect([...enabled]).toEqual(["wallet"])
    }
  })

  it("ignores a non-string, which is what a misconfigured build can hand over", () => {
    expect([...resolveEnabledCowryPages({ list: 42, enableAll: null })]).toEqual(ALL)
    expect([...resolveEnabledCowryPages({ list: "wallet", enableAll: 1 })]).toEqual(["wallet"])
  })
})

describe("parseCowryPages", () => {
  it("drops duplicates", () => {
    expect(parseCowryPages("wallet,wallet,earn")).toEqual(["wallet", "earn"])
  })

  it("returns nothing for input that is not a string", () => {
    expect(parseCowryPages(undefined)).toEqual([])
    expect(parseCowryPages(null)).toEqual([])
  })
})

describe("the key set", () => {
  it("covers every Cowry page, so none can be left ungoverned", () => {
    expect(COWRY_PAGE_KEYS).toHaveLength(7)
    expect(Object.keys(COWRY_PAGE_PATHS).sort()).toEqual([...COWRY_PAGE_KEYS].sort())
  })

  it("maps each key to a distinct route", () => {
    const paths = Object.values(COWRY_PAGE_PATHS)
    expect(new Set(paths).size).toBe(paths.length)
  })

  it("recognises its own keys and nothing else", () => {
    for (const key of COWRY_PAGE_KEYS) expect(isCowryPageKey(key)).toBe(true)
    expect(isCowryPageKey("dashboard")).toBe(false)
    expect(isCowryPageKey("")).toBe(false)
  })
})
