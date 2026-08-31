import { Link } from "react-router"
import { Routes } from "@/routes/constants"
import type { TelehealthBooking } from "@/utils/careconnect/types"
import type { RowStatus } from "@/utils/careconnect/bookingStatus"

/** Action link for a booking row — semantics depend on row status and viewer role. */
export function BookingRowAction({
  booking,
  rowStatus,
  isProfessional,
  onDetails,
  onRecord,
}: {
  booking: TelehealthBooking
  rowStatus: RowStatus
  isProfessional: boolean
  onDetails: (booking: TelehealthBooking) => void
  /**
   * Opens the visit record for a completed booking. Optional so hosts that have
   * no record surface (the agency analytics table) keep working unchanged and
   * simply fall back to the details dialog.
   */
  onRecord?: (booking: TelehealthBooking) => void
}) {
  const linkClass = "text-sm font-semibold text-[#151922] hover:underline cursor-pointer"

  if (rowStatus === "in_progress") {
    return (
      <button type="button" className={linkClass} onClick={() => onDetails(booking)}>
        Join call
      </button>
    )
  }

  if (rowStatus === "completed") {
    // A completed visit is where the record lives. Without the client's consent
    // there is nothing to write, so fall back to the booking details.
    if (isProfessional) {
      const canRecord = onRecord && booking.recordConsent?.granted === true
      return (
        <button
          type="button"
          className={linkClass}
          onClick={() => (canRecord ? onRecord(booking) : onDetails(booking))}
        >
          {canRecord ? (booking.hasRecord ? "View record" : "Add record") : "Details"}
        </button>
      )
    }
    return (
      <button type="button" className={linkClass} onClick={() => onDetails(booking)}>
        View
      </button>
    )
  }

  if (rowStatus === "cancelled") {
    return isProfessional ? (
      <button type="button" className={linkClass} onClick={() => onDetails(booking)}>
        Details
      </button>
    ) : (
      <Link to={Routes.app.user.telehealth} className={linkClass}>
        Reschedule
      </Link>
    )
  }

  return (
    <button type="button" className={linkClass} onClick={() => onDetails(booking)}>
      Details
    </button>
  )
}
