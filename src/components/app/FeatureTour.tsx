import { useCallback, useEffect, useLayoutEffect, useState } from "react"
import { createPortal } from "react-dom"
import { X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useAuthUser } from "@/utils/auth"

/**
 * A short, one-time tour of what is new.
 *
 * Each step points at a real control on the page — marked with `data-tour="<id>"` — dims
 * everything else, and says in one line what it does. Steps whose control is not on screen
 * (the phone tab bar on a desktop, focus mode on a phone) are skipped, so nobody is shown
 * something they cannot see. Finishing or skipping is remembered per member, per browser.
 *
 * Bump TOUR_VERSION to show it again after a round of new features.
 */

const TOUR_VERSION = 1
const START_DELAY_MS = 1200

interface Step {
  id: string
  title: string
  body: string
}

const STEPS: Step[] = [
  { id: "compose", title: "Share something", body: "Post an update, a photo or a win. Type @ to mention someone — posts can earn you Cowries." },
  { id: "search", title: "Find anyone", body: "Search people, providers and jobs from any page. Press / to jump straight in." },
  { id: "cowry", title: "Your Cowries", body: "Your balance lives here. Tap it to see the full picture and what you can do with them." },
  { id: "focus", title: "Focus on posts", body: "Fold the side columns away and read the feed on its own. Press F to switch." },
  { id: "tabbar-post", title: "Post from anywhere", body: "The + opens the composer from any page." },
]

const storageKey = (uid: string) => `careconnect-tour-v${TOUR_VERSION}:${uid}`

/** The first element for a step that is actually on screen. */
function findAnchor(id: string): HTMLElement | null {
  const candidates = document.querySelectorAll<HTMLElement>(`[data-tour="${id}"]`)
  for (const el of candidates) {
    const rect = el.getBoundingClientRect()
    if (rect.width > 0 && rect.height > 0 && getComputedStyle(el).visibility !== "hidden") return el
  }
  return null
}

export function FeatureTour() {
  const { user } = useAuthUser()
  const uid = user?.uid
  const [steps, setSteps] = useState<Step[]>([])
  const [index, setIndex] = useState(0)
  const [rect, setRect] = useState<DOMRect | null>(null)

  // Start once, a moment after the page has settled, if this member has not seen it.
  useEffect(() => {
    if (!uid) return
    try {
      if (localStorage.getItem(storageKey(uid))) return
    } catch {
      return // No storage means it could not be remembered; better not to show it every time.
    }
    const timer = setTimeout(() => {
      const available = STEPS.filter((step) => findAnchor(step.id))
      if (available.length) setSteps(available)
    }, START_DELAY_MS)
    return () => clearTimeout(timer)
  }, [uid])

  const finish = useCallback(() => {
    setSteps([])
    try {
      if (uid) localStorage.setItem(storageKey(uid), "done")
    } catch {
      // Not remembered; it may show once more.
    }
  }, [uid])

  const step = steps[index]

  // Keep the spotlight on its control through scrolling and resizing.
  useLayoutEffect(() => {
    if (!step) return
    const anchor = findAnchor(step.id)
    if (!anchor) {
      setRect(null)
      return
    }
    anchor.scrollIntoView({ block: "center", behavior: "smooth" })
    const update = () => setRect(anchor.getBoundingClientRect())
    update()
    const timer = setTimeout(update, 350)
    window.addEventListener("resize", update)
    window.addEventListener("scroll", update, { passive: true })
    return () => {
      clearTimeout(timer)
      window.removeEventListener("resize", update)
      window.removeEventListener("scroll", update)
    }
  }, [step])

  useEffect(() => {
    if (!step) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") finish()
      else if (event.key === "ArrowRight" || event.key === "Enter") {
        if (index < steps.length - 1) setIndex(index + 1)
        else finish()
      } else if (event.key === "ArrowLeft" && index > 0) setIndex(index - 1)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [step, index, steps.length, finish])

  if (!step || !rect) return null

  const pad = 8
  const hole = {
    top: rect.top - pad,
    left: rect.left - pad,
    width: rect.width + pad * 2,
    height: rect.height + pad * 2,
  }
  // The card goes below the control if there is room, otherwise above it.
  const below = hole.top + hole.height + 200 < window.innerHeight
  const cardWidth = Math.min(320, window.innerWidth - 32)
  const cardLeft = Math.min(Math.max(16, rect.left + rect.width / 2 - cardWidth / 2), window.innerWidth - cardWidth - 16)
  const last = index === steps.length - 1

  return createPortal(
    <div className="fixed inset-0 z-[80]" role="dialog" aria-modal="true" aria-label={`Tour: ${step.title}`}>
      {/* Everything dims except the control being shown — the huge shadow is the dimming. */}
      <div
        className="pointer-events-none absolute rounded-2xl ring-2 ring-[#00b4b8] transition-all duration-300 ease-out"
        style={{ ...hole, boxShadow: "0 0 0 9999px rgba(12, 16, 22, 0.6)" }}
        aria-hidden="true"
      />
      {/* Clicking the dim area is the same as skipping. */}
      <button type="button" className="absolute inset-0 cursor-default" aria-label="Skip the tour" onClick={finish} tabIndex={-1} />

      <div
        key={step.id}
        className="animate-fade-in-up absolute rounded-2xl bg-white p-4 shadow-[0_24px_60px_-20px_rgba(0,0,0,0.6)]"
        style={{
          width: cardWidth,
          left: cardLeft,
          ...(below ? { top: hole.top + hole.height + 12 } : { bottom: window.innerHeight - hole.top + 12 }),
        }}
      >
        <div className="flex items-start justify-between gap-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#00898c]">
            New · {index + 1} of {steps.length}
          </p>
          <button type="button" onClick={finish} aria-label="Close the tour" className="-mr-1 -mt-1 flex size-7 items-center justify-center rounded-full text-[#657080] hover:bg-[#f2f6f8]">
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>
        <h2 className="mt-1 text-base font-bold text-[#151922]">{step.title}</h2>
        <p className="mt-1 text-sm leading-relaxed text-[#4a5260]">{step.body}</p>

        <div className="mt-4 flex items-center justify-between gap-3">
          <div className="flex gap-1.5" aria-hidden="true">
            {steps.map((item, i) => (
              <span key={item.id} className={cn("h-1.5 rounded-full transition-all", i === index ? "w-5 bg-[#00b4b8]" : "w-1.5 bg-[#d7dde3]")} />
            ))}
          </div>
          <div className="flex items-center gap-2">
            {index > 0 ? (
              <Button type="button" variant="ghost" size="sm" onClick={() => setIndex(index - 1)} className="h-9 px-3">
                Back
              </Button>
            ) : (
              <Button type="button" variant="ghost" size="sm" onClick={finish} className="h-9 px-3 text-[#657080]">
                Skip
              </Button>
            )}
            <Button type="button" size="sm" onClick={() => (last ? finish() : setIndex(index + 1))} className="h-9 rounded-full px-4">
              {last ? "Got it" : "Next"}
            </Button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  )
}
