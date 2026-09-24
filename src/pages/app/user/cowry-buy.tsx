import { useCallback, useEffect, useRef, useState } from "react"
import { Link, useNavigate, useSearchParams } from "react-router"
import { toast } from "sonner"
import { ArrowLeft, Check, Loader2, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Routes } from "@/routes/constants"
import { getAuthErrorMessage } from "@/utils/auth"
import {
  getPurchasePackages,
  settlePurchase,
  startPurchase,
  type CowryPurchasePackage,
  type CowryPurchaseSettleResult,
} from "@/utils/careconnect/services/cowryService"
import {
  PURCHASE_REFUSAL_MESSAGES,
  formatCowries,
  formatNaira,
  roundTripValue,
} from "@/utils/careconnect/cowry"

/**
 * Buy Cowries.
 *
 * Money leaves a real card here, so the screen's job is that nobody is surprised later.
 * Three figures are shown before the button, not after it: what the card is charged, what
 * the fee takes, and what actually lands in the wallet. The withdrawal fee is disclosed
 * here too — someone who only meets it on the way out reads it as a trick.
 *
 * The return leg matters as much as the outward one. A provider sends the user back with
 * `?purchase=<id>`; the screen picks that up, asks the server to settle, and polls while
 * the provider is still deciding rather than declaring failure early.
 */

/** How long to keep asking while the provider has not settled. */
const POLL_INTERVAL_MS = 2500
const POLL_ATTEMPTS = 8

function BuySkeleton() {
  return (
    <div className="space-y-6 p-5 sm:p-8">
      <Skeleton className="h-6 w-40" />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Skeleton className="h-28 rounded-xl" />
        <Skeleton className="h-28 rounded-xl" />
        <Skeleton className="h-28 rounded-xl" />
        <Skeleton className="h-28 rounded-xl" />
      </div>
      <Skeleton className="h-52 rounded-xl" />
    </div>
  )
}

