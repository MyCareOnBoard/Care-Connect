import { useEffect, useState } from "react"
import { Link } from "react-router"
import { Trophy, X } from "lucide-react"
import { CowryIcon } from "@/components/cowry/CowryIcon"
import { GiftIcon } from "@/components/cowry/GiftIcon"
import type { CareFlow } from "@/components/app/useCareFlow"
import { Routes } from "@/routes/constants"
import { formatCowries } from "@/utils/careconnect/cowry"
import { listTopGifts, type CowryTopGift } from "@/utils/careconnect/services/cowryService"

/**
 * The top of the homepage: the five biggest gifts sent recently, scrolling past like a
 * ticker — "Ada sent Tunde a Golden Crown · 5,000".
 *
 * Seeing generous gifts is what makes people want to send one, so it runs across everyone's
 * homepage, members and providers alike. It shows only real gifts from the top-gifts
 * endpoint and stays hidden when there are none (or the endpoint is not there yet) — a
 * ticker of made-up gifts would be worse than no ticker.
 *
 * Pauses under the pointer so a name can be read and tapped; still, not scrolling, under
 * reduced motion. Dismissable for the rest of the session.
 */

const REFRESH_MS = 5 * 60 * 1000
const DISMISS_KEY = "careconnect-gift-marquee-dismissed"
const PREVIEW_EVENT = "careconnect:top-gifts-preview"

