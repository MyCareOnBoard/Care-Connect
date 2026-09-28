import { useEffect, useState } from "react"
import { toast } from "sonner"
import { AlertTriangle, Check, Flame } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { CowryAmount, CowryIcon } from "@/components/cowry/CowryIcon"
import {
  AnimatedCowries,
  CowryLoadError,
  CowryPageHeader,
  CowryProgress,
} from "@/components/cowry/CowryUI"
import { celebrateOnce } from "@/components/cowry/celebrate"
import { cn } from "@/lib/utils"
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
 * find that out here rather than by posting an eleventh and getting nothing, so each
 * activity is a card whose remaining allowance is the most prominent thing on it.
 */

function EarnSkeleton() {
  return (
    <div className="space-y-6 p-5 sm:p-8">
      <Skeleton className="h-8 w-44" />
      <Skeleton className="h-44 rounded-3xl" />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-32 rounded-2xl" />
        ))}
      </div>
    </div>
  )
}

/**
 * Has any pool run dry?
 *
 * Shown as a warning before someone is refused rather than as an explanation afterwards.
 */
function exhaustedPools(pools: CowryPoolStatus[]): CowryPoolStatus[] {
  return pools.filter((pool) => pool.exhausted)
}

export default function CowryEarnPage() {
  const [summary, setSummary] = useState<CowryEarnSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [attempt, setAttempt] = useState(0)

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
  }, [attempt])

  // A finished streak is celebrated once per week, not on every visit that week.
  const streakWeek = summary?.streak.earned ? summary.streak.weekKey : null
  useEffect(() => {
    if (streakWeek) celebrateOnce(`streak-${streakWeek}`, "burst")
  }, [streakWeek])

  if (loading) return <EarnSkeleton />

  if (!summary) {
    return (
      <CowryLoadError
        title="Earn Cowries"
        message="We couldn't load your earning summary."
        onRetry={() => setAttempt((n) => n + 1)}
      />
    )
  }

  const { today, streak, pools } = summary
  const dry = exhaustedPools(pools)
  const streakProgress = streak.daysRequired
    ? Math.min(100, (streak.daysActive / streak.daysRequired) * 100)
    : 0
  // What is still on offer today at the listed rates. Base values, before multipliers.
  const onOffer = today.reduce((sum, row) => sum + Math.max(0, row.remaining) * row.value, 0)
  const openCount = today.filter((row) => row.remaining > 0).length

  return (
    <div className="animate-fade-in-up space-y-7 p-5 sm:p-8">
      <CowryPageHeader
        title="Earn Cowries"
        subtitle="Cowries land in your wallet as you earn them, then become spendable a day later."
      />

      {dry.length > 0 && (
        <div
          role="status"
          className="flex gap-3 rounded-2xl border border-[#f0c9a4] bg-[#fff6ec] p-4 text-sm text-[#8a5a2b]"
        >
          <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <p>
            Today&apos;s reward limit has been reached for some activities. They start paying
            again tomorrow — anything you post in the meantime still counts, it just
            won&apos;t earn Cowries today.
          </p>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        {/* The streak, as days you can see filling in rather than a bare fraction. */}
        <section
          className={cn(
            "relative overflow-hidden rounded-3xl p-6 ring-1",
            streak.earned
              ? "bg-[linear-gradient(135deg,#fff6ec,#ffe9d6)] ring-[#f5d2ae]"
              : "bg-white ring-[#e2e6ea]",
          )}
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span
                className={cn(
                  "flex size-10 items-center justify-center rounded-2xl",
                  streak.daysActive > 0 ? "bg-[#ffe9d6]" : "bg-[#eceef1]",
                )}
              >
                <Flame
                  className={cn(
                    "size-5",
                    streak.daysActive > 0 ? "animate-cowry-flame text-[#d97a2b]" : "text-[#9aa4b2]",
                  )}
                  aria-hidden="true"
                />
              </span>
              <div>
                <h2 className="text-sm font-semibold text-[#141922]">This week&apos;s streak</h2>
                <p className="text-xs text-[#657080]">
                  Be active on any {streak.daysRequired} days, Monday to Sunday.
                </p>
              </div>
            </div>
            {streak.earned ? (
              <span className="animate-cowry-pop inline-flex items-center gap-1.5 rounded-full bg-[#e2f7e8] px-3 py-1 text-sm font-semibold text-[#1f9c4c]">
                <Check className="size-4" aria-hidden="true" />
                Earned <CowryAmount amount={streak.reward} size={14} />
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#fff4df] px-3 py-1 text-sm font-semibold text-[#a8793f]">
                Reward <CowryAmount amount={streak.reward} size={14} />
              </span>
            )}
          </div>

          <ol className="mt-6 flex flex-wrap gap-2.5" aria-label={`${streak.daysActive} of ${streak.daysRequired} days active`}>
            {Array.from({ length: streak.daysRequired }).map((_, index) => {
              const done = index < streak.daysActive
              return (
                <li
                  key={index}
                  className={cn(
                    "flex size-11 items-center justify-center rounded-2xl transition-all",
                    done
                      ? "animate-cowry-pop bg-white shadow-[0_6px_16px_-8px_rgba(200,150,62,0.8)] ring-1 ring-[#f3dfb3]"
                      : "border-2 border-dashed border-[#dde2e7] text-xs font-semibold text-[#9aa4b2]",
                  )}
                  style={done ? { animationDelay: `${index * 90}ms` } : undefined}
                >
                  {done ? <CowryIcon size={24} /> : index + 1}
                </li>
              )
            })}
          </ol>

          <CowryProgress
            value={streakProgress}
            tone={streak.earned ? "green" : "orange"}
            label="Days active this week"
            ariaNow={streak.daysActive}
            ariaMax={streak.daysRequired}
            className="mt-5"
          />
          <p className="mt-2 text-xs text-[#657080]">
            {streak.earned
              ? "Streak complete. See you next week."
              : `${streak.daysActive} of ${streak.daysRequired} days — ${
                  streak.daysRequired - streak.daysActive
                } more to go.`}
          </p>
        </section>

        <section className="cowry-shine flex flex-col justify-between rounded-3xl bg-[linear-gradient(135deg,#0c2a33_0%,#0b5f68_60%,#00a3a7_100%)] p-6 text-white">
          <div className="relative">
            <p className="text-sm text-white/75">Still on offer today</p>
            <p className="mt-2 flex items-center gap-2.5 text-4xl font-bold">
              <CowryIcon size={34} className="animate-cowry-float" />
              <AnimatedCowries value={onOffer} />
            </p>
          </div>
          <p className="relative mt-4 text-xs text-white/75">
            {openCount > 0
              ? `Across ${openCount} activit${openCount === 1 ? "y" : "ies"} with allowance left, at the rates below.`
              : "You've used today's allowance for everything. It resets tomorrow."}
          </p>
        </section>
      </div>

      <section>
        <h2 className="mb-4 text-lg font-bold">What pays today</h2>
        <ul className="cowry-stagger grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {today.map((row) => {
            const spent = row.remaining === 0
            const used = row.cap ? Math.min(100, (row.used / row.cap) * 100) : 0
            return (
              <li
                key={row.activityType}
                className={cn(
                  "cowry-lift cowry-hover rounded-2xl bg-white p-4 ring-1 ring-[#e2e6ea]",
                  spent && "bg-[#f9fafb]",
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <p className={cn("text-sm font-semibold", spent ? "text-[#657080]" : "text-[#141922]")}>
                    {ACTIVITY_LABELS[row.activityType] ?? row.activityType}
                  </p>
                  <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[#fff4df] px-2 py-0.5 text-xs font-bold text-[#a8793f]">
                    <CowryIcon size={14} className="cowry-wobble" />+{formatCowries(row.value)}
                  </span>
                </div>

                <CowryProgress
                  value={used}
                  tone={spent ? "teal" : "gold"}
                  label={`${ACTIVITY_LABELS[row.activityType] ?? row.activityType}: ${row.used} of ${row.cap} used today`}
                  ariaNow={row.used}
                  ariaMax={row.cap}
                  className="mt-4 h-2"
                />

                <div className="mt-2 flex items-center justify-between text-xs">
                  <span className="tabular-nums text-[#657080]">
                    {row.used} of {row.cap} used
                  </span>
                  {spent ? (
                    <span className="inline-flex items-center gap-1 font-semibold text-[#00868a]">
                      <Check className="size-3.5" aria-hidden="true" />
                      Done for today
                    </span>
                  ) : (
                    <span className="font-semibold tabular-nums text-[#1f9c4c]">{row.remaining} left</span>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
        <p className="mt-4 text-xs text-[#657080]">
          A post is paid once, when you make it. A video that passes 1,000 views watched at
          least halfway earns again on top of that, up to 2,500 Cowries for that video.
        </p>
      </section>
    </div>
  )
}
