import { useEffect, useRef, useState } from "react"
import DailyIframe, { type DailyCall } from "@daily-co/daily-js"
import { Button } from "@/components/ui/button"
import { CallRecordButton } from "@/components/professional/CallRecordButton"
import { getAuthErrorMessage } from "@/utils/auth"
import {
  getVideoRoom,
  type VideoRoomAccess,
} from "@/utils/careconnect/services/telehealthService"
import type { TelehealthBooking } from "@/utils/careconnect/types"

/**
 * TESTING ONLY — a fixed public Daily room, used solely as a fallback when the API cannot
 * provision a per-booking room (a placeholder DAILY_API_KEY surfaces as a 502 from
 * /video-room).
 *
 * Never pre-empts a working call: the real endpoint is always tried first and this is only
 * reached from the failure path, so it self-disables the moment the key is valid.
 *
 * SECURITY: a public Daily room needs no token, so while this variable is set any booking
 * whose provisioning fails lands in ONE shared room that anyone with the URL can join,
 * including someone party to no booking. Clear the variable once DAILY_API_KEY is real —
 * it must not be set for live clinical calls.
 */
const TEST_ROOM_URL: string | null =
  (import.meta.env.VITE_DAILY_TEST_ROOM_URL as string | undefined)?.trim() || null

/**
 * Daily Prebuilt embed for a booking's video call.
 *
 * Prebuilt brings its own controls — camera, mic, screen share, chat, participants,
 * device picker, reconnect — so this component only fetches join access and manages the
 * iframe's lifecycle. Keeping the embed isolated here means swapping in a custom
 * `@daily-co/daily-react` UI later is a change to this one file.
 */
export function VideoCallFrame({
  booking,
  canManage,
  onWriteRecord,
  onLeave,
}: {
  booking: TelehealthBooking
  /** True for the professional/agency side, which is the side that documents the visit. */
  canManage: boolean
  onWriteRecord?: (booking: TelehealthBooking) => void
  /** Called when the participant leaves the call (Prebuilt's leave button, or an eject). */
  onLeave: () => void
}) {
  const bookingId = booking.id
  const containerRef = useRef<HTMLDivElement>(null)
  const callRef = useRef<DailyCall | null>(null)
  const onLeaveRef = useRef(onLeave)
  onLeaveRef.current = onLeave
  const [error, setError] = useState<string | null>(null)
  const [joining, setJoining] = useState(true)
  // Surfaced on screen so a shared test room is never mistaken for a real, private call.
  const [usingTestRoom, setUsingTestRoom] = useState(false)

  useEffect(() => {
    let cancelled = false
    let call: DailyCall | null = null

    ;(async () => {
      try {
        // Always try the real per-booking room first. Only if that fails — and only while
        // VITE_DAILY_TEST_ROOM_URL is set — fall back to the shared public test room, so
        // the call UI stays testable while the backend's Daily key is a placeholder.
        let access: VideoRoomAccess
        try {
          access = await getVideoRoom(bookingId)
        } catch (provisionError) {
          if (!TEST_ROOM_URL) throw provisionError
          console.warn(
            "[VideoCallFrame] room provisioning failed; falling back to VITE_DAILY_TEST_ROOM_URL (shared public room, testing only)",
            provisionError,
          )
          access = { roomUrl: TEST_ROOM_URL, token: null, expiresAt: "", testRoom: true }
        }
        if (!cancelled) setUsingTestRoom(access.testRoom === true)
        // The dialog can close while the token request is in flight — don't build a
        // frame nobody will see, or it leaks and blocks the next one.
        if (cancelled || !containerRef.current) return

        call = DailyIframe.createFrame(containerRef.current, {
          iframeStyle: { width: "100%", height: "100%", border: "0" },
          showLeaveButton: true,
          showFullscreenButton: true,
          theme: {
            colors: {
              accent: "#00b4b8",
              accentText: "#ffffff",
            },
          },
        })
        callRef.current = call

        call.on("left-meeting", () => onLeaveRef.current())
        call.on("error", (event) => {
          setError(event?.errorMsg || "The call ended unexpectedly.")
        })

        // A public test room (DAILY_TEST_ROOM_URL on the server) comes back without a
        // token, and passing an explicit null/undefined one makes daily-js reject the join.
        await call.join(
          access.token ? { url: access.roomUrl, token: access.token } : { url: access.roomUrl },
        )
        if (!cancelled) setJoining(false)
      } catch (requestError) {
        if (!cancelled) {
          setError(getAuthErrorMessage(requestError))
          setJoining(false)
        }
      }
    })()

    return () => {
      cancelled = true
      // daily-js allows only one live DailyIframe at a time — without this, reopening
      // the dialog throws "Duplicate DailyIframe instances".
      callRef.current?.destroy().catch(() => undefined)
      callRef.current = null
    }
  }, [bookingId])

  if (error) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 bg-[#1f2430] px-6 py-16 text-center">
        <p className="text-sm text-white/80">{error}</p>
        <Button type="button" variant="outline" onClick={onLeave}>
          Back to booking
        </Button>
      </div>
    )
  }

  return (
    <>
      <div className="relative flex-1 overflow-hidden bg-[#1f2430]">
        {joining && (
          <p className="absolute inset-0 z-10 flex items-center justify-center text-sm text-white/70">
            Connecting…
          </p>
        )}
      {/* Unmissable on purpose: this room is shared across bookings and joinable by anyone
          with the link, so nobody should mistake it for a private call. */}
        {usingTestRoom && (
          <p className="absolute left-1/2 top-3 z-20 -translate-x-1/2 rounded-full bg-[#d8442a] px-3 py-1 text-xs font-semibold text-white shadow-lg">
            Shared test room — not private
          </p>
        )}
        <div ref={containerRef} className="h-full w-full" />
      </div>

      {/* Documenting while the visit is happening. Sits in its own strip below the embed
          rather than overlaying it, because Prebuilt owns the bottom of the iframe for its
          own tray and an overlay would land on top of the mic and camera controls. */}
      {canManage && onWriteRecord && (
        <div className="flex items-center justify-center bg-black px-4 py-3">
          <CallRecordButton booking={booking} onWriteRecord={onWriteRecord} />
        </div>
      )}
    </>
  )
}
