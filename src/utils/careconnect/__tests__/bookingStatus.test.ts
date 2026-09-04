import { describe, it, expect, afterEach, vi } from "vitest"
import { recordWriteState, rowStatusFor } from "@/utils/careconnect/bookingStatus"
import type { TelehealthBooking } from "@/utils/careconnect/types"

/**
 * `recordWriteState` mirrors `canWriteRecordNow` in the backend's client-record.schema.js.
 * A drift between the two shows up as a button that looks available and then 409s, so the
 * cases here are deliberately the same cases as the backend's own test.
 */

// 2026-03-04 10:00 local, a 60-minute visit — the window opens at 09:50.
function booking(overrides: Partial<TelehealthBooking> = {}): TelehealthBooking {
  return {
    id: "b1",
    dateKey: "2026-03-04",
    startMinutes: 10 * 60,
    durationMinutes: 60,
    status: "confirmed",
    clientName: "Ada Boateng",
    recordConsent: { granted: true },
    ...overrides,
  } as TelehealthBooking
}

const at = (hour: number, minute = 0) =>
  vi.setSystemTime(new Date(2026, 2, 4, hour, minute, 0, 0))

afterEach(() => {
  vi.useRealTimers()
})

describe("recordWriteState", () => {
  it("allows documenting during the visit, not only after it", () => {
    vi.useFakeTimers()
    at(10, 30)
    expect(recordWriteState(booking()).block).toBeNull()
    // The same grace period the call itself opens in.
    at(9, 55)
    expect(recordWriteState(booking()).block).toBeNull()
    at(18)
    expect(recordWriteState(booking({ status: "completed" })).block).toBeNull()
  })

  it("blocks a visit that has not started, and says so", () => {
    vi.useFakeTimers()
    at(8)
    const state = recordWriteState(booking())
    expect(state.block).toBe("not_started")
    expect(state.reason).toMatch(/hasn't started/i)
  })

  it("blocks without a treating relationship, whatever the clock says", () => {
    vi.useFakeTimers()
    at(10, 30)
    expect(recordWriteState(booking({ status: "requested" })).block).toBe("no_relationship")
    expect(recordWriteState(booking({ status: "cancelled" })).reason).toMatch(/cancelled/i)
  })

  it("blocks without consent and names the client, even once completed", () => {
    vi.useFakeTimers()
    at(18)
    for (const recordConsent of [undefined, { granted: false }] as const) {
      const state = recordWriteState(booking({ status: "completed", recordConsent }))
      expect(state.block).toBe("no_consent")
      expect(state.reason).toContain("Ada Boateng")
    }
  })

  it("falls back to a generic subject when the client has no name", () => {
    vi.useFakeTimers()
    at(18)
    const state = recordWriteState(
      booking({ status: "completed", clientName: "", recordConsent: undefined }),
    )
    expect(state.reason).toBe("The client hasn't consented to a visit record.")
  })
})

describe("rowStatusFor", () => {
  it("reports in_progress only inside the slot", () => {
    vi.useFakeTimers()
    at(10, 30)
    expect(rowStatusFor(booking())).toBe("in_progress")
    at(8)
    expect(rowStatusFor(booking())).toBe("upcoming")
    at(12)
    expect(rowStatusFor(booking())).toBe("upcoming")
  })

  it("lets a stored terminal status win over the clock", () => {
    vi.useFakeTimers()
    at(10, 30)
    expect(rowStatusFor(booking({ status: "completed" }))).toBe("completed")
    expect(rowStatusFor(booking({ status: "cancelled" }))).toBe("cancelled")
    expect(rowStatusFor(booking({ status: "requested" }))).toBe("requested")
  })
})