export default function CowryBuyPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const returningPurchaseId = searchParams.get("purchase")

  const [packages, setPackages] = useState<CowryPurchasePackage[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState<string>("")
  const [starting, setStarting] = useState(false)

  const [settling, setSettling] = useState(Boolean(returningPurchaseId))
  const [settled, setSettled] = useState<CowryPurchaseSettleResult | null>(null)
  const pollCount = useRef(0)

  useEffect(() => {
    let active = true
    ;(async () => {
      setLoading(true)
      try {
        const result = await getPurchasePackages()
        if (!active) return
        setPackages(result)
        setSelectedId(result[1]?.id ?? result[0]?.id ?? "")
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

  /**
   * Settle the purchase the provider sent us back with.
   *
   * Polls while it is pending: a provider that has taken the money but not finished
   * confirming is the common case, and telling the user it failed would be wrong.
   */
  const checkReturn = useCallback(
    async (purchaseId: string) => {
      try {
        const result = await settlePurchase(purchaseId)
        if (result.pending && pollCount.current < POLL_ATTEMPTS) {
          pollCount.current += 1
          setTimeout(() => checkReturn(purchaseId), POLL_INTERVAL_MS)
          return
        }
        setSettled(result)
        setSettling(false)
      } catch (error) {
        toast.error(getAuthErrorMessage(error))
        setSettling(false)
      }
    },
    [],
  )

  useEffect(() => {
    if (!returningPurchaseId) return
    pollCount.current = 0
    setSettling(true)
    checkReturn(returningPurchaseId)
  }, [returningPurchaseId, checkReturn])

  const selected = packages?.find((pkg) => pkg.id === selectedId)

  async function buy() {
    if (!selected) return
    setStarting(true)
    try {
      const returnUrl = `${window.location.origin}${Routes.app.user.cowryBuy}`
      const result = await startPurchase({ packageId: selected.id, returnUrl })

      if (!result.ok) {
        toast.error(PURCHASE_REFUSAL_MESSAGES[result.reason ?? ""] ?? "We couldn't start that purchase.")
        return
      }
      if (result.authorizationUrl) {
        // Leaving the app entirely, so nothing is assumed about the outcome here — the
        // return leg above is what decides it.
        window.location.href = result.authorizationUrl
      }
    } catch (error) {
      toast.error(getAuthErrorMessage(error))
    } finally {
      setStarting(false)
    }
  }

  /* ── coming back from the provider ────────────────────────────────────── */
  if (returningPurchaseId) {
    const credited = settled?.credited || settled?.alreadyCredited
    const stillPending = settling || settled?.pending

    return (
      <div className="animate-fade-in-up space-y-6 p-5 sm:p-8">
        <div className="mx-auto max-w-lg rounded-xl border border-[#e2e2e2] bg-white p-8 text-center">
          <div
            className={`mx-auto flex size-12 items-center justify-center rounded-full ${
              credited ? "bg-[#e2f7e8]" : stillPending ? "bg-[#fff6ec]" : "bg-[#ffe0dd]"
            }`}
          >
            {credited ? (
              <Check className="size-6 text-[#1f9c4c]" aria-hidden="true" />
            ) : stillPending ? (
              <Loader2 className="size-6 animate-spin text-[#d97a2b]" aria-hidden="true" />
            ) : (
              <X className="size-6 text-[#b4372c]" aria-hidden="true" />
            )}
          </div>

          <h1 className="mt-4 text-xl font-bold">
            {credited
              ? "Cowries added"
              : stillPending
                ? "Confirming your payment"
                : "Payment not completed"}
          </h1>

          <p className="mx-auto mt-2 max-w-sm text-sm text-[#657080]">
            {credited && settled?.purchase && (
              <>
                {formatCowries(settled.purchase.creditedCowries)} Cowries are in your
                purchased balance.
              </>
            )}
            {stillPending &&
              "Your bank has the payment. This usually takes a few seconds — we'll add your Cowries as soon as it clears, even if you close this page."}
            {!credited && !stillPending && "Nothing has been charged. You can try again."}
          </p>

          {credited && settled?.purchase && (
            <dl className="mt-5 divide-y divide-[#eef1f3] border-y border-[#eef1f3] text-left text-sm">
              <div className="flex justify-between py-3">
                <dt className="text-[#657080]">Paid</dt>
                <dd className="font-semibold tabular-nums">
                  {formatNaira(settled.purchase.nairaPrice)}
                </dd>
              </div>
              <div className="flex justify-between py-3">
                <dt className="text-[#657080]">Fee</dt>
                <dd className="tabular-nums text-[#565656]">
                  {formatCowries(settled.purchase.feeCowries)} Cowries
                </dd>
              </div>
              <div className="flex justify-between py-3">
                <dt className="font-semibold">Added to your wallet</dt>
                <dd className="font-bold tabular-nums">
                  {formatCowries(settled.purchase.creditedCowries)} Cowries
                </dd>
              </div>
            </dl>
          )}

          {settled?.purchase?.id && (
            <p className="mt-4 font-mono text-xs text-[#657080]">
              Reference {settled.purchase.id}
            </p>
          )}

          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Button onClick={() => navigate(Routes.app.user.cowryWallet)}>Back to wallet</Button>
            {!credited && !stillPending && (
              <Button
                variant="outline"
                onClick={() => {
                  // Drop the query param so the screen returns to the package list.
                  setSearchParams({})
                  setSettled(null)
                }}
              >
                Try again
              </Button>
            )}
          </div>
        </div>
      </div>
    )
  }

  if (loading) return <BuySkeleton />

  if (!packages || packages.length === 0) {
    return (
      <div className="space-y-6 p-5 sm:p-8">
        <h1 className="text-xl font-bold">Buy Cowries</h1>
        <p className="rounded-xl border border-dashed border-[#e2e2e2] p-10 text-center text-sm text-[#657080]">
          Buying Cowries isn&apos;t available yet. You can still earn them by taking part.
        </p>
      </div>
    )
  }

  const roundTrip = selected
    ? roundTripValue(selected.pricing.nairaPrice, selected.depositFeeRate, selected.withdrawalFeeRate)
    : 0

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
        <h1 className="mt-2 text-xl font-bold">Buy Cowries</h1>
        <p className="mt-1 text-sm text-[#657080]">
          Bought Cowries are for sending gifts. They can also go toward mobile data, with a
          fee.
        </p>
      </header>

      <section>
        <h2 className="mb-3 text-sm font-semibold text-[#141922]">Choose an amount</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {packages.map((pkg) => {
            const active = pkg.id === selectedId
            return (
              <button
                key={pkg.id}
                type="button"
                onClick={() => setSelectedId(pkg.id)}
                aria-pressed={active}
                className={`rounded-xl border p-4 text-left transition ${
                  active
                    ? "border-[#0d8de0] bg-[#e0f2ff]"
                    : "border-[#e2e2e2] bg-white hover:border-[#c8cdd4]"
                }`}
              >
                <span className="block text-lg font-bold tabular-nums">
                  {formatCowries(pkg.pricing.credited)}
                </span>
                <span className="block text-xs text-[#657080]">Cowries</span>
                <span className="mt-2 block text-sm font-semibold tabular-nums text-[#565656]">
                  {formatNaira(pkg.pricing.nairaPrice)}
                </span>
              </button>
            )
          })}
        </div>
      </section>

      {selected && (
        <section className="max-w-lg rounded-xl border border-[#e2e2e2] bg-white p-5">
          <h2 className="text-sm font-semibold text-[#141922]">Before you pay</h2>

          <dl className="mt-3 divide-y divide-[#eef1f3] border-y border-[#eef1f3] text-sm">
            <div className="flex justify-between py-3">
              <dt className="text-[#657080]">Your card is charged</dt>
              <dd className="font-semibold tabular-nums">
                {formatNaira(selected.pricing.nairaPrice)}
              </dd>
            </div>
            <div className="flex justify-between py-3">
              <dt className="text-[#657080]">
                Fee ({Math.round(selected.depositFeeRate * 100)}%)
              </dt>
              <dd className="tabular-nums text-[#d97a2b]">
                {formatCowries(selected.pricing.fee)} Cowries
              </dd>
            </div>
            <div className="flex justify-between py-3">
              <dt className="font-semibold">You receive</dt>
              <dd className="text-lg font-bold tabular-nums">
                {formatCowries(selected.pricing.credited)} Cowries
              </dd>
            </div>
          </dl>

          {/* Disclosed here rather than at withdrawal. It is the same number either way;
              only the moment someone learns it decides how it reads. */}
          <div className="mt-4 rounded-lg bg-[#f7f9fb] p-4 text-xs leading-relaxed text-[#657080]">
            <p className="font-semibold text-[#141922]">If you later cash out</p>
            <p className="mt-1">
              Taking money back out carries a{" "}
              {Math.round((selected.withdrawalFeeRate ?? 0) * 100)}% fee. Paying{" "}
              {formatNaira(selected.pricing.nairaPrice)} today and withdrawing the whole
              balance later would return about{" "}
              <span className="font-semibold tabular-nums text-[#565656]">
                {formatNaira(roundTrip)}
              </span>
              . Cowries are worth most when you spend them here.
            </p>
          </div>

          <Button className="mt-5 w-full" onClick={buy} disabled={starting}>
            {starting ? "Opening payment…" : `Pay ${formatNaira(selected.pricing.nairaPrice)}`}
          </Button>

          <p className="mt-3 text-center text-xs text-[#657080]">
            You&apos;ll pay on our payment provider&apos;s page and come straight back.
            Buying is for adults only.
          </p>
        </section>
      )}
    </div>
  )
}
