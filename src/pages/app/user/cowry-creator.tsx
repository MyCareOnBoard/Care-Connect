import { useEffect, useState } from "react"
import { Link } from "react-router"
import { toast } from "sonner"
import { Gift, Lock, ShieldAlert, Smartphone } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { CowryIcon } from "@/components/cowry/CowryIcon"
import {
  AnimatedCowries,
  CowryEmpty,
  CowryLoadError,
  CowryPageHeader,
  CowryProgress,
  CowryScatter,
} from "@/components/cowry/CowryUI"
import { Routes } from "@/routes/constants"
import { getAuthErrorMessage } from "@/utils/auth"
import { formatDate, formatRelative, toDate } from "@/utils/careconnect/types"
import { isCowryPathEnabled } from "@/utils/careconnect/cowryPages"
import {
  getCreatorEarnings,
  listGifts,
  type CowryCreatorEarnings,
  type CowryCreatorHold,
  type CowryGift,
} from "@/utils/careconnect/services/cowryService"
import { GIFT_SET_LABELS, formatCowries } from "@/utils/careconnect/cowry"

/**
 * Creator earnings.
 *
 * What came in from gifts, what can be spent, and — the part that matters — the date each
 * held amount frees up. A creator told only that money is "held" reads it as money being
 * withheld. One told the date, and shown the countdown, reads it as a rule, which is what it
 * is: the window in which the card payment behind the gift could still be reversed.
 */

const DAY_MS = 24 * 60 * 60 * 1000

/** Gift sets get their own tint, so a legendary gift looks like one. */
const SET_TINTS: Record<string, string> = {
  everyday: "bg-[#eef1f3] text-[#565656]",
  warm: "bg-[#fff4df] text-[#a8793f]",
  bold: "bg-[#e0f2ff] text-[#0d8de0]",
  rare: "bg-[#f1e8ff] text-[#7a4fd1]",
  legendary: "bg-[linear-gradient(135deg,#fff1c7,#f3c969)] text-[#7a5310]",
}

function CreatorSkeleton() {
  return (
    <div className="space-y-6 p-5 sm:p-8">
      <Skeleton className="h-8 w-48" />
      <div className="grid gap-4 sm:grid-cols-3">
        <Skeleton className="h-36 rounded-3xl" />
        <Skeleton className="h-36 rounded-2xl" />
        <Skeleton className="h-36 rounded-2xl" />
      </div>
      <Skeleton className="h-64 rounded-2xl" />
    </div>
  )
}

/** Days until a hold frees up, and how far through its window it is. */
function holdCountdown(hold: CowryCreatorHold, holdDays: number) {
  const release = toDate(hold.releaseAt)
  if (!release) return { daysLeft: null, progress: 0 }
  const daysLeft = Math.max(0, Math.ceil((release.getTime() - Date.now()) / DAY_MS))
  const progress = holdDays > 0 ? Math.min(100, ((holdDays - daysLeft) / holdDays) * 100) : 100
  return { daysLeft, progress }
}

