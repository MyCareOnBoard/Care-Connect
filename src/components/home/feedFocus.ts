import { useSyncExternalStore, type CSSProperties } from "react"

/**
 * Focus mode for the feed.
 *
 * Hides the two side columns and centres the feed at a comfortable reading width, with the
 * columns sliding away rather than blinking out. Only laptop-width screens and up have side columns (lg,
 * 1024px up) — below that they already stack under the feed — so focus mode only exists
 * there. The choice is remembered per browser.
 *
 * The columns animate because both layouts are written as the same three plain tracks
 * (lengths and percentages, no `minmax`/`fr`), which the browser can interpolate between:
 *
 *   normal  side   | rest of the width | side   (sides 248px on a small laptop, up to 332/326)
 *   focus   empty  | 760px, centred    | empty
 *
 * Built so the collapsed side tracks can later hold slim icon strips instead of nothing.
 */

const STORAGE_KEY = "careconnect-feed-focus"
// Laptop width and up (1024px). Tablets and phones stack the columns instead.
const WIDE_QUERY = "(min-width: 64rem)"

/** Reading width for the feed in focus mode. */
export const FOCUS_FEED_WIDTH = 760

/** Matches the grid's gap-5 (20px), which both layouts keep. */
const GAP = 20

/**
 * The side columns scale with the screen — 248px on a 1024px laptop, their full 332/326px
 * on wider ones — so the feed keeps a readable width at every laptop size.
 */
const LEFT = "clamp(248px, 24vw, 332px)"
const RIGHT = "clamp(248px, 24vw, 326px)"
const NORMAL_COLUMNS = `${LEFT} calc(100% - ${LEFT} - ${RIGHT} - ${GAP * 2}px) ${RIGHT}`
const FOCUS_COLUMNS = `calc(50% - ${FOCUS_FEED_WIDTH / 2 + GAP}px) ${FOCUS_FEED_WIDTH}px calc(50% - ${FOCUS_FEED_WIDTH / 2 + GAP}px)`

/* ── the saved choice ─────────────────────────────────────────────────── */

const listeners = new Set<() => void>()

function readSaved(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === "1"
  } catch {
    return false
  }
}

let focused = typeof window === "undefined" ? false : readSaved()

export function setFeedFocus(next: boolean): void {
  if (focused === next) return
  focused = next
  try {
    localStorage.setItem(STORAGE_KEY, next ? "1" : "0")
  } catch {
    // Storage blocked: focus still works for this visit.
  }
  listeners.forEach((listener) => listener())
}

export function toggleFeedFocus(): void {
  setFeedFocus(!focused)
}

function subscribeFocus(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/* ── is the screen wide enough to have side columns? ─────────────────── */

function subscribeWide(listener: () => void) {
  const query = window.matchMedia(WIDE_QUERY)
  query.addEventListener("change", listener)
  return () => query.removeEventListener("change", listener)
}

function readWide() {
  return typeof window !== "undefined" && window.matchMedia(WIDE_QUERY).matches
}

/* ── the hook the dashboards use ──────────────────────────────────────── */

export interface FeedFocus {
  /** The saved choice. */
  focused: boolean
  /** Whether focus mode is actually in effect: saved *and* the screen has side columns. */
  active: boolean
  /** Whether the toggle should be offered at all. */
  available: boolean
  /** Spread onto the three-column grid. */
  grid: { className: string; style: CSSProperties }
  /** Spread onto each side column; it slides toward its own edge as it fades. */
  aside: (side: "left" | "right") => { className: string; inert?: boolean }
}

export function useFeedFocus(): FeedFocus {
  const saved = useSyncExternalStore(subscribeFocus, () => focused, () => false)
  const wide = useSyncExternalStore(subscribeWide, readWide, () => false)
  const active = saved && wide

  return {
    focused: saved,
    active,
    available: wide,
    grid: {
      className:
        "lg:grid-cols-[var(--feed-columns)] lg:transition-[grid-template-columns] lg:duration-500 lg:ease-[cubic-bezier(0.4,0,0.2,1)] motion-reduce:transition-none",
      style: { "--feed-columns": active ? FOCUS_COLUMNS : NORMAL_COLUMNS } as CSSProperties,
    },
    aside: (side) => ({
      // Fades and slides toward its own edge as its track shrinks. `invisible` lands at the
      // end of the fade, so the columns never flash off before they have moved.
      className: [
        "transition-[opacity,translate,visibility] duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] motion-reduce:transition-none",
        active
          ? `lg:pointer-events-none lg:invisible lg:opacity-0 ${side === "left" ? "lg:-translate-x-8" : "lg:translate-x-8"}`
          : "",
      ].join(" "),
      // Out of the tab order and hidden from screen readers while it is out of sight.
      inert: active || undefined,
    }),
  }
}
