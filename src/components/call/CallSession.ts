import { createContext, useContext } from "react"
import type { TelehealthBooking } from "@/utils/careconnect/types"

/**
 * The live call, held above the router.
 *
 * A call used to be a step inside `BookingDetailsDialog`, which tied its life to that
 * dialog's: closing the dialog or navigating anywhere unmounted the frame and dropped the
 * call. That made minimizing impossible in the only sense that matters — the professional
 * wanting to read the client's previous records, on a different route, without hanging up.
 *
 * So the call lives here instead, mounted once in `AppLayout` above the `Outlet`, and the
 * booking dialog only asks for it to start. Nothing about the call is re-created by a route
 * change, because nothing about it is owned by a route.
 */

/** `live` while media is flowing; `ended` once the participant has left and the layer is showing the post-call panel. */
type CallPhase = "live" | "ended"

export type ActiveCall = {
  booking: TelehealthBooking
  /** True for the professional/agency side — the side that documents the visit. */
  canManage: boolean
  phase: CallPhase
  minimized: boolean
}

export type CallSessionValue = {
  call: ActiveCall | null
  /**
   * Start, or bring back, the call for a booking.
   *
   * `onStatusChanged` is how a completion made from the post-call panel gets back to the
   * list the caller is showing. It is optional and allowed to become a no-op: the page that
   * registered it may well have unmounted by the time the call ends, which is the whole
   * point of the call outliving it.
   */
  startCall: (
    booking: TelehealthBooking,
    canManage: boolean,
    onStatusChanged?: (updated: TelehealthBooking) => void,
  ) => void
  setMinimized: (next: boolean) => void
  /** The participant left. Keeps the layer up so the post-call panel can offer a rejoin. */
  markEnded: () => void
  /** Back into the same session — the server reuses it, so this costs nothing. */
  rejoin: () => void
  /** Tear the layer down entirely. */
  dismiss: () => void
  /** Record a booking change made from the post-call panel, and pass it on. */
  applyStatusChange: (updated: TelehealthBooking) => void
}

export const CallSessionContext = createContext<CallSessionValue | null>(null)

/**
 * The call session, or null outside the provider.
 *
 * Nullable on purpose: `BookingDetailsDialog` is also rendered from pages that sit outside
 * `AppLayout`, and a missing provider should degrade to "no floating call" rather than
 * throw on a screen that only wanted to show booking details.
 */
export function useCallSession(): CallSessionValue | null {
  return useContext(CallSessionContext)
}
