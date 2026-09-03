import { useEffect, useRef, useState } from "react"
import DailyIframe, { type DailyCall } from "@daily-co/daily-js"
import { Button } from "@/components/ui/button"
import { getAuthErrorMessage } from "@/utils/auth"
import { getVideoRoom } from "@/utils/careconnect/services/telehealthService"

/**
 * TESTING ONLY — a fixed public Daily room that replaces the per-booking room lookup.
 *
 * Only honoured in a dev build. A production bundle resolves this to null regardless of
 * the environment variable, because a public room needs no token: anyone with the URL
 * could join, and every booking would share one room.
 */
const TEST_ROOM_URL: string | null = import.meta.env.DEV
  ? (import.meta.env.VITE_DAILY_TEST_ROOM_URL as string | undefined)?.trim() || null
  : null

/**
 * Daily Prebuilt embed for a booking's video call.
 *
 * Prebuilt brings its own controls — camera, mic, screen share, chat, participants,
 * device picker, reconnect — so this component only fetches join access and manages the
 * iframe's lifecycle. Keeping the embed isolated here means swapping in a custom
 * `@daily-co/daily-react` UI later is a change to this one file.
 */
export function VideoCallFrame({
  bookingId,
  onLeave,
}: {
  bookingId: string
  /** Called when the participant leaves the call (Prebuilt's leave button, or an eject). */
  onLeave: () => void
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const callRef = useRef<DailyCall | null>(null)
  const onLeaveRef = useRef(onLeave)
  onLeaveRef.current = onLeave
  const [error, setError] = useState<string | null>(null)
  const [joining, setJoining] = useState(true)

  useEffect(() => {
    let cancelled = false
    let call: DailyCall | null = null

    ;(async () => {
      try {
        // TESTING ONLY. With VITE_DAILY_TEST_ROOM_URL set, join a fixed public Daily room
        // instead of asking the API for a per-booking one. Exists so the call UI can be
        // exercised while the backend's Daily key is unset or invalid (which surfaces as a
        // 502 from /video-room), with no deploy needed.
        //
        // Guarded on import.meta.env.DEV so a production bundle ignores it entirely — a
        // public room takes no token, so anyone with the link could otherwise join.
        const access = TEST_ROOM_URL
          ? { roomUrl: TEST_ROOM_URL, token: null, expiresAt: "", testRoom: true }
          : await getVideoRoom(bookingId)
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
    <div className="relative flex-1 overflow-hidden bg-[#1f2430]">
      {joining && (
        <p className="absolute inset-0 z-10 flex items-center justify-center text-sm text-white/70">
          Connecting…
        </p>
      )}
      <div ref={containerRef} className="h-full w-full" />
    </div>
  )
}
