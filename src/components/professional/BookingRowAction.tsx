import { Link } from "react-router"
import { toast } from "sonner"
import { Routes } from "@/routes/constants"
import type { TelehealthBooking } from "@/utils/careconnect/types"
import type { RowStatus } from "@/utils/careconnect/bookingStatus"

/** Action link for a booking row — semantics depend on row status and viewer role. */
export function BookingRowAction({
  booking,
  rowStatus,
  isProfessional,
  onDetails,
}: {
  booking: TelehealthBooking
  rowStatus: RowStatus
  isProfessional: boolean
  onDetails: (booking: TelehealthBooking) => void
}) {
  const linkClass = "text-sm font-semibold text-[#151922] hover:underline cursor-pointer"

  if (rowStatus === "in_progress") {
    return (
      <button type="button" className={linkClass} onClick={() => toast("Joining video call...")}>
        Join call
      </button>
    )
  }

  if (rowStatus === "completed") {
    return isProfessional ? (
      <button type="button" className={linkClass} onClick={() => toast("Downloading notes...")}>
        Download notes
      </button>
    ) : (
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
