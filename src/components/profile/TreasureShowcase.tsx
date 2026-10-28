import { useEffect, useState } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { GiftIcon } from "@/components/cowry/GiftIcon"
import { TreasureChest } from "@/components/cowry/TreasureChest"
import { cn } from "@/lib/utils"
import { listGifts, type CowryGift } from "@/utils/careconnect/services/cowryService"

/** How many kinds of treasure fit on one page of the shelf (two rows of four). */
const SHELF = 8

type Shelf = { giftId: string; label: string; icon?: string | null; count: number }

/**
 * The treasures you have been sent, one tile per kind with how many of each, most received
 * first. A record of what people valued in your posts — shown only once there is something
 * on the shelf, so a new profile does not open on an empty case.
 */
export function TreasureShowcase() {
  const [gifts, setGifts] = useState<CowryGift[] | null>(null)
  const [page, setPage] = useState(0)

  useEffect(() => {
    let active = true
    listGifts({ direction: "received", limit: 100 })
      .then((rows) => active && setGifts(rows))
      .catch(() => active && setGifts([]))
    return () => {
      active = false
    }
  }, [])

  if (!gifts || gifts.length === 0) return null

  const byKind = new Map<string, Shelf>()
  for (const gift of gifts) {
    const kind = byKind.get(gift.giftId)
    if (kind) kind.count += 1
    else byKind.set(gift.giftId, { giftId: gift.giftId, label: gift.giftLabel, icon: gift.giftIcon, count: 1 })
  }
  const shelf = [...byKind.values()].sort((a, b) => b.count - a.count)
  const senders = new Set(gifts.map((gift) => gift.senderId)).size
  // A full shelf turns over to the next page rather than growing the card.
  const pages = Math.ceil(shelf.length / SHELF)
  const current = Math.min(page, pages - 1)
  const shown = shelf.slice(current * SHELF, current * SHELF + SHELF)

  return (
    <section
      aria-label="Treasures received"
      className="rounded-[24px] bg-white p-5 shadow-[0_12px_40px_-24px_rgba(16,20,26,0.35)] ring-1 ring-[#e2e6ea] sm:p-6"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="inline-flex items-center gap-2 text-base font-bold text-[#151922]">
          <TreasureChest className="size-5 text-[#c0438f]" aria-hidden="true" />
          Treasures received
        </h2>
        <p className="text-sm text-[#657080]">
          <span className="font-bold tabular-nums text-[#151922]">{gifts.length}</span> from {senders}{" "}
          {senders === 1 ? "person" : "people"}
        </p>
      </div>

      <ul key={current} className="animate-fade-in-up mt-4 grid grid-cols-4 gap-2 sm:gap-3">
        {shown.map((item) => (
          <li
            key={item.giftId}
            className="flex flex-col items-center gap-1.5 rounded-2xl bg-[#fdf6fa] px-1 py-3 text-center ring-1 ring-[#f6e1ee]"
          >
            <span className="relative">
              <GiftIcon gift={{ id: item.giftId, label: item.label, icon: item.icon }} size={36} />
              {item.count > 1 && (
                <span className="absolute -right-2.5 -top-1.5 rounded-full bg-[#c0438f] px-1.5 text-[10px] font-bold leading-4 text-white tabular-nums">
                  ×{item.count}
                </span>
              )}
            </span>
            <span className="line-clamp-2 text-[11px] font-medium leading-tight text-[#4a5260]">{item.label}</span>
          </li>
        ))}
      </ul>
      {pages > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <button
            type="button"
            onClick={() => setPage(current - 1)}
            disabled={current === 0}
            aria-label="Previous treasures"
            className="flex size-9 items-center justify-center rounded-full text-[#4a5260] ring-1 ring-[#e2e6ea] transition hover:bg-[#fdf6fa] hover:ring-[#c0438f]/40 active:scale-90 disabled:opacity-35 disabled:hover:bg-transparent disabled:hover:ring-[#e2e6ea]"
          >
            <ChevronLeft className="size-4" aria-hidden="true" />
          </button>
          <div className="flex items-center gap-1.5" aria-live="polite">
            <span className="sr-only">
              Page {current + 1} of {pages}
            </span>
            {Array.from({ length: pages }).map((_, index) => (
              <button
                key={index}
                type="button"
                onClick={() => setPage(index)}
                aria-label={`Page ${index + 1}`}
                aria-current={index === current || undefined}
                className={cn(
                  "h-1.5 rounded-full transition-all",
                  index === current ? "w-5 bg-[#c0438f]" : "w-1.5 bg-[#e6d3df] hover:bg-[#d9a8c6]",
                )}
              />
            ))}
          </div>
          <button
            type="button"
            onClick={() => setPage(current + 1)}
            disabled={current === pages - 1}
            aria-label="Next treasures"
            className="flex size-9 items-center justify-center rounded-full text-[#4a5260] ring-1 ring-[#e2e6ea] transition hover:bg-[#fdf6fa] hover:ring-[#c0438f]/40 active:scale-90 disabled:opacity-35 disabled:hover:bg-transparent disabled:hover:ring-[#e2e6ea]"
          >
            <ChevronRight className="size-4" aria-hidden="true" />
          </button>
        </div>
      )}
    </section>
  )
}
