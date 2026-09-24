import { useEffect, useMemo, useState } from "react"
import { toast } from "sonner"
import { ArrowDownLeft, ArrowUpRight, Clock, Copy, Loader2 } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { CowryIcon } from "@/components/cowry/CowryIcon"
import { CowryEmpty, CowryPageHeader } from "@/components/cowry/CowryUI"
import { cn } from "@/lib/utils"
import { getAuthErrorMessage } from "@/utils/auth"
import { formatDate, toDate } from "@/utils/careconnect/types"
import {
  listTransactions,
  type CowryLedgerEntry,
  type CowryTransactionType,
  type CowryWalletType,
} from "@/utils/careconnect/services/cowryService"
import {
  TRANSACTION_LABELS,
  WALLET_LABELS,
  entryDescription,
  entryDirection,
  formatCowries,
  signedAmount,
} from "@/utils/careconnect/cowry"

/**
 * Cowry history — every movement on the account.
 *
 * Support lives in this screen, so it shows the reference needed to trace a row rather
 * than hiding it behind a detail view, and makes it one tap to copy. The description line
 * matters most: a clawback or a returned reservation has to explain itself here, or a
 * balance appears to have changed on its own.
 *
 * Rows are grouped by day rather than laid out as a six-column table, which did not fit a
 * phone — and a phone is where most people will check what happened to their Cowries.
 */

const PAGE_SIZE = 25

const WALLET_FILTERS: Array<{ value: CowryWalletType | "all"; label: string; dot?: string }> = [
  { value: "all", label: "All" },
  { value: "reward", label: "Reward", dot: "#c8963e" },
  { value: "purchased", label: "Purchased", dot: "#0d8de0" },
  { value: "creator", label: "Creator", dot: "#c0438f" },
]

const TYPE_FILTERS: Array<{ value: CowryTransactionType | "all"; label: string }> = [
  { value: "all", label: "All activity" },
  { value: "earn", label: "Earned" },
  { value: "redeem", label: "Redeemed" },
  { value: "buy", label: "Purchased" },
  { value: "gift", label: "Gifts" },
  { value: "reserve", label: "Held" },
  { value: "release", label: "Returned" },
  { value: "reverse", label: "Corrections" },
]

const DIRECTION_STYLE = {
  in: { icon: ArrowDownLeft, chip: "bg-[#e2f7e8] text-[#1f9c4c]", text: "text-[#1f9c4c]" },
  out: { icon: ArrowUpRight, chip: "bg-[#ffe9e6] text-[#b4372c]", text: "text-[#b4372c]" },
  neutral: { icon: Clock, chip: "bg-[#eceef1] text-[#657080]", text: "text-[#657080]" },
}

/** "Today", "Yesterday", or the date — how people think about recent money. */
function dayLabel(entry: CowryLedgerEntry): string {
  const date = toDate(entry.createdAt)
  if (!date) return "Earlier"
  const today = new Date()
  const startOf = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
  const diff = Math.round((startOf(today) - startOf(date)) / 86_400_000)
  if (diff === 0) return "Today"
  if (diff === 1) return "Yesterday"
  return formatDate(entry.createdAt)
}

function HistorySkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-24 rounded-2xl" />
      <Skeleton className="h-72 rounded-2xl" />
    </div>
  )
}

async function copyReference(reference: string) {
  try {
    await navigator.clipboard.writeText(reference)
    toast.success("Reference copied")
  } catch {
    toast.error("Couldn't copy. Select the reference and copy it instead.")
  }
}