function Item({ gift, rank, viewProfile }: { gift: CowryTopGift; rank: number; viewProfile: (uid: string) => string }) {
  return (
    <span className="flex shrink-0 items-center gap-2 px-5 text-sm">
      <span className="flex size-5 items-center justify-center rounded-full bg-white/15 text-[11px] font-bold text-[#ffe7a8]">
        {rank}
      </span>
      <GiftIcon gift={{ id: gift.giftId, label: gift.giftLabel, icon: gift.giftIcon }} size={20} />
      <span className="whitespace-nowrap text-white/90">
        <Link to={viewProfile(gift.senderId)} className="font-semibold text-white hover:underline">
          {gift.senderName || "Someone"}
        </Link>{" "}
        sent{" "}
        <Link to={viewProfile(gift.recipientId)} className="font-semibold text-white hover:underline">
          {gift.recipientName || "a member"}
        </Link>{" "}
        {/^[aeiou]/i.test(gift.giftLabel) ? "an" : "a"} <span className="font-semibold text-[#ffe7a8]">{gift.giftLabel}</span>
      </span>
      <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-black/20 px-2 py-0.5 text-xs font-bold text-[#ffe7a8]">
        <CowryIcon size={13} />
        {formatCowries(gift.cost)}
      </span>
      <span className="pl-3 text-white/30" aria-hidden="true">
        ✦
      </span>
    </span>
  )
}

export function GiftMarquee({ flow }: { flow: CareFlow }) {
  const [gifts, setGifts] = useState<CowryTopGift[]>([])
  const [dismissed, setDismissed] = useState(() => {
    try {
      return sessionStorage.getItem(DISMISS_KEY) === "1"
    } catch {
      return false
    }
  })
  const viewProfile = flow === "agency" ? Routes.app.agency.viewProfile : Routes.app.user.viewProfile

  useEffect(() => {
    if (dismissed) return
    let active = true
    const load = () =>
      listTopGifts({ limit: 5 })
        .then((top) => {
          // Already ranked by cost and already capped by the endpoint, so taken as given
          // rather than re-sorted — the server also breaks ties on recency, which a sort
          // here would undo.
          if (active) setGifts(top.gifts)
        })
        .catch(() => {
          // No endpoint yet, or it failed: stay hidden rather than show anything invented.
        })
    void load()
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") void load()
    }, REFRESH_MS)
    // Development preview: see previewTopGifts() at the bottom of this file.
    const onPreview = (event: Event) => setGifts((event as CustomEvent<CowryTopGift[]>).detail ?? [])
    window.addEventListener(PREVIEW_EVENT, onPreview)
    return () => {
      active = false
      window.clearInterval(timer)
      window.removeEventListener(PREVIEW_EVENT, onPreview)
    }
  }, [dismissed])

  if (dismissed || gifts.length === 0) return null

  const dismiss = () => {
    setDismissed(true)
    try {
      sessionStorage.setItem(DISMISS_KEY, "1")
    } catch {
      // Not remembered; it returns on the next page load.
    }
  }

  // The list is drawn twice, end to end, and the track slides by exactly one copy — so the
  // loop is seamless. Longer lists take longer to pass, keeping the reading speed the same.
  const items = gifts.map((gift, index) => <Item key={gift.id} gift={gift} rank={index + 1} viewProfile={viewProfile} />)
  const duration = `${Math.max(18, gifts.length * 7)}s`

  return (
    <div
      role="region"
      aria-label="Top gifts this week"
      className="relative z-30 flex h-10 items-center overflow-hidden bg-[linear-gradient(90deg,#3a2508_0%,#7a5310_30%,#a8793f_50%,#7a5310_70%,#3a2508_100%)] text-white shadow-[inset_0_-1px_0_rgba(255,255,255,0.12)]"
    >
      <span className="relative z-10 flex h-full shrink-0 items-center gap-1.5 bg-[#2a1a05]/85 pl-3 pr-4 text-xs font-bold uppercase tracking-wide text-[#ffe7a8] shadow-[6px_0_12px_-4px_rgba(0,0,0,0.5)] backdrop-blur">
        <Trophy className="size-4" aria-hidden="true" />
        <span className="hidden sm:inline">Top gifts</span>
      </span>

      <div className="group relative min-w-0 flex-1 overflow-hidden">
        {/* Soft fades at both edges, so items glide in and out rather than being cut. */}
        <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-8 bg-linear-to-r from-[#5a3b0c] to-transparent" aria-hidden="true" />
        <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-8 bg-linear-to-l from-[#5a3b0c] to-transparent" aria-hidden="true" />
        <div className="gift-marquee-track flex w-max group-hover:[animation-play-state:paused] group-focus-within:[animation-play-state:paused]" style={{ animationDuration: duration }}>
          <div className="flex">{items}</div>
          {/* The second copy is for the loop only; screen readers get the list once. */}
          <div className="flex" aria-hidden="true">
            {gifts.map((gift, index) => (
              <Item key={`${gift.id}-copy`} gift={gift} rank={index + 1} viewProfile={viewProfile} />
            ))}
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={dismiss}
        aria-label="Hide top gifts"
        className="relative z-10 flex h-full shrink-0 items-center bg-[#2a1a05]/85 px-3 text-[#ffe7a8]/80 transition hover:text-white"
      >
        <X className="size-4" aria-hidden="true" />
      </button>
    </div>
  )
}

// Development only: `previewTopGifts()` in the browser console fills the ticker with sample
// gifts, so the look can be checked before the endpoint exists. Never runs in production.
if (import.meta.env.DEV && typeof window !== "undefined") {
  ;(window as unknown as { previewTopGifts: () => void }).previewTopGifts = () => {
    const sample = (id: string, giftLabel: string, cost: number, sender: string, recipient: string): CowryTopGift => ({
      id,
      giftId: id,
      giftLabel,
      giftSet: cost >= 2000 ? "legendary" : "rare",
      cost,
      senderId: `${id}-s`,
      senderName: sender,
      recipientId: `${id}-r`,
      recipientName: recipient,
    })
    window.dispatchEvent(
      new CustomEvent(PREVIEW_EVENT, {
        detail: [
          sample("g1", "Golden Crown", 5000, "Preview Ada", "Preview Tunde"),
          sample("g2", "Diamond", 3500, "Preview Kemi", "Preview Musa"),
          sample("g3", "Rose Bouquet", 1200, "Preview Ife", "Preview Grace"),
          sample("g4", "Stethoscope", 800, "Preview Obi", "Preview Chidi"),
          sample("g5", "Cowry Shell", 500, "Preview Sade", "Preview Emeka"),
        ],
      }),
    )
  }
}
