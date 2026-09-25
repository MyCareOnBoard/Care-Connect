import { useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router"
import { toast } from "sonner"
import { ArrowLeft, Loader2, Smartphone, Wifi } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { CowryAmount, CowryIcon } from "@/components/cowry/CowryIcon"
import {
  ChoiceCard,
  CowryLoadError,
  CowryPageHeader,
  CowryProgress,
  CowryResultCard,
  CowrySteps,
  ReceiptRow,
} from "@/components/cowry/CowryUI"
import { cn } from "@/lib/utils"
import { Routes } from "@/routes/constants"
import { getAuthErrorMessage } from "@/utils/auth"
import {
  getRedemptionCatalog,
  redeemForData,
  type CowryDataPackage,
  type CowryNetwork,
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
 * Choose and confirm on one route rather than several: the whole choice fits, and a user
 * deciding between a 500 MB and a 1 GB package should not have to navigate back to compare.
 * The confirm step is separate because it is the last point before Cowries move.
 *
 * Three outcomes, and all three are shown honestly — delivered, failed with the Cowries
 * already back, or still with the provider and the Cowries held.
 */

type Step = "choose" | "confirm" | "result"

const STEPS = ["Choose", "Confirm", "Done"]
const STEP_INDEX: Record<Step, number> = { choose: 0, confirm: 1, result: 2 }

/** Wallets that can pay, in the order they should be offered. */
const WALLET_ORDER: CowryWalletType[] = ["reward", "creator", "purchased"]

/** Brand colours, as a dot beside each network's name. */
const NETWORK_COLORS: Record<CowryNetwork, string> = {
  mtn: "#ffcc00",
  airtel: "#e40000",
  glo: "#50b651",
  "9mobile": "#006e53",
}

/**
 * The package label split into figure and unit, so the size can be the headline.
 *
 * Splits the backend's own label rather than recomputing from megabytes, so the card can
 * never disagree with what the receipt and the history call the same package.
 */
function dataSize(pkg: CowryDataPackage): { value: string; unit: string } {
  const match = /^\s*([\d.,]+)\s*([a-z]+)\s*$/i.exec(pkg.label ?? "")
  return match ? { value: match[1], unit: match[2].toUpperCase() } : { value: pkg.label, unit: "" }
}

function RedeemSkeleton() {
  return (
    <div className="space-y-6 p-5 sm:p-8">
      <Skeleton className="h-8 w-44" />
      <Skeleton className="h-20 rounded-2xl" />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-36 rounded-2xl" />
        ))}
      </div>
      <Skeleton className="h-28 rounded-2xl" />
    </div>
  )
}

