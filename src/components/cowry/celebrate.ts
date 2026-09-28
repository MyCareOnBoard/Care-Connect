import confetti from "canvas-confetti"

/**
 * Cowry celebrations.
 *
 * Reserved for moments the server has confirmed — data delivered, Cowries credited, a gift
 * landed, money sent. A celebration on tap is a promise the backend may not keep.
 *
 * The shapes are shell-shaped ovals in ivory and gold, with a little brand teal, so the
 * confetti reads as Cowries raining down rather than a generic party. Everything respects
 * reduced motion: canvas-confetti skips itself when asked to.
 */

const COWRY_COLORS = ["#fff8e8", "#f3dfb3", "#e0b872", "#c8963e", "#00b4b8", "#0d8de0"]

let shellShape: confetti.Shape | null | undefined

/** Built lazily: Path2D does not exist in every environment this module is imported in. */
function shell(): confetti.Shape | null {
  if (shellShape !== undefined) return shellShape
  try {
    shellShape = confetti.shapeFromPath({
      path: "M6 0C9.6 0 12 3.6 12 8.5S9.6 17 6 17 0 13.4 0 8.5 2.4 0 6 0Z",
    })
  } catch {
    shellShape = null
  }
  return shellShape
}

function fire(options: confetti.Options) {
  try {
    const shape = shell()
    void confetti({
      colors: COWRY_COLORS,
      disableForReducedMotion: true,
      zIndex: 80,
      ...(shape ? { shapes: [shape, "circle"] } : {}),
      ...options,
    })
  } catch {
    // Confetti is decoration. A canvas that will not draw must never break the flow.
  }
}

export type CelebrationSize = "small" | "burst" | "shower"

/**
 * Throw Cowries.
 *
 * `small` is a pop from one point (a gift sent, a streak ticked). `burst` is the standard
 * success. `shower` is the big one — first reward reached, money credited — and runs for
 * a little over a second from both sides.
 */
export function celebrateCowries(size: CelebrationSize = "burst", origin = { x: 0.5, y: 0.55 }) {
  if (typeof window === "undefined") return

  if (size === "small") {
    fire({ particleCount: 40, spread: 70, startVelocity: 32, scalar: 0.9, origin })
    return
  }

  if (size === "burst") {
    fire({ particleCount: 90, spread: 100, startVelocity: 42, scalar: 1.1, origin })
    setTimeout(() => fire({ particleCount: 50, spread: 140, startVelocity: 28, scalar: 0.8, origin }), 180)
    return
  }

  const end = Date.now() + 1200
  const frame = () => {
    fire({ particleCount: 4, angle: 60, spread: 60, origin: { x: 0, y: 0.7 }, scalar: 1.1 })
    fire({ particleCount: 4, angle: 120, spread: 60, origin: { x: 1, y: 0.7 }, scalar: 1.1 })
    if (Date.now() < end) requestAnimationFrame(frame)
  }
  frame()
}

/**
 * Celebrate once per key per browser session.
 *
 * For milestones seen on load (a streak already earned, a first reward within reach), so
 * revisiting the page does not throw confetti every time.
 */
export function celebrateOnce(key: string, size: CelebrationSize = "burst") {
  const storageKey = `cowry:celebrated:${key}`
  try {
    if (sessionStorage.getItem(storageKey)) return
    sessionStorage.setItem(storageKey, "1")
  } catch {
    // Storage unavailable: celebrate anyway, it is only confetti.
  }
  celebrateCowries(size)
}

/** Where on screen an element is, as confetti's 0..1 origin. */
export function originOf(element: Element | null | undefined) {
  if (!element || typeof window === "undefined") return { x: 0.5, y: 0.55 }
  const rect = element.getBoundingClientRect()
  return {
    x: (rect.left + rect.width / 2) / window.innerWidth,
    y: (rect.top + rect.height / 2) / window.innerHeight,
  }
}
