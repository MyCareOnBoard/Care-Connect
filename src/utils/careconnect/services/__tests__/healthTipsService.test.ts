import { beforeEach, describe, expect, it, vi } from "vitest"

// The real client initialises Firebase on import; these tests are about the service, not it.
const post = vi.fn()
vi.mock("@/lib/axios", () => ({ default: { post: (...args: unknown[]) => post(...args) } }))

import {
  HEALTH_TIPS_PATH,
  HealthTipsQueryError,
  MAX_QUERY_LENGTH,
  healthTipsErrorMessage,
  normalizeQuery,
  searchHealthTips,
} from "../healthTipsService"

describe("normalizeQuery", () => {
  it("collapses whitespace and trims", () => {
    expect(normalizeQuery("  sleeping   better \n")).toBe("sleeping better")
  })

  it("rejects queries that are too short", () => {
    expect(() => normalizeQuery(" a ")).toThrow(HealthTipsQueryError)
  })

  it("rejects queries that are too long", () => {
    expect(() => normalizeQuery("x".repeat(MAX_QUERY_LENGTH + 1))).toThrow(HealthTipsQueryError)
  })
})

describe("searchHealthTips", () => {
  beforeEach(() => post.mockReset())

  it("posts the cleaned query to the health tips endpoint", async () => {
    post.mockResolvedValue({ data: { success: true, data: { tips: [], urgent: false, notice: null } } })
    await searchHealthTips("  sleeping   better ")
    expect(post).toHaveBeenCalledWith(HEALTH_TIPS_PATH, { query: "sleeping better" })
  })

  it("does not spend a request on an invalid query", async () => {
    await expect(searchHealthTips("a")).rejects.toBeInstanceOf(HealthTipsQueryError)
    expect(post).not.toHaveBeenCalled()
  })

  it("maps tips and keeps optional fields optional", async () => {
    post.mockResolvedValue({
      data: {
        data: {
          urgent: false,
          notice: null,
          tips: [
            { id: "tip-1", title: "Walk daily", summary: "Helps.", steps: ["Start small"], whenToSeeAProfessional: "If it hurts." },
            { title: "Hydrate", summary: "Sip water." },
          ],
        },
      },
    })
    const result = await searchHealthTips("staying healthy")
    expect(result.tips).toHaveLength(2)
    expect(result.tips[0].steps).toEqual(["Start small"])
    expect(result.tips[1].id).toBe("tip-1")
    expect(result.tips[1].steps).toBeUndefined()
    expect(result.urgent).toBe(false)
    expect(result.notice).toBeNull()
  })

  it("carries an emergency through as urgent with the server's notice and no tips", async () => {
    post.mockResolvedValue({
      data: { data: { tips: [], urgent: true, notice: "Call your local emergency number." } },
    })
    const result = await searchHealthTips("he is not breathing")
    expect(result.urgent).toBe(true)
    expect(result.tips).toEqual([])
    expect(result.notice).toBe("Call your local emergency number.")
  })

  it("only treats an explicit true as urgent", async () => {
    post.mockResolvedValue({ data: { data: { tips: [], urgent: "yes" } } })
    expect((await searchHealthTips("sleeping better")).urgent).toBe(false)
  })

  it("survives a malformed body", async () => {
    post.mockResolvedValue({ data: {} })
    const result = await searchHealthTips("sleeping better")
    expect(result).toEqual({ query: "sleeping better", tips: [], urgent: false, notice: null })
  })
})

describe("healthTipsErrorMessage", () => {
  const failure = (status: number, error?: unknown) => ({ response: { status, data: { error } } })

  it("passes through the server's wording for rate limits and an unavailable model", () => {
    expect(healthTipsErrorMessage(failure(429, "You're searching too quickly."))).toBe(
      "You're searching too quickly.",
    )
    expect(healthTipsErrorMessage(failure(503, "Health tips are unavailable right now."))).toBe(
      "Health tips are unavailable right now.",
    )
  })

  it("does not echo anything else the server says", () => {
    expect(healthTipsErrorMessage(failure(500, "stack trace with a secret"))).toBe(
      "We couldn't get tips just now.",
    )
    expect(healthTipsErrorMessage(failure(400, "Validation failed"))).toBe(
      "We couldn't get tips just now.",
    )
  })

  it("falls back for network errors and odd values", () => {
    for (const value of [new Error("Network Error"), null, undefined, "boom", failure(429, 42)]) {
      expect(healthTipsErrorMessage(value)).toBe("We couldn't get tips just now.")
    }
  })
})
