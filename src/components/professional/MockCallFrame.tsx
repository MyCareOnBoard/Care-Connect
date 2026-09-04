import { useEffect, useState } from "react"
import { FileText, Info, PhoneOff, Users } from "lucide-react"
import { getInitials } from "@/lib/utils"
import type { TelehealthBooking } from "@/utils/careconnect/types"

/**
 * Stand-in for the Daily call, used when `VITE_MOCK_VIDEO_CALL` is set.
 *
 * Exists because Daily requires a payment method on the account before any room will
 * connect — including on the free tier — which blocks exercising everything that happens
 * *around* a call, chiefly the professional writing a visit record mid-visit.
 *
 * Deliberately not a fake video feed: no participant tiles pretending to carry a stream, no
 * mic/camera buttons that only flip local state. An earlier version of this screen did that
 * and it read as a working call, which made it easy to mistake for one. This announces what
 * it is and offers only the controls that genuinely do something.
 */
export function MockCallFrame({
  booking,
  canManage,
  onWriteRecord,
  onLeave,
}: {
  booking: TelehealthBooking
  /** True for the professional/agency side, which is the side that writes the record. */
  canManage: boolean
  onWriteRecord?: (booking: TelehealthBooking) => void
  onLeave: () => void
}) {
  // Elapsed time is real — it's the one thing here that isn't pretend, and it makes the
  // record's "during the visit" context feel right while testing.
  const [seconds, setSeconds] = useState(0)
  useEffect(() => {
    const timer = window.setInterval(() => setSeconds((value) => value + 1), 1000)
    return () => window.clearInterval(timer)
  }, [])

  const elapsed = `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`
  const otherParty = canManage ? booking.clientName : booking.professionalName

  // Mirrors the server's own preconditions on POST /records, so the button can explain
  // itself instead of the professional discovering the rule through a 409.
  const recordBlockedReason =
    booking.status !== "completed"
      ? "Complete the visit first — the record can only be written afterwards."
      : booking.recordConsent?.granted !== true
        ? `${booking.clientName || "The client"} hasn't consented to a visit record.`
        : null
  const canWriteRecord = recordBlockedReason === null

  return (
    <>
      <div className="relative flex flex-1 flex-col items-center justify-center gap-4 bg-[#1f2430] px-6 py-12 text-center">
        <p className="absolute left-1/2 top-3 -translate-x-1/2 rounded-full bg-[#d8442a] px-3 py-1 text-xs font-semibold text-white">
          Mock call — no video
        </p>

        <span className="flex size-20 items-center justify-center rounded-full bg-[#00b4b8] text-xl font-semibold text-white">
          {getInitials(otherParty || "?")}
        </span>
        <div>
          <p className="text-base font-semibold text-white">{otherParty || "Care Connect user"}</p>
          <p className="mt-1 text-sm tabular-nums text-white/60">{elapsed}</p>
        </div>

        <p className="flex max-w-sm items-start gap-2 rounded-xl bg-white/5 px-4 py-3 text-left text-xs text-white/70">
          <Info className="mt-0.5 size-4 shrink-0" />
          <span>
            Video is stubbed out for testing. Everything else about the visit behaves
            normally — end the call, complete the booking, then write the record.
            {recordBlockedReason ? ` ${recordBlockedReason}` : ""}
          </span>
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3 bg-black px-4 py-4">
        {/* The reason this screen exists: the record flow.
            Gated exactly as POST /records is — it answers 409 unless the visit is
            completed and the client consented. An earlier version of this button ignored
            both, so pressing it mid-call produced "Write the record once the visit is
            completed", which the editor then mistook for "already created" and turned into
            a misleading "Record not found". */}
        {canManage && onWriteRecord && (
          <button
            type="button"
            disabled={!canWriteRecord}
            title={recordBlockedReason ?? undefined}
            onClick={() => onWriteRecord(booking)}
            className="flex items-center gap-2 rounded-full bg-[#00b4b8] px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:bg-white/15 disabled:text-white/50"
          >
            <FileText className="size-4" />
            {booking.hasRecord ? "Open visit record" : "Write visit record"}
          </button>
        )}

        <span className="flex items-center gap-2 rounded-full bg-white/10 px-4 py-2.5 text-sm text-white/60">
          <Users className="size-4" />
          2 participants
        </span>

        <button
          type="button"
          onClick={onLeave}
          aria-label="End call"
          className="flex size-11 items-center justify-center rounded-full bg-[#ff3e66] text-white transition-transform hover:scale-105 active:scale-95"
        >
          <PhoneOff className="size-4" />
        </button>
      </div>
    </>
  )
}
