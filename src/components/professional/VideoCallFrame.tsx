import { useCallback, useEffect, useRef, useState } from "react"
// Types only. The SDK itself is imported dynamically below — see the note on the effect.
import type { Publisher, Session } from "@vonage/client-sdk-video"
import { Maximize2, Mic, MicOff, Minus, PhoneOff, Video, VideoOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import { CallFollowUpButton, CallRecordButton } from "@/components/professional/CallRecordButton"
import { getInitials } from "@/lib/utils"
import { getAuthErrorMessage } from "@/utils/auth"
import { getVideoRoom } from "@/utils/careconnect/services/telehealthService"
import type { TelehealthBooking } from "@/utils/careconnect/types"

/** What the participant is told about the connection, in the order it normally moves. */
type CallState = "connecting" | "connected" | "reconnecting"

/**
 * Why a remote tile has no picture. Two different situations that look identical on screen
 * and must not be described identically: "Camera off" is wrong and mildly alarming when
 * what actually happened is that the connection got too weak to carry video.
 */
type VideoOffReason = "camera" | "quality"

/**
 * What we track about someone else's stream.
 *
 * Held in state rather than read off the SDK's `Stream` object on render, because a
 * mutating object is not something React re-renders for: the camera going off changes the
 * stream in place, and only an event handler writing to state can make the screen follow.
 */
type RemoteStream = {
  streamId: string
  /** The name the other side published, if it published one. */
  name: string
  /** Null while video is flowing. */
  videoOff: VideoOffReason | null
}

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
  compact = false,
  onToggleCompact,
  onWriteRecord,
  onProposeFollowUp,
  onLeave,
}: {
  booking: TelehealthBooking
  /** True for the professional/agency side, which is the side that documents the visit. */
  canManage: boolean
  /**
   * Render as a thumbnail rather than a full screen.
   *
   * A prop rather than a separate component, and toggled without remounting anything,
   * because remounting is exactly what minimizing must not do: the session, the publisher
   * and both subscriptions live in this component's refs, so a second instance would tear
   * down the call it is meant to preserve.
   */
  compact?: boolean
  /** Omitted where there is nowhere to minimize to, which hides the control. */
  onToggleCompact?: () => void
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
  const onLeaveRef = useRef(onLeave)
  onLeaveRef.current = onLeave

  const [error, setError] = useState<string | null>(null)
  const [state, setState] = useState<CallState>("connecting")
  const [remoteStreams, setRemoteStreams] = useState<RemoteStream[]>([])
  const [micOn, setMicOn] = useState(true)
  const [cameraOn, setCameraOn] = useState(true)

  useEffect(() => {
    // Guards the whole async path: the dialog can close mid-connect, and StrictMode runs
    // this effect twice in development. Without it the second run leaves a live session
    // publishing from a component nobody is looking at.
    let cancelled = false

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

          const { streamId, name, hasVideo } = event.stream
          const setVideoOff = (videoOff: VideoOffReason | null) => {
            if (cancelled) return
            setRemoteStreams((prev) =>
              prev.map((s) => (s.streamId === streamId ? { ...s, videoOff } : s)),
            )
          }

          // Subscriber events rather than the session's `streamPropertyChanged`: these fire
          // both when the publisher turns the camera off and when the SDK drops video to
          // cope with a weak connection. The property watch only sees the first, and the
          // second looks exactly the same on screen.
          subscriber.on("videoDisabled", (videoEvent) => {
            setVideoOff(videoEvent.reason === "publishVideo" ? "camera" : "quality")
          })
          subscriber.on("videoEnabled", () => setVideoOff(null))

          setRemoteStreams((prev) =>
            prev.some((s) => s.streamId === streamId)
              ? prev
              : [...prev, { streamId, name, videoOff: hasVideo ? null : "camera" }],
          )
        })

        session.on("streamDestroyed", (event) => {
          // The SDK removes the element itself on this event, so only the bookkeeping is
          // ours — unsubscribing here would double-remove.
          const { streamId } = event.stream
          setRemoteStreams((prev) => prev.filter((s) => s.streamId !== streamId))
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
      // Disconnecting drops our streams and every subscription with them, so nothing has
      // to be unsubscribed by hand. The tracked streams are reset so a rejoin does not
      // start out believing the other side is already here.
      sessionRef.current?.disconnect()
      sessionRef.current = null
      setRemoteStreams([])
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
      <div
        className={`flex flex-1 flex-col items-center justify-center gap-3 bg-[#1f2430] text-center ${
          compact ? "px-3 py-4" : "gap-4 px-6 py-16"
        }`}
      >
        <p className={compact ? "text-xs text-white/80" : "text-sm text-white/80"}>{error}</p>
        {compact ? (
          <button
            type="button"
            onClick={onLeave}
            className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/20"
          >
            Close
          </button>
        ) : (
          <Button type="button" variant="outline" onClick={onLeave}>
            Back to booking
          </Button>
        )}
      </div>
    )
  }

  const otherParty =
    (canManage ? booking.clientName : booking.professionalName) || "Care Connect user"
  const selfName = publisherName || "You"

  // Only meaningful for the 1:1 visit this screen is built for: with one remote stream the
  // whole area belongs to that person, so the placeholder can cover it. A third party would
  // make "whose camera is off" ambiguous, and the SDK's own per-tile handling is left to it.
  const soleRemote = remoteStreams.length === 1 ? remoteStreams[0] : null
  const remoteVideoOff = soleRemote?.videoOff ?? null

  // A 44px control is a comfortable touch target and far too big for a 256px tile; both
  // sizes are named once here so the buttons below stay readable.
  const controlSize = compact ? "size-8" : "size-11"
  const iconSize = compact ? "size-3.5" : "size-4"

  return (
    <>
      <div className="relative flex-1 overflow-hidden bg-[#1f2430]">
        {/* The remote stream is subscribed straight into this element. A grid rather than a
            single slot so a third party joining lays out instead of stacking. */}
        <div
          ref={remoteRef}
          className={`grid h-full w-full ${remoteStreams.length > 1 ? "grid-cols-2" : "grid-cols-1"}`}
        />

        {/* Three states share this spot, and they are genuinely different situations: not
            connected yet, connected but alone, and connected to someone whose camera is
            off. The last one used to be an unexplained black rectangle — the same avatar
            the waiting state uses says who is there and that the call is fine. */}
        {(remoteStreams.length === 0 || remoteVideoOff) && (
          <div
            className={`absolute inset-0 flex flex-col items-center justify-center bg-[#1f2430] px-3 text-center ${
              compact ? "gap-2" : "gap-4"
            }`}
          >
            <span
              className={`flex items-center justify-center rounded-full bg-[#00b4b8] font-semibold text-white ${
                compact ? "size-10 text-sm" : "size-20 text-xl"
              }`}
            >
              {getInitials(soleRemote?.name || otherParty)}
            </span>
            {remoteVideoOff ? (
              <div className="max-w-full">
                <p
                  className={`truncate font-semibold text-white ${compact ? "text-xs" : "text-base"}`}
                >
                  {soleRemote?.name || otherParty}
                </p>
                <p className={`mt-1 text-white/60 ${compact ? "text-[11px]" : "text-sm"}`}>
                  {remoteVideoOff === "camera"
                    ? "Camera off"
                    : compact
                      ? "Weak connection"
                      : "Video paused — the connection is weak"}
                </p>
              </div>
            ) : (
              <p className={`text-white/70 ${compact ? "text-[11px]" : "text-sm"}`}>
                {state === "connecting"
                  ? "Connecting…"
                  : compact
                    ? "Waiting…"
                    : `Waiting for ${otherParty} to join…`}
              </p>
            )}
          </div>
        )}

        {/* Who you are looking at, while you can see them. Top-left keeps it clear of the
            reconnect pill at top-centre and the self-view at bottom-right; it is suppressed
            when the placeholder is up, since that already names them in full. */}
        {soleRemote && !remoteVideoOff && (
          <p className="absolute left-3 top-3 z-20 max-w-[60%] truncate rounded-full bg-black/50 px-3 py-1 text-xs font-medium text-white backdrop-blur-sm">
            {soleRemote.name || otherParty}
          </p>
        )}

        {state === "reconnecting" && (
          <p className="absolute left-1/2 top-3 z-20 -translate-x-1/2 rounded-full bg-[#d8442a] px-3 py-1 text-xs font-semibold text-white shadow-lg">
            Reconnecting…
          </p>
        )}

        {/* Own preview, corner-pinned and small: it is a check that you are on camera, not
            something to watch. With the camera off the video element is hidden rather than
            removed — destroying it would drop the published stream — and the tile names you
            instead, so it reads as "you, camera off" rather than as a dead black square. */}
        <div
          className={`absolute bottom-3 right-3 z-10 overflow-hidden rounded-xl bg-[#2a3040] ring-1 ring-white/15 ${
            // Hidden rather than unmounted in the thumbnail: there is no room for it, but
            // the publisher's video element lives in here and removing it would stop
            // publishing — the other party would watch you disappear as you minimized.
            compact ? "invisible h-px w-px" : "h-24 w-32 sm:h-28 sm:w-44"
          }`}
        >
          <div ref={localRef} className={`h-full w-full ${cameraOn ? "" : "invisible"}`} />
          {!cameraOn && !compact && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 px-2">
              <span className="flex size-9 items-center justify-center rounded-full bg-[#00b4b8] text-xs font-semibold text-white">
                {getInitials(selfName)}
              </span>
              <span className="max-w-full truncate text-[11px] text-white/70">You</span>
            </div>
          )}
        </div>
      </div>

      <div
        className={`flex flex-wrap items-center justify-center bg-black ${
          compact ? "gap-1.5 px-2 py-2" : "gap-3 px-4 py-3"
        }`}
      >
        <button
          type="button"
          onClick={toggleMic}
          aria-label={micOn ? "Mute microphone" : "Unmute microphone"}
          aria-pressed={!micOn}
          className={`${controlSize} flex items-center justify-center rounded-full text-white transition-transform hover:scale-105 active:scale-95 ${
            micOn ? "bg-white/10 hover:bg-white/20" : "bg-[#d8442a]"
          }`}
        >
          {micOn ? <Mic className={iconSize} /> : <MicOff className={iconSize} />}
        </button>

        <button
          type="button"
          onClick={toggleCamera}
          aria-label={cameraOn ? "Turn off camera" : "Turn on camera"}
          aria-pressed={!cameraOn}
          className={`${controlSize} flex items-center justify-center rounded-full text-white transition-transform hover:scale-105 active:scale-95 ${
            cameraOn ? "bg-white/10 hover:bg-white/20" : "bg-[#d8442a]"
          }`}
        >
          {cameraOn ? <Video className={iconSize} /> : <VideoOff className={iconSize} />}
        </button>

        {/* Documenting while the visit is happening — the reason this frame carries controls
            of its own rather than handing the whole strip to the call. Dropped from the
            thumbnail: both open a dialog that would cover the tile you just shrank, and
            expanding first is one click either way. */}
        {!compact && canManage && onWriteRecord && (
          <CallRecordButton booking={booking} onWriteRecord={onWriteRecord} />
        )}
        {!compact && canManage && onProposeFollowUp && (
          <CallFollowUpButton booking={booking} onProposeFollowUp={onProposeFollowUp} />
        )}

        {onToggleCompact && (
          <button
            type="button"
            onClick={onToggleCompact}
            aria-label={compact ? "Expand the call" : "Minimize the call and keep it running"}
            title={
              compact ? "Expand the call" : "Minimize — the call keeps running as you move around"
            }
            className={`${controlSize} flex items-center justify-center rounded-full bg-white/10 text-white transition-transform hover:scale-105 hover:bg-white/20 active:scale-95`}
          >
            {compact ? <Maximize2 className={iconSize} /> : <Minus className={iconSize} />}
          </button>
        )}

        <button
          type="button"
          onClick={onLeave}
          aria-label="End call"
          className={`${controlSize} flex items-center justify-center rounded-full bg-[#ff3e66] text-white transition-transform hover:scale-105 active:scale-95`}
        >
          <PhoneOff className={iconSize} />
        </button>
      </div>
    </>
  )
}
