import { beforeEach, describe, expect, it, vi } from "vitest"

// The real client initialises Firebase on import; these tests are about the service, not it.
const post = vi.fn()
vi.mock("@/lib/axios", () => ({ default: { post: (...args: unknown[]) => post(...args) } }))

import {
  HEALTH_TIPS_FEEDBACK_PATH,
  HEALTH_TIPS_PATH,
  HealthTipsQueryError,
  MAX_EXCLUDE,
  MAX_QUERY_LENGTH,
  fetchHealthTipImage,
  healthTipsErrorMessage,
  normalizeQuery,
  searchHealthTips,
  sendHealthTipFeedback,
} from "../healthTipsService"

const KEY = "0123456789abcdef0123456789abcdef"

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

  it("maps the single tip and keeps optional fields optional", async () => {
    post.mockResolvedValue({
      data: {
        data: {
          urgent: false,
          notice: null,
          tip: { id: "tip-1", title: "Walk daily", summary: "Helps.", steps: ["Start small"], whenToSeeAProfessional: "If it hurts." },
        },
      },
    })
    const result = await searchHealthTips("staying healthy")
    expect(result.tip?.title).toBe("Walk daily")
    expect(result.tip?.steps).toEqual(["Start small"])
    expect(result.tip?.whenToSeeAProfessional).toBe("If it hurts.")
    expect(result.tip?.image).toBeUndefined()
    expect(result.urgent).toBe(false)
    expect(result.notice).toBeNull()
  })

  it("fills in defaults for a tip with missing fields", async () => {
    post.mockResolvedValue({ data: { data: { tip: { summary: "Sip water." } } } })
    const result = await searchHealthTips("staying healthy")
    expect(result.tip).toMatchObject({ id: "tip-1", title: "Health tip", summary: "Sip water." })
    expect(result.tip?.steps).toBeUndefined()
  })

  it("falls back to the first of `tips` when the server has not shipped `tip` yet", async () => {
    post.mockResolvedValue({
      data: {
        data: {
          tips: [
            { id: "tip-1", title: "Walk daily", summary: "Helps." },
            { id: "tip-2", title: "Hydrate", summary: "Sip water." },
          ],
        },
      },
    })
    const result = await searchHealthTips("staying healthy")
    expect(result.tip?.title).toBe("Walk daily")
  })

  it("prefers `tip` over `tips` when both are sent", async () => {
    post.mockResolvedValue({
      data: {
        data: {
          tip: { id: "tip-1", title: "New", summary: "S." },
          tips: [{ id: "tip-1", title: "Old", summary: "S." }],
        },
      },
    })
    expect((await searchHealthTips("staying healthy")).tip?.title).toBe("New")
  })

  it("carries an emergency through as urgent with the server's notice and no tip", async () => {
    post.mockResolvedValue({
      data: { data: { tip: null, tips: [], urgent: true, notice: "Call your local emergency number." } },
    })
    const result = await searchHealthTips("he is not breathing")
    expect(result.urgent).toBe(true)
    expect(result.tip).toBeNull()
    expect(result.notice).toBe("Call your local emergency number.")
  })

  describe("image", () => {
    const withImage = (image: unknown) => ({
      data: { data: { tip: { id: "tip-1", title: "Stretch", summary: "Loosen up.", image } } },
    })

    it("keeps an https image that has alt text", async () => {
      post.mockResolvedValue(withImage({ url: "https://cdn.example.com/stretch.png", alt: "  A seated neck stretch " }))
      const result = await searchHealthTips("neck stretch")
      expect(result.tip?.image).toEqual({
        status: "ready",
        url: "https://cdn.example.com/stretch.png",
        alt: "A seated neck stretch",
      })
    })

    it("drops an image with no alt text, so the tip shows as text", async () => {
      post.mockResolvedValue(withImage({ url: "https://cdn.example.com/stretch.png", alt: "   " }))
      expect((await searchHealthTips("neck stretch")).tip?.image).toBeUndefined()
      post.mockResolvedValue(withImage({ url: "https://cdn.example.com/stretch.png" }))
      expect((await searchHealthTips("neck stretch")).tip?.image).toBeUndefined()
    })

    it("drops an image that is not an https URL", async () => {
      for (const url of ["http://cdn.example.com/a.png", "javascript:alert(1)", "data:image/png;base64,AAAA", 42]) {
        post.mockResolvedValue(withImage({ url, alt: "A stretch" }))
        expect((await searchHealthTips("neck stretch")).tip?.image).toBeUndefined()
      }
    })

    it("reads a pending image by its key, with no URL", async () => {
      post.mockResolvedValue(withImage({ status: "pending", key: KEY, alt: " A seated neck stretch " }))
      expect((await searchHealthTips("neck stretch")).tip?.image).toEqual({
        status: "pending",
        key: KEY,
        alt: "A seated neck stretch",
      })
    })

    it("keeps the key on a ready image when the server sends one", async () => {
      post.mockResolvedValue(withImage({ status: "ready", key: KEY, url: "https://cdn.example.com/a.png", alt: "A stretch" }))
      expect((await searchHealthTips("neck stretch")).tip?.image).toMatchObject({ status: "ready", key: KEY })
    })

    it("drops a pending image with a bad key or no alt text, and never keeps a bad key", async () => {
      for (const image of [
        { status: "pending", key: "../../etc/passwd", alt: "A stretch" },
        { status: "pending", key: KEY.toUpperCase(), alt: "A stretch" },
        { status: "pending", alt: "A stretch" },
        { status: "pending", key: KEY, alt: "  " },
      ]) {
        post.mockResolvedValue(withImage(image))
        expect((await searchHealthTips("neck stretch")).tip?.image).toBeUndefined()
      }
      post.mockResolvedValue(withImage({ url: "https://cdn.example.com/a.png", alt: "A stretch", key: "nope" }))
      expect((await searchHealthTips("neck stretch")).tip?.image).toEqual({
        status: "ready",
        url: "https://cdn.example.com/a.png",
        alt: "A stretch",
      })
    })

    it("ignores a malformed image value but keeps the tip", async () => {
      for (const image of [null, "photo.png", 7, []]) {
        post.mockResolvedValue(withImage(image))
        const result = await searchHealthTips("neck stretch")
        expect(result.tip?.title).toBe("Stretch")
        expect(result.tip?.image).toBeUndefined()
      }
    })
  })

  it("only treats an explicit true as urgent", async () => {
    post.mockResolvedValue({ data: { data: { tip: null, urgent: "yes" } } })
    expect((await searchHealthTips("sleeping better")).urgent).toBe(false)
  })

  it("survives a malformed body", async () => {
    post.mockResolvedValue({ data: {} })
    const result = await searchHealthTips("sleeping better")
    expect(result).toEqual({
      query: "sleeping better",
      tip: null,
      urgent: false,
      notice: null,
      personalized: false,
      needs: [],
    })
  })
})

