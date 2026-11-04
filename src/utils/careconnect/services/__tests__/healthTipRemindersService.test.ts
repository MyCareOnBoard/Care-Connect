import { beforeEach, describe, expect, it, vi } from "vitest"

const post = vi.fn()
const get = vi.fn()
const patch = vi.fn()
const del = vi.fn()
vi.mock("@/lib/axios", () => ({
  default: {
    post: (...args: unknown[]) => post(...args),
    get: (...args: unknown[]) => get(...args),
    patch: (...args: unknown[]) => patch(...args),
    delete: (...args: unknown[]) => del(...args),
  },
}))

import {
  HEALTH_TIP_REMINDERS_PATH,
  browserTimezone,
  createHealthTipReminder,
  deleteHealthTipReminder,
  describeRecurrence,
  formatReminderTime,
  listHealthTipReminders,
  reminderErrorMessage,
  setHealthTipReminderStatus,
} from "../healthTipRemindersService"

const SERVER = {
  id: "r1",
  label: "Release a tight neck",
  time: "08:00",
  timezone: "America/New_York",
  recurrence: "daily",
  status: "active",
  nextAt: "2026-11-05T13:00:00.000Z",
  expiresAt: "2026-12-04T13:00:00.000Z",
}

beforeEach(() => {
  for (const fn of [post, get, patch, del]) fn.mockReset()
})

describe("createHealthTipReminder", () => {
  it("sends the label, time, recurrence and the browser's time zone — and nothing else", async () => {
    post.mockResolvedValue({ data: { success: true, data: SERVER } })
    const out = await createHealthTipReminder({ label: "  Release   a tight neck ", time: "08:00", recurrence: "daily" })
    expect(post).toHaveBeenCalledWith(HEALTH_TIP_REMINDERS_PATH, {
      label: "Release a tight neck",
      time: "08:00",
      timezone: browserTimezone(),
      recurrence: "daily",
    })
    expect(out.id).toBe("r1")
  })

  it("refuses a bad time or empty name without calling the server", async () => {
    await expect(createHealthTipReminder({ label: "x", time: "25:00", recurrence: "once" })).rejects.toThrow()
    await expect(createHealthTipReminder({ label: "   ", time: "08:00", recurrence: "once" })).rejects.toThrow()
    expect(post).not.toHaveBeenCalled()
  })

  it("rejects a reply it cannot read rather than showing half a reminder", async () => {
    post.mockResolvedValue({ data: { success: true, data: { id: "r1" } } })
    await expect(createHealthTipReminder({ label: "x", time: "08:00", recurrence: "once" })).rejects.toThrow()
  })
})

describe("helpers", () => {
  it("formats times and repeats for reading", () => {
    expect(formatReminderTime("08:00")).toBe("8:00 AM")
    expect(formatReminderTime("00:30")).toBe("12:30 AM")
    expect(formatReminderTime("12:00")).toBe("12:00 PM")
    expect(formatReminderTime("18:05")).toBe("6:05 PM")
    expect(describeRecurrence("daily")).toBe("every day")
    expect(describeRecurrence("weekly")).toBe("every week")
    expect(describeRecurrence("once")).toBe("once")
  })

  it("uses the server's message only for the limits", () => {
    expect(reminderErrorMessage({ response: { status: 409, data: { error: "Up to 5." } } })).toBe("Up to 5.")
    expect(reminderErrorMessage({ response: { status: 500, data: { error: "stack trace" } } })).toMatch(/couldn't set/)
    expect(reminderErrorMessage(new Error("boom"))).toMatch(/couldn't set/)
  })
})

describe("managing reminders", () => {
  it("lists reminders, dropping any it cannot read, and reports the limit", async () => {
    get.mockResolvedValue({
      data: { data: { reminders: [SERVER, { id: "bad" }, null, { ...SERVER, id: "r2", time: "9am" }], max: 5 } },
    })
    const out = await listHealthTipReminders()
    expect(out.reminders.map((r) => r.id)).toEqual(["r1"])
    expect(out.max).toBe(5)
  })

  it("falls back to an empty list and the default limit on a strange reply", async () => {
    get.mockResolvedValue({ data: {} })
    expect(await listHealthTipReminders()).toEqual({ reminders: [], max: 5 })
  })

  it("pauses and resumes by id, encoding it", async () => {
    patch.mockResolvedValue({ data: { data: { ...SERVER, status: "paused", nextAt: null } } })
    const out = await setHealthTipReminderStatus("a/b", "paused")
    expect(patch).toHaveBeenCalledWith(`${HEALTH_TIP_REMINDERS_PATH}/a%2Fb`, { status: "paused" })
    expect(out.status).toBe("paused")
  })

  it("deletes by id", async () => {
    del.mockResolvedValue({ data: { success: true } })
    await deleteHealthTipReminder("r1")
    expect(del).toHaveBeenCalledWith(`${HEALTH_TIP_REMINDERS_PATH}/r1`)
  })
})
