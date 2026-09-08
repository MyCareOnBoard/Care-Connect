import { useCallback, useEffect, useRef, useState } from "react"
// Types only. The SDK itself is imported dynamically below — see the note on the effect.
import type { Publisher, Session, Subscriber } from "@vonage/client-sdk-video"
import { Mic, MicOff, PhoneOff, Video, VideoOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import { CallFollowUpButton, CallRecordButton } from "@/components/professional/CallRecordButton"
import { getInitials } from "@/lib/utils"
import { getAuthErrorMessage } from "@/utils/auth"
import { getVideoRoom } from "@/utils/careconnect/services/telehealthService"
import type { TelehealthBooking } from "@/utils/careconnect/types"

/** What the participant is told about the connection, in the order it normally moves. */
type CallState = "connecting" | "connected" | "reconnecting"

/**
 * Turn an SDK error into something a clinician can act on.
 *
 * The SDK's own messages are written for developers ("OT_USER_MEDIA_ACCESS_DENIED"), and the
 * two failures that actually happen in the field — a blocked camera permission and an
 * expired token — both need the *user* to do something specific. Anything unrecognised falls
 * through to the SDK's message rather than being flattened into "something went wrong",
 * because a real message is easier to report than a generic one.
 */
function callErrorMessage(error: { name?: string; message?: string } | undefined): string {
  switch (error?.name) {
    case "OT_USER_MEDIA_ACCESS_DENIED":
    case "OT_CONSTRAINTS_NOT_SATISFIED":
      return "Your browser blocked access to the camera or microphone. Allow it in the address bar, then rejoin."
    case "OT_NO_DEVICES_FOUND":
    case "OT_NO_VIDEO_CAPTURE_DEVICES":
      return "No camera or microphone was found on this device."
    case "OT_AUTHENTICATION_ERROR":
    case "OT_INVALID_SESSION_ID":
      return "This call link has expired. Close this and rejoin from the booking."
    case "OT_NOT_CONNECTED":
      return "The connection to the call was lost."
    default:
      return error?.message || "The call ended unexpectedly."
  }
}

/**
 * Vonage Video call for a booking.
 *
 * Replaces the Daily Prebuilt embed. The two are not equivalent in what they hand you:
 * Prebuilt shipped an entire call UI inside an iframe, whereas the Vonage client SDK gives
 * only streams and elements — so every control on this screen is ours to draw. It is kept
 * deliberately minimal for a 1:1 clinical visit: the other party, your own preview, mic and
 * camera, leave. No chat, no screen share, no participant list, because nothing in a
 * telehealth visit needs them and each one is another surface to get wrong.
 *
 * The session is created server-side once per booking and reused; this component only
 * fetches a fresh per-participant token and connects, so rejoining costs nothing.
 */
export function VideoCallFrame({
  booking,
  canManage,
  onWriteRecord,
  onProposeFollowUp,
  onLeave,
}: {
  booking: TelehealthBooking
  /** True for the professional/agency side, which is the side that documents the visit. */
  canManage: boolean
  onWriteRecord?: (booking: TelehealthBooking) => void
  /** Arrange the next visit without leaving the call. */
  onProposeFollowUp?: (booking: TelehealthBooking) => void
  /** Called when the participant leaves, or is disconnected with no way back. */
  onLeave: () => void
}) {
  const bookingId = booking.id
  const publisherName = (canManage ? booking.professionalName : booking.clientName) || undefined
  const remoteRef = useRef<HTMLDivElement>(null)
  const localRef = useRef<HTMLDivElement>(null)
  const sessionRef = useRef<Session | null>(null)
  const publisherRef = useRef<Publisher | null>(null)
  const subscribersRef = useRef(new Map<string, Subscriber>())
  const onLeaveRef = useRef(onLeave)
  onLeaveRef.current = onLeave

  const [error, setError] = useState<string | null>(null)
  const [state, setState] = useState<CallState>("connecting")
  const [remoteCount, setRemoteCount] = useState(0)
  const [micOn, setMicOn] = useState(true)
  const [cameraOn, setCameraOn] = useState(true)

  useEffect(() => {
    // Guards the whole async path: the dialog can close mid-connect, and StrictMode runs
    // this effect twice in development. Without it the second run leaves a live session
    // publishing from a component nobody is looking at.
    let cancelled = false
    // Captured rather than read through the ref in the cleanup: the map is created once so
    // the two are the same object either way, but this run's handlers and this run's
    // cleanup should provably be talking about the same one.
    const subscribers = subscribersRef.current

    const connect = async () => {
      try {
        // The client SDK is ~2.5 MB, and this is the only screen that needs it — a static
        // import pulls it into the chunk behind the schedule, making every professional
        // download a video stack to look at their day. Loaded in parallel with the token
        // request so the split costs no extra wait.
        const [access, sdk] = await Promise.all([
          getVideoRoom(bookingId),
          import("@vonage/client-sdk-video"),
        ])
        const OT = sdk.default
        const remoteEl = remoteRef.current
        const localEl = localRef.current
        if (cancelled || !remoteEl || !localEl) return

        const session = OT.initSession(access.applicationId, access.sessionId)
        sessionRef.current = session

        session.on("streamCreated", (event) => {
          // Fires only for the *other* participants — a publisher's own stream is reported
          // on the publisher, not the session — so anything here is remote by definition.
          if (cancelled) return
          const subscriber = session.subscribe(
            event.stream,
            remoteEl,
            {
              insertMode: "append",
              width: "100%",
              height: "100%",
              fitMode: "cover",
              showControls: false,
            },
            (subscribeError) => {
              if (subscribeError && !cancelled) setError(callErrorMessage(subscribeError))
            },
          )
          subscribers.set(event.stream.streamId, subscriber)
          setRemoteCount(subscribers.size)
        })

        session.on("streamDestroyed", (event) => {
          // The SDK removes the element itself on this event, so only the bookkeeping is
          // ours — unsubscribing here would double-remove.
          subscribers.delete(event.stream.streamId)
          setRemoteCount(subscribers.size)
        })

        // The SDK reconnects on its own, so these two only change what the user is told.
        session.on("sessionReconnecting", () => {
          if (!cancelled) setState("reconnecting")
        })
        session.on("sessionReconnected", () => {
          if (!cancelled) setState("connected")
        })

        session.on("sessionDisconnected", (event) => {
          // Our own cleanup disconnect also lands here; `cancelled` is already set by then,
          // so it cannot fire a leave for a component that is unmounting anyway.
          if (cancelled) return
          if (event.reason === "networkDisconnected") {
            setError("The connection to the call was lost.")
            return
          }
          onLeaveRef.current()
        })

        await new Promise<void>((resolve, reject) => {
          session.connect(access.token, (connectError) => {
            if (connectError) reject(connectError)
            else resolve()
          })
        })
        if (cancelled) return

        const publisher = await new Promise<Publisher>((resolve, reject) => {
          const created = OT.initPublisher(
            localEl,
            {
              insertMode: "append",
              width: "100%",
              height: "100%",
              fitMode: "cover",
              // Only the local preview is mirrored — it is your own reflection, and an
              // unmirrored one reads as reversed. The remote tile must not be.
              mirror: true,
              showControls: false,
              name: publisherName,
            },
            (publishError) => {
              if (publishError) reject(publishError)
              else resolve(created)
            },
          )
        })
        if (cancelled) {
          publisher.destroy()
          return
        }
        publisherRef.current = publisher

        session.publish(publisher, (publishError) => {
          if (cancelled) return
          if (publishError) setError(callErrorMessage(publishError))
          else setState("connected")
        })
      } catch (requestError) {
        if (cancelled) return
        // Two error shapes arrive here: an axios rejection from /video-room, and an OTError
        // from connect or initPublisher. The latter carries a `name`, which is what makes
        // the actionable messages above possible.
        const otName = (requestError as { name?: string } | undefined)?.name
        setError(
          typeof otName === "string" && otName.startsWith("OT_")
            ? callErrorMessage(requestError as { name: string; message?: string })
            : getAuthErrorMessage(requestError),
        )
      }
    }

    void connect()

    return () => {
      cancelled = true
      publisherRef.current?.destroy()
      publisherRef.current = null
      // Disconnecting drops our streams and every subscription with them, so the map only
      // needs clearing — and it must be cleared, or a rejoin starts with stale entries.
      sessionRef.current?.disconnect()
      sessionRef.current = null
      subscribers.clear()
    }
  }, [bookingId, publisherName])

  const toggleMic = useCallback(() => {
    const publisher = publisherRef.current
    if (!publisher) return
    setMicOn((on) => {
      publisher.publishAudio(!on)
      return !on
    })
  }, [])

  const toggleCamera = useCallback(() => {
    const publisher = publisherRef.current
    if (!publisher) return
    setCameraOn((on) => {
      publisher.publishVideo(!on)
      return !on
    })
  }, [])

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

  const otherParty =
    (canManage ? booking.clientName : booking.professionalName) || "Care Connect user"

  return (
    <>
      <div className="relative flex-1 overflow-hidden bg-[#1f2430]">
        {/* The remote stream is subscribed straight into this element. A grid rather than a
            single slot so a third party joining lays out instead of stacking. */}
        <div
          ref={remoteRef}
          className={`grid h-full w-full ${remoteCount > 1 ? "grid-cols-2" : "grid-cols-1"}`}
        />

        {/* Nothing to show until the other side publishes, and "nobody is here yet" is a
            different thing from "still connecting" — being told which one is the difference
            between waiting and giving up. */}
        {remoteCount === 0 && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 text-center">
            <span className="flex size-20 items-center justify-center rounded-full bg-[#00b4b8] text-xl font-semibold text-white">
              {getInitials(otherParty)}
            </span>
            <p className="text-sm text-white/70">
              {state === "connecting" ? "Connecting…" : `Waiting for ${otherParty} to join…`}
            </p>
          </div>
        )}

        {state === "reconnecting" && (
          <p className="absolute left-1/2 top-3 z-20 -translate-x-1/2 rounded-full bg-[#d8442a] px-3 py-1 text-xs font-semibold text-white shadow-lg">
            Reconnecting…
          </p>
        )}

        {/* Own preview, corner-pinned and small: it is a check that you are on camera, not
            something to watch. Hidden while the camera is off so the tile is not a black
            box — but only visually, since destroying it would drop the published stream. */}
        <div
          ref={localRef}
          className={`absolute bottom-3 right-3 z-10 h-24 w-32 overflow-hidden rounded-xl bg-black/60 ring-1 ring-white/15 sm:h-28 sm:w-44 ${
            cameraOn ? "" : "invisible"
          }`}
        />
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3 bg-black px-4 py-3">
        <button
          type="button"
          onClick={toggleMic}
          aria-label={micOn ? "Mute microphone" : "Unmute microphone"}
          aria-pressed={!micOn}
          className={`flex size-11 items-center justify-center rounded-full text-white transition-transform hover:scale-105 active:scale-95 ${
            micOn ? "bg-white/10 hover:bg-white/20" : "bg-[#d8442a]"
          }`}
        >
          {micOn ? <Mic className="size-4" /> : <MicOff className="size-4" />}
        </button>

        <button
          type="button"
          onClick={toggleCamera}
          aria-label={cameraOn ? "Turn off camera" : "Turn on camera"}
          aria-pressed={!cameraOn}
          className={`flex size-11 items-center justify-center rounded-full text-white transition-transform hover:scale-105 active:scale-95 ${
            cameraOn ? "bg-white/10 hover:bg-white/20" : "bg-[#d8442a]"
          }`}
        >
          {cameraOn ? <Video className="size-4" /> : <VideoOff className="size-4" />}
        </button>

        {/* Documenting while the visit is happening — the reason this frame carries controls
            of its own rather than handing the whole strip to the call. */}
        {canManage && onWriteRecord && (
          <CallRecordButton booking={booking} onWriteRecord={onWriteRecord} />
        )}
        {canManage && onProposeFollowUp && (
          <CallFollowUpButton booking={booking} onProposeFollowUp={onProposeFollowUp} />
        )}

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
