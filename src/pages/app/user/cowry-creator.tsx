import { useEffect, useState } from "react"
import { Link } from "react-router"
import { toast } from "sonner"
import { ArrowLeft, Gift, Lock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Routes } from "@/routes/constants"
import { getAuthErrorMessage } from "@/utils/auth"
import { formatDate, formatRelative } from "@/utils/careconnect/types"
import {
  getCreatorEarnings,
  listGifts,
  type CowryCreatorEarnings,
  type CowryGift,
} from "@/utils/careconnect/services/cowryService"
import { formatCowries } from "@/utils/careconnect/cowry"

/**
 * Creator earnings.
 *
 * What came in from gifts, what can be spent, and — the part that matters — the date each
 * held amount frees up. A creator told only that money is "held" reads it as money being
 * withheld. One told the date reads it as a rule, which is what it is: the window in which
 * the card payment behind the gift could still be reversed.
 */

function CreatorSkeleton() {
  return (
    <div className="space-y-6 p-5 sm:p-8">
      <Skeleton className="h-6 w-44" />
      <div className="grid gap-4 sm:grid-cols-3">
        <Skeleton className="h-24 rounded-xl" />
        <Skeleton className="h-24 rounded-xl" />
        <Skeleton className="h-24 rounded-xl" />
      </div>
      <Skeleton className="h-64 rounded-xl" />
    </div>
  )
}

export default function CowryCreatorPage() {
  const [earnings, setEarnings] = useState<CowryCreatorEarnings | null>(null)
  const [received, setReceived] = useState<CowryGift[]>([])
  const [loading, setLoading] = useState(true)

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
  }, [])

  if (loading) return <CreatorSkeleton />

  if (!earnings) {
    return (
      <div className="space-y-6 p-5 sm:p-8">
        <h1 className="text-xl font-bold">Creator earnings</h1>
        <p className="rounded-xl border border-dashed border-[#e2e2e2] p-10 text-center text-sm text-[#657080]">
          We couldn&apos;t load your earnings. Refresh the page to try again.
        </p>
      </div>
    )
  }

  const nothingYet = earnings.giftsReceived === 0

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
        <h1 className="mt-2 text-xl font-bold">Creator earnings</h1>
        <p className="mt-1 text-sm text-[#657080]">
          Cowries from gifts people send you. You can redeem them for mobile data.
        </p>
      </header>

      {earnings.suspended && (
        <div
          role="status"
          className="rounded-xl border border-[#f0b4ae] bg-[#fff1ef] p-4 text-sm text-[#8a2f26]"
        >
          <p className="font-semibold">Your creator earnings are frozen</p>
          <p className="mt-1">
            Nothing has been removed. Your balance is held while your account is reviewed, and
            becomes available again once that finishes.
          </p>
        </div>
      )}

      <section className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-[#e2e2e2] bg-white p-5">
          <p className="text-sm text-[#657080]">Ready to use</p>
          <p className="mt-1 text-3xl font-bold tabular-nums text-[#141922]">
            {formatCowries(earnings.available)}
          </p>
          {earnings.available > 0 && !earnings.suspended && (
            <Button asChild size="sm" className="mt-3">
              <Link to={Routes.app.user.cowryRedeem}>Redeem for data</Link>
            </Button>
          )}
        </div>

        <div className="rounded-xl border border-[#e2e2e2] bg-white p-5">
          <div className="flex items-center gap-1.5">
            <Lock className="size-3.5 text-[#657080]" aria-hidden="true" />
            <p className="text-sm text-[#657080]">Held</p>
          </div>
          <p className="mt-1 text-3xl font-bold tabular-nums text-[#141922]">
            {formatCowries(earnings.pending)}
          </p>
          <p className="mt-1 text-xs text-[#657080]">
            Frees up {earnings.holdDays} days after each gift
          </p>
        </div>

        <div className="rounded-xl border border-[#e2e2e2] bg-white p-5">
          <p className="text-sm text-[#657080]">Gifts received</p>
          <p className="mt-1 text-3xl font-bold tabular-nums text-[#141922]">
            {earnings.giftsReceived}
          </p>
        </div>
      </section>

      {/* Said once, plainly. The hold is a rule with a reason, not a withholding. */}
      {earnings.pending > 0 && (
        <section className="rounded-xl border border-[#e2e2e2] bg-[#f7f9fb] p-5">
          <h2 className="text-sm font-semibold text-[#141922]">Why some Cowries are held</h2>
          <p className="mt-2 text-sm leading-relaxed text-[#657080]">
            Gifts are bought with a card, and a card payment can be reversed for up to{" "}
            {earnings.holdDays} days. Each gift&apos;s Cowries become yours to spend once that
            window closes — the dates are below, and nothing needs doing to claim them.
          </p>
        </section>
      )}

      {earnings.holds.length > 0 && (
        <section>
          <h2 className="mb-4 text-xl font-bold">Becoming available</h2>
          <div className="overflow-x-auto rounded-xl border border-[#e2e2e2]">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-[#e2e2e2] text-[#657080]">
                <tr>
                  <th className="px-4 py-3 font-semibold">Gift</th>
                  <th className="px-4 py-3 text-right font-semibold">Cowries</th>
                  <th className="px-4 py-3 font-semibold">Available on</th>
                </tr>
              </thead>
              <tbody>
                {earnings.holds.map((hold) => (
                  <tr key={hold.giftId} className="border-b border-[#eef1f3] last:border-0">
                    <td className="px-4 py-3 font-medium">{hold.giftLabel}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-[#565656]">
                      {formatCowries(hold.amount)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-[#565656]">
                      {formatDate(hold.releaseAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <section>
        <h2 className="mb-4 text-xl font-bold">Gifts you&apos;ve received</h2>
        {nothingYet ? (
          <div className="rounded-xl border border-dashed border-[#e2e2e2] p-10 text-center">
            <Gift className="mx-auto size-6 text-[#9aa4b2]" aria-hidden="true" />
            <p className="mt-3 text-sm font-medium text-[#141922]">No gifts yet</p>
            <p className="mx-auto mt-2 max-w-md text-sm text-[#657080]">
              When someone sends you a gift it appears here, along with the Cowries it earned
              you.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-[#eef1f3] rounded-xl border border-[#e2e2e2] bg-white">
            {received.map((gift) => (
              <li key={gift.id} className="flex items-start justify-between gap-4 p-4">
                <div className="min-w-0">
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
                  <p className="mt-0.5 text-xs text-[#657080]">
                    {formatRelative(gift.createdAt)}
                  </p>
                </div>
                <span className="shrink-0 text-sm font-semibold tabular-nums text-[#1f9c4c]">
                  +{formatCowries(gift.creatorAmount)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
