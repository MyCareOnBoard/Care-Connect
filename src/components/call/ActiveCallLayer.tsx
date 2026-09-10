import { useEffect, useReducer, useState } from "react"
import { format } from "date-fns"
import { PhoneOff } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { useCallSession } from "@/components/call/CallSession"
import { MockCallFrame } from "@/components/professional/MockCallFrame"
import { VideoCallFrame } from "@/components/professional/VideoCallFrame"
import { useRecordSurfaces } from "@/components/records/useRecordSurfaces"
import { getAuthErrorMessage } from "@/utils/auth"
import { updateBookingStatus } from "@/utils/careconnect/services/telehealthService"
import { videoJoinWindow } from "@/utils/careconnect/bookingStatus"
import type { TelehealthBooking } from "@/utils/careconnect/types"

/**
 * TESTING — replace the real call with a stubbed surface (`VITE_MOCK_VIDEO_CALL=true`).
 *
 * A real session is billable, so exercising everything that happens *around* a call —
 * documenting, minimizing, rejoining — is worth doing without one.
 */
const MOCK_VIDEO_CALL =
  (import.meta.env.VITE_MOCK_VIDEO_CALL as string | undefined)?.trim() === "true"

/**
 * The floating call, rendered once in `AppLayout`.
 *
 * Two presentations of **one** mounted frame: full screen, and a thumbnail docked bottom
 * left. Only this wrapper's classes change between them, which is the point — the session,
 * the publisher and the subscriptions live in the frame's refs, so anything that remounted
 * it would drop the call it is supposed to be preserving.
 *
 * Stacking, which is load-bearing here:
 *   - Full screen sits at `z-[35]`: above the shell's header (`z-20`) and mobile drawer
 *     (`z-30`), and deliberately *below* dialogs (`z-40`/`z-50`) so the record editor opens
 *     on top of the call rather than behind it.
 *   - The thumbnail sits at `z-[60]`, above everything, because its whole job is to stay
 *     visible over whatever you opened. `pointer-events-auto` is not decoration: an open
 *     Radix dialog sets `pointer-events: none` on the body, and without this the tile would
 *     be visible but dead.
 *
 * It docks bottom **left** because the record editor's own minimized bar docks bottom
 * right; two docked panels in one corner would sit on top of each other.
 *
 * Known gap in that ordering: minimize the call, open a booking dialog, then expand. The
 * call comes back full screen *underneath* that dialog, because full screen deliberately
 * sits below dialog content. Closing the dialog reveals it. Fixing it properly needs the
 * layer to know how many modals are open, which is not worth a registry for a sequence
 * nobody performs on purpose — whereas "the record editor opens on top of the call" is
 * something people do on every visit.
 */
export function ActiveCallLayer() {
  const session = useCallSession()
  // Its own instance of the clinical dialogs rather than a page's: the page that started
  // the call may be unmounted by the time these are opened from it, which is precisely
  // what an app-level call makes possible.
  const { openRecordEditor, openFollowUpProposal, openClientRecords, surfaces } =
    useRecordSurfaces({
      onBookingPatched: (updated) => session?.applyStatusChange(updated),
    })

  if (!session?.call) return null
  const { call, setMinimized, markEnded, rejoin, dismiss } = session
  const { booking, canManage, phase, minimized } = call
  const Frame = MOCK_VIDEO_CALL ? MockCallFrame : VideoCallFrame

  return (
    <>
      <div
        className={
          minimized
            ? "pointer-events-auto fixed bottom-4 left-4 z-[60] flex h-48 w-64 flex-col overflow-hidden rounded-2xl bg-[#1f2430] shadow-[0_18px_48px_rgba(17,24,39,0.34)]"
            : "pointer-events-auto fixed inset-0 z-[35] flex flex-col bg-[#1f2430]"
        }
      >
        {phase === "live" ? (
          <Frame
            booking={booking}
            canManage={canManage}
            compact={minimized}
            onToggleCompact={() => setMinimized(!minimized)}
            onWriteRecord={canManage ? openRecordEditor : undefined}
            onProposeFollowUp={canManage ? openFollowUpProposal : undefined}
            onViewRecords={
              canManage
                ? (target) => {
                    // Minimize *before* navigating, not after: the records page is a route,
                    // so a full-screen call would otherwise cover the very page it just
                    // opened. Shrinking first means the visit carries on in the corner while
                    // the professional reads the history — which is the entire reason the
                    // call was lifted out of the booking dialog.
                    setMinimized(true)
                    openClientRecords(target)
                  }
                : undefined
            }
            onLeave={markEnded}
          />
        ) : (
          <PostCallPanel
            booking={booking}
            canManage={canManage}
            onRejoin={rejoin}
            onDismiss={dismiss}
            onCompleted={session.applyStatusChange}
          />
        )}
      </div>

      {surfaces}
    </>
  )
}

