import { describe, it, expect, vi, afterEach } from "vitest"
import {
  COWRY_EARNED_EVENT,
  COWRY_REFUSAL_MESSAGES,
  onCowryEarned,
  publishCowryAward,
  shouldAnnounce,
} from "@/utils/careconnect/cowryEarned"

/**
 * The rule with teeth here is the one about the feed.
 *
 * The daily visit is capped at one, so every feed load after the first comes back refused.
 * Announcing those would put "you've reached today's limit" on screen all day, on a screen
 * the user never asked to earn from. A refusal is only worth saying after something the
 * user deliberately did.
 */

afterEach(() => {
  vi.restoreAllMocks()
})

describe("shouldAnnounce", () => {
  it("announces a real award from any source", () => {
    for (const source of ["post", "comment", "visit"] as const) {
      expect(shouldAnnounce({ award: { awarded: true, amount: 10 }, source })).toBe(true)
    }
  })

  it("stays quiet about a refused daily visit, however many times the feed loads", () => {
    const detail = {
      award: { awarded: false, reason: "daily_cap_reached" },
      source: "visit" as const,
    }
    expect(shouldAnnounce(detail)).toBe(false)
  })

  it("does announce the same refusal after a deliberate post or comment", () => {
    expect(
      shouldAnnounce({ award: { awarded: false, reason: "daily_cap_reached" }, source: "post" }),
    ).toBe(true)
    expect(
      shouldAnnounce({ award: { awarded: false, reason: "daily_cap_reached" }, source: "comment" }),
    ).toBe(true)
  })

  it("stays quiet about a refusal it has no honest wording for", () => {
    expect(
      shouldAnnounce({ award: { awarded: false, reason: "not_eligible" }, source: "post" }),
    ).toBe(false)
    expect(shouldAnnounce({ award: { awarded: false, reason: null }, source: "post" })).toBe(false)
  })

  it("stays quiet about an award of nothing", () => {
    expect(shouldAnnounce({ award: { awarded: true, amount: 0 }, source: "post" })).toBe(false)
    expect(shouldAnnounce({ award: { awarded: true, amount: null }, source: "post" })).toBe(false)
  })

  it("survives a missing award, which is the common case", () => {
    expect(shouldAnnounce(null)).toBe(false)
    expect(shouldAnnounce(undefined)).toBe(false)
  })

  it("has wording for every refusal it admits", () => {
    for (const reason of Object.keys(COWRY_REFUSAL_MESSAGES)) {
      expect(shouldAnnounce({ award: { awarded: false, reason }, source: "post" })).toBe(true)
      expect(COWRY_REFUSAL_MESSAGES[reason].length).toBeGreaterThan(0)
    }
  })
})

describe("publishCowryAward", () => {
  it("dispatches an award the layer can render", () => {
    const seen: unknown[] = []
    const off = onCowryEarned((detail) => seen.push(detail))

    publishCowryAward({ awarded: true, amount: 15, releaseAt: "2026-09-25T00:00:00Z" }, "post")

    expect(seen).toEqual([
      {
        award: { awarded: true, amount: 15, releaseAt: "2026-09-25T00:00:00Z" },
        source: "post",
      },
    ])
    off()
  })

  it("dispatches nothing when the response carried no award", () => {
    const seen: unknown[] = []
    const off = onCowryEarned((detail) => seen.push(detail))

    // null is what the backend sends for a repeat, and undefined is what an older
    // deployment or a stripping proxy would leave behind. Neither may throw.
    publishCowryAward(null, "post")
    publishCowryAward(undefined, "comment")
    publishCowryAward("nonsense", "post")

    expect(seen).toEqual([])
    off()
  })

  it("does not dispatch the feed's refusal", () => {
    const seen: unknown[] = []
    const off = onCowryEarned((detail) => seen.push(detail))

    publishCowryAward({ awarded: false, reason: "daily_cap_reached" }, "visit")

    expect(seen).toEqual([])
    off()
  })

  it("stops delivering once unsubscribed", () => {
    const seen: unknown[] = []
    const off = onCowryEarned((detail) => seen.push(detail))
    off()

    publishCowryAward({ awarded: true, amount: 5 }, "visit")
    expect(seen).toEqual([])
  })

  it("uses a name other listeners can key on", () => {
    const handler = vi.fn()
    window.addEventListener(COWRY_EARNED_EVENT, handler)
    publishCowryAward({ awarded: true, amount: 3 }, "comment")
    expect(handler).toHaveBeenCalledTimes(1)
    window.removeEventListener(COWRY_EARNED_EVENT, handler)
  })
})
