import { useEffect, useRef, useState } from "react"
import { useLocation, useNavigation } from "react-router"

/**
 * Thin top-of-viewport progress bar shown on every route transition.
 *
 * `useNavigation().state` only turns "loading" for a meaningful stretch when
 * there's real async work (slow network, an uncached chunk) — React Router
 * batches fast, loader-less transitions through `startTransition`, so on a
 * warm cache the state can flip loading→idle without ever painting. Relying
 * on that alone is why a Suspense-only preloader can look like it "never
 * shows up". To guarantee visibility on every page change, this also flashes
 * a brief completion bar on every committed `location.key` change, independent
 * of how long (if at all) the navigation was actually pending.
 */
export function RouteProgressBar() {
  const location = useLocation()
  const navigation = useNavigation()
  const [progress, setProgress] = useState(0)
  const [visible, setVisible] = useState(false)
  const growIntervalRef = useRef<number | undefined>(undefined)
  const hideTimerRef = useRef<number | undefined>(undefined)
  const isFirstRender = useRef(true)

  // Grows while a navigation is genuinely pending (uncached chunk / slow network).
  useEffect(() => {
    if (navigation.state === "idle") return
    setVisible(true)
    setProgress((current) => Math.max(current, 15))
    growIntervalRef.current = window.setInterval(() => {
      setProgress((current) => (current >= 85 ? current : current + (85 - current) * 0.15))
    }, 180)
    return () => window.clearInterval(growIntervalRef.current)
  }, [navigation.state])

  // Guaranteed brief flash on every committed route change, so the bar is
  // visible even when the transition was too fast for `navigation.state` to
  // ever visibly report "loading".
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }
    window.clearInterval(growIntervalRef.current)
    window.clearTimeout(hideTimerRef.current)
    setVisible(true)
    setProgress(100)
    hideTimerRef.current = window.setTimeout(() => {
      setVisible(false)
      setProgress(0)
    }, 300)
    return () => window.clearTimeout(hideTimerRef.current)
  }, [location.key])

  if (!visible) return null

  return (
    <div aria-hidden className="fixed inset-x-0 top-0 z-[60] h-0.5 bg-transparent">
      <div className="h-full bg-[#00b4b8] transition-[width] duration-200 ease-out" style={{ width: `${progress}%` }} />
    </div>
  )
}
