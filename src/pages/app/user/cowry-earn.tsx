import { useEffect, useState } from "react"
import { Link } from "react-router"
import { toast } from "sonner"
import { ArrowLeft, Check, Flame } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { Routes } from "@/routes/constants"
import { getAuthErrorMessage } from "@/utils/auth"
import {
  getEarnSummary,
  type CowryEarnSummary,
  type CowryPoolStatus,
} from "@/utils/careconnect/services/cowryService"
import { ACTIVITY_LABELS, formatCowries } from "@/utils/careconnect/cowry"

/**
 * Earn — what pays, and how much of today is left.
 *
 * The caps are the point of this screen. Someone who has used their ten comments should
 * find that out here rather than by posting an eleventh and getting nothing, so the
 * remaining allowance is the most prominent thing on each row.
 */

function EarnSkeleton() {
  return (
    <div className="space-y-6 p-5 sm:p-8">
      <Skeleton className="h-6 w-40" />
      <Skeleton className="h-24 rounded-xl" />
      <Skeleton className="h-80 rounded-xl" />
    </div>
  )
}

/**
 * Is any pool close to running out?
 *
 * Shown as a warning before someone is refused rather than as an explanation afterwards.
 */
function exhaustedPools(pools: CowryPoolStatus[]): CowryPoolStatus[] {
  return pools.filter((pool) => pool.exhausted)
}

export default function CowryEarnPage() {
  const [summary, setSummary] = useState<CowryEarnSummary | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    ;(async () => {
      setLoading(true)
      try {
        const result = await getEarnSummary()
        if (!active) return
        setSummary(result)
      } catch (error) {
        toast.error(getAuthErrorMessage(error))
      } finally {
        if (active) setLoading(false)
      }
    })()
    return () => {
      active = false
    }
  }, [])

  if (loading) return <EarnSkeleton />

  if (!summary) {
    return (
      <div className="space-y-6 p-5 sm:p-8">
        <h1 className="text-xl font-bold">Earn Cowries</h1>
        <p className="rounded-xl border border-dashed border-[#e2e2e2] p-10 text-center text-sm text-[#657080]">
          We couldn&apos;t load your earning summary. Refresh the page to try again.
        </p>
      </div>
    )
  }

  const { today, streak, pools } = summary
  const dry = exhaustedPools(pools)
  const streakProgress = Math.min(100, Math.round((streak.daysActive / streak.daysRequired) * 100))

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
        <h1 className="mt-2 text-xl font-bold">Earn Cowries</h1>
        <p className="mt-1 text-sm text-[#657080]">
          Cowries land in your wallet as you earn them, then become spendable a day later.
        </p>
      </header>

      {dry.length > 0 && (
        <div
          role="status"
          className="rounded-xl border border-[#f0c9a4] bg-[#fff6ec] p-4 text-sm text-[#8a5a2b]"
        >
          Today&apos;s reward limit has been reached for some activities. They start paying
          again tomorrow — anything you post in the meantime still counts, it just
          won&apos;t earn Cowries today.
        </div>
      )}

      <section className="rounded-xl border border-[#e2e2e2] bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Flame
              className={`size-5 ${streak.earned ? "text-[#d97a2b]" : "text-[#9aa4b2]"}`}
              aria-hidden="true"
            />
            <h2 className="text-sm font-semibold text-[#141922]">This week&apos;s streak</h2>
          </div>
          <p className="text-sm text-[#657080]">
            {streak.earned ? (
              <span className="inline-flex items-center gap-1 font-semibold text-[#1f9c4c]">
                <Check className="size-4" aria-hidden="true" />
                Earned {formatCowries(streak.reward)} Cowries
              </span>
            ) : (
              `${streak.daysActive} of ${streak.daysRequired} days — ${formatCowries(streak.reward)} Cowries when you reach ${streak.daysRequired}`
            )}
          </p>
        </div>

        <div
          className="mt-4 h-2 overflow-hidden rounded-full bg-[#eef1f3]"
          role="progressbar"
          aria-valuenow={streak.daysActive}
          aria-valuemin={0}
          aria-valuemax={streak.daysRequired}
          aria-label="Days active this week"
        >
          <div
            className={`h-full rounded-full transition-[width] duration-500 ${
              streak.earned ? "bg-[#1f9c4c]" : "bg-[#d97a2b]"
            }`}
            style={{ width: `${streakProgress}%` }}
          />
        </div>
        <p className="mt-3 text-xs text-[#657080]">
          Be active on any {streak.daysRequired} days between Monday and Sunday.
        </p>
      </section>

      <section>
        <h2 className="mb-4 text-xl font-bold">What pays today</h2>
        <div className="overflow-x-auto rounded-xl border border-[#e2e2e2]">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-[#e2e2e2] text-[#657080]">
              <tr>
                <th className="px-4 py-3 font-semibold">Activity</th>
                <th className="px-4 py-3 font-semibold">Cowries each</th>
                <th className="px-4 py-3 font-semibold">Used today</th>
                <th className="px-4 py-3 font-semibold">Left today</th>
              </tr>
            </thead>
            <tbody>
              {today.map((row) => {
                const spent = row.remaining === 0
                return (
                  <tr key={row.activityType} className="border-b border-[#eef1f3] last:border-0">
                    <td className="px-4 py-3 font-medium">
                      {ACTIVITY_LABELS[row.activityType] ?? row.activityType}
                    </td>
                    <td className="px-4 py-3 tabular-nums text-[#565656]">
                      {formatCowries(row.value)}
                    </td>
                    <td className="px-4 py-3 tabular-nums text-[#565656]">
                      {row.used} of {row.cap}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-semibold tabular-nums ${
                          spent ? "bg-[#eceef1] text-[#657080]" : "bg-[#e2f7e8] text-[#1f9c4c]"
                        }`}
                      >
                        {spent ? "None left today" : `${row.remaining} left`}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-[#657080]">
          A post is paid once, when you make it. A video that passes 1,000 views watched at
          least halfway earns again on top of that, up to 2,500 Cowries for that video.
        </p>
      </section>
    </div>
  )
}
