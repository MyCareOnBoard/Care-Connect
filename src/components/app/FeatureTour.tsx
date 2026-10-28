import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { useSearchParams } from "react-router"
import { X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useAuthUser } from "@/utils/auth"
import { preferenceStorage } from "@/lib/consent"

/**
 * A short tour of how to use CareConnect, shown once and replayable from the account menu
 * ("Take the tour", which opens home with `?tour=1`).
 *
 * Each step points at a real control on the page — marked with `data-tour="<id>"` — dims
 * everything else, and says in a line or two what it does and how to use it. Steps whose
 * control is not on screen (the phone tab bar on a desktop, focus mode on a phone, Cowries
 * for an account without them) are skipped, so nobody is shown something they cannot see.
 * Finishing or skipping is remembered per member, per browser.
 *
 * Bump TOUR_VERSION to show it again after a round of new features.
 */

const TOUR_VERSION = 2
const START_DELAY_MS = 1200

interface Step {
  /** The `data-tour` id of the control it points at. */
  id: string
  title: string
  body: string
}

/** In the order someone would use them: post, react, find people, talk, work, earn, settle in. */
const STEPS: Step[] = [
  {
    id: "compose",
    title: "Share something",
    body: "Write an update, add photos or a video, and type @ to mention someone. Posts can earn you Cowries.",
  },
  { id: "tabbar-post", title: "Post from anywhere", body: "On your phone, the + opens the composer from any page." },
  {
    id: "treasure",
    title: "Send a treasure",
    body: "Like a post a lot? Tap Treasure under it to send a gift paid in Cowries. Pick one, add a message, and they get a celebration.",
  },
  { id: "search", title: "Find anyone", body: "Search people, providers and jobs from any page. Press / to jump straight in." },
  {
    id: "nav-mynetwork",
    title: "Grow your network",
    body: "Accept linkup requests, see your linkups and find people you may know — each in its own tab.",
  },
  {
    id: "nav-network",
    title: "Grow your network",
    body: "Accept linkup requests, see your linkups and find people you may know — each in its own tab.",
  },
  {
    id: "nav-messages",
    title: "Message people",
    body: "Chat one-to-one and share photos and files. On a phone, swipe a conversation left to delete it or right to mark it read.",
  },
  {
    id: "nav-jobs",
    title: "Jobs",
    body: "Filter by type, pay or what's new, save a search to reuse it, and apply in a few taps. Agencies post jobs and review applicants here.",
  },
  {
    id: "nav-marketplace",
    title: "Marketplace",
    body: "Browse equipment, courses and services, filter by price, and message a seller. List your own with Add product.",
  },
  {
    id: "cowry",
    title: "Your Cowries",
    body: "Earn Cowries for taking part, then redeem them for mobile data or cash out to a bank or mobile money account. Tap here for your wallet and history.",
  },
  { id: "notifications", title: "Stay in the loop", body: "Linkups, messages, treasures and job updates arrive here." },
  {
    id: "account",
    title: "Your account",
    body: "Your profile, settings, privacy and cookie choices, light or dark mode — and this tour, any time you want it again.",
  },
  { id: "focus", title: "Focus on posts", body: "Fold the side columns away and read the feed on its own. Press F to switch." },
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
  const [searchParams, setSearchParams] = useSearchParams()
  const replay = searchParams.get("tour") === "1"
  const replayRequested = useRef(false)

  // Start once, a moment after the page has settled, if this member has not seen it.
  useEffect(() => {
    if (!uid) return
    if (replay) {
      // Asked for. Note it, then clear the flag from the address (so a refresh does not start
      // it again); this effect runs again once the flag is gone, and starts the tour then.
      replayRequested.current = true
      setSearchParams(
        (current) => {
          const next = new URLSearchParams(current)
          next.delete("tour")
          return next
        },
        { replace: true },
      )
      return
    }
    if (!replayRequested.current) {
      try {
        // Kept for good only with preference consent; otherwise for this browser session, so
        // declining preferences does not mean seeing the tour on every visit.
        if (localStorage.getItem(storageKey(uid)) || sessionStorage.getItem(storageKey(uid))) return
      } catch {
        return // No storage means it could not be remembered; better not to show it every time.
      }
    }
    replayRequested.current = false
    setIndex(0)
    const timer = setTimeout(() => {
      const available = STEPS.filter((step) => findAnchor(step.id)).filter(
        (step, i, list) => list.findIndex((other) => other.title === step.title) === i,
      )
      if (available.length) setSteps(available)
    }, START_DELAY_MS)
    return () => clearTimeout(timer)
    // setSearchParams is stable enough here; the tour starts once per arrival.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid, replay])

  const finish = useCallback(() => {
    setSteps([])
    try {
      if (uid) {
        preferenceStorage.setItem(storageKey(uid), "done")
        sessionStorage.setItem(storageKey(uid), "done")
      }
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
            Tour · {index + 1} of {steps.length}
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
