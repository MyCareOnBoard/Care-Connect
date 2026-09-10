import { useCallback, useMemo, useRef, useState } from "react"
import { toast } from "sonner"
import { CallSessionContext, type ActiveCall, type CallSessionValue } from "@/components/call/CallSession"
import type { TelehealthBooking } from "@/utils/careconnect/types"

/**
 * Holds the one live call for the whole app. Mounted in `AppLayout`, outside the `Outlet`.
 *
 * See `CallSession.ts` for why the call is held above the router rather than inside the
 * booking dialog that starts it.
 */
export function CallSessionProvider({ children }: { children: React.ReactNode }) {
  const [call, setCall] = useState<ActiveCall | null>(null)
  /**
   * Kept in a ref rather than in `call`: it is a callback belonging to whichever page
   * started the call, and a function in state would change the context value's identity
   * and re-render every consumer for something none of them read.
   */
  const onStatusChangedRef = useRef<((updated: TelehealthBooking) => void) | undefined>(undefined)

  const startCall = useCallback<CallSessionValue["startCall"]>(
    (booking, canManage, onStatusChanged) => {
      // One call at a time. Two live sessions would publish two microphones from one
      // machine and bill two bookings for a person who can only be in one of them.
      if (call && call.phase === "live" && call.booking.id !== booking.id) {
        toast.error("You're already in a call. Leave that one before joining another.")
        return
      }
      onStatusChangedRef.current = onStatusChanged
      setCall({ booking, canManage, phase: "live", minimized: false })
    },
    [call],
  )

  const setMinimized = useCallback((next: boolean) => {
    setCall((current) => (current ? { ...current, minimized: next } : current))
  }, [])

  const markEnded = useCallback(() => {
    // Maximized on the way out: the post-call panel carries the rejoin and the professional's
    // "Complete visit", and neither should be discovered inside a thumbnail.
    setCall((current) => (current ? { ...current, phase: "ended", minimized: false } : current))
  }, [])

  const rejoin = useCallback(() => {
    setCall((current) => (current ? { ...current, phase: "live", minimized: false } : current))
  }, [])

  const dismiss = useCallback(() => {
    onStatusChangedRef.current = undefined
    setCall(null)
  }, [])

  const applyStatusChange = useCallback((updated: TelehealthBooking) => {
    setCall((current) =>
      current && current.booking.id === updated.id ? { ...current, booking: updated } : current,
    )
    onStatusChangedRef.current?.(updated)
  }, [])

  const value = useMemo(
    () => ({ call, startCall, setMinimized, markEnded, rejoin, dismiss, applyStatusChange }),
    [call, startCall, setMinimized, markEnded, rejoin, dismiss, applyStatusChange],
  )

  return <CallSessionContext.Provider value={value}>{children}</CallSessionContext.Provider>
}
