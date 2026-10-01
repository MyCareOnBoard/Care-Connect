import { useEffect, useState, type ReactNode } from "react"
import { createPortal } from "react-dom"
import { playSound, type SoundName } from "@/lib/sound"
import { MomentCaption } from "@/components/cowry/moments/MomentCaption"

/**
 * The frame every legendary arrival plays in: full screen, above everything, a few seconds
 * long, then it fades and the gift card takes over.
 *
 * Tap anywhere or press Esc to skip. With reduced motion the scene is handed `still`, and
 * shows a single held frame for a moment instead of animating.
 */

function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && Boolean(window.matchMedia?.("(prefers-reduced-motion: reduce)").matches)
}

export function FullScreenMoment({
  durationMs,
  sound,
  label,
  onDone,
  children,
}: {
  durationMs: number
  sound?: SoundName
  /** What is happening, for screen readers: "A Blooming Rose opens". */
  label: string
  onDone: () => void
  children: (still: boolean) => ReactNode
}) {
  const [still] = useState(prefersReducedMotion)
  const [leaving, setLeaving] = useState(false)
  const total = still ? 1800 : durationMs

  useEffect(() => {
    if (sound) playSound(sound)
    const leave = setTimeout(() => setLeaving(true), total - 450)
    const done = setTimeout(onDone, total)
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && onDone()
    window.addEventListener("keydown", onKey)
    return () => {
      clearTimeout(leave)
      clearTimeout(done)
      window.removeEventListener("keydown", onKey)
    }
  }, [onDone, sound, total])

  return createPortal(
    <div
      role="status"
      aria-label={label}
      onClick={onDone}
      className={`pointer-events-auto fixed inset-0 z-[75] cursor-pointer overflow-hidden transition-opacity duration-500 ${
        leaving ? "opacity-0" : "opacity-100"
      }`}
    >
      {children(still)}
      <MomentCaption />
      <span className="pointer-events-none absolute bottom-6 left-1/2 -translate-x-1/2 text-xs font-medium text-white/50">
        Tap to skip
      </span>
    </div>,
    document.body,
  )
}
