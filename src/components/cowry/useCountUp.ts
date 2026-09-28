import { useEffect, useRef, useState } from "react"

function prefersReducedMotion() {
  try {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches
  } catch {
    return false
  }
}

/**
 * A number that counts to its value instead of appearing at it.
 *
 * Starts from zero on first render and from the previous value on every change after, so a
 * balance going 1,200 → 1,320 ticks up by 120 rather than restarting. Ease-out, so it lands
 * gently. Reduced motion gets the final number straight away.
 */
export function useCountUp(target: number, durationMs = 900): number {
  const [value, setValue] = useState(0)
  const from = useRef(0)

  useEffect(() => {
    const start = from.current
    if (start === target || prefersReducedMotion() || typeof requestAnimationFrame === "undefined") {
      from.current = target
      setValue(target)
      return
    }

    let raf = 0
    const began = performance.now()
    const tick = (now: number) => {
      const t = Math.min(1, (now - began) / durationMs)
      const eased = 1 - Math.pow(1 - t, 3)
      const next = Math.round(start + (target - start) * eased)
      setValue(next)
      from.current = next
      if (t < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [target, durationMs])

  return value
}
