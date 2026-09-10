import { CalendarPlus, FileText, FolderOpen } from "lucide-react"
import { recordWriteState } from "@/utils/careconnect/bookingStatus"
import type { TelehealthBooking } from "@/utils/careconnect/types"

/**
 * Open the client's whole record history, mid-call.
 *
 * Unlike the other two, this one leaves the call *screen* — the history is a route, not a
 * dialog — so the caller minimizes the call before navigating and the visit carries on in
 * the docked tile. That is only possible because the call is held above the router; while it
 * was a step inside the booking dialog, going to this page hung up.
 *
 * No client-side gate beyond "you are the professional on this visit": what may be read is
 * decided per record by episode-scoped consent on the server, which fails closed. Guessing
 * at that here would either hide records the professional is entitled to or promise ones
 * they are not.
 */
export function CallClientRecordsButton({
  booking,
  onViewRecords,
}: {
  booking: TelehealthBooking
  onViewRecords: (booking: TelehealthBooking) => void
}) {
  return (
    <button
      type="button"
      onClick={() => onViewRecords(booking)}
      title="Open this client's records — the call keeps running"
      className="flex items-center gap-2 rounded-full bg-white/10 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/20"
    >
      <FolderOpen className="size-4" />
      Client records
    </button>
  )
}

/**
 * Arrange the next visit without leaving the call.
 *
 * Shares this file with the record button because the two live side by side in both call
 * frames and are gated on the same thing — a visit that is actually under way.
 */
export function CallFollowUpButton({
  booking,
  onProposeFollowUp,
}: {
  booking: TelehealthBooking
  onProposeFollowUp: (booking: TelehealthBooking) => void
}) {
  return (
    <button
      type="button"
      onClick={() => onProposeFollowUp(booking)}
      className="flex items-center gap-2 rounded-full bg-white/10 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/20"
    >
      <CalendarPlus className="size-4" />
      Propose follow-up
    </button>
  )
}

/**
 * In-visit "write the record" control, shared by the real and the mock call frame so the
 * two cannot drift apart on when documenting is allowed.
 *
 * Gated by `recordWriteState`, which mirrors the server's own precondition on
 * `POST /records`. Disabled with a reason rather than hidden: a professional who can't
 * document should be told why — usually that the client withheld consent for this visit —
 * not left looking for a button that isn't there.
 */
export function CallRecordButton({
  booking,
  onWriteRecord,
}: {
  booking: TelehealthBooking
  onWriteRecord: (booking: TelehealthBooking) => void
}) {
  const { reason } = recordWriteState(booking)

  return (
    <button
      type="button"
      disabled={reason !== null}
      title={reason ?? undefined}
      onClick={() => onWriteRecord(booking)}
      className="flex items-center gap-2 rounded-full bg-[#00b4b8] px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:bg-white/15 disabled:text-white/50"
    >
      <FileText className="size-4" />
      {booking.hasRecord ? "Open visit record" : "Write visit record"}
    </button>
  )
}
