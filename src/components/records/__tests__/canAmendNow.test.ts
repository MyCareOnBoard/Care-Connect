import { describe, it, expect, afterEach, vi } from "vitest"
import { canAmendNow } from "@/components/records/RecordViewerDialog"
import type { VisitRecord } from "@/utils/careconnect/types"

/**
 * `canAmendNow` mirrors `canAmendRecord` in the backend's client-record.schema.js, and it
 * decides whether the only route to correcting a signed record is on screen. When it is
 * wrong the professional is told to add an amendment with no way to add one, so its cases
 * are worth pinning.
 */

const SIGNED_AT = "2026-03-04T10:00:00.000Z"

function record(overrides: Partial<VisitRecord> = {}): VisitRecord {
  return {
    id: "b1",
    bookingId: "b1",
    professionalUid: "pro-1",
    status: "signed",
    signedAt: SIGNED_AT,
    ...overrides,
  } as VisitRecord
}

const hoursAfterSigning = (hours: number) =>
  vi.setSystemTime(new Date(Date.parse(SIGNED_AT) + hours * 60 * 60 * 1000))

afterEach(() => {
  vi.useRealTimers()
})

describe("canAmendNow", () => {
  it("lets the author amend inside the 24-hour window", () => {
    vi.useFakeTimers()
    hoursAfterSigning(1)
    expect(canAmendNow(record(), "pro-1")).toBe(true)
    hoursAfterSigning(23.9)
    expect(canAmendNow(record(), "pro-1")).toBe(true)
  })

  it("closes once the window has passed", () => {
    vi.useFakeTimers()
    hoursAfterSigning(24.1)
    expect(canAmendNow(record(), "pro-1")).toBe(false)
  })

  it("refuses anyone but the author", () => {
    vi.useFakeTimers()
    hoursAfterSigning(1)
    expect(canAmendNow(record(), "pro-2")).toBe(false)
    // The client reading their own record amends nothing.
    expect(canAmendNow(record({ clientId: "client-1" }), "client-1")).toBe(false)
  })

  it("refuses a draft — there is nothing to amend until it is signed", () => {
    vi.useFakeTimers()
    hoursAfterSigning(1)
    expect(canAmendNow(record({ status: "draft", signedAt: undefined }), "pro-1")).toBe(false)
  })

  it("refuses when there is no record, no viewer, or no signing time", () => {
    expect(canAmendNow(null, "pro-1")).toBe(false)
    expect(canAmendNow(record(), null)).toBe(false)
    expect(canAmendNow(record({ signedAt: undefined }), "pro-1")).toBe(false)
  })

  it("reads a Firestore timestamp as well as an ISO string", () => {
    vi.useFakeTimers()
    hoursAfterSigning(2)
    const asTimestamp = { _seconds: Date.parse(SIGNED_AT) / 1000, _nanoseconds: 0 }
    expect(canAmendNow(record({ signedAt: asTimestamp }), "pro-1")).toBe(true)
  })
})
