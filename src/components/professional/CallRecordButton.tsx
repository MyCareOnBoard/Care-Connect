import { FileText } from "lucide-react"
import { recordWriteState } from "@/utils/careconnect/bookingStatus"
import type { TelehealthBooking } from "@/utils/careconnect/types"

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
