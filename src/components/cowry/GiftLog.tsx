import { useCallback, useEffect, useState } from "react"
import { ArrowRight, MessageSquare, RefreshCw, Search, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { CowryIcon } from "@/components/cowry/CowryIcon"
import { GiftIcon } from "@/components/cowry/GiftIcon"
import { GIFT_SET_LABELS, formatCowries } from "@/utils/careconnect/cowry"
import { formatDate, formatRelative } from "@/utils/careconnect/types"
import { cn } from "@/lib/utils"
import {
  EMPTY_GIFT_LOG_FILTERS,
  hasAnyGiftLogFilter,
  toGiftLogQuery,
  type GiftLogFilters,
  type GiftLogParty,
} from "@/utils/careconnect/giftLogFilters"
import {
  listAdminGifts,
  listSentGifts,
  type CowrySentGift,
  type CowrySentGiftLog,
} from "@/utils/careconnect/services/cowryAdminService"

/**
 * Every gift that has been sent.
 *
 * The reconciliation view: what members spent against what the platform minted for
 * creators. Those two figures are the reason the totals sit above the table rather than
 * below it, and the reason they describe the whole filter rather than the page.
 *
 * One thing this screen deliberately does not show is the note a sender attached to a gift.
 * The backend does not return it. A list of private messages between members would be
 * surveillance rather than an audit trail, so a row says only that there is one.
 */

const PAGE_SIZE = 50

function Total({
  label,
  value,
  hint,
  cowries = true,
}: {
  label: string
  value: number | null
  hint?: string
  cowries?: boolean
}) {
  return (
    <div className="rounded-lg bg-white p-4 ring-1 ring-[#e2e6ea]">
      <p className="text-xs font-semibold uppercase tracking-wide text-[#8b95a1]">{label}</p>
      <p className="mt-1.5 flex items-center gap-1 text-xl font-bold tabular-nums text-[#10141a]">
        {value === null ? (
          <span className="text-base font-semibold text-[#8b95a1]">Unavailable</span>
        ) : (
          <>
            {cowries && <CowryIcon size={16} />}
            {formatCowries(value)}
          </>
        )}
      </p>
      {hint && <p className="mt-1 text-xs text-[#6b7280]">{hint}</p>}
    </div>
  )
}

function Row({ gift }: { gift: CowrySentGift }) {
  return (
    <tr className="border-b border-[#eef1f3] last:border-b-0 hover:bg-[#f9fafb]">
      <td className="whitespace-nowrap p-3 align-top text-xs text-[#657080]">
        <p className="font-medium text-[#141922]">{formatRelative(gift.createdAt)}</p>
        <p className="mt-0.5">{formatDate(gift.createdAt)}</p>
      </td>

      <td className="p-3 align-top">
        <p className="flex items-center gap-2 text-sm font-semibold text-[#141922]">
          <GiftIcon gift={{ id: gift.giftId, label: gift.giftLabel }} size={18} />
          {gift.giftLabel}
        </p>
        <p className="mt-0.5 text-xs text-[#8b95a1]">
          {GIFT_SET_LABELS[gift.giftSet] ?? gift.giftSet}
          {gift.targetType === "post" && gift.targetId ? " · on a post" : " · on a profile"}
        </p>
      </td>

      <td className="min-w-0 p-3 align-top text-sm">
        <p className="flex min-w-0 flex-wrap items-center gap-1.5 text-[#141922]">
          <span className="truncate font-medium">{gift.senderName || gift.senderId}</span>
          <ArrowRight className="size-3 shrink-0 text-[#8b95a1]" aria-hidden="true" />
          <span className="truncate font-medium">{gift.recipientName || gift.recipientId}</span>
        </p>
        <p className="mt-0.5 flex items-center gap-2 text-xs text-[#8b95a1]">
          {gift.hasMessage && (
            <span className="flex items-center gap-1" title="A note was attached. Its contents are not shown here.">
              <MessageSquare className="size-3" aria-hidden="true" />
              note
            </span>
          )}
          {gift.visible === false && <span>private</span>}
        </p>
      </td>

      <td className="whitespace-nowrap p-3 text-right align-top">
        <p className="flex items-center justify-end gap-1 text-sm font-bold tabular-nums text-[#141922]">
          <CowryIcon size={13} />
          {formatCowries(gift.cost)}
        </p>
        <p className="mt-0.5 flex items-center justify-end gap-1 text-xs tabular-nums text-[#1f9c4c]">
          +{formatCowries(gift.creatorAmount)}
        </p>
      </td>

      <td className="whitespace-nowrap p-3 align-top">
        <span
          className={cn(
            "rounded-full px-2 py-0.5 text-[11px] font-semibold",
            gift.held ? "bg-[#fdf4e0] text-[#9a7116]" : "bg-[#e7f6ec] text-[#1f7a43]",
          )}
        >
          {gift.held ? "Held" : "Released"}
        </span>
      </td>
    </tr>
  )
}

export function GiftLog() {
  const [filters, setFilters] = useState<GiftLogFilters>(EMPTY_GIFT_LOG_FILTERS)
  const [applied, setApplied] = useState<GiftLogFilters>(EMPTY_GIFT_LOG_FILTERS)
  const [offset, setOffset] = useState(0)
  const [log, setLog] = useState<CowrySentGiftLog | null>(null)
  const [giftOptions, setGiftOptions] = useState<Array<{ id: string; label: string }>>([])
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)

  const load = useCallback(async (active: GiftLogFilters, from: number) => {
    setLoading(true)
    setFailed(false)
    try {
      setLog(await listSentGifts(toGiftLogQuery(active, from, PAGE_SIZE)))
    } catch {
      setFailed(true)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load(applied, offset)
  }, [load, applied, offset])

  // The gift picker reuses the catalogue rather than deriving options from the rows, so an
  // admin can filter by a gift that happens not to be on the current page.
  useEffect(() => {
    listAdminGifts()
      .then((catalog) => setGiftOptions(catalog.gifts.map((g) => ({ id: g.id, label: g.label }))))
      .catch(() => setGiftOptions([]))
  }, [])

  const apply = () => {
    setOffset(0)
    setApplied(filters)
  }

  const clear = () => {
    setFilters(EMPTY_GIFT_LOG_FILTERS)
    setOffset(0)
    setApplied(EMPTY_GIFT_LOG_FILTERS)
  }

  const rows = log?.data ?? []
  const totals = log?.totals
  const paging = log?.paging

  return (
    <section className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-[#10141a]">Treasures sent</h2>
        <p className="mt-1 text-sm text-[#4f4f4f]">
          Every treasure members have sent, newest first. Totals cover everything matching the
          filters, not just this page.
        </p>
      </div>

      {/* ── filters ──────────────────────────────────────────────────────── */}

      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="sm:col-span-2">
            <label htmlFor="log-party-id" className="text-xs font-semibold text-[#10141a]">
              Member
            </label>
            <div className="mt-1.5 flex gap-2">
              <Select
                value={filters.party}
                onValueChange={(value) => setFilters((f) => ({ ...f, party: value as GiftLogParty }))}
              >
                <SelectTrigger className="w-32 shrink-0" aria-label="Which side of the treasure">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sender">Sent by</SelectItem>
                  <SelectItem value="recipient">Received by</SelectItem>
                </SelectContent>
              </Select>
              <Input
                id="log-party-id"
                placeholder="User ID"
                className="font-mono text-sm"
                value={filters.partyId}
                onChange={(e) => setFilters((f) => ({ ...f, partyId: e.target.value }))}
                onKeyDown={(e) => e.key === "Enter" && apply()}
              />
            </div>
            <p className="mt-1 text-xs text-[#8b95a1]">One side at a time, not both.</p>
          </div>

          <div>
            <label htmlFor="log-gift" className="text-xs font-semibold text-[#10141a]">
              Treasure
            </label>
            <Select
              value={filters.giftId || "all"}
              onValueChange={(value) => setFilters((f) => ({ ...f, giftId: value === "all" ? "" : value }))}
            >
              <SelectTrigger id="log-gift" className="mt-1.5">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Any treasure</SelectItem>
                {giftOptions.map((option) => (
                  <SelectItem key={option.id} value={option.id}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label htmlFor="log-from" className="text-xs font-semibold text-[#10141a]">
                From
              </label>
              <Input
                id="log-from"
                type="date"
                className="mt-1.5"
                value={filters.from}
                onChange={(e) => setFilters((f) => ({ ...f, from: e.target.value }))}
              />
            </div>
            <div>
              <label htmlFor="log-to" className="text-xs font-semibold text-[#10141a]">
                To
              </label>
              <Input
                id="log-to"
                type="date"
                className="mt-1.5"
                value={filters.to}
                onChange={(e) => setFilters((f) => ({ ...f, to: e.target.value }))}
              />
            </div>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <Button onClick={apply} disabled={loading}>
            <Search className="mr-2 size-4" aria-hidden="true" />
            Apply
          </Button>
          {hasAnyGiftLogFilter(applied) && (
            <Button variant="outline" onClick={clear} disabled={loading}>
              <X className="mr-2 size-4" aria-hidden="true" />
              Clear
            </Button>
          )}
        </div>
      </div>

      {/* ── totals ───────────────────────────────────────────────────────── */}

      {totals && (
        <div className="grid gap-3 sm:grid-cols-3">
          <Total label="Treasures" value={totals.gifts} cowries={false} />
          <Total label="Members spent" value={totals.cost} hint="Purchased Cowries" />
          <Total
            label="Creators earned"
            value={totals.creatorAmount}
            hint="Minted, always less than spent"
          />
        </div>
      )}

      {totals && !totals.exact && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
          Totals are unavailable here, so the figures above are blank. The rows below are
          complete. This happens where the database cannot aggregate, such as on a local
          emulator.
        </p>
      )}

      {/* ── the table ────────────────────────────────────────────────────── */}

      {loading ? (
        <div className="space-y-2">
          {[0, 1, 2, 3, 4, 5].map((row) => (
            <Skeleton key={row} className="h-16 rounded-lg" />
          ))}
        </div>
      ) : failed ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-dashed border-[#d7dde3] p-6">
          <p className="text-sm text-[#657080]">The log could not be loaded.</p>
          <Button variant="outline" size="sm" onClick={() => void load(applied, offset)}>
            <RefreshCw className="mr-2 size-4" aria-hidden="true" />
            Try again
          </Button>
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[#d7dde3] p-10 text-center">
          <p className="text-sm font-semibold text-[#4f5862]">
            {hasAnyGiftLogFilter(applied) ? "No treasures match these filters" : "No treasures have been sent yet"}
          </p>
          <p className="mt-1 text-sm text-[#8b95a1]">
            {hasAnyGiftLogFilter(applied)
              ? "Try a wider date range, or clear the filters."
              : "Treasures appear here as members send them."}
          </p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
            <table className="w-full min-w-[720px] text-left">
              <thead>
                <tr className="border-b border-[#eef1f3] text-xs uppercase tracking-wide text-[#8b95a1]">
                  <th scope="col" className="p-3 font-semibold">When</th>
                  <th scope="col" className="p-3 font-semibold">Treasure</th>
                  <th scope="col" className="p-3 font-semibold">From and to</th>
                  <th scope="col" className="p-3 text-right font-semibold">Spent / earned</th>
                  <th scope="col" className="p-3 font-semibold">Creator share</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((gift) => (
                  <Row key={gift.id} gift={gift} />
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-[#8b95a1] tabular-nums">
              {totals?.gifts === null || totals?.gifts === undefined
                ? `Showing ${rows.length}`
                : `${offset + 1}–${offset + rows.length} of ${formatCowries(totals.gifts)}`}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={offset === 0 || loading}
                onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={!paging?.hasMore || loading}
                onClick={() => setOffset(offset + PAGE_SIZE)}
              >
                Next
              </Button>
            </div>
          </div>
        </>
      )}
    </section>
  )
}
