import { useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { Link } from "react-router"
import { X } from "lucide-react"
import { GiftIcon } from "@/components/cowry/GiftIcon"
import { giftColor, type GiftLike } from "@/components/cowry/giftIcons"
import { IconRain, RAIN_MS } from "@/components/cowry/CowryRain"
import { CowryIcon } from "@/components/cowry/CowryIcon"
import { cn } from "@/lib/utils"
import { Routes } from "@/routes/constants"
import { formatCowries } from "@/utils/careconnect/cowry"
import { isCowryPathEnabled } from "@/utils/careconnect/cowryPages"
import type { CowryGiftSet } from "@/utils/careconnect/services/cowryService"

/**
 * A gift arriving: its own icon raining down, and a card saying who it is from.
 *
 * The rain scales with what the gift cost — a small gift is a light shower, a big one a
 * downpour with bigger drops — so the moment matches the gesture. Rare and legendary sets
 * get larger drops on top of that.
 *
 * Not a dialog: nothing is blocked and focus is not taken. The card leaves on its own after
 * a few seconds unless the pointer or keyboard is on it, and Esc dismisses it.
 */

export interface GiftSplashData {
  /** Unique per showing, so a second identical gift still rains again. */
  key: string
  gift: GiftLike
  set?: CowryGiftSet | null
  cost: number
  /** "from Ada" on the receiver's side; omitted on the sender's. */
  senderName?: string | null
  /** "to Ada" on the sender's side. */
  recipientName?: string | null
  message?: string | null
  /** Cowries it earned the receiver, when known. */
  creatorAmount?: number | null
  direction: "received" | "sent"
}

/** How long the card stays when left alone. */
const CARD_MS = 7000

/** More Cowries, more rain: roughly 12 drops for a small gift up to 48 for a large one. */
function dropsFor(cost: number) {
  return Math.round(Math.min(48, Math.max(12, 8 + Math.log10(Math.max(1, cost)) * 11)))
}

function sizeRangeFor(cost: number, set?: CowryGiftSet | null): [number, number] {
  const big = set === "rare" || set === "legendary"
  const base = cost >= 1000 ? 26 : cost >= 100 ? 22 : 18
  return big ? [base + 10, base + 36] : [base, base + 24]
}

export function GiftSplash({ data, onDone }: { data: GiftSplashData; onDone: () => void }) {
  const [held, setHeld] = useState(false)
  const [leaving, setLeaving] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const color = giftColor(data.gift)
  const label = data.gift.label || "a gift"

  // Leave after a while, unless someone is reading or pointing at the card.
  useEffect(() => {
    if (held) return
    timer.current = setTimeout(() => setLeaving(true), CARD_MS)
    return () => {
      if (timer.current) clearTimeout(timer.current)
    }
  }, [held])

  useEffect(() => {
    if (!leaving) return
    const done = setTimeout(onDone, 300)
    return () => clearTimeout(done)
  }, [leaving, onDone])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setLeaving(true)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])

  // The rain runs once per gift, whatever the card does.
  const [raining, setRaining] = useState(true)
  const [seed] = useState(() => Date.now())
  useEffect(() => {
    const stop = setTimeout(() => setRaining(false), RAIN_MS + 400)
    return () => clearTimeout(stop)
  }, [])

  const creatorPage = isCowryPathEnabled(Routes.app.user.cowryCreator) ? Routes.app.user.cowryCreator : null

  return (
    <>
      {raining && (
        <IconRain
          seed={seed}
          drops={dropsFor(data.cost)}
          sizeRange={sizeRangeFor(data.cost, data.set)}
          renderDrop={(size) => <GiftIcon gift={data.gift} size={size} />}
        />
      )}

      {createPortal(
        <div
          role="status"
          aria-live="polite"
          onMouseEnter={() => setHeld(true)}
          onMouseLeave={() => setHeld(false)}
          onFocus={() => setHeld(true)}
          onBlur={() => setHeld(false)}
          className={cn(
            "fixed inset-x-4 bottom-[calc(var(--app-bottom-inset,0px)+1.5rem)] z-70 mx-auto max-w-sm overflow-hidden rounded-3xl bg-white p-5 shadow-[0_24px_60px_-18px_rgba(16,20,26,0.45)] ring-1 ring-[#e2e6ea] transition-all duration-300 sm:bottom-[calc(var(--app-bottom-inset,0px)+2rem)]",
            leaving ? "translate-y-6 opacity-0" : "animate-fade-in-up",
          )}
        >
          {/* A wash of the gift's own colour behind its icon. */}
          <div
            className="pointer-events-none absolute inset-x-0 top-0 h-24 opacity-20"
            style={{ background: `radial-gradient(60% 100% at 50% 0%, ${color}, transparent)` }}
            aria-hidden="true"
          />

          <button
            type="button"
            onClick={() => setLeaving(true)}
            aria-label="Dismiss"
            className="absolute right-3 top-3 flex size-8 items-center justify-center rounded-full text-[#657080] transition hover:bg-[#f2f6f8]"
          >
            <X className="size-4" aria-hidden="true" />
          </button>

          <div className="relative flex items-center gap-4">
            <span className="relative flex size-16 shrink-0 items-center justify-center">
              <span
                className="animate-check-ring absolute size-14 rounded-full"
                style={{ backgroundColor: color }}
                aria-hidden="true"
              />
              <span
                className="animate-cowry-pop relative flex size-16 items-center justify-center rounded-full bg-white shadow-[0_8px_20px_-8px_rgba(16,20,26,0.45)] ring-4"
                style={{ ["--tw-ring-color" as string]: `${color}33` }}
              >
                <GiftIcon gift={data.gift} size={36} />
              </span>
            </span>

            <div className="min-w-0 pr-6">
              <p className="text-xs font-semibold uppercase tracking-wide" style={{ color }}>
                {data.direction === "received" ? "You got a gift" : "Gift sent"}
              </p>
              <p className="mt-0.5 text-base font-bold leading-snug text-[#151922]">
                {data.direction === "received"
                  ? `${data.senderName || "Someone"} sent you ${label}`
                  : `${label} is on its way${data.recipientName ? ` to ${data.recipientName}` : ""}`}
              </p>
              {data.direction === "received" && (data.creatorAmount ?? 0) > 0 && (
                <p className="mt-1 inline-flex items-center gap-1 text-sm font-semibold text-[#1f9c4c]">
                  +<CowryIcon size={14} />
                  {formatCowries(data.creatorAmount)} Creator Cowries
                </p>
              )}
            </div>
          </div>

          {data.message && (
            <p className="relative mt-3 rounded-2xl bg-[#f7f9fb] px-4 py-2.5 text-sm italic text-[#383d45]">
              &ldquo;{data.message}&rdquo;
            </p>
          )}

          {data.direction === "received" && creatorPage && (
            <Link
              to={creatorPage}
              onClick={() => setLeaving(true)}
              className="relative mt-3 inline-flex text-sm font-semibold text-[#00868a] hover:underline"
            >
              See your gifts →
            </Link>
          )}
        </div>,
        document.body,
      )}
    </>
  )
}