describe("searchHealthTips — personalising", () => {
  beforeEach(() => post.mockReset())

  const AGE_QUESTION = {
    field: "ageRange",
    question: "Which age group are you in?",
    options: [
      { value: "18_29", label: "18–29" },
      { value: "30_44", label: "30–44" },
    ],
  }

  it("sends nothing extra unless the person opted in", async () => {
    post.mockResolvedValue({ data: { data: {} } })
    await searchHealthTips("sleeping better", { personalize: false, answers: { ageRange: "30_44" } })
    // Answers do not travel without the opt-in, even if a caller passes them.
    expect(post).toHaveBeenCalledWith(HEALTH_TIPS_PATH, { query: "sleeping better" })
  })

  it("sends the opt-in, and the answers when there are some", async () => {
    post.mockResolvedValue({ data: { data: {} } })
    await searchHealthTips("sleeping better", { personalize: true })
    expect(post).toHaveBeenLastCalledWith(HEALTH_TIPS_PATH, { query: "sleeping better", personalize: true })

    await searchHealthTips("sleeping better", { personalize: true, answers: { ageRange: "30_44" } })
    expect(post).toHaveBeenLastCalledWith(HEALTH_TIPS_PATH, {
      query: "sleeping better",
      personalize: true,
      answers: { ageRange: "30_44" },
    })

    // An empty object is how the person says they skipped the questions.
    await searchHealthTips("sleeping better", { personalize: true, answers: {} })
    expect(post).toHaveBeenLastCalledWith(HEALTH_TIPS_PATH, {
      query: "sleeping better",
      personalize: true,
      answers: {},
    })
  })

  it("never sends health profile data of its own", async () => {
    post.mockResolvedValue({ data: { data: {} } })
    await searchHealthTips("sleeping better", { personalize: true })
    const [, payload] = post.mock.calls[0]
    expect(Object.keys(payload).sort()).toEqual(["personalize", "query"])
  })

  it("reads questions when the server has some instead of a tip", async () => {
    post.mockResolvedValue({ data: { data: { tip: null, tips: [], urgent: false, notice: null, needs: [AGE_QUESTION] } } })
    const result = await searchHealthTips("sleeping better", { personalize: true })
    expect(result.tip).toBeNull()
    expect(result.needs).toEqual([AGE_QUESTION])
    expect(result.personalized).toBe(false)
  })

  it("reads the personalised flag", async () => {
    post.mockResolvedValue({
      data: { data: { tip: { id: "tip-1", title: "T", summary: "S" }, personalized: true } },
    })
    expect((await searchHealthTips("sleeping better", { personalize: true })).personalized).toBe(true)
    post.mockResolvedValue({ data: { data: { tip: { id: "tip-1", title: "T", summary: "S" }, personalized: "yes" } } })
    expect((await searchHealthTips("sleeping better", { personalize: true })).personalized).toBe(false)
  })

  it("drops malformed questions and keeps the good ones", async () => {
    const bad = [
      null,
      "question",
      { field: "medications", question: "Which medicines?", options: AGE_QUESTION.options },
      { field: "ageRange", question: "   ", options: AGE_QUESTION.options },
      { field: "ageRange", question: "One option only", options: [AGE_QUESTION.options[0]] },
      { field: "ageRange", question: "No options" },
      { field: "ageRange", question: "Bad options", options: [{ value: 1, label: "x" }, { value: "a" }] },
    ]
    post.mockResolvedValue({ data: { data: { needs: [...bad, AGE_QUESTION] } } })
    expect((await searchHealthTips("sleeping better", { personalize: true })).needs).toEqual([AGE_QUESTION])
  })

  it("shows at most three questions, whatever the server sends", async () => {
    const make = (field: string) => ({ ...AGE_QUESTION, field })
    post.mockResolvedValue({
      data: { data: { needs: [make("ageRange"), make("mobility"), make("smoking"), make("alcohol")] } },
    })
    const result = await searchHealthTips("sleeping better", { personalize: true })
    expect(result.needs.map((q) => q.field)).toEqual(["ageRange", "mobility", "smoking"])
  })

  it("never asks a question alongside an emergency or a tip", async () => {
    post.mockResolvedValue({ data: { data: { urgent: true, notice: "Call.", needs: [AGE_QUESTION] } } })
    expect((await searchHealthTips("he is not breathing", { personalize: true })).needs).toEqual([])

    post.mockResolvedValue({
      data: { data: { tip: { id: "tip-1", title: "T", summary: "S" }, needs: [AGE_QUESTION] } },
    })
    expect((await searchHealthTips("sleeping better", { personalize: true })).needs).toEqual([])
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

describe("searchHealthTips — show me another", () => {
  beforeEach(() => post.mockReset())

  it("sends the titles already shown, and nothing extra when there are none", async () => {
    post.mockResolvedValue({ data: { data: {} } })
    await searchHealthTips("sleeping better", { exclude: [] })
    expect(post).toHaveBeenLastCalledWith(HEALTH_TIPS_PATH, { query: "sleeping better" })

    await searchHealthTips("sleeping better", { exclude: ["Keep a regular bedtime"] })
    expect(post).toHaveBeenLastCalledWith(HEALTH_TIPS_PATH, {
      query: "sleeping better",
      exclude: ["Keep a regular bedtime"],
    })
  })

  it("works together with personalising and answers", async () => {
    post.mockResolvedValue({ data: { data: {} } })
    await searchHealthTips("sleeping better", { personalize: true, answers: { ageRange: "60_74" }, exclude: ["A"] })
    expect(post).toHaveBeenLastCalledWith(HEALTH_TIPS_PATH, {
      query: "sleeping better",
      personalize: true,
      answers: { ageRange: "60_74" },
      exclude: ["A"],
    })
  })

  it("keeps the newest titles within the server's limit, trimmed and non-empty", async () => {
    post.mockResolvedValue({ data: { data: {} } })
    const titles = Array.from({ length: MAX_EXCLUDE + 2 }, (_, i) => ` Tip ${i} `)
    await searchHealthTips("sleeping better", { exclude: ["  ", ...titles] })
    const sent = post.mock.lastCall?.[1].exclude as string[]
    expect(sent).toHaveLength(MAX_EXCLUDE)
    expect(sent.at(-1)).toBe(`Tip ${MAX_EXCLUDE + 1}`)
    expect(sent.every((title) => title === title.trim() && title.length > 0)).toBe(true)
  })
})

describe("sendHealthTipFeedback", () => {
  beforeEach(() => post.mockReset())

  it("sends only the rating for a thumbs-up, even if a reason was passed", async () => {
    post.mockResolvedValue({ data: { success: true } })
    await sendHealthTipFeedback({ rating: "up", reason: "unclear" })
    expect(post).toHaveBeenCalledWith(HEALTH_TIPS_FEEDBACK_PATH, { rating: "up" })
  })

  it("sends the reason and flags for a thumbs-down, and leaves out the ones that are off", async () => {
    post.mockResolvedValue({ data: { success: true } })
    await sendHealthTipFeedback({ rating: "down", reason: "not_relevant", concerning: true, personalized: false })
    expect(post).toHaveBeenLastCalledWith(HEALTH_TIPS_FEEDBACK_PATH, {
      rating: "down",
      reason: "not_relevant",
      concerning: true,
    })
  })

  it("names a picture only with a valid key", async () => {
    post.mockResolvedValue({ data: { success: true } })
    await sendHealthTipFeedback({ rating: "down", reason: "bad_image", imageKey: KEY })
    expect(post).toHaveBeenLastCalledWith(HEALTH_TIPS_FEEDBACK_PATH, { rating: "down", reason: "bad_image", imageKey: KEY })
    await sendHealthTipFeedback({ rating: "down", reason: "bad_image", imageKey: "../x" })
    expect(post.mock.lastCall?.[1]).toEqual({ rating: "down", reason: "bad_image" })
  })

  it("never carries the query or any tip text", async () => {
    post.mockResolvedValue({ data: { success: true } })
    await sendHealthTipFeedback({
      rating: "down",
      reason: "unclear",
      // Not part of the type, but a caller must not be able to smuggle them through.
      ...({ query: "my chest hurts", title: "A tip" } as object),
    })
    expect(Object.keys(post.mock.lastCall?.[1]).sort()).toEqual(["rating", "reason"])
  })

  it("rejects when the server does, so the form can say it failed", async () => {
    post.mockRejectedValue(new Error("Network Error"))
    await expect(sendHealthTipFeedback({ rating: "up" })).rejects.toThrow("Network Error")
  })
})

describe("fetchHealthTipImage", () => {
  beforeEach(() => post.mockReset())

  it("posts to the image path for the key", async () => {
    post.mockResolvedValue({ data: { data: { status: "pending" } } })
    expect(await fetchHealthTipImage(KEY)).toEqual({ status: "pending" })
    expect(post).toHaveBeenCalledWith(`/careconnectHealthTips/image/${KEY}`)
  })

  it("returns a ready https picture, with its alt text when given", async () => {
    post.mockResolvedValue({ data: { data: { status: "ready", url: "https://cdn.example.com/a.png", alt: " Alt " } } })
    expect(await fetchHealthTipImage(KEY)).toEqual({ status: "ready", url: "https://cdn.example.com/a.png", alt: "Alt" })
  })

  it("reads anything unexpected as failed", async () => {
    for (const data of [
      { status: "ready", url: "http://cdn.example.com/a.png" },
      { status: "ready", url: "javascript:alert(1)" },
      { status: "ready" },
      { status: "failed" },
      { status: "weird" },
      {},
    ]) {
      post.mockResolvedValue({ data: { data } })
      expect(await fetchHealthTipImage(KEY)).toEqual({ status: "failed" })
    }
    post.mockResolvedValue({ data: {} })
    expect(await fetchHealthTipImage(KEY)).toEqual({ status: "failed" })
  })

  it("does not spend a request on a key that is not one", async () => {
    for (const key of ["", "../../x", KEY.toUpperCase(), `${KEY}0`]) {
      expect(await fetchHealthTipImage(key)).toEqual({ status: "failed" })
    }
    expect(post).not.toHaveBeenCalled()
  })
})
