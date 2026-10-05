import { useCallback, useEffect, useMemo, useState } from "react"
import { ArrowRight, Crown, Gift, RefreshCw, Trophy, TrendingUp } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { CowryIcon } from "@/components/cowry/CowryIcon"
import { GiftIcon } from "@/components/cowry/GiftIcon"
import { cn } from "@/lib/utils"
import { GIFT_SET_LABELS, formatCowries } from "@/utils/careconnect/cowry"
import { formatRelative } from "@/utils/careconnect/types"
import {
  listTopGifts,
  type CowryGiftWindow,
  type CowryTopGifts,
} from "@/utils/careconnect/services/cowryService"

/**
 * Gifting at a glance, for operators.
 *
 * Built on the public top-gifts endpoint, which is what exists: the biggest gifts in a
 * window, plus how many gifts that window held. So the count is every gift sent, and
 * everything else — totals, most given, the split by set — is said to be "among the biggest
 * N", never passed off as the whole of gifting. A dashboard that rounds a sample up to a
 * total is worse than one that shows less.
 *
 * Names are not links: an operator account cannot open member profiles.
 */

const WINDOWS: Array<{ key: CowryGiftWindow; label: string }> = [
  { key: "24h", label: "24 hours" },
  { key: "7d", label: "7 days" },
  { key: "30d", label: "30 days" },
  { key: "all", label: "All time" },
]

/** How many of the biggest gifts to analyse. */
const SAMPLE = 50

const SET_ORDER = ["everyday", "warm", "bold", "rare", "legendary"]
const SET_BARS: Record<string, string> = {
  everyday: "bg-[#9aa4b2]",
  warm: "bg-[#e0a93a]",
  bold: "bg-[#0d8de0]",
  rare: "bg-[#7a4fd1]",
  legendary: "bg-[linear-gradient(90deg,#f3c969,#c8963e)]",
}

