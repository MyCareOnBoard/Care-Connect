/**
 * Health tip reminders — thin axios wrapper around the reminders endpoints.
 *
 *   POST   /careconnectHealthTips/reminders        { label, time: "HH:MM", timezone, recurrence? } -> 201
 *   409 the person already has the maximum number of reminders
 *
 * The time is the person's own clock; the browser's IANA time zone travels with it so the
 * server fires it at that wall-clock time, also after a clock change. `label` is the tip's
 * title, kept only so the person can recognise the reminder in their own list. The query and
 * the tip's text are never sent, and the notification itself is generic text written by the
 * server, so it says nothing about the person's health on a lock screen.
 */

import axiosClient from "@/lib/axios"

export const HEALTH_TIP_REMINDERS_PATH = "/careconnectHealthTips/reminders"

export type ReminderRecurrence = "once" | "daily" | "weekly"

export interface NewHealthTipReminder {
  label: string
  /** 24-hour "HH:MM" on the person's own clock. */
  time: string
  recurrence: ReminderRecurrence
}

export interface HealthTipReminder {
  id: string
  label: string
  time: string
  timezone: string
  recurrence: ReminderRecurrence
  status: "active" | "paused"
  /** ISO time of the next reminder; null while paused. */
  nextAt: string | null
  expiresAt: string
}

const TIME = /^([01]\d|2[0-3]):([0-5]\d)$/
const RECURRENCES: ReminderRecurrence[] = ["once", "daily", "weekly"]
const FALLBACK_ERROR = "We couldn't set that reminder. Please try again."
export const MAX_LABEL_CHARS = 80

/** The browser's IANA time zone ("America/New_York"), or UTC if it can't be read. */
export function browserTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"
  } catch {
    return "UTC"
  }
}

/** "08:00" -> "8:00 AM". Anything that is not HH:MM is returned as it came. */
export function formatReminderTime(time: string): string {
  const match = TIME.exec(time)
  if (!match) return time
  const hours = Number(match[1])
  const suffix = hours >= 12 ? "PM" : "AM"
  return `${hours % 12 === 0 ? 12 : hours % 12}:${match[2]} ${suffix}`
}

export function describeRecurrence(recurrence: ReminderRecurrence): string {
  if (recurrence === "daily") return "every day"
  if (recurrence === "weekly") return "every week"
  return "once"
}

function mapReminder(raw: unknown): HealthTipReminder | null {
  if (!raw || typeof raw !== "object") return null
  const r = raw as Record<string, unknown>
  if (typeof r.id !== "string" || !r.id) return null
  if (typeof r.label !== "string" || !r.label) return null
  if (typeof r.time !== "string" || !TIME.test(r.time)) return null
  if (!RECURRENCES.includes(r.recurrence as ReminderRecurrence)) return null
  if (r.status !== "active" && r.status !== "paused") return null
  return {
    id: r.id,
    label: r.label,
    time: r.time,
    timezone: typeof r.timezone === "string" ? r.timezone : "",
    recurrence: r.recurrence as ReminderRecurrence,
    status: r.status,
    nextAt: typeof r.nextAt === "string" ? r.nextAt : null,
    expiresAt: typeof r.expiresAt === "string" ? r.expiresAt : "",
  }
}

/** A message the person can act on. The server's own text is used only for the limit (409). */
export function reminderErrorMessage(error: unknown): string {
  const response = (error as { response?: { status?: number; data?: { error?: unknown } } } | null)?.response
  const message = response?.data?.error
  if ((response?.status === 409 || response?.status === 429) && typeof message === "string" && message) {
    return message
  }
  return FALLBACK_ERROR
}

export async function createHealthTipReminder(input: NewHealthTipReminder): Promise<HealthTipReminder> {
  const label = input.label.replace(/\s+/g, " ").trim().slice(0, MAX_LABEL_CHARS)
  if (!label) throw new Error("A reminder needs a name.")
  if (!TIME.test(input.time)) throw new Error("Choose a time of day.")
  const { data } = await axiosClient.post(HEALTH_TIP_REMINDERS_PATH, {
    label,
    time: input.time,
    timezone: browserTimezone(),
    recurrence: input.recurrence,
  })
  const reminder = mapReminder(data?.data)
  if (!reminder) throw new Error(FALLBACK_ERROR)
  return reminder
}

/** The person's own live reminders, soonest first, and the most they can have at once. */
export async function listHealthTipReminders(): Promise<{ reminders: HealthTipReminder[]; max: number }> {
  const { data } = await axiosClient.get(HEALTH_TIP_REMINDERS_PATH)
  const raw = Array.isArray(data?.data?.reminders) ? data.data.reminders : []
  const max = Number.isInteger(data?.data?.max) && data.data.max > 0 ? data.data.max : 5
  return {
    reminders: raw.map(mapReminder).filter((r: HealthTipReminder | null): r is HealthTipReminder => r !== null),
    max,
  }
}

/** Pause, or resume (which schedules the next one from now and renews the 30 days). */
export async function setHealthTipReminderStatus(
  id: string,
  status: "active" | "paused",
): Promise<HealthTipReminder> {
  const { data } = await axiosClient.patch(`${HEALTH_TIP_REMINDERS_PATH}/${encodeURIComponent(id)}`, { status })
  const reminder = mapReminder(data?.data)
  if (!reminder) throw new Error(FALLBACK_ERROR)
  return reminder
}

export async function deleteHealthTipReminder(id: string): Promise<void> {
  await axiosClient.delete(`${HEALTH_TIP_REMINDERS_PATH}/${encodeURIComponent(id)}`)
}