export default function CowryRedeemPage() {
  const navigate = useNavigate()
  const [catalog, setCatalog] = useState<CowryRedemptionCatalog | null>(null)
  const [loading, setLoading] = useState(true)
  const [attempt, setAttempt] = useState(0)
  const [step, setStep] = useState<Step>("choose")
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<CowryRedeemResult | null>(null)

  const [packageId, setPackageId] = useState<string>("")
  const [network, setNetwork] = useState<string>("")
  const [phoneNumber, setPhoneNumber] = useState("")
  const [phoneTouched, setPhoneTouched] = useState(false)
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
  }, [attempt])

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
      <CowryLoadError
        title="Redeem for data"
        message="We couldn't load the data packages."
        onRetry={() => setAttempt((n) => n + 1)}
      />
    )
  }

  const networkLabel = catalog.networks.find((n) => n.id === network)?.label

  /* ── result ───────────────────────────────────────────────────────────── */
  if (step === "result" && result) {
    const delivered = result.ok && !result.pending && !result.released
    const heldWithProvider = Boolean(result.pending)
    const refused = !result.ok

    return (
      <div>
        <div className="flex justify-center px-5 pt-6 sm:px-8">
          <CowrySteps steps={STEPS} current={delivered ? 3 : STEP_INDEX.result} />
        </div>
        <CowryResultCard
          tone={delivered ? "success" : heldWithProvider ? "pending" : "error"}
          celebration="shower"
          title={
            delivered
              ? "Data on its way"
              : heldWithProvider
                ? "Still with the provider"
                : "Not completed"
          }
          reference={result.redemption?.id}
          details={
            delivered && result.redemption ? (
              <>
                <ReceiptRow label="Package">{result.redemption.packageLabel}</ReceiptRow>
                <ReceiptRow label="Sent to">{result.redemption.phoneNumber}</ReceiptRow>
                <ReceiptRow label="Cowries used" strong>
                  <CowryAmount amount={result.redemption.total} size={18} />
                </ReceiptRow>
              </>
            ) : undefined
          }
          actions={
            <>
              <Button onClick={() => navigate(Routes.app.user.cowryWallet)}>Back to wallet</Button>
              {refused ? (
                <Button
                  variant="outline"
                  onClick={() => {
                    setResult(null)
                    setStep("choose")
                  }}
                >
                  Try something else
                </Button>
              ) : (
                <Button variant="outline" onClick={() => navigate(Routes.app.user.cowryHistory)}>
                  See history
                </Button>
              )}
            </>
          }
        >
          {delivered &&
            `${result.redemption?.packageLabel} sent to ${result.redemption?.phoneNumber}. It usually lands within a few minutes.`}
          {heldWithProvider &&
            "Your Cowries are being held while we wait. If the provider does not come back within 15 minutes, they are returned to your balance automatically."}
          {result.released &&
            "The delivery did not go through, and your reserved Cowries have already been returned."}
          {refused && REDEEM_REFUSAL_MESSAGES[result.reason ?? "not_eligible"]}
          {refused && result.reason === "insufficient_cowries" && result.required && (
            <>
              {" "}
              You need {formatCowries(result.required)} and have {formatCowries(result.available)}.
            </>
          )}
        </CowryResultCard>
      </div>
    )
  }

  /* ── confirm ──────────────────────────────────────────────────────────── */
  if (step === "confirm" && selected && price) {
    const size = dataSize(selected)
    return (
      <div className="animate-fade-in-up space-y-6 p-5 sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <button
            type="button"
            onClick={() => setStep("choose")}
            className="group inline-flex items-center gap-1 text-sm font-semibold text-[#00868a] hover:underline"
          >
            <ArrowLeft className="size-4 transition-transform group-hover:-translate-x-0.5" aria-hidden="true" />
            Change
          </button>
          <CowrySteps steps={STEPS} current={STEP_INDEX.confirm} />
        </div>

        <div className="mx-auto max-w-lg overflow-hidden rounded-3xl bg-white shadow-[0_24px_60px_-30px_rgba(16,20,26,0.35)] ring-1 ring-[#e2e6ea]">
          {/* A ticket-style header: what arrives, and where. */}
          <div className="cowry-shine bg-[linear-gradient(135deg,#0c2a33_0%,#0b5f68_60%,#00a3a7_100%)] p-6 text-white">
            <div className="relative flex items-center justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-wide text-white/70">You&apos;re getting</p>
                <p className="mt-1 text-4xl font-bold">
                  {size.value}
                  <span className="ml-1 text-xl font-semibold text-white/80">{size.unit}</span>
                </p>
                <p className="mt-1 flex flex-wrap items-center gap-1.5 text-sm text-white/80">
                  <span
                    className="size-2.5 rounded-full"
                    style={{ background: NETWORK_COLORS[network as CowryNetwork] ?? "#fff" }}
                    aria-hidden="true"
                  />
                  {networkLabel} · <span className="tabular-nums">{phoneNumber}</span>
                </p>
              </div>
              <Wifi className="size-12 text-white/30" aria-hidden="true" />
            </div>
          </div>

          <div className="p-6">
            <h1 className="text-lg font-bold">Confirm your data reward</h1>
            <p className="mt-1 text-sm text-[#657080]">
              Check the number. Data cannot be recalled once it is delivered.
            </p>

            <dl className="mt-4 divide-y divide-[#eef1f3] border-y border-[#eef1f3] text-sm">
              <ReceiptRow label="Paid from">{WALLET_LABELS[walletType]}</ReceiptRow>
              <ReceiptRow label="Cost">
                <CowryAmount amount={price.cowryCost} size={14} />
              </ReceiptRow>
              {price.fee > 0 && (
                // Shown as its own line rather than folded into the total: a fee the user
                // only discovers by subtracting is a fee they will read as a trick.
                <ReceiptRow label="Conversion fee (15%)" tone="fee">
                  {formatCowries(price.fee)}
                </ReceiptRow>
              )}
              <ReceiptRow label="Total Cowries" strong>
                <CowryAmount amount={price.total} size={18} />
              </ReceiptRow>
              <ReceiptRow label="Balance afterwards">
                <span className="text-[#565656]">{formatCowries(balance - price.total)}</span>
              </ReceiptRow>
            </dl>

            <Button className="cowry-press mt-6 h-12 w-full text-base" onClick={submit} disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                  Sending…
                </>
              ) : (
                `Redeem ${selected.label}`
              )}
            </Button>
          </div>
        </div>
      </div>
    )
  }

  /* ── choose ───────────────────────────────────────────────────────────── */
  const { usage, wallet } = catalog
  const perMonth = wallet?.limits?.perMonth ?? 0
  const monthlyLeft = Math.max(0, perMonth - (usage?.month ?? 0))
  const showPhoneError = phoneTouched && phoneNumber !== "" && !phoneValid

  // Say why Continue is off, instead of leaving a grey button to be puzzled over.
  const blocker = !wallet?.canRedeem
    ? "Redeeming is unavailable on this account right now."
    : monthlyLeft === 0
      ? "You've used all your data rewards for this month."
      : !selected
        ? "Choose a package."
        : !affordable
          ? `You need ${formatCowries((price?.total ?? 0) - balance)} more ${WALLET_LABELS[walletType]} for this package.`
          : !phoneValid
            ? "Enter the Nigerian mobile number to send the data to."
            : null

  return (
    <div className="animate-fade-in-up space-y-7 p-5 sm:p-8">
      <CowryPageHeader
        title="Redeem for data"
        subtitle={
          wallet?.canRedeem
            ? `${monthlyLeft} of ${perMonth} data rewards left this month.`
            : "Redeeming is unavailable on this account right now."
        }
        aside={<CowrySteps steps={STEPS} current={STEP_INDEX.choose} />}
      />

      <section>
        <h2 className="mb-3 text-sm font-semibold text-[#141922]">1. Pay from</h2>
        <div className="cowry-stagger grid gap-3 sm:grid-cols-3">
          {WALLET_ORDER.map((type) => {
            const available = wallet?.[type]?.available ?? 0
            return (
              <ChoiceCard key={type} selected={walletType === type} onSelect={() => setWalletType(type)}>
                <span className="block text-sm font-semibold text-[#141922]">{WALLET_LABELS[type]}</span>
                <span className="mt-2 flex items-center gap-1.5 text-xl font-bold text-[#141922]">
                  <CowryIcon size={18} className="cowry-wobble" />
                  <span className="tabular-nums">{formatCowries(available)}</span>
                </span>
                <span className="mt-0.5 block text-xs text-[#657080]">
                  available{type === "purchased" && " · 15% conversion fee"}
                </span>
              </ChoiceCard>
            )
          })}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold text-[#141922]">2. Choose a package</h2>
        <div className="cowry-stagger grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {catalog.packages.map((pkg) => {
            const cost = pkg.pricing?.[walletType]
            const total = cost?.total ?? pkg.cowryCost
            const canAfford = cost ? balance >= cost.total : false
            const reach = total > 0 ? Math.min(100, (balance / total) * 100) : 0
            const size = dataSize(pkg)
            return (
              <ChoiceCard
                key={pkg.id}
                selected={packageId === pkg.id}
                onSelect={() => setPackageId(pkg.id)}
                muted={!canAfford}
              >
                <Wifi className="size-5 text-[#00b4b8]" aria-hidden="true" />
                <span className="mt-2 block text-3xl font-bold text-[#141922]">
                  {size.value}
                  <span className="ml-1 text-base font-semibold text-[#657080]">{size.unit}</span>
                </span>
                <span className="mt-1 block text-sm font-semibold text-[#565656]">
                  <CowryAmount amount={total} size={14} />
                </span>
                {canAfford ? (
                  <span className="mt-3 block text-xs font-semibold text-[#1f9c4c]">You can afford this</span>
                ) : (
                  <span className="mt-3 block">
                    <CowryProgress value={reach} tone="gold" label={`${Math.round(reach)}% of the way to ${pkg.label}`} className="h-1.5" />
                    <span className="mt-1 block text-xs text-[#8a94a3]">
                      {formatCowries(total - balance)} to go
                    </span>
                  </span>
                )}
              </ChoiceCard>
            )
          })}
        </div>
      </section>

      <section className="grid gap-5 rounded-2xl bg-white p-5 ring-1 ring-[#e2e6ea] sm:grid-cols-2">
        <div>
          <p id="cowry-network-label" className="text-sm font-semibold text-[#141922]">
            3. Network
          </p>
          <div role="group" aria-labelledby="cowry-network-label" className="mt-2 flex flex-wrap gap-2">
            {catalog.networks.map((option) => {
              const active = network === option.id
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setNetwork(option.id)}
                  aria-pressed={active}
                  className={cn(
                    "cowry-press inline-flex items-center gap-2 rounded-full border-2 px-4 py-2 text-sm font-semibold transition",
                    active
                      ? "border-[#00b4b8] bg-[#effbfb] text-[#141922]"
                      : "border-[#e2e6ea] bg-white text-[#565656] hover:border-[#c8cdd4]",
                  )}
                >
                  <span
                    className={cn("size-3 rounded-full transition-transform", active && "scale-125")}
                    style={{ background: NETWORK_COLORS[option.id] ?? "#9aa4b2" }}
                    aria-hidden="true"
                  />
                  {option.label}
                </button>
              )
            })}
          </div>
        </div>

        <div>
          <Label htmlFor="cowry-phone" className="text-sm font-semibold text-[#141922]">
            4. Phone number
          </Label>
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
              onBlur={() => setPhoneTouched(true)}
              aria-invalid={showPhoneError || undefined}
              aria-describedby="cowry-phone-help"
              className={cn("pl-9", phoneValid && "border-[#1f9c4c]")}
            />
          </div>
          <p
            id="cowry-phone-help"
            className={cn("mt-1.5 text-xs", showPhoneError ? "text-[#b4372c]" : "text-[#657080]")}
          >
            {showPhoneError
              ? "That doesn't look like a Nigerian mobile number, e.g. 08012345678."
              : "A number can only receive data for one account."}
          </p>
        </div>
      </section>

      <div data-floating-actions className="sticky bottom-4 z-10 flex flex-wrap items-center gap-4 rounded-2xl bg-white/90 p-4 shadow-[0_12px_40px_-20px_rgba(16,20,26,0.5)] ring-1 ring-[#e2e6ea] backdrop-blur">
        <div className="min-w-0 flex-1 text-sm">
          {blocker ? (
            <p className="text-[#657080]">{blocker}</p>
          ) : (
            <p className="text-[#141922]">
              <span className="font-semibold">{selected?.label}</span> for{" "}
              <CowryAmount amount={price?.total} size={14} className="font-semibold" />
            </p>
          )}
        </div>
        <Button className="cowry-press px-8" disabled={Boolean(blocker)} onClick={() => setStep("confirm")}>
          Continue
        </Button>
      </div>
    </div>
  )
}
