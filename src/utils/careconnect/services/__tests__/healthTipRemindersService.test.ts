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
  getHealthTipReminderTip,
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

describe("the tip kept with a reminder", () => {
  const TIP = {
    id: "tip-1",
    title: "Release a tight neck",
    summary: "Gentle movement helps.",
    steps: ["Sit tall", "Tilt slowly"],
    whenToSeeAProfessional: "If it persists, ask a clinician.",
    image: { status: "ready" as const, url: "https://cdn.example.com/a.png", alt: "A stretch", key: "0123456789abcdef0123456789abcdef" },
  }

  it("sends only the tip's text fields when setting a reminder — no picture, no id", async () => {
    post.mockResolvedValue({ data: { success: true, data: SERVER } })
    await createHealthTipReminder({ label: "x", time: "08:00", recurrence: "once", tip: TIP })
    const body = post.mock.calls[0][1]
    expect(body.tip).toEqual({
      title: TIP.title,
      summary: TIP.summary,
      steps: TIP.steps,
      whenToSeeAProfessional: TIP.whenToSeeAProfessional,
    })
  })

  it("reads the saved tip back for the reminder a notification opens", async () => {
    get.mockResolvedValue({ data: { data: { ...SERVER, tip: { id: "tip-1", title: "T", summary: "S", steps: ["a", 3, ""] } } } })
    const tip = await getHealthTipReminderTip("abc_123")
    expect(get).toHaveBeenCalledWith(`${HEALTH_TIP_REMINDERS_PATH}/abc_123`)
    expect(tip).toEqual({ id: "tip-1", title: "T", summary: "S", steps: ["a"] })
  })

  it("returns null, and asks nothing, for an id that is not ours", async () => {
    expect(await getHealthTipReminderTip("../etc/passwd")).toBeNull()
    expect(await getHealthTipReminderTip("a b")).toBeNull()
    expect(get).not.toHaveBeenCalled()
  })

  it("returns null when the reminder is gone, has no tip, or the request fails", async () => {
    get.mockResolvedValueOnce({ data: { data: { ...SERVER, tip: null } } })
    expect(await getHealthTipReminderTip("r1")).toBeNull()
    get.mockRejectedValueOnce(new Error("404"))
    expect(await getHealthTipReminderTip("r1")).toBeNull()
  })
})
