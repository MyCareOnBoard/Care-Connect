import { useEffect, useRef, useState } from "react"
import { RefreshCw } from "lucide-react"
import { cn } from "@/lib/utils"

/**
 * Pull down from the top of the page to refresh — the gesture every phone feed has.
 *
 * Touch only, and only when the page is already scrolled to the very top, so it never
 * fights ordinary scrolling. Pull past the threshold and let go to refresh; a shorter pull
 * springs back. The indicator hangs just under the header and spins while refreshing.
 */

/** How far to pull, in pixels, before letting go refreshes. */
const THRESHOLD = 72
/** Pulling feels heavier the further it goes. */
const RESISTANCE = 0.45
const MAX_PULL = 120

export function PullToRefresh({ onRefresh }: { onRefresh: () => Promise<unknown> }) {
  const [pull, setPull] = useState(0)
  const [refreshing, setRefreshing] = useState(false)
  const start = useRef<number | null>(null)
  const pullRef = useRef(0)
  const refreshingRef = useRef(false)
  const onRefreshRef = useRef(onRefresh)
  onRefreshRef.current = onRefresh

  useEffect(() => {
    const onStart = (event: TouchEvent) => {
      if (refreshingRef.current || window.scrollY > 0 || event.touches.length !== 1) return
      start.current = event.touches[0].clientY
    }
    const onMove = (event: TouchEvent) => {
      if (start.current === null) return
      const distance = event.touches[0].clientY - start.current
      if (distance <= 0 || window.scrollY > 0) {
        start.current = null
        pullRef.current = 0
        setPull(0)
        return
      }
      const next = Math.min(MAX_PULL, distance * RESISTANCE)
      pullRef.current = next
      setPull(next)
    }
    const onEnd = () => {
      if (start.current === null) return
      start.current = null
      const reached = pullRef.current >= THRESHOLD * RESISTANCE * 2
      pullRef.current = 0
      setPull(0)
      if (!reached) return
      refreshingRef.current = true
      setRefreshing(true)
      void onRefreshRef.current().finally(() => {
        refreshingRef.current = false
        setRefreshing(false)
      })
    }

    window.addEventListener("touchstart", onStart, { passive: true })
    window.addEventListener("touchmove", onMove, { passive: true })
    window.addEventListener("touchend", onEnd)
    window.addEventListener("touchcancel", onEnd)
    return () => {
      window.removeEventListener("touchstart", onStart)
      window.removeEventListener("touchmove", onMove)
      window.removeEventListener("touchend", onEnd)
      window.removeEventListener("touchcancel", onEnd)
    }
  }, [])

  const threshold = THRESHOLD * RESISTANCE * 2
  const progress = Math.min(1, pull / threshold)
  const visible = pull > 4 || refreshing

  return (
    <div
      className={cn(
        "pointer-events-none fixed inset-x-0 top-18 z-20 flex justify-center transition-opacity duration-200 lg:hidden",
        visible ? "opacity-100" : "opacity-0",
      )}
      style={{ transform: `translateY(${refreshing ? 20 : pull * 0.6}px)` }}
      aria-live="polite"
    >
      <span className="flex size-10 items-center justify-center rounded-full bg-white shadow-[0_8px_20px_-8px_rgba(16,20,26,0.45)] ring-1 ring-[#e2e6ea]">
        <RefreshCw
          className={cn("size-5 text-[#00b4b8]", refreshing && "animate-spin")}
          style={refreshing ? undefined : { transform: `rotate(${progress * 270}deg)`, opacity: 0.4 + progress * 0.6 }}
          aria-hidden="true"
        />
        <span className="sr-only">{refreshing ? "Refreshing the feed" : ""}</span>
      </span>
    </div>
  )
}
