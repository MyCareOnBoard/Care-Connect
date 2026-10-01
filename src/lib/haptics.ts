/**
 * A small physical response on phones — the tick a native app gives when you like
 * something or a post goes up.
 *
 * Silently does nothing where vibration is not supported (desktop, iOS Safari) or when the
 * person has asked for reduced motion. Never used to signal an error: a buzz for "that
 * failed" is alarming, and the message on screen already says it.
 */

const PATTERNS = {
  /** A light tap: a like, a toggle. */
  tap: 12,
  /** Something went through: a post published, a gift sent. */
  success: [14, 60, 22],
} as const

export function haptic(kind: keyof typeof PATTERNS = "tap"): void {
  try {
    if (typeof navigator === "undefined" || typeof navigator.vibrate !== "function") return
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return
    navigator.vibrate(PATTERNS[kind] as number | number[])
  } catch {
    // Vibration is a nicety; nothing depends on it.
  }
}
