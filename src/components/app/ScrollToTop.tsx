import { useEffect, useRef, useState } from "react"
import { ArrowUp } from "lucide-react"
import { cn } from "@/lib/utils"

/**
 * Back to top.
 *
 * Mounted once per layout, outside the routed content, so it is on every page without each
 * page opting in. It appears once the page has scrolled a screen or so, floats gently, and
 * its ring fills as you read down — so it doubles as a sense of how far through a long page
 * you are.
 *
 * Pages with their own sticky bar at the bottom (a Continue button, say) mark it with
 * `data-floating-actions`, and the button lifts itself above it rather than sitting on top
 * of the thing someone is trying to press.
 */

/** How far down before the button is worth showing. */
const SHOW_AFTER_PX = 480
/** Gap kept between the button and a floating action bar beneath it. */
const BAR_GAP_PX = 12
/** Matches the launch keyframes in index.css. */
const LAUNCH_MS = 650

const RING_RADIUS = 21
const RING_LENGTH = 2 * Math.PI * RING_RADIUS

function prefersReducedMotion() {
  try {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches
  } catch {
    return false
  }
}

export function ScrollToTop() {
  const [visible, setVisible] = useState(false)
  const [progress, setProgress] = useState(0)
  const [lift, setLift] = useState(0)
  const [launching, setLaunching] = useState(false)
  const launchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    let frame = 0

    const measure = () => {
      frame = 0
      const scrollTop = window.scrollY || document.documentElement.scrollTop
      const max = document.documentElement.scrollHeight - window.innerHeight
      setVisible(scrollTop > SHOW_AFTER_PX)
      setProgress(max > 0 ? Math.min(1, scrollTop / max) : 0)

      // Only a bar that is actually on screen at the bottom counts.
      const bar = document.querySelector<HTMLElement>("[data-floating-actions]")
      if (bar) {
        const rect = bar.getBoundingClientRect()
        const overlapsBottom = rect.bottom > window.innerHeight - 120 && rect.top < window.innerHeight
        setLift(overlapsBottom ? Math.max(0, window.innerHeight - rect.top) + BAR_GAP_PX : 0)
      } else {
        setLift(0)
      }
    }

    // One measurement per frame at most, however fast the scroll events come.
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(measure)
    }

    measure()
    window.addEventListener("scroll", schedule, { passive: true })
    window.addEventListener("resize", schedule)
    return () => {
      window.removeEventListener("scroll", schedule)
      window.removeEventListener("resize", schedule)
      if (frame) cancelAnimationFrame(frame)
    }
  }, [])

  useEffect(
    () => () => {
      if (launchTimer.current) clearTimeout(launchTimer.current)
    },
    [],
  )

  function toTop() {
    const reduced = prefersReducedMotion()
    window.scrollTo({ top: 0, behavior: reduced ? "auto" : "smooth" })
    if (reduced) return
    setLaunching(true)
    if (launchTimer.current) clearTimeout(launchTimer.current)
    launchTimer.current = setTimeout(() => setLaunching(false), LAUNCH_MS)
  }

  return (
    <div
      className={cn(
        "fixed right-4 z-40 transition-[opacity,transform,bottom] duration-300 ease-out sm:right-6",
        visible
          ? "translate-y-0 scale-100 opacity-100"
          : "pointer-events-none translate-y-4 scale-75 opacity-0",
      )}
      style={{ bottom: `calc(env(safe-area-inset-bottom, 0px) + ${20 + lift}px)` }}
    >
      {/* The bob lives on its own wrapper so it never fights the show/hide transform. */}
      <div className="animate-float-soft">
        <button
          type="button"
          onClick={toTop}
          aria-label="Back to top"
          aria-hidden={!visible}
          tabIndex={visible ? 0 : -1}
          className="group relative flex size-12 items-center justify-center rounded-full bg-white/90 text-[#00898c] shadow-[0_10px_28px_-10px_rgba(0,137,140,0.55)] ring-1 ring-[#d7eef0] backdrop-blur-md transition-all duration-200 hover:-translate-y-1 hover:bg-[#00b4b8] hover:text-white hover:shadow-[0_16px_34px_-10px_rgba(0,180,184,0.75)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00b4b8] focus-visible:ring-offset-2 active:translate-y-0 active:scale-90"
        >
          {/* Reading progress, drawn as a ring that fills clockwise from the top. */}
          <svg className="absolute inset-0 -rotate-90" viewBox="0 0 48 48" aria-hidden="true">
            <circle cx="24" cy="24" r={RING_RADIUS} fill="none" stroke="currentColor" strokeOpacity="0.12" strokeWidth="2.5" />
            <circle
              cx="24"
              cy="24"
              r={RING_RADIUS}
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeDasharray={RING_LENGTH}
              strokeDashoffset={RING_LENGTH * (1 - progress)}
              className="transition-[stroke-dashoffset] duration-150"
            />
          </svg>

          {/* A soft halo that breathes on hover. */}
          <span
            className="absolute inset-0 rounded-full bg-[#00b4b8]/25 opacity-0 transition-opacity group-hover:animate-ping group-hover:opacity-100 motion-reduce:hidden"
            aria-hidden="true"
          />

          {/* Clipped, so the arrow can shoot out of the top and come back in from below. */}
          <span className="relative flex size-6 items-center justify-center overflow-hidden">
            <ArrowUp
              className={cn(
                "size-5 transition-transform duration-200 group-hover:-translate-y-0.5",
                launching && "animate-arrow-launch",
              )}
              strokeWidth={2.5}
              aria-hidden="true"
            />
          </span>

          <span className="pointer-events-none absolute right-full mr-3 hidden whitespace-nowrap rounded-full bg-[#10141a] px-3 py-1 text-xs font-semibold text-white opacity-0 shadow-lg transition-all duration-200 group-hover:-translate-x-1 group-hover:opacity-100 sm:block">
            Back to top
          </span>
        </button>
      </div>
    </div>
  )
}
