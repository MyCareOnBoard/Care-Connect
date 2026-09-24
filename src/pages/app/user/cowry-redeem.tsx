import { useEffect, useMemo, useState } from "react"
import { Link, useNavigate } from "react-router"
import { toast } from "sonner"
import { ArrowLeft, Check, Loader2, Smartphone, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { Routes } from "@/routes/constants"
import { getAuthErrorMessage } from "@/utils/auth"
import {
  getRedemptionCatalog,
  redeemForData,
  type CowryDataPackage,
  type CowryRedeemResult,
  type CowryRedemptionCatalog,
  type CowryWalletType,
} from "@/utils/careconnect/services/cowryService"
import {
  REDEEM_REFUSAL_MESSAGES,
  WALLET_LABELS,
  formatCowries,
  isValidNigerianMobile,
} from "@/utils/careconnect/cowry"

/**
 * Redeem Cowries for mobile data.
 *
 * Four steps on one screen rather than four routes: the whole choice fits, and a user
 * deciding between a 500 MB and a 1 GB package should not have to navigate back to
 * compare. The confirm step is separate because it is the last point before Cowries move.
 *
 * Three outcomes, and all three are shown honestly — delivered, failed with the Cowries
 * already back, or still with the provider and the Cowries held.
 */

type Step = "choose" | "confirm" | "result"

/** Wallets that can pay, in the order they should be offered. */
const WALLET_ORDER: CowryWalletType[] = ["reward", "creator", "purchased"]

function RedeemSkeleton() {
  return (
    <div className="space-y-6 p-5 sm:p-8">
      <Skeleton className="h-6 w-40" />
      <Skeleton className="h-32 rounded-xl" />
      <Skeleton className="h-64 rounded-xl" />
    </div>
  )
}

export default function CowryRedeemPage() {
  const navigate = useNavigate()
  const [catalog, setCatalog] = useState<CowryRedemptionCatalog | null>(null)
  const [loading, setLoading] = useState(true)
  const [step, setStep] = useState<Step>("choose")
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<CowryRedeemResult | null>(null)

  const [packageId, setPackageId] = useState<string>("")
  const [network, setNetwork] = useState<string>("")
  const [phoneNumber, setPhoneNumber] = useState("")
  const [walletType, setWalletType] = useState<CowryWalletType>("reward")

  useEffect(() => {
    let active = true
    ;(async () => {
      setLoading(true)
      try {
        const data = await getRedemptionCatalog()
        if (!active) return
        setCatalog(data)
        setPackageId(data.packages[0]?.id ?? "")
        setNetwork(data.networks[0]?.id ?? "")
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

  const selected: CowryDataPackage | undefined = useMemo(
    () => catalog?.packages.find((pkg) => pkg.id === packageId),
    [catalog, packageId],
  )
  const price = selected?.pricing?.[walletType]
  const balance = catalog?.wallet?.[walletType]?.available ?? 0
  const affordable = price ? balance >= price.total : false
  const phoneValid = isValidNigerianMobile(phoneNumber)

  async function submit() {
    if (!selected || !price) return
    setSubmitting(true)
    try {
      const outcome = await redeemForData({
        packageId: selected.id,
        network,
        phoneNumber,
        walletType,
        // Bound to this attempt, so a double tap or a retry cannot reserve twice.
        idempotencyKey: `${selected.id}_${phoneNumber}_${Date.now()}`,
      })
      setResult(outcome)
      setStep("result")
    } catch (error) {
      toast.error(getAuthErrorMessage(error))
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <RedeemSkeleton />

  if (!catalog) {
    return (
      <div className="space-y-6 p-5 sm:p-8">
        <h1 className="text-xl font-bold">Redeem for data</h1>
        <p className="rounded-xl border border-dashed border-[#e2e2e2] p-10 text-center text-sm text-[#657080]">
          We couldn&apos;t load the data packages. Refresh the page to try again.
        </p>
      </div>
    )
  }

  /* ── result ───────────────────────────────────────────────────────────── */
  if (step === "result" && result) {
    const delivered = result.ok && !result.pending && !result.released
    const heldWithProvider = Boolean(result.pending)
    const refused = !result.ok

    return (
      <div className="animate-fade-in-up space-y-6 p-5 sm:p-8">
        <div className="mx-auto max-w-lg rounded-xl border border-[#e2e2e2] bg-white p-8 text-center">
          <div
            className={`mx-auto flex size-12 items-center justify-center rounded-full ${
              delivered ? "bg-[#e2f7e8]" : heldWithProvider ? "bg-[#fff6ec]" : "bg-[#ffe0dd]"
            }`}
          >
            {delivered ? (
              <Check className="size-6 text-[#1f9c4c]" aria-hidden="true" />
            ) : heldWithProvider ? (
              <Loader2 className="size-6 animate-spin text-[#d97a2b]" aria-hidden="true" />
            ) : (
              <X className="size-6 text-[#b4372c]" aria-hidden="true" />
            )}
          </div>

          <h1 className="mt-4 text-xl font-bold">
            {delivered
              ? "Data on its way"
              : heldWithProvider
                ? "Still with the provider"
                : "Not completed"}
          </h1>

          <p className="mx-auto mt-2 max-w-sm text-sm text-[#657080]">
            {delivered &&
              `${result.redemption?.packageLabel} sent to ${result.redemption?.phoneNumber}.`}
            {heldWithProvider &&
              "Your Cowries are being held while we wait. If the provider does not come back within 15 minutes, they are returned to your balance automatically."}
            {result.released &&
              "The delivery did not go through, and your reserved Cowries have already been returned."}
            {refused && REDEEM_REFUSAL_MESSAGES[result.reason ?? "not_eligible"]}
            {refused && result.reason === "insufficient_cowries" && result.required && (
              <>
                {" "}
                You need {formatCowries(result.required)} and have{" "}
                {formatCowries(result.available)}.
              </>
            )}
          </p>

          {result.redemption?.id && (
            <p className="mt-4 font-mono text-xs text-[#657080]">
              Reference {result.redemption.id}
            </p>
          )}

          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Button onClick={() => navigate(Routes.app.user.cowryWallet)}>Back to wallet</Button>
            <Button variant="outline" onClick={() => navigate(Routes.app.user.cowryHistory)}>
              See history
            </Button>
          </div>
        </div>
      </div>
    )
  }

  /* ── confirm ──────────────────────────────────────────────────────────── */
  if (step === "confirm" && selected && price) {
    return (
      <div className="animate-fade-in-up space-y-6 p-5 sm:p-8">
        <button
          type="button"
          onClick={() => setStep("choose")}
          className="inline-flex items-center gap-1 text-sm font-semibold text-[#0d8de0] hover:underline"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          Change
        </button>

        <div className="mx-auto max-w-lg rounded-xl border border-[#e2e2e2] bg-white p-6">
          <h1 className="text-xl font-bold">Confirm your data reward</h1>
          <p className="mt-1 text-sm text-[#657080]">
            Check the number. Data cannot be recalled once it is delivered.
          </p>

          <dl className="mt-5 divide-y divide-[#eef1f3] border-y border-[#eef1f3] text-sm">
            <div className="flex justify-between py-3">
              <dt className="text-[#657080]">Package</dt>
              <dd className="font-semibold">{selected.label}</dd>
            </div>
            <div className="flex justify-between py-3">
              <dt className="text-[#657080]">Network</dt>
              <dd className="font-semibold">
                {catalog.networks.find((n) => n.id === network)?.label}
              </dd>
            </div>
            <div className="flex justify-between py-3">
              <dt className="text-[#657080]">Number</dt>
              <dd className="font-semibold tabular-nums">{phoneNumber}</dd>
            </div>
            <div className="flex justify-between py-3">
              <dt className="text-[#657080]">Paid from</dt>
              <dd className="font-semibold">{WALLET_LABELS[walletType]}</dd>
            </div>
            <div className="flex justify-between py-3">
              <dt className="text-[#657080]">Cost</dt>
              <dd className="font-semibold tabular-nums">{formatCowries(price.cowryCost)}</dd>
            </div>
            {price.fee > 0 && (
              // Shown as its own line rather than folded into the total: a fee the user
              // only discovers by subtracting is a fee they will read as a trick.
              <div className="flex justify-between py-3">
                <dt className="text-[#657080]">Conversion fee (15%)</dt>
                <dd className="font-semibold tabular-nums text-[#d97a2b]">
                  {formatCowries(price.fee)}
                </dd>
              </div>
            )}
            <div className="flex justify-between py-3">
              <dt className="font-semibold">Total Cowries</dt>
              <dd className="text-lg font-bold tabular-nums">{formatCowries(price.total)}</dd>
            </div>
            <div className="flex justify-between py-3">
              <dt className="text-[#657080]">Balance afterwards</dt>
              <dd className="font-semibold tabular-nums text-[#565656]">
                {formatCowries(balance - price.total)}
              </dd>
            </div>
          </dl>

          <Button className="mt-6 w-full" onClick={submit} disabled={submitting}>
            {submitting ? "Sending…" : `Redeem ${selected.label}`}
          </Button>
        </div>
      </div>
    )
  }

  /* ── choose ───────────────────────────────────────────────────────────── */
  const { usage, wallet } = catalog
  const monthlyLeft = Math.max(0, (wallet?.limits?.perMonth ?? 0) - (usage?.month ?? 0))

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
        <h1 className="mt-2 text-xl font-bold">Redeem for data</h1>
        <p className="mt-1 text-sm text-[#657080]">
          {wallet?.canRedeem
            ? `${monthlyLeft} of ${wallet?.limits?.perMonth} data rewards left this month.`
            : "Redeeming is unavailable on this account right now."}
        </p>
      </header>

      <section>
        <h2 className="mb-3 text-sm font-semibold text-[#141922]">Pay from</h2>
        <div className="flex flex-wrap gap-2">
          {WALLET_ORDER.map((type) => {
            const available = wallet?.[type]?.available ?? 0
            const active = walletType === type
            return (
              <button
                key={type}
                type="button"
                onClick={() => setWalletType(type)}
                aria-pressed={active}
                className={`rounded-xl border px-4 py-3 text-left text-sm transition ${
                  active
                    ? "border-[#0d8de0] bg-[#e0f2ff]"
                    : "border-[#e2e2e2] bg-white hover:border-[#c8cdd4]"
                }`}
              >
                <span className="block font-semibold">{WALLET_LABELS[type]}</span>
                <span className="block tabular-nums text-[#657080]">
                  {formatCowries(available)} available
                  {type === "purchased" && " · 15% fee"}
                </span>
              </button>
            )
          })}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold text-[#141922]">Choose a package</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {catalog.packages.map((pkg) => {
            const cost = pkg.pricing?.[walletType]
            const canAfford = cost ? (wallet?.[walletType]?.available ?? 0) >= cost.total : false
            const active = packageId === pkg.id
            return (
              <button
                key={pkg.id}
                type="button"
                onClick={() => setPackageId(pkg.id)}
                aria-pressed={active}
                className={`rounded-xl border p-4 text-left transition ${
                  active
                    ? "border-[#0d8de0] bg-[#e0f2ff]"
                    : "border-[#e2e2e2] bg-white hover:border-[#c8cdd4]"
                }`}
              >
                <span className="block text-lg font-bold">{pkg.label}</span>
                <span className="mt-1 block text-sm tabular-nums text-[#565656]">
                  {formatCowries(cost?.total ?? pkg.cowryCost)} Cowries
                </span>
                {!canAfford && (
                  <span className="mt-1 block text-xs text-[#b4372c]">Not enough yet</span>
                )}
              </button>
            )
          })}
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="cowry-network">Network</Label>
          <div id="cowry-network" className="mt-2 flex flex-wrap gap-2">
            {catalog.networks.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => setNetwork(option.id)}
                aria-pressed={network === option.id}
                className={`rounded-lg border px-3 py-2 text-sm font-medium transition ${
                  network === option.id
                    ? "border-[#0d8de0] bg-[#e0f2ff]"
                    : "border-[#e2e2e2] bg-white hover:border-[#c8cdd4]"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <Label htmlFor="cowry-phone">Phone number</Label>
          <div className="relative mt-2">
            <Smartphone
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#9aa4b2]"
              aria-hidden="true"
            />
            <Input
              id="cowry-phone"
              inputMode="tel"
              autoComplete="tel"
              placeholder="08012345678"
              value={phoneNumber}
              onChange={(event) => setPhoneNumber(event.target.value)}
              className="pl-9"
            />
          </div>
          <p className="mt-1.5 text-xs text-[#657080]">
            A number can only receive data for one account.
          </p>
        </div>
      </section>

      <Button
        className="w-full sm:w-auto"
        disabled={!wallet?.canRedeem || !selected || !affordable || !phoneValid || monthlyLeft === 0}
        onClick={() => setStep("confirm")}
      >
        Continue
      </Button>
    </div>
  )
}