/**
 * What you see after hanging up.
 *
 * Lives here rather than in `BookingDetailsDialog` because the call now outlives that
 * dialog: hanging up with the dialog closed, or on another page entirely, has to land
 * somewhere that still exists.
 *
 * Leaving the call is not the same act as finishing the visit. Hanging up used to complete
 * the booking outright for the professional, which made the red button a one-way door — the
 * server refuses a call for a completed booking — so a dropped connection or a mis-click
 * ended the visit with most of its window still to run. Completion is one click from here
 * instead, so the nudge survives without the trap.
 */
function PostCallPanel({
  booking,
  canManage,
  onRejoin,
  onDismiss,
  onCompleted,
}: {
  booking: TelehealthBooking
  canManage: boolean
  onRejoin: () => void
  onDismiss: () => void
  onCompleted: (updated: TelehealthBooking) => void
}) {
  const [pending, setPending] = useState(false)
  // Re-derives the window when it lapses; nothing reads the counter. See the timer below.
  const [, recheckWindow] = useReducer((tick: number) => tick + 1, 0)

  const isTerminal = booking.status === "completed" || booking.status === "cancelled"
  const isAccepted = booking.status === "confirmed" || booking.status === "completed"
  const joinWindow = booking.mode === "online" ? videoJoinWindow(booking) : null
  // The same three conditions the server checks before minting a token, so this button and
  // that endpoint cannot disagree about whether rejoining is possible.
  const canRejoin = !isTerminal && isAccepted && joinWindow?.state === "open"
  const closesAtMs = canRejoin && joinWindow ? joinWindow.closesAt.getTime() : null

  useEffect(() => {
    if (closesAtMs === null) return
    // The window closes ten minutes after the slot ends, comfortably inside how long this
    // panel stays open — without this the rejoin button would sit there stale and then 409.
    // One timer at the closing instant rather than a poll: one moment is worth reacting to.
    const timer = window.setTimeout(recheckWindow, Math.max(0, closesAtMs - Date.now()) + 1000)
    return () => window.clearTimeout(timer)
  }, [closesAtMs])

  const complete = async () => {
    setPending(true)
    try {
      onCompleted(await updateBookingStatus(booking.id, "completed"))
      toast.success("Visit completed")
      onDismiss()
    } catch (error) {
      toast.error(getAuthErrorMessage(error))
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="flex flex-1 items-center justify-center px-6 py-10">
      <div className="w-full max-w-sm rounded-[28px] bg-white px-6 py-8 text-center">
        <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-[#e3f8f8] text-[#00898c]">
          <PhoneOff className="size-6" />
        </span>
        <h3 className="mt-4 text-xl font-semibold text-[#151922]">Call ended</h3>
        <p className="mt-2 text-sm text-[#656f80]">
          {closesAtMs !== null
            ? `You can rejoin until ${format(closesAtMs, "h:mm a")}.`
            : "The appointment window has closed."}
        </p>

        {canRejoin && (
          <Button
            type="button"
            className="mt-6 w-full bg-[#00b4b8] text-white hover:opacity-90"
            onClick={onRejoin}
          >
            Rejoin call
          </Button>
        )}

        {/* The professional's explicit end-of-visit act, and what unlocks writing the record
            from the booking's details panel. */}
        {canManage && !isTerminal && (
          <Button
            type="button"
            variant="outline"
            disabled={pending}
            className={`${canRejoin ? "mt-3" : "mt-6"} w-full border-[#00b4b8] text-[#00b4b8] hover:bg-[#e3f8f8]`}
            onClick={complete}
          >
            Complete visit
          </Button>
        )}

        <button
          type="button"
          onClick={onDismiss}
          className="mt-3 w-full text-sm font-semibold text-[#00898c] hover:opacity-80"
        >
          Close
        </button>
      </div>
    </div>
  )
}