function Figure({ label, value, hint, icon: Icon }: { label: string; value: string; hint?: string; icon: typeof Gift }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4">
      <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-[#6b7280]">
        <Icon className="size-3.5" aria-hidden="true" />
        {label}
      </p>
      <p className="mt-1.5 text-xl font-bold tabular-nums text-[#10141a]">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-[#8b95a1]">{hint}</p>}
    </div>
  )
}

export function AdminGiftAnalytics() {
  const [active, setActive] = useState<CowryGiftWindow>("7d")
  const [board, setBoard] = useState<CowryTopGifts | null>(null)
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)

  const load = useCallback(async (next: CowryGiftWindow) => {
    setLoading(true)
    setFailed(false)
    try {
      setBoard(await listTopGifts({ limit: SAMPLE, window: next }))
    } catch {
      setFailed(true)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load(active)
  }, [active, load])

  const gifts = useMemo(() => board?.gifts ?? [], [board])
  const total = gifts.reduce((sum, gift) => sum + gift.cost, 0)
  const legendary = gifts.filter((gift) => gift.giftSet === "legendary").length

  const mostGiven = useMemo(() => {
    const byName = new Map<string, { label: string; giftId: string; count: number; cowries: number }>()
    for (const gift of gifts) {
      const row = byName.get(gift.giftId) ?? { label: gift.giftLabel, giftId: gift.giftId, count: 0, cowries: 0 }
      row.count += 1
      row.cowries += gift.cost
      byName.set(gift.giftId, row)
    }
    return [...byName.values()].sort((a, b) => b.count - a.count || b.cowries - a.cowries).slice(0, 8)
  }, [gifts])

  const bySet = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const gift of gifts) counts[gift.giftSet] = (counts[gift.giftSet] ?? 0) + 1
    return SET_ORDER.map((set) => ({ set, count: counts[set] ?? 0 }))
  }, [gifts])

  const topCount = mostGiven[0]?.count ?? 1
  const sampleNote = `Among the ${gifts.length} biggest gift${gifts.length === 1 ? "" : "s"} in this window`

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-gray-200 bg-white p-4">
        <div>
          <h2 className="text-lg font-semibold text-[#10141a]">Gift activity</h2>
          <p className="text-sm text-[#4f4f4f]">What members are sending, and which gifts lead.</p>
        </div>
        <div className="flex items-center gap-2">
          <div role="tablist" aria-label="Time window" className="flex gap-1 rounded-full bg-[#f4f6f8] p-1">
            {WINDOWS.map((option) => (
              <button
                key={option.key}
                type="button"
                role="tab"
                aria-selected={active === option.key}
                onClick={() => setActive(option.key)}
                className={cn(
                  "rounded-full px-3 py-1.5 text-xs font-semibold transition",
                  active === option.key ? "bg-white text-[#10141a] shadow" : "text-[#4f4f4f] hover:bg-white/70",
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
          <Button variant="ghost" size="sm" onClick={() => void load(active)} disabled={loading} aria-label="Refresh">
            <RefreshCw className={cn("size-4", loading && "animate-spin")} aria-hidden="true" />
          </Button>
        </div>
      </div>

      {failed ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-dashed border-[#d7dde3] bg-white p-6">
          <p className="text-sm text-[#657080]">Gift activity could not be loaded.</p>
          <Button variant="outline" size="sm" onClick={() => void load(active)}>
            <RefreshCw className="size-4" aria-hidden="true" />
            Try again
          </Button>
        </div>
      ) : loading && !board ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 rounded-2xl" />
          ))}
          <Skeleton className="h-72 rounded-2xl sm:col-span-2 lg:col-span-4" />
        </div>
      ) : (
        <div className={cn("space-y-5 transition-opacity", loading && "opacity-60")}>
          <div className="cowry-stagger grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Figure
              icon={Gift}
              label="Gifts sent"
              value={`${formatCowries(board?.scanned ?? 0)}${board?.scanCapped ? "+" : ""}`}
              hint={board?.scanCapped ? "More than the backend counts in one go" : "Every gift in this window"}
            />
            <Figure icon={TrendingUp} label="Cowries in the biggest" value={formatCowries(total)} hint={sampleNote} />
            <Figure
              icon={Trophy}
              label="Biggest gift"
              value={gifts[0] ? formatCowries(gifts[0].cost) : "—"}
              hint={gifts[0]?.giftLabel}
            />
            <Figure icon={Crown} label="Legendary" value={formatCowries(legendary)} hint={sampleNote} />
          </div>

          {gifts.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[#d7dde3] bg-white p-10 text-center">
              <Gift className="mx-auto size-8 text-[#c3cad3]" aria-hidden="true" />
              <p className="mt-2 text-sm text-[#6b7280]">No gifts were sent in this window.</p>
            </div>
          ) : (
            <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
              <div className="rounded-2xl border border-gray-200 bg-white p-5">
                <h3 className="text-sm font-semibold text-[#10141a]">Biggest gifts</h3>
                <ol className="cowry-stagger mt-3 divide-y divide-[#eef1f3]">
                  {gifts.slice(0, 10).map((gift, index) => (
                    <li key={gift.id} className="flex items-center gap-3 py-2.5">
                      <span
                        className={cn(
                          "flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                          index === 0 ? "bg-[#fff1c7] text-[#7a5310]" : "bg-[#f4f6f8] text-[#657080]",
                        )}
                      >
                        {index + 1}
                      </span>
                      <GiftIcon gift={{ id: gift.giftId, label: gift.giftLabel }} size={28} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-[#141922]">{gift.giftLabel}</p>
                        <p className="flex min-w-0 items-center gap-1 text-xs text-[#8b95a1]">
                          <span className="truncate">{gift.senderName || "Someone"}</span>
                          <ArrowRight className="size-3 shrink-0" aria-hidden="true" />
                          <span className="truncate">{gift.recipientName || "Someone"}</span>
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="flex items-center justify-end gap-1 text-sm font-bold tabular-nums">
                          <CowryIcon size={14} />
                          {formatCowries(gift.cost)}
                        </p>
                        <p className="text-[11px] text-[#8b95a1]">{formatRelative(gift.createdAt)}</p>
                      </div>
                    </li>
                  ))}
                </ol>
              </div>

              <div className="space-y-5">
                <div className="rounded-2xl border border-gray-200 bg-white p-5">
                  <h3 className="text-sm font-semibold text-[#10141a]">Most given</h3>
                  <p className="text-xs text-[#8b95a1]">{sampleNote}</p>
                  <ul className="mt-3 space-y-2.5">
                    {mostGiven.map((row) => (
                      <li key={row.giftId} className="flex items-center gap-2.5">
                        <GiftIcon gift={{ id: row.giftId, label: row.label }} size={22} />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-baseline justify-between gap-2 text-xs">
                            <span className="truncate font-semibold text-[#141922]">{row.label}</span>
                            <span className="shrink-0 tabular-nums text-[#657080]">×{row.count}</span>
                          </div>
                          <span className="mt-1 block h-1.5 overflow-hidden rounded-full bg-[#eef1f3]">
                            <span
                              className="block h-full rounded-full bg-[#00b3ad] transition-all duration-700"
                              style={{ width: `${(row.count / topCount) * 100}%` }}
                            />
                          </span>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="rounded-2xl border border-gray-200 bg-white p-5">
                  <h3 className="text-sm font-semibold text-[#10141a]">By set</h3>
                  <p className="text-xs text-[#8b95a1]">{sampleNote}</p>
                  <ul className="mt-3 space-y-2">
                    {bySet.map(({ set, count }) => (
                      <li key={set} className="grid grid-cols-[5.5rem_minmax(0,1fr)_2rem] items-center gap-2 text-xs">
                        <span className="font-semibold text-[#4f4f4f]">{GIFT_SET_LABELS[set] ?? set}</span>
                        <span className="h-2 overflow-hidden rounded-full bg-[#eef1f3]">
                          <span
                            className={cn("block h-full rounded-full transition-all duration-700", SET_BARS[set])}
                            style={{ width: gifts.length ? `${(count / gifts.length) * 100}%` : "0%" }}
                          />
                        </span>
                        <span className="text-right tabular-nums text-[#657080]">{count}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  )
}
