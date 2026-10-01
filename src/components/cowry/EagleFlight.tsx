import { useEffect, useState } from "react"
import { createPortal } from "react-dom"
import { EagleArt } from "@/components/cowry/EagleArt"
import { playSound } from "@/lib/sound"
import { MomentCaption } from "@/components/cowry/moments/MomentCaption"

/**
 * The Golden Eagle's arrival: the screen dims to a warm dusk, golden light turns slowly
 * behind, and the eagle sweeps across — wings beating, a trail of sparks behind it — before
 * the gift card rises into place.
 *
 * Replaces the falling-icons shower for this gift only. A tap anywhere or Esc skips it, and
 * with reduced motion the eagle simply appears, still, for a moment instead of flying.
 */

/** How long the flight lasts. Matches eagleFly in index.css. */
export const EAGLE_FLIGHT_MS = 4200
const TRAIL = 16

export function EagleFlight({ onDone }: { onDone: () => void }) {
  const [leaving, setLeaving] = useState(false)
  const reduced =
    typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches

  useEffect(() => {
    playSound("eagle")
    const leave = setTimeout(() => setLeaving(true), reduced ? 1600 : EAGLE_FLIGHT_MS - 400)
    const done = setTimeout(onDone, reduced ? 2000 : EAGLE_FLIGHT_MS)
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && onDone()
    window.addEventListener("keydown", onKey)
    return () => {
      clearTimeout(leave)
      clearTimeout(done)
      window.removeEventListener("keydown", onKey)
    }
  }, [onDone, reduced])

  return createPortal(
    <div
      className={`pointer-events-auto fixed inset-0 z-[75] cursor-pointer overflow-hidden transition-opacity duration-500 ${leaving ? "opacity-0" : "opacity-100"}`}
      role="presentation"
      onClick={onDone}
    >
      {/* Dusk, with a warm glow where the eagle passes. */}
      <div className="animate-fadeIn absolute inset-0 bg-[radial-gradient(ellipse_at_50%_45%,rgba(120,80,20,0.55)_0%,rgba(20,14,6,0.88)_60%,rgba(8,6,3,0.95)_100%)]" />
      {/* Slowly turning rays of gold light. */}
      <div
        className="eagle-rays absolute left-1/2 top-1/2 size-[160vmax] opacity-30"
        style={{
          // Centred by transform (not Tailwind's translate classes), because the spin
          // animation sets transform too and the two would otherwise add up.
          transform: "translate(-50%, -50%)",
          background:
            "repeating-conic-gradient(from 0deg, rgba(255,215,120,0.55) 0deg 6deg, transparent 6deg 24deg)",
          maskImage: "radial-gradient(circle, black 0%, transparent 55%)",
          WebkitMaskImage: "radial-gradient(circle, black 0%, transparent 55%)",
        }}
        aria-hidden="true"
      />

      {reduced ? (
        <div className="absolute inset-0 flex items-center justify-center">
          <EagleArt size={280} className="drop-shadow-[0_20px_40px_rgba(0,0,0,0.6)]" />
        </div>
      ) : (
        <>
          {/* The trail: sparks that fly the same path a moment behind, fading as they go. */}
          {Array.from({ length: TRAIL }).map((_, i) => (
            <span
              key={i}
              className="eagle-flight absolute left-0 top-0"
              style={{ animationDelay: `${(i + 1) * 70}ms` }}
              aria-hidden="true"
            >
              <span
                className="block rounded-full bg-[#ffd97a] shadow-[0_0_12px_4px_rgba(255,200,90,0.8)]"
                style={{
                  width: Math.max(3, 12 - i * 0.6),
                  height: Math.max(3, 12 - i * 0.6),
                  opacity: Math.max(0.15, 1 - i / TRAIL),
                  transform: `translate(60px, ${70 + (i % 3) * 8}px)`,
                }}
              />
            </span>
          ))}

          {/* The eagle itself. */}
          <div className="eagle-flight absolute left-0 top-0">
            <div className="eagle-bob">
              <EagleArt size={300} flapping className="drop-shadow-[0_24px_40px_rgba(0,0,0,0.55)]" />
            </div>
          </div>
        </>
      )}
      <MomentCaption />
    </div>,
    document.body,
  )
}
