import { useCallback, useEffect, useRef, useState } from "react"
import { useNavigate, useSearchParams } from "react-router"
import { toast } from "sonner"
import { Info, Loader2, Lock, ShieldCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { CowryAmount, CowryIcon } from "@/components/cowry/CowryIcon"
import {
  AnimatedCowries,
  ChoiceCard,
  CowryEmpty,
  CowryLoadError,
  CowryPageHeader,
  CowryResultCard,
  ReceiptRow,
} from "@/components/cowry/CowryUI"
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
    <div className="p-5 space-y-6 sm:p-8">
      <Skeleton className="w-40 h-8" />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-36 rounded-2xl" />
        ))}
      </div>
      <Skeleton className="h-64 rounded-3xl" />
    </div>
  )
}

/** A pile of shells that grows with the package, so bigger reads as bigger at a glance. */
function ShellStack({ count }: { count: number }) {
  return (
    <span className="flex items-end h-8" aria-hidden="true">
      {Array.from({ length: count }).map((_, i) => (
        <CowryIcon
          key={i}
          size={26}
          className="cowry-wobble -ml-2.5 first:ml-0"
        />
      ))}
    </span>
  )
}

export default function CowryBuyPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const returningPurchaseId = searchParams.get("purchase")

  const [packages, setPackages] = useState<CowryPurchasePackage[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [attempt, setAttempt] = useState(0)
  const [selectedId, setSelectedId] = useState<string>("")
  const [starting, setStarting] = useState(false)

  const [settling, setSettling] = useState(Boolean(returningPurchaseId))
  const [settled, setSettled] = useState<CowryPurchaseSettleResult | null>(null)
  const pollCount = useRef(0)
  const pollTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const mounted = useRef(true)

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
      if (pollTimer.current) clearTimeout(pollTimer.current)
    }
  }, [])

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
  }, [attempt])

  /**
   * Settle the purchase the provider sent us back with.
   *
   * Polls while it is pending: a provider that has taken the money but not finished
   * confirming is the common case, and telling the user it failed would be wrong. The
   * timer is tracked so leaving the page stops the polling.
   */
  const checkReturn = useCallback(async (purchaseId: string) => {
    try {
      const result = await settlePurchase(purchaseId)
      if (!mounted.current) return
      if (result.pending && pollCount.current < POLL_ATTEMPTS) {
        pollCount.current += 1
        pollTimer.current = setTimeout(() => checkReturn(purchaseId), POLL_INTERVAL_MS)
        return
      }
      setSettled(result)
      setSettling(false)
    } catch (error) {
      if (!mounted.current) return
      toast.error(getAuthErrorMessage(error))
      setSettling(false)
    }
  }, [])

  useEffect(() => {
    if (!returningPurchaseId) return
    pollCount.current = 0
    setSettling(true)
    checkReturn(returningPurchaseId)
    return () => {
      if (pollTimer.current) clearTimeout(pollTimer.current)
    }
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
    const credited = Boolean(settled?.credited || settled?.alreadyCredited)
    const stillPending = settling || Boolean(settled?.pending)

    return (
      <CowryResultCard
        tone={credited ? "success" : stillPending ? "pending" : "error"}
        celebration="shower"
        title={credited ? "Cowries added" : stillPending ? "Confirming your payment" : "Payment not completed"}
        reference={settled?.purchase?.id}
        details={
          credited && settled?.purchase ? (
            <>
              <ReceiptRow label="Paid">{formatNaira(settled.purchase.nairaPrice)}</ReceiptRow>
              <ReceiptRow label="Fee">
                <span className="text-[#565656]">{formatCowries(settled.purchase.feeCowries)} Cowries</span>
              </ReceiptRow>
              <ReceiptRow label="Added to your wallet" strong>
                <span className="inline-flex items-center gap-1.5">
                  <CowryIcon size={18} />
                  <AnimatedCowries value={settled.purchase.creditedCowries} />
                </span>
              </ReceiptRow>
            </>
          ) : undefined
        }
        actions={
          <>
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
          </>
        }
      >
        {credited && settled?.purchase && (
          <>{formatCowries(settled.purchase.creditedCowries)} Cowries are in your purchased balance, ready to send as gifts.</>
        )}
        {stillPending &&
          "Your bank has the payment. This usually takes a few seconds — we'll add your Cowries as soon as it clears, even if you close this page."}
        {!credited && !stillPending && "Nothing has been charged. You can try again."}
      </CowryResultCard>
    )
  }

  if (loading) return <BuySkeleton />

  if (!packages) {
    return (
      <CowryLoadError
        title="Buy Cowries"
        message="We couldn't load the Cowry packages."
        onRetry={() => setAttempt((n) => n + 1)}
      />
    )
  }

  if (packages.length === 0) {
    return (
      <div className="p-5 space-y-6 animate-fade-in-up sm:p-8">
        <CowryPageHeader title="Buy Cowries" />
        <CowryEmpty title="Buying Cowries isn't available yet">
          You can still earn them by taking part.
        </CowryEmpty>
      </div>
    )
  }

  const roundTrip = selected
    ? roundTripValue(selected.pricing.nairaPrice, selected.depositFeeRate, selected.withdrawalFeeRate)
    : 0

  return (
    <div className="p-5 animate-fade-in-up space-y-7 sm:p-8">
      <CowryPageHeader
        title="Buy Cowries"
        subtitle="Bought Cowries are for sending gifts. They can also go toward mobile data, with a fee."
      />

      <section>
        <h2 className="mb-3 text-sm font-semibold text-[#141922]">Choose an amount</h2>
        <div className="grid gap-3 cowry-stagger sm:grid-cols-2 lg:grid-cols-4">
          {packages.map((pkg, index) => (
            <ChoiceCard key={pkg.id} selected={pkg.id === selectedId} onSelect={() => setSelectedId(pkg.id)}>
              <ShellStack count={Math.min(4, index + 1)} />
              <span className="mt-3 block text-2xl font-bold tabular-nums text-[#141922]">
                {formatCowries(pkg.pricing.credited)}
              </span>
              <span className="block text-xs text-[#657080]">Cowries</span>
              <span className="mt-3 inline-block rounded-full bg-[#eef1f3] px-3 py-1 text-sm font-bold tabular-nums text-[#141922]">
                {formatNaira(pkg.pricing.nairaPrice)}
              </span>
            </ChoiceCard>
          ))}
        </div>
      </section>

      {selected && (
        <section
          key={selected.id}
          className="animate-fade-in-up grid gap-5 rounded-3xl bg-white p-5 ring-1 ring-[#e2e6ea] sm:p-6 lg:grid-cols-[1fr_1fr]"
        >
          <div>
            <h2 className="text-sm font-semibold text-[#141922]">Before you pay</h2>
            <dl className="mt-3 divide-y divide-[#eef1f3] border-y border-[#eef1f3] text-sm">
              <ReceiptRow label="Your card is charged">{formatNaira(selected.pricing.nairaPrice)}</ReceiptRow>
              <ReceiptRow label={`Fee (${Math.round(selected.depositFeeRate * 100)}%)`} tone="fee">
                {formatCowries(selected.pricing.fee)} Cowries
              </ReceiptRow>
              <ReceiptRow label="You receive" strong>
                <CowryAmount amount={selected.pricing.credited} size={18} />
              </ReceiptRow>
            </dl>

            <Button className="w-full h-12 mt-5 text-base cowry-press bg-[#00b4b8] hover:bg-[#0b7bc8]" onClick={buy} >
              {starting ? (
                <>
                  <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                  Opening payment…
                </>
              ) : (
                <>
                  <Lock className="size-4" aria-hidden="true" />
                  Pay {formatNaira(selected.pricing.nairaPrice)}
                </>
              )}
            </Button>
            <p className="mt-3 flex items-center justify-center gap-1.5 text-center text-xs text-[#657080]">
              <ShieldCheck className="size-3.5 text-[#1f9c4c]" aria-hidden="true" />
              You&apos;ll pay on our payment provider&apos;s page and come straight back. Adults only.
            </p>
          </div>

          {/* Disclosed here rather than at withdrawal. It is the same number either way;
              only the moment someone learns it decides how it reads. */}
          <div className="rounded-2xl bg-[#f7f9fb] p-5 text-sm leading-relaxed text-[#657080]">
            <p className="flex items-center gap-2 font-semibold text-[#141922]">
              <Info className="size-4 text-[#0d8de0]" aria-hidden="true" />
              If you later cash out
            </p>
            <p className="mt-2">
              Taking money back out carries a {Math.round((selected.withdrawalFeeRate ?? 0) * 100)}% fee.
            </p>
            <div className="flex items-center gap-2 mt-4 text-xs text-center">
              <div className="flex-1 rounded-xl bg-white p-3 ring-1 ring-[#e2e6ea]">
                <p className="text-[#8a94a3]">You pay</p>
                <p className="mt-0.5 text-base font-bold tabular-nums text-[#141922]">
                  {formatNaira(selected.pricing.nairaPrice)}
                </p>
              </div>
              <span className="text-[#9aa4b2]" aria-hidden="true">→</span>
              <div className="flex-1 rounded-xl bg-white p-3 ring-1 ring-[#e2e6ea]">
                <p className="text-[#8a94a3]">Back out, about</p>
                <p className="mt-0.5 text-base font-bold tabular-nums text-[#d97a2b]">{formatNaira(roundTrip)}</p>
              </div>
            </div>
            <p className="mt-4 text-xs">Cowries are worth most when you spend them here.</p>
          </div>
        </section>
      )}
    </div>
  )
}
