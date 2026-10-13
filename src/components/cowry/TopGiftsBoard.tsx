import { useCallback, useEffect, useState } from "react"
import { Link } from "react-router"
import { ArrowRight, RefreshCw, Trophy } from "lucide-react"
import { CowryIcon } from "@/components/cowry/CowryIcon"
import { GiftIcon } from "@/components/cowry/GiftIcon"
import { CowryEmpty } from "@/components/cowry/CowryUI"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Routes } from "@/routes/constants"
import { cn } from "@/lib/utils"
import { formatCowries } from "@/utils/careconnect/cowry"
import { formatRelative } from "@/utils/careconnect/types"
import {
  listTopGifts,
  type CowryGiftWindow,
  type CowryPublicGift,
  type CowryTopGifts,
} from "@/utils/careconnect/services/cowryService"

/**
 * The biggest gifts anyone sent, for everyone to see.
 *
 * A gift is bought partly to be seen, and a board of the largest ones is most of what makes
 * anyone send a second. It is deliberately about the gifts and not about earnings: the
 * endpoint behind it never sends the creator's share or the note that came with the gift,
 * so there is nothing here to accidentally display.
 *
 * A window rather than all-time by default. All-time means one early large gift sits at the
 * top forever and the board stops saying anything about what is happening now.
 */

const WINDOWS: Array<{ key: CowryGiftWindow; label: string }> = [
  { key: "24h", label: "Today" },
  { key: "7d", label: "This week" },
  { key: "30d", label: "This month" },
  { key: "all", label: "All time" },
]

/** Gold, silver, bronze, then nothing — a rank only reads as one for the first few. */
const RANK_TINTS = [
  "bg-[linear-gradient(135deg,#fff1c7,#f3c969)] text-[#7a5310]",
  "bg-[#eef1f3] text-[#565656]",
  "bg-[#f7ebe0] text-[#8a5a33]",
]

function BoardSkeleton() {
  return (
    <ul className="space-y-2">
      {[0, 1, 2, 3, 4].map((row) => (
        <li key={row} className="flex items-center gap-3 rounded-2xl bg-white p-3 ring-1 ring-[#e2e6ea]">
          <Skeleton className="size-8 rounded-full" />
          <Skeleton className="size-9 rounded-2xl" />
          <div className="min-w-0 flex-1 space-y-1.5">
            <Skeleton className="h-3.5 w-32" />
            <Skeleton className="h-3 w-44" />
          </div>
          <Skeleton className="h-4 w-14" />
        </li>
      ))}
    </ul>
  )
}

function GiftRow({
  gift,
  rank,
  profileHref,
}: {
  gift: CowryPublicGift
  rank: number
  profileHref: (id: string) => string
}) {
  // A name is not guaranteed: it is stored on gifts sent from now on and resolved on read
  // for older ones, and a deleted account resolves to nothing at all.
  const sender = gift.senderName || "Someone"
  const recipient = gift.recipientName || "a member"

  return (
    <li className="flex items-center gap-3 rounded-2xl bg-white p-3 ring-1 ring-[#e2e6ea] transition-colors hover:bg-[#f9fafb]">
      <span
        className={cn(
          "flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-bold tabular-nums",
          RANK_TINTS[rank - 1] ?? "bg-[#f4f6f8] text-[#8b95a1]",
        )}
        aria-hidden="true"
      >
        {rank}
      </span>

      <span className="flex size-9 shrink-0 items-center justify-center rounded-2xl bg-[#f4f6f8]">
        <GiftIcon gift={{ id: gift.giftId, label: gift.giftLabel }} size={22} />
      </span>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-[#141922]">{gift.giftLabel}</p>
        <p className="flex min-w-0 items-center gap-1 truncate text-xs text-[#657080]">
          <Link to={profileHref(gift.senderId)} className="truncate hover:text-[#00898c] hover:underline">
            {sender}
          </Link>
          <ArrowRight className="size-3 shrink-0" aria-hidden="true" />
          <Link to={profileHref(gift.recipientId)} className="truncate hover:text-[#00898c] hover:underline">
            {recipient}
          </Link>
        </p>
      </div>

      <div className="shrink-0 text-right">
        <p className="flex items-center justify-end gap-1 text-sm font-bold tabular-nums text-[#141922]">
          <CowryIcon size={14} />
          {formatCowries(gift.cost)}
        </p>
        <p className="text-[11px] text-[#8b95a1]">{formatRelative(gift.createdAt)}</p>
      </div>
    </li>
  )
}

export function TopGiftsBoard({
  limit = 5,
  initialWindow = "7d",
  profileHref = Routes.app.user.viewProfile,
  className,
}: {
  limit?: number
  initialWindow?: CowryGiftWindow
  /** Which profile route to link names to. The user flow by default. */
  profileHref?: (id: string) => string
  className?: string
}) {
  const [activeWindow, setActiveWindow] = useState<CowryGiftWindow>(initialWindow)
  const [board, setBoard] = useState<CowryTopGifts | null>(null)
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)

  const load = useCallback(
    async (next: CowryGiftWindow) => {
      setLoading(true)
      setFailed(false)
      try {
        setBoard(await listTopGifts({ limit, window: next }))
      } catch {
        // A board that cannot load is a section that says so, not a page that breaks.
        setFailed(true)
      } finally {
        setLoading(false)
      }
    },
    [limit],
  )

  useEffect(() => {
    void load(activeWindow)
  }, [load, activeWindow])

  return (
    <section className={className}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-lg font-bold">
          <Trophy className="size-5 text-[#f3c969]" aria-hidden="true" />
          Biggest treasures
        </h2>

        <div className="flex flex-wrap gap-1" role="group" aria-label="Time window">
          {WINDOWS.map((option) => (
            <button
              key={option.key}
              type="button"
              onClick={() => setActiveWindow(option.key)}
              aria-pressed={activeWindow === option.key}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-semibold transition-colors",
                activeWindow === option.key
                  ? "bg-[#00868a] text-white"
                  : "bg-[#f1f4f6] text-[#565f6d] hover:bg-[#e6ebef]",
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <BoardSkeleton />
      ) : failed ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-dashed border-[#d7dde3] bg-white/60 p-6">
          <p className="text-sm text-[#657080]">The board could not be loaded.</p>
          <Button variant="outline" size="sm" onClick={() => void load(activeWindow)}>
            <RefreshCw className="mr-2 size-4" aria-hidden="true" />
            Try again
          </Button>
        </div>
      ) : !board || board.gifts.length === 0 ? (
        <CowryEmpty title="No treasures in this window yet">
          {activeWindow === "all"
            ? "When someone sends a treasure, the biggest ones appear here."
            : "Nothing sent in this window. Try a longer one."}
        </CowryEmpty>
      ) : (
        <>
          <ul className="cowry-stagger space-y-2">
            {board.gifts.map((gift, index) => (
              <GiftRow key={gift.id} gift={gift} rank={index + 1} profileHref={profileHref} />
            ))}
          </ul>

          {board.scanCapped && (
            /*
             * Said out loud rather than hidden. Beyond a few hundred gifts in a window the
             * backend ranks the most recent of them, so this is the biggest of what it
             * looked at — which is not quite the claim the heading makes.
             */
            <p className="mt-3 text-xs text-[#8b95a1]">
              Ranked from the {board.scanned} most recent treasures in this window.
            </p>
          )}
        </>
      )}
    </section>
  )
}
