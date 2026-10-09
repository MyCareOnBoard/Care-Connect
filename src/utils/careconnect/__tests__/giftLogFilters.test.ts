import { describe, it, expect } from "vitest"
import {
  EMPTY_GIFT_LOG_FILTERS,
  hasAnyGiftLogFilter,
  toGiftLogQuery,
  type GiftLogFilters,
} from "@/utils/careconnect/giftLogFilters"

/**
 * Turning the gift log's filter form into a request.
 *
 * The case that earns this file is the end of a date range. A date input gives back
 * YYYY-MM-DD with no time, and the backend compares against a timestamp — so taking the end
 * date at face value means a range ending today excludes everything sent today. The log
 * would simply be missing the most recent gifts, with nothing on screen to say so.
 */

const filters = (over: Partial<GiftLogFilters> = {}): GiftLogFilters => ({
  ...EMPTY_GIFT_LOG_FILTERS,
  ...over,
})

describe("toGiftLogQuery", () => {
  it("sends only the page when nothing is filtered", () => {
    expect(toGiftLogQuery(filters(), 0, 50)).toEqual({ limit: 50, offset: 0 })
  })

  it("covers the whole of the last day in the range", () => {
    // The assertion this file exists for.
    const query = toGiftLogQuery(filters({ to: "2026-10-02" }), 0, 50)
    expect(query.to).toBe("2026-10-02T23:59:59.999Z")
  })

  it("starts at the beginning of the first day", () => {
    const query = toGiftLogQuery(filters({ from: "2026-09-01" }), 0, 50)
    expect(query.from).toBe("2026-09-01T00:00:00.000Z")
  })

  it("covers a single day picked at both ends", () => {
    // From and to set to the same date must not produce an empty window.
    const query = toGiftLogQuery(filters({ from: "2026-10-02", to: "2026-10-02" }), 0, 50)
    expect(query.from).toBe("2026-10-02T00:00:00.000Z")
    expect(query.to).toBe("2026-10-02T23:59:59.999Z")
    expect(new Date(query.to!).getTime()).toBeGreaterThan(new Date(query.from!).getTime())
  })

  it("filters the side the admin chose, and only that side", () => {
    // The backend refuses both at once, so sending both would be a failed request.
    const asSender = toGiftLogQuery(filters({ party: "sender", partyId: "u1" }), 0, 50)
    expect(asSender.senderId).toBe("u1")
    expect(asSender.recipientId).toBeUndefined()

    const asRecipient = toGiftLogQuery(filters({ party: "recipient", partyId: "u1" }), 0, 50)
    expect(asRecipient.recipientId).toBe("u1")
    expect(asRecipient.senderId).toBeUndefined()
  })

  it("trims a pasted id", () => {
    // Ids get pasted, and a trailing space would match nothing with no explanation.
    expect(toGiftLogQuery(filters({ partyId: "  u1  " }), 0, 50).senderId).toBe("u1")
  })

  it("omits a member filter that is only whitespace", () => {
    const query = toGiftLogQuery(filters({ partyId: "   " }), 0, 50)
    expect(query.senderId).toBeUndefined()
    expect(query.recipientId).toBeUndefined()
  })

  it("passes the treasure through and omits it when unset", () => {
    expect(toGiftLogQuery(filters({ giftId: "royal_crown" }), 0, 50).giftId).toBe("royal_crown")
    expect(toGiftLogQuery(filters(), 0, 50).giftId).toBeUndefined()
  })

  it("carries the page it was given", () => {
    expect(toGiftLogQuery(filters(), 100, 25)).toMatchObject({ offset: 100, limit: 25 })
  })
})

describe("hasAnyGiftLogFilter", () => {
  it("is false for an untouched form", () => {
    expect(hasAnyGiftLogFilter(EMPTY_GIFT_LOG_FILTERS)).toBe(false)
  })

  it("is false when the member box holds only spaces", () => {
    // Otherwise a Clear button appears with nothing to clear.
    expect(hasAnyGiftLogFilter(filters({ partyId: "   " }))).toBe(false)
  })

  it("is true for any filter that is actually set", () => {
    expect(hasAnyGiftLogFilter(filters({ partyId: "u1" }))).toBe(true)
    expect(hasAnyGiftLogFilter(filters({ giftId: "rose" }))).toBe(true)
    expect(hasAnyGiftLogFilter(filters({ from: "2026-09-01" }))).toBe(true)
    expect(hasAnyGiftLogFilter(filters({ to: "2026-10-01" }))).toBe(true)
  })

  it("ignores the side switch on its own", () => {
    // Choosing "received by" without typing an id filters nothing.
    expect(hasAnyGiftLogFilter(filters({ party: "recipient" }))).toBe(false)
  })
})
