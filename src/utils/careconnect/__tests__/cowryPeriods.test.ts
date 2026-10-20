import { describe, expect, it } from "vitest"
import { periodStart } from "../cowryPeriods"

// Thursday 16 October 2026, mid-afternoon.
const now = new Date(2026, 9, 16, 15, 30)
const day = (date: Date | null) => date && [date.getFullYear(), date.getMonth() + 1, date.getDate(), date.getHours()]

describe("Cowry history periods", () => {
  it("starts today at midnight", () => {
    expect(day(periodStart("today", now))).toEqual([2026, 10, 16, 0])
  })

  it("starts the week on Monday", () => {
    expect(day(periodStart("week", now))).toEqual([2026, 10, 12, 0])
    // On a Sunday the week still began the Monday before, not the next day.
    expect(day(periodStart("week", new Date(2026, 9, 18, 9)))).toEqual([2026, 10, 12, 0])
    // And on a Monday it is that same day.
    expect(day(periodStart("week", new Date(2026, 9, 12, 9)))).toEqual([2026, 10, 12, 0])
  })

  it("starts the month on the 1st, and 3 months back on the same date", () => {
    expect(day(periodStart("month", now))).toEqual([2026, 10, 1, 0])
    expect(day(periodStart("3months", now))).toEqual([2026, 7, 16, 0])
  })

  it("has no start for any time", () => {
    expect(periodStart("all", now)).toBeNull()
  })
})
