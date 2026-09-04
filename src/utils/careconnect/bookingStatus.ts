import type { TelehealthBooking } from "@/utils/careconnect/types"

/** Display status derived from a booking's stored status + its time window (no "in-progress" backend status exists). */
export type RowStatus = "requested" | "completed" | "cancelled" | "in_progress" | "upcoming"

/** Booking instant from its dateKey + startMinutes (local). */
export function bookingStart(booking: TelehealthBooking): Date {
  const [year, month, day] = booking.dateKey.split("-").map(Number)
  return new Date(year, month - 1, day, Math.floor(booking.startMinutes / 60), booking.startMinutes % 60)
}

export function formatDurationLabel(minutes: number): string {
  if (minutes % 60 === 0) {
    const hrs = minutes / 60
    return `${hrs} hr${hrs > 1 ? "s" : ""}`
  }
  if (minutes > 60) {
    return `${Math.floor(minutes / 60)} hr ${minutes % 60} min`
  }
  return `${minutes} mins`
}

export function rowStatusFor(booking: TelehealthBooking): RowStatus {
  if (booking.status === "completed") return "completed"
  if (booking.status === "cancelled") return "cancelled"
  // A booking the provider hasn't accepted yet — surfaced so it can be confirmed.
  if (booking.status === "requested") return "requested"
  const start = bookingStart(booking)
  const end = new Date(start.getTime() + booking.durationMinutes * 60000)
  const now = new Date()
  if (now >= start && now <= end) return "in_progress"
  return "upcoming"
}

/**
 * How far either side of the slot an online booking's call can be joined. Must match
 * `VIDEO_JOIN_GRACE_MS` in the backend's booking.schema.js — the server enforces the
 * window; this only decides whether the button is enabled and what it says.
 */
export const VIDEO_JOIN_GRACE_MS = 10 * 60 * 1000

export type VideoJoinState = "open" | "too_early" | "ended"

/**
 * Whether a booking's video call is joinable now, and when it opens if not. `opensAt`
 * lets the caller explain the wait ("Available from 2:50 PM") instead of just disabling.
 */
export function videoJoinWindow(booking: TelehealthBooking): {
  state: VideoJoinState
  opensAt: Date
  closesAt: Date
} {
  const start = bookingStart(booking).getTime()
  const opensAt = new Date(start - VIDEO_JOIN_GRACE_MS)
  const closesAt = new Date(start + booking.durationMinutes * 60_000 + VIDEO_JOIN_GRACE_MS)
  const now = Date.now()
  const state: VideoJoinState =
    now < opensAt.getTime() ? "too_early" : now > closesAt.getTime() ? "ended" : "open"
  return { state, opensAt, closesAt }
}

/** Why a visit record can't be written yet, or `null` when it can. */
export type RecordWriteBlock = "no_relationship" | "not_started" | "no_consent" | null

/**
 * Whether the professional may write this visit's record now, and why not if they can't.
 *
 * Mirrors `canWriteRecordNow` in the backend's `client-record.schema.js` — records are
 * written *during* a visit as well as after it, so an in-progress booking qualifies. The
 * server is the enforcement point; this only decides what the button looks like.
 *
 * `no_consent` is worth distinguishing from the rest: it isn't a matter of waiting, so
 * callers show it as an explanation rather than a disabled button.
 */
export function recordWriteState(booking: TelehealthBooking): {
  block: RecordWriteBlock
  reason: string | null
} {
  const client = booking.clientName || "The client"
  if (booking.status !== "completed" && booking.status !== "confirmed") {
    return {
      block: "no_relationship",
      reason:
        booking.status === "cancelled"
          ? "This visit was cancelled."
          : "Confirm the booking before writing a record.",
    }
  }
  if (booking.status !== "completed" && Date.now() < videoJoinWindow(booking).opensAt.getTime()) {
    return { block: "not_started", reason: "This visit hasn't started yet." }
  }
  if (booking.recordConsent?.granted !== true) {
    return { block: "no_consent", reason: `${client} hasn't consented to a visit record.` }
  }
  return { block: null, reason: null }
}

export const ROW_STATUS_PILL: Record<RowStatus, { label: string; className: string }> = {
  requested: { label: "Requested", className: "border border-[#d97a2b] bg-white text-[#d97a2b]" },
  completed: { label: "Completed", className: "border border-[#10ad58] bg-white text-[#10ad58]" },
  in_progress: { label: "In-progress", className: "bg-[#1f2430] text-white" },
  cancelled: { label: "Cancelled", className: "border border-[#ff3e66] bg-white text-[#ff3e66]" },
  upcoming: { label: "Upcoming", className: "border border-[#00b4b8] bg-white text-[#00b4b8]" },
}
