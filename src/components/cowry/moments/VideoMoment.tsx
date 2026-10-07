import { useCallback, useEffect, useRef, useState, type ReactNode } from "react"
import { createPortal } from "react-dom"
import { useSoundEnabled } from "@/lib/sound"
import { MomentCaption } from "@/components/cowry/moments/MomentCaption"

/**
 * A legendary arrival played from a video: full screen, with the gift's name and amount over
 * the top (MomentCaption), tap or Esc to skip, and the gift card after it ends.
 *
 * Its sound is the video's own, and only when Sounds is on. Browsers allow sound only after
 * the person has interacted with the page; if this one has not, the browser refuses and the
 * video plays muted rather than not at all.
 *
 * It never leaves a blank screen. If the video fails, or has not started within a few seconds
 * (a slow connection, a blocked file), `fallback` — the gift's drawn scene — plays instead. With
 * reduced motion there is no playback: one held frame of the video, briefly, with the caption.
 */

/** How long to wait for the first frame before falling back to the drawn scene. */
const START_TIMEOUT_MS = 4000
/** A ceiling, in case "ended" never fires — a stalled stream should not hold the screen. */
const MAX_MS = 14000
/** Reduced motion: how long the held frame shows. */
const STILL_MS = 2200

function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && Boolean(window.matchMedia?.("(prefers-reduced-motion: reduce)").matches)
}

export function VideoMoment({
  src,
  label,
  onDone,
  fallback,
}: {
  src: string
  /** What is happening, for screen readers: "A Golden Lion roars". */
  label: string
  onDone: () => void
  /** The drawn scene, played if the video cannot be. */
  fallback: ReactNode
}) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const startedRef = useRef(false)
  const [still] = useState(prefersReducedMotion)
  const [failed, setFailed] = useState(false)
  const [leaving, setLeaving] = useState(false)
  const soundOn = useSoundEnabled()

  const finish = useCallback(() => {
    setLeaving(true)
    window.setTimeout(onDone, 450)
  }, [onDone])

  // Start playing: with sound if allowed, muted if the browser says no.
  useEffect(() => {
    if (failed) return
    const video = videoRef.current
    if (!video) return

    if (still) {
      // One frame, a little way in, where the subject is in shot.
      const hold = () => {
        video.currentTime = Math.min(2, (video.duration || 4) / 3)
      }
      video.addEventListener("loadedmetadata", hold, { once: true })
      const done = window.setTimeout(finish, STILL_MS)
      return () => {
        video.removeEventListener("loadedmetadata", hold)
        window.clearTimeout(done)
      }
    }

    // Promise.resolve: not every browser's play() returns a promise.
    const play = () => Promise.resolve().then(() => video.play())
    video.muted = !soundOn
    play().catch(() => {
      video.muted = true
      play().catch(() => setFailed(true))
    })

    const startCheck = window.setTimeout(() => {
      if (!startedRef.current) setFailed(true)
    }, START_TIMEOUT_MS)
    const ceiling = window.setTimeout(finish, MAX_MS)
    return () => {
      window.clearTimeout(startCheck)
      window.clearTimeout(ceiling)
    }
    // soundOn is read once at start; switching Sounds mid-video is handled below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [failed, still, finish])

  // Sounds switched off (or on) while it plays.
  useEffect(() => {
    if (videoRef.current && !still) videoRef.current.muted = !soundOn
  }, [soundOn, still])

  useEffect(() => {
    if (failed) return
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && onDone()
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [failed, onDone])

  if (failed) return <>{fallback}</>

  return createPortal(
    <div
      role="status"
      aria-label={label}
      onClick={onDone}
      className={`pointer-events-auto fixed inset-0 z-[75] cursor-pointer overflow-hidden bg-black transition-opacity duration-500 ${
        leaving ? "opacity-0" : "animate-fadeIn opacity-100"
      }`}
    >
      <video
        ref={videoRef}
        src={src}
        playsInline
        preload="auto"
        // Muted until the effect decides; a video that starts unmuted is the one browsers block.
        muted
        onPlaying={() => {
          startedRef.current = true
        }}
        onEnded={finish}
        onError={() => setFailed(true)}
        className="absolute inset-0 size-full object-cover"
        aria-hidden="true"
      />

      {/* Shade at the top and bottom, so the gold caption and "Tap to skip" read on any frame. */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[38vh] bg-[linear-gradient(180deg,rgba(0,0,0,0.6),transparent)]" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[18vh] bg-[linear-gradient(0deg,rgba(0,0,0,0.5),transparent)]" />

      <MomentCaption />
      <span className="pointer-events-none absolute bottom-6 left-1/2 -translate-x-1/2 text-xs font-medium text-white/60">
        Tap to skip
      </span>
    </div>,
    document.body,
  )
}