export default function CowryHistoryPage() {
  const [entries, setEntries] = useState<CowryLedgerEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [walletType, setWalletType] = useState<CowryWalletType | "all">("all")
  const [type, setType] = useState<CowryTransactionType | "all">("all")
  const [exhausted, setExhausted] = useState(false)

  useEffect(() => {
    let active = true
    ;(async () => {
      setLoading(true)
      setExhausted(false)
      try {
        const rows = await listTransactions({
          limit: PAGE_SIZE,
          ...(walletType !== "all" ? { walletType } : {}),
          ...(type !== "all" ? { type } : {}),
        })
        if (!active) return
        setEntries(rows)
        setExhausted(rows.length < PAGE_SIZE)
      } catch (error) {
        toast.error(getAuthErrorMessage(error))
      } finally {
        if (active) setLoading(false)
      }
    })()
    return () => {
      active = false
    }
  }, [walletType, type])

  async function loadMore() {
    setLoadingMore(true)
    try {
      const rows = await listTransactions({
        limit: PAGE_SIZE,
        offset: entries.length,
        ...(walletType !== "all" ? { walletType } : {}),
        ...(type !== "all" ? { type } : {}),
      })
      setEntries((current) => [...current, ...rows])
      if (rows.length < PAGE_SIZE) setExhausted(true)
    } catch (error) {
      toast.error(getAuthErrorMessage(error))
    } finally {
      setLoadingMore(false)
    }
  }

  const groups = useMemo(() => {
    const byDay: Array<{ label: string; rows: CowryLedgerEntry[] }> = []
    for (const entry of entries) {
      const label = dayLabel(entry)
      const last = byDay[byDay.length - 1]
      if (last && last.label === label) last.rows.push(entry)
      else byDay.push({ label, rows: [entry] })
    }
    return byDay
  }, [entries])

  // Totals for what is on screen. Labelled as such: it is not a lifetime figure.
  const totals = useMemo(() => {
    let inflow = 0
    let outflow = 0
    for (const entry of entries) {
      const direction = entryDirection(entry)
      if (direction === "in") inflow += entry.amount ?? 0
      if (direction === "out") outflow += entry.amount ?? 0
    }
    return { inflow, outflow }
  }, [entries])

  return (
    <div className="animate-fade-in-up space-y-6 p-5 sm:p-8">
      {/* The header and filters stay put while the list reloads, so changing a filter does
          not flash the whole page back to a skeleton. */}
      <CowryPageHeader title="Cowry history" subtitle="Every Cowry in and out of your account, newest first." />

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by balance">
          {WALLET_FILTERS.map((option) => {
            const active = walletType === option.value
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => setWalletType(option.value)}
                aria-pressed={active}
                className={cn(
                  "cowry-press inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-semibold transition",
                  active
                    ? "bg-[#10141a] text-white shadow-sm"
                    : "bg-white text-[#565656] ring-1 ring-[#e2e6ea] hover:ring-[#c8cdd4]",
                )}
              >
                {option.dot && (
                  <span className="size-2 rounded-full" style={{ background: option.dot }} aria-hidden="true" />
                )}
                {option.label}
              </button>
            )
          })}
        </div>

        <Select value={type} onValueChange={(value) => setType(value as typeof type)}>
          <SelectTrigger className="w-44 bg-white" aria-label="Filter by activity">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TYPE_FILTERS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <HistorySkeleton />
      ) : entries.length === 0 ? (
        <CowryEmpty
          title={walletType === "all" && type === "all" ? "No Cowry activity yet" : "Nothing matches these filters"}
        >
          {walletType === "all" && type === "all"
            ? "Every Cowry you earn, buy, redeem or send will be listed here."
            : "Try a different balance or activity."}
        </CowryEmpty>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:max-w-md">
            <div className="rounded-2xl bg-white p-4 ring-1 ring-[#e2e6ea]">
              <p className="text-xs text-[#657080]">In, shown below</p>
              <p className="mt-1 flex items-center gap-1.5 text-xl font-bold tabular-nums text-[#1f9c4c]">
                <CowryIcon size={18} />+{formatCowries(totals.inflow)}
              </p>
            </div>
            <div className="rounded-2xl bg-white p-4 ring-1 ring-[#e2e6ea]">
              <p className="text-xs text-[#657080]">Out, shown below</p>
              <p className="mt-1 flex items-center gap-1.5 text-xl font-bold tabular-nums text-[#b4372c]">
                <CowryIcon size={18} />−{formatCowries(totals.outflow)}
              </p>
            </div>
          </div>

          <div className="space-y-5">
            {groups.map((group) => (
              <section key={group.label}>
                <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#8a94a3]">
                  {group.label}
                </h2>
                <ul className="cowry-stagger divide-y divide-[#eef1f3] overflow-hidden rounded-2xl bg-white ring-1 ring-[#e2e6ea]">
                  {group.rows.map((entry) => {
                    const direction = DIRECTION_STYLE[entryDirection(entry)]
                    const DirectionIcon = direction.icon
                    const reference = entry.fulfillmentReference || entry.paymentReference || entry.id
                    return (
                      <li key={entry.id} className="flex gap-3 p-4 transition-colors hover:bg-[#f9fafb]">
                        <span
                          className={cn(
                            "mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full",
                            direction.chip,
                          )}
                        >
                          <DirectionIcon className="size-4" aria-hidden="true" />
                        </span>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-3">
                            <p className="text-sm font-semibold text-[#141922]">
                              {TRANSACTION_LABELS[entry.type] ?? entry.type}
                              <span className="ml-2 rounded-full bg-[#f1f3f5] px-2 py-0.5 text-[11px] font-medium text-[#657080]">
                                {WALLET_LABELS[entry.walletType]}
                              </span>
                            </p>
                            <span className={cn("shrink-0 text-sm font-bold tabular-nums", direction.text)}>
                              {signedAmount(entry)}
                            </span>
                          </div>
                          <p className="mt-0.5 text-sm text-[#565656]">{entryDescription(entry)}</p>
                          {/* A correction points back at the row it fixes; showing that link is
                              what keeps a clawback from looking arbitrary. */}
                          {entry.reversalOf && (
                            <p className="mt-0.5 font-mono text-xs text-[#657080]">corrects {entry.reversalOf}</p>
                          )}
                          <button
                            type="button"
                            onClick={() => copyReference(reference)}
                            className="mt-1 inline-flex max-w-full items-center gap-1 rounded font-mono text-xs text-[#8a94a3] transition hover:text-[#00868a]"
                            title="Copy reference"
                          >
                            <span className="truncate">{reference}</span>
                            <Copy className="size-3 shrink-0" aria-hidden="true" />
                          </button>
                        </div>
                      </li>
                    )
                  })}
                </ul>
              </section>
            ))}
          </div>

          <div className="flex items-center justify-between gap-4">
            <p className="text-xs text-[#657080]">
              Showing {formatCowries(entries.length)} movement{entries.length === 1 ? "" : "s"}.
            </p>
            {!exhausted && (
              <Button variant="outline" onClick={loadMore} disabled={loadingMore}>
                {loadingMore && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
                {loadingMore ? "Loading…" : "Load more"}
              </Button>
            )}
          </div>
        </>
      )}
    </div>
  )
}
