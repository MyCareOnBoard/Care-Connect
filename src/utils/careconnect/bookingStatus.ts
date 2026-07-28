import type { TelehealthBooking } from "@/utils/careconnect/types"

/** Display status derived from a booking's stored status + its time window (no "in-progress" backend status exists). */
export type RowStatus = "completed" | "cancelled" | "in_progress" | "upcoming"

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
  const start = bookingStart(booking)
  const end = new Date(start.getTime() + booking.durationMinutes * 60000)
  const now = new Date()
  if (now >= start && now <= end) return "in_progress"
  return "upcoming"
}

export const ROW_STATUS_PILL: Record<RowStatus, { label: string; className: string }> = {
  completed: { label: "Completed", className: "border border-[#10ad58] bg-white text-[#10ad58]" },
  in_progress: { label: "In-progress", className: "bg-[#1f2430] text-white" },
  cancelled: { label: "Cancelled", className: "border border-[#ff3e66] bg-white text-[#ff3e66]" },
  upcoming: { label: "Upcoming", className: "border border-[#00b4b8] bg-white text-[#00b4b8]" },
}