export default function CowryCreatorPage() {
  const [earnings, setEarnings] = useState<CowryCreatorEarnings | null>(null)
  const [received, setReceived] = useState<CowryGift[]>([])
  const [loading, setLoading] = useState(true)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let active = true
    ;(async () => {
      setLoading(true)
      try {
        const [summary, gifts] = await Promise.all([
          getCreatorEarnings(),
          listGifts({ direction: "received", limit: 50 }),
        ])
        if (!active) return
        setEarnings(summary)
        setReceived(gifts)
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

  if (loading) return <CreatorSkeleton />

  if (!earnings) {
    return (
      <CowryLoadError
        title="Creator earnings"
        message="We couldn't load your earnings."
        onRetry={() => setAttempt((n) => n + 1)}
      />
    )
  }

  const canRedeem =
    earnings.available > 0 && !earnings.suspended && isCowryPathEnabled(Routes.app.user.cowryRedeem)
  // Soonest first, so the countdown at the top is the next thing to happen.
  const holds = [...earnings.holds].sort(
    (a, b) => (toDate(a.releaseAt)?.getTime() ?? 0) - (toDate(b.releaseAt)?.getTime() ?? 0),
  )
  const nextRelease = holds[0] ? holdCountdown(holds[0], earnings.holdDays).daysLeft : null

  return (
    <div className="animate-fade-in-up space-y-7 p-5 sm:p-8">
      <CowryPageHeader
        title="Creator earnings"
        subtitle="Cowries from gifts people send you. You can redeem them for mobile data."
      />

      {earnings.suspended && (
        <div
          role="status"
          className="flex gap-3 rounded-2xl border border-[#f0b4ae] bg-[#fff1ef] p-4 text-sm text-[#8a2f26]"
        >
          <ShieldAlert className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
          <div>
            <p className="font-semibold">Your creator earnings are frozen</p>
            <p className="mt-1">
              Nothing has been removed. Your balance is held while your account is reviewed, and
              becomes available again once that finishes.
            </p>
          </div>
        </div>
      )}

      <section className="cowry-stagger grid gap-4 sm:grid-cols-3">
        <div className="cowry-shine rounded-3xl bg-[linear-gradient(135deg,#3a1030_0%,#8a2f6e_55%,#c0438f_100%)] p-5 text-white shadow-[0_20px_45px_-26px_rgba(192,67,143,0.9)]">
          <CowryScatter className="opacity-60" />
          <div className="relative">
            <p className="text-sm text-white/75">Ready to use</p>
            <p className="mt-2 flex items-center gap-2 text-4xl font-bold">
              <CowryIcon size={32} className="animate-cowry-pop" />
              <AnimatedCowries value={earnings.available} />
            </p>
            {canRedeem && (
              <Button asChild size="sm" className="mt-4 bg-white text-[#8a2f6e] hover:bg-white">
                <Link to={Routes.app.user.cowryRedeem}>
                  <Smartphone className="size-4" aria-hidden="true" />
                  Redeem for data
                </Link>
              </Button>
            )}
          </div>
        </div>

        <div className="cowry-lift rounded-2xl bg-white p-5 ring-1 ring-[#e2e6ea]">
          <p className="flex items-center gap-1.5 text-sm text-[#657080]">
            <Lock className="size-3.5" aria-hidden="true" />
            Held
          </p>
          <p className="mt-2 text-3xl font-bold text-[#141922]">
            <AnimatedCowries value={earnings.pending} />
          </p>
          <p className="mt-1 text-xs text-[#657080]">
            {nextRelease === null
              ? `Frees up ${earnings.holdDays} days after each gift`
              : nextRelease === 0
                ? "Some frees up today"
                : `Next frees up in ${nextRelease} day${nextRelease === 1 ? "" : "s"}`}
          </p>
        </div>

        <div className="cowry-lift cowry-hover rounded-2xl bg-white p-5 ring-1 ring-[#e2e6ea]">
          <p className="flex items-center gap-1.5 text-sm text-[#657080]">
            <Gift className="cowry-wobble size-3.5" aria-hidden="true" />
            Gifts received
          </p>
          <p className="mt-2 text-3xl font-bold text-[#141922]">
            <AnimatedCowries value={earnings.giftsReceived} />
          </p>
          <p className="mt-1 text-xs text-[#657080]">All time</p>
        </div>
      </section>

      {holds.length > 0 && (
        <section>
          <h2 className="text-lg font-bold">Becoming available</h2>
          {/* Said once, plainly. The hold is a rule with a reason, not a withholding. */}
          <p className="mt-1 max-w-2xl text-sm text-[#657080]">
            Gifts are bought with a card, and a card payment can be reversed for up to{" "}
            {earnings.holdDays} days. Each gift&apos;s Cowries become yours once that window
            closes — nothing needs doing to claim them.
          </p>

          <ul className="cowry-stagger mt-4 space-y-3">
            {holds.map((hold) => {
              const { daysLeft, progress } = holdCountdown(hold, earnings.holdDays)
              return (
                <li key={hold.giftId} className="rounded-2xl bg-white p-4 ring-1 ring-[#e2e6ea]">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-[#141922]">{hold.giftLabel}</p>
                    <p className="flex items-center gap-1 text-sm font-bold tabular-nums text-[#141922]">
                      <CowryIcon size={16} />
                      {formatCowries(hold.amount)}
                    </p>
                  </div>
                  <CowryProgress
                    value={progress}
                    tone="gold"
                    label={`${hold.giftLabel} hold progress`}
                    className="mt-3 h-2"
                  />
                  <p className="mt-2 text-xs text-[#657080]">
                    {daysLeft === null
                      ? "Release date to follow"
                      : daysLeft === 0
                        ? `Available today · ${formatDate(hold.releaseAt)}`
                        : `${daysLeft} day${daysLeft === 1 ? "" : "s"} to go · ${formatDate(hold.releaseAt)}`}
                  </p>
                </li>
              )
            })}
          </ul>
        </section>
      )}

      <section>
        <h2 className="mb-4 text-lg font-bold">Gifts you&apos;ve received</h2>
        {received.length === 0 ? (
          <CowryEmpty title="No gifts yet">
            When someone sends you a gift it appears here, along with the Cowries it earned you.
          </CowryEmpty>
        ) : (
          <ul className="cowry-stagger divide-y divide-[#eef1f3] overflow-hidden rounded-2xl bg-white ring-1 ring-[#e2e6ea]">
            {received.map((gift) => (
              <li key={gift.id} className="flex items-center gap-3 p-4 transition-colors hover:bg-[#f9fafb]">
                <span
                  className={`flex size-10 shrink-0 items-center justify-center rounded-2xl ${
                    SET_TINTS[gift.giftSet] ?? SET_TINTS.everyday
                  }`}
                  title={GIFT_SET_LABELS[gift.giftSet] ?? gift.giftSet}
                >
                  <Gift className="size-5" aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-[#141922]">
                    {gift.giftLabel}
                    <span className="ml-2 font-normal text-[#657080]">
                      from {gift.senderName || "someone"}
                    </span>
                  </p>
                  {gift.message && (
                    <p className="mt-0.5 truncate text-sm italic text-[#565656]">
                      &ldquo;{gift.message}&rdquo;
                    </p>
                  )}
                  <p className="mt-0.5 text-xs text-[#657080]">{formatRelative(gift.createdAt)}</p>
                </div>
                <span className="inline-flex shrink-0 items-center gap-1 text-sm font-bold tabular-nums text-[#1f9c4c]">
                  +<CowryIcon size={14} />
                  {formatCowries(gift.creatorAmount)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
