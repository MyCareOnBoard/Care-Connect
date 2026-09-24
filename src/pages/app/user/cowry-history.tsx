import { useEffect, useState } from "react"
import { Link } from "react-router"
import { toast } from "sonner"
import { ArrowLeft } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Routes } from "@/routes/constants"
import { getAuthErrorMessage } from "@/utils/auth"
import { formatDate } from "@/utils/careconnect/types"
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
 * than hiding it behind a detail view. The `note` column matters most: a clawback or a
 * returned reservation has to explain itself here, or a balance appears to have changed
 * on its own.
 */

const PAGE_SIZE = 25

const WALLET_FILTERS: Array<{ value: CowryWalletType | "all"; label: string }> = [
  { value: "all", label: "All balances" },
  { value: "reward", label: "Reward" },
  { value: "purchased", label: "Purchased" },
  { value: "creator", label: "Creator" },
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

function HistorySkeleton() {
  return (
    <div className="space-y-6 p-5 sm:p-8">
      <Skeleton className="h-6 w-40" />
      <Skeleton className="h-10 w-72" />
      <Skeleton className="h-96 rounded-xl" />
    </div>
  )
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

  if (loading) return <HistorySkeleton />

  return (
    <div className="animate-fade-in-up space-y-6 p-5 sm:p-8">
      <header>
        <Link
          to={Routes.app.user.cowryWallet}
          className="inline-flex items-center gap-1 text-sm font-semibold text-[#0d8de0] hover:underline"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          Cowry wallet
        </Link>
        <h1 className="mt-2 text-xl font-bold">Cowry history</h1>
        <p className="mt-1 text-sm text-[#657080]">
          Every Cowry in and out of your account, newest first.
        </p>
      </header>

      <div className="flex flex-wrap gap-3">
        <Select value={walletType} onValueChange={(value) => setWalletType(value as typeof walletType)}>
          <SelectTrigger className="w-44" aria-label="Filter by balance">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {WALLET_FILTERS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={type} onValueChange={(value) => setType(value as typeof type)}>
          <SelectTrigger className="w-44" aria-label="Filter by activity">
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

      {entries.length === 0 ? (
        <p className="rounded-xl border border-dashed border-[#e2e2e2] p-10 text-center text-sm text-[#657080]">
          {walletType === "all" && type === "all"
            ? "No Cowry activity on this account yet."
            : "Nothing matches these filters."}
        </p>
      ) : (
        <>
          <div className="overflow-x-auto rounded-xl border border-[#e2e2e2]">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-[#e2e2e2] text-[#657080]">
                <tr>
                  <th className="px-4 py-3 font-semibold">Date</th>
                  <th className="px-4 py-3 font-semibold">Activity</th>
                  <th className="px-4 py-3 font-semibold">Balance</th>
                  <th className="px-4 py-3 font-semibold">What happened</th>
                  <th className="px-4 py-3 text-right font-semibold">Cowries</th>
                  <th className="px-4 py-3 font-semibold">Reference</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => {
                  const direction = entryDirection(entry)
                  // A correction points back at the row it fixes; showing that link is
                  // what keeps a clawback from looking arbitrary.
                  const reference =
                    entry.fulfillmentReference || entry.paymentReference || entry.id
                  return (
                    <tr key={entry.id} className="border-b border-[#eef1f3] last:border-0">
                      <td className="whitespace-nowrap px-4 py-3 text-[#565656]">
                        {formatDate(entry.createdAt)}
                      </td>
                      <td className="px-4 py-3 font-medium">
                        {TRANSACTION_LABELS[entry.type] ?? entry.type}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-[#565656]">
                        {WALLET_LABELS[entry.walletType]}
                      </td>
                      <td className="px-4 py-3 text-[#565656]">
                        {entryDescription(entry)}
                        {entry.reversalOf && (
                          <span className="mt-0.5 block font-mono text-xs text-[#657080]">
                            corrects {entry.reversalOf}
                          </span>
                        )}
                      </td>
                      <td
                        className={`whitespace-nowrap px-4 py-3 text-right font-semibold tabular-nums ${
                          direction === "in"
                            ? "text-[#1f9c4c]"
                            : direction === "out"
                              ? "text-[#b4372c]"
                              : "text-[#657080]"
                        }`}
                      >
                        {signedAmount(entry)}
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-mono text-xs text-[#657080]">{reference}</span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between gap-4">
            <p className="text-xs text-[#657080]">
              Showing {formatCowries(entries.length)} movement
              {entries.length === 1 ? "" : "s"}.
            </p>
            {!exhausted && (
              <Button variant="outline" onClick={loadMore} disabled={loadingMore}>
                {loadingMore ? "Loading…" : "Load more"}
              </Button>
            )}
          </div>
        </>
      )}
    </div>
  )
}
