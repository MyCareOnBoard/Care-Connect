import { useEffect, useState } from "react"
import { Link, useNavigate } from "react-router"
import { toast } from "sonner"
import { ArrowLeft, Building2, Info, Landmark, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { CowryAmount, CowryIcon } from "@/components/cowry/CowryIcon"
import {
  CowryLoadError,
  CowryPageHeader,
  CowryResultCard,
  CowrySteps,
  ReceiptRow,
} from "@/components/cowry/CowryUI"
import { cn } from "@/lib/utils"
import { Routes } from "@/routes/constants"
import { getAuthErrorMessage } from "@/utils/auth"
import { isCowryPathEnabled } from "@/utils/careconnect/cowryPages"
import {
  getWithdrawalQuote,
  requestWithdrawal,
  type CowryWithdrawalQuote,
  type CowryWithdrawalResult,
} from "@/utils/careconnect/services/cowryService"
import {
  NIGERIAN_BANKS,
  WITHDRAWAL_REFUSAL_MESSAGES,
  formatCowries,
  formatNaira,
  isValidAccountNumber,
} from "@/utils/careconnect/cowry"

/**
 * Cash out.
 *
 * The screen has to handle a state the others do not: withdrawal is genuinely unavailable
 * until finance sets the Cowry value, because there is no honest naira figure to show. So
 * the first thing it does is ask, and if the rate is unset it says so plainly rather than
 * offering a form that can only fail.
 *
 * When it is available, the net amount is the largest figure on the screen and the fee is
 * its own line. Someone cashing out should not have to subtract to learn what they get.
 */

type Step = "amount" | "confirm" | "result"

const STEPS = ["Amount", "Confirm", "Done"]
const STEP_INDEX: Record<Step, number> = { amount: 0, confirm: 1, result: 2 }

/** Debounce on the quote, so typing an amount does not hammer the endpoint. */
const QUOTE_DEBOUNCE_MS = 400

function WithdrawSkeleton() {
  return (
    <div className="space-y-6 p-5 sm:p-8">
      <Skeleton className="h-8 w-40" />
      <Skeleton className="h-56 rounded-3xl" />
      <Skeleton className="h-52 rounded-2xl" />
    </div>
  )
}

export default function CowryWithdrawPage() {
  const navigate = useNavigate()

  const [initial, setInitial] = useState<CowryWithdrawalQuote | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadFailed, setLoadFailed] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const [step, setStep] = useState<Step>("amount")

  const [amount, setAmount] = useState("")
  const [quote, setQuote] = useState<CowryWithdrawalQuote | null>(null)
  const [quoting, setQuoting] = useState(false)

  const [accountNumber, setAccountNumber] = useState("")
  const [bankCode, setBankCode] = useState("")
  const [accountName, setAccountName] = useState("")

  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<CowryWithdrawalResult | null>(null)

  // One opening call, both to learn the balance and to find out whether cashing out is
  // possible at all. The minimum doubles as a sensible default amount.
  useEffect(() => {
    let active = true
    ;(async () => {
      setLoading(true)
      setLoadFailed(false)
      try {
        const opening = await getWithdrawalQuote(1)
        if (!active) return
        setInitial(opening)
        if (opening.rateSet) setAmount(String(Math.min(opening.available, opening.minimumCowries)))
      } catch (error) {
        toast.error(getAuthErrorMessage(error))
        // Kept apart from "rate not set": a dropped connection is not a policy, and
        // telling someone cashing out is unavailable when it is not would be wrong.
        if (active) setLoadFailed(true)
      } finally {
        if (active) setLoading(false)
      }
    })()
    return () => {
      active = false
    }
  }, [attempt])

  // Requote as the amount changes. Server-side, so the fee shown is the fee charged.
  useEffect(() => {
    const cowries = Number(amount)
    if (!initial?.rateSet || !Number.isFinite(cowries) || cowries < 1) {
      setQuote(null)
      return
    }
    let active = true
    setQuoting(true)
    const timer = setTimeout(async () => {
      try {
        const next = await getWithdrawalQuote(cowries)
        if (active) setQuote(next)
      } catch {
        // A failed quote clears the figures rather than leaving a stale one on screen,
        // which also keeps Continue off until a fresh quote arrives.
        if (active) setQuote(null)
      } finally {
        if (active) setQuoting(false)
      }
    }, QUOTE_DEBOUNCE_MS)
    return () => {
      active = false
      clearTimeout(timer)
    }
  }, [amount, initial?.rateSet])

  async function submit() {
    if (!quote) return
    setSubmitting(true)
    try {
      const outcome = await requestWithdrawal({
        cowries: quote.cowries,
        destination: { accountNumber, bankCode, accountName },
        idempotencyKey: `${quote.cowries}_${accountNumber}_${Date.now()}`,
      })
      setResult(outcome)
      setStep("result")
    } catch (error) {
      toast.error(getAuthErrorMessage(error))
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <WithdrawSkeleton />

  if (loadFailed) {
    return (
      <CowryLoadError
        title="Cash out"
        message="We couldn't check your balance or today's rate."
        onRetry={() => setAttempt((n) => n + 1)}
      />
    )
  }

  /* ── not available yet ────────────────────────────────────────────────── */
  if (!initial || !initial.rateSet) {
    return (
      <div className="animate-fade-in-up space-y-6 p-5 sm:p-8">
        <CowryPageHeader title="Cash out" />
        <div className="max-w-lg rounded-3xl bg-white p-6 ring-1 ring-[#e2e6ea]">
          <div className="flex items-start gap-4">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-[#e0f2ff]">
              <Info className="size-5 text-[#0d8de0]" aria-hidden="true" />
            </span>
            <div>
              <p className="font-semibold text-[#141922]">Cashing out isn&apos;t available yet</p>
              <p className="mt-2 text-sm leading-relaxed text-[#657080]">
                We haven&apos;t set what a Cowry is worth in naira, so we can&apos;t tell you
                what a withdrawal would pay — and we&apos;d rather say that than show you a
                number we&apos;d have to change.
              </p>
              <p className="mt-2 text-sm leading-relaxed text-[#657080]">
                Your bought Cowries are safe. You can send gifts with them, or put them
                toward mobile data, today.
              </p>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            {isCowryPathEnabled(Routes.app.user.cowryRedeem) && (
              <Button asChild>
                <Link to={Routes.app.user.cowryRedeem}>Redeem for data</Link>
              </Button>
            )}
            <Button asChild variant="outline">
              <Link to={Routes.app.user.cowryWallet}>Back to wallet</Link>
            </Button>
          </div>
        </div>
      </div>
    )
  }

  /* ── result ───────────────────────────────────────────────────────────── */
  if (step === "result" && result) {
    const paid = Boolean(result.paid)
    const pending = Boolean(result.pending)
    const refused = !result.ok

    return (
      <div>
        <div className="flex justify-center px-5 pt-6 sm:px-8">
          <CowrySteps steps={STEPS} current={paid ? 3 : STEP_INDEX.result} />
        </div>
        <CowryResultCard
          tone={paid ? "success" : pending ? "pending" : "error"}
          celebration="shower"
          title={paid ? "Money sent" : pending ? "Sending to your bank" : "Not completed"}
          reference={result.withdrawal?.id}
          details={
            paid && result.withdrawal ? (
              <>
                <ReceiptRow label="Cowries used">{formatCowries(result.withdrawal.cowries)}</ReceiptRow>
                <ReceiptRow label="Fee">
                  <span className="text-[#565656]">{formatNaira(result.withdrawal.feeNaira)}</span>
                </ReceiptRow>
                <ReceiptRow label="Sent to your bank" strong>
                  {formatNaira(result.withdrawal.netNaira)}
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
                    setStep("amount")
                  }}
                >
                  Change details
                </Button>
              ) : (
                <Button variant="outline" onClick={() => navigate(Routes.app.user.cowryHistory)}>
                  See history
                </Button>
              )}
            </>
          }
        >
          {paid &&
            `${formatNaira(result.withdrawal?.netNaira)} is on its way to your ${accountName || "bank"} account.`}
          {pending &&
            "Your bank hasn't confirmed yet. If it doesn't go through, your Cowries come back automatically within half an hour."}
          {result.released &&
            "Your bank didn't accept the transfer, and your Cowries have already been returned."}
          {refused && !result.released && WITHDRAWAL_REFUSAL_MESSAGES[result.reason ?? ""]}
        </CowryResultCard>
      </div>
    )
  }

  /* ── confirm ──────────────────────────────────────────────────────────── */
  if (step === "confirm" && quote) {
    const bank = NIGERIAN_BANKS.find((b) => b.code === bankCode)
    return (
      <div className="animate-fade-in-up space-y-6 p-5 sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <button
            type="button"
            onClick={() => setStep("amount")}
            className="group inline-flex items-center gap-1 text-sm font-semibold text-[#00868a] hover:underline"
          >
            <ArrowLeft className="size-4 transition-transform group-hover:-translate-x-0.5" aria-hidden="true" />
            Change
          </button>
          <CowrySteps steps={STEPS} current={STEP_INDEX.confirm} />
        </div>

        <div className="mx-auto max-w-lg overflow-hidden rounded-3xl bg-white shadow-[0_24px_60px_-30px_rgba(16,20,26,0.35)] ring-1 ring-[#e2e6ea]">
          <div className="cowry-shine bg-[linear-gradient(135deg,#10141a_0%,#2a3442_100%)] p-6 text-white">
            <div className="relative">
              <p className="text-xs uppercase tracking-wide text-white/60">You receive</p>
              <p className="mt-1 text-4xl font-bold tabular-nums">{formatNaira(quote.netNaira)}</p>
              <p className="mt-3 flex items-center gap-2 text-sm text-white/80">
                <Landmark className="size-4" aria-hidden="true" />
                {accountName} · <span className="tabular-nums">{accountNumber}</span> · {bank?.name}
              </p>
            </div>
          </div>

          <div className="p-6">
            <h1 className="text-lg font-bold">Confirm your withdrawal</h1>
            <p className="mt-1 text-sm text-[#657080]">
              Check the account number. A transfer to the wrong account can&apos;t be recalled.
            </p>

            <dl className="mt-4 divide-y divide-[#eef1f3] border-y border-[#eef1f3] text-sm">
              <ReceiptRow label="Cowries used">
                <CowryAmount amount={quote.cowries} size={14} />
              </ReceiptRow>
              <ReceiptRow label="Worth">{formatNaira(quote.grossNaira)}</ReceiptRow>
              <ReceiptRow label={`Fee (${Math.round(quote.withdrawalFeeRate * 100)}%)`} tone="fee">
                {formatNaira(quote.feeNaira)}
              </ReceiptRow>
              <ReceiptRow label="You receive" strong>
                {formatNaira(quote.netNaira)}
              </ReceiptRow>
            </dl>

            <Button className="cowry-press mt-6 h-12 w-full text-base" onClick={submit} disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                  Sending…
                </>
              ) : (
                `Send ${formatNaira(quote.netNaira)}`
              )}
            </Button>
          </div>
        </div>
      </div>
    )
  }

  /* ── amount and destination ───────────────────────────────────────────── */
  const cowries = Number(amount)
  const affordable = Number.isFinite(cowries) && cowries > 0 && cowries <= initial.available
  const aboveMinimum = Number.isFinite(cowries) && cowries >= initial.minimumCowries
  const belowMinimumBalance = initial.available < initial.minimumCowries
  const destinationReady =
    isValidAccountNumber(accountNumber) && Boolean(bankCode) && accountName.trim().length > 1

  const presets = [
    { label: "Minimum", value: initial.minimumCowries },
    { label: "Half", value: Math.floor(initial.available / 2) },
    { label: "All", value: initial.available },
  ].filter((preset) => preset.value >= initial.minimumCowries && preset.value <= initial.available)

  const blocker = belowMinimumBalance
    ? `You need at least ${formatCowries(initial.minimumCowries)} bought Cowries to cash out.`
    : !affordable || !aboveMinimum
      ? "Enter an amount you have, above the minimum."
      : !quote
        ? "Getting your quote…"
        : !destinationReady
          ? "Add the bank account to send it to."
          : null

  return (
    <div className="animate-fade-in-up space-y-7 p-5 sm:p-8">
      <CowryPageHeader
        title="Cash out"
        subtitle="Bought Cowries only. Cowries you earned are for mobile data rather than cash."
        aside={<CowrySteps steps={STEPS} current={STEP_INDEX.amount} />}
      />

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="space-y-4 rounded-3xl bg-white p-5 ring-1 ring-[#e2e6ea] sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <Label htmlFor="withdraw-amount" className="text-sm font-semibold text-[#141922]">
              How many Cowries?
            </Label>
            <span className="text-xs text-[#657080]">
              You have <CowryAmount amount={initial.available} size={13} className="font-semibold" />
            </span>
          </div>

          <div className="relative">
            <CowryIcon size={22} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              id="withdraw-amount"
              type="number"
              inputMode="numeric"
              min={initial.minimumCowries}
              max={initial.available}
              className="h-14 pl-11 text-2xl font-bold tabular-nums"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              aria-invalid={(amount !== "" && (!affordable || !aboveMinimum)) || undefined}
            />
          </div>

          {presets.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {presets.map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => setAmount(String(preset.value))}
                  className={cn(
                    "cowry-press rounded-full border px-3 py-1.5 text-xs font-semibold transition",
                    Number(amount) === preset.value
                      ? "border-[#00b4b8] bg-[#effbfb] text-[#00868a]"
                      : "border-[#e2e6ea] text-[#565656] hover:border-[#c8cdd4]",
                  )}
                >
                  {preset.label} · {formatCowries(preset.value)}
                </button>
              ))}
            </div>
          )}

          {!aboveMinimum && amount !== "" && (
            <p className="text-xs text-[#b4372c]">
              The smallest withdrawal is {formatCowries(initial.minimumCowries)} Cowries.
            </p>
          )}
          {!affordable && amount !== "" && (
            <p className="text-xs text-[#b4372c]">That&apos;s more than you have.</p>
          )}

          {/* The net is the largest figure; nobody should have to subtract to learn it. */}
          <div className="rounded-2xl bg-[#f7f9fb] p-4">
            {quoting && !quote ? (
              <Skeleton className="h-20" />
            ) : quote ? (
              <dl className="space-y-1.5 text-sm">
                <div className="flex justify-between">
                  <dt className="text-[#657080]">Worth</dt>
                  <dd className="tabular-nums text-[#565656]">{formatNaira(quote.grossNaira)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-[#657080]">Fee ({Math.round(quote.withdrawalFeeRate * 100)}%)</dt>
                  <dd className="tabular-nums text-[#d97a2b]">{formatNaira(quote.feeNaira)}</dd>
                </div>
                <div className="flex items-baseline justify-between border-t border-[#e2e6ea] pt-2">
                  <dt className="font-semibold text-[#141922]">You receive</dt>
                  <dd
                    key={quote.netNaira}
                    className="animate-fadeIn text-2xl font-bold tabular-nums text-[#141922]"
                  >
                    {formatNaira(quote.netNaira)}
                  </dd>
                </div>
              </dl>
            ) : (
              <p className="text-sm text-[#657080]">Enter an amount to see what you&apos;d receive.</p>
            )}
          </div>
        </section>

        <section className="space-y-4 rounded-3xl bg-white p-5 ring-1 ring-[#e2e6ea] sm:p-6">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-[#141922]">
            <Building2 className="size-4 text-[#657080]" aria-hidden="true" />
            Where should it go?
          </h2>

          <div>
            <Label htmlFor="withdraw-bank">Bank</Label>
            <Select value={bankCode} onValueChange={setBankCode}>
              <SelectTrigger id="withdraw-bank" className="mt-2">
                <SelectValue placeholder="Choose your bank" />
              </SelectTrigger>
              <SelectContent>
                {NIGERIAN_BANKS.map((bank) => (
                  <SelectItem key={bank.code} value={bank.code}>
                    {bank.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="withdraw-account">Account number</Label>
            <Input
              id="withdraw-account"
              inputMode="numeric"
              maxLength={10}
              placeholder="0123456789"
              className={cn("mt-2 tabular-nums tracking-wider", isValidAccountNumber(accountNumber) && "border-[#1f9c4c]")}
              value={accountNumber}
              onChange={(event) => setAccountNumber(event.target.value.replace(/\D/g, ""))}
            />
            <p
              className={cn(
                "mt-1.5 text-xs",
                accountNumber !== "" && !isValidAccountNumber(accountNumber) ? "text-[#b4372c]" : "text-[#8a94a3]",
              )}
            >
              {accountNumber.length}/10 digits
            </p>
          </div>

          <div>
            <Label htmlFor="withdraw-name">Account name</Label>
            <Input
              id="withdraw-name"
              autoComplete="name"
              placeholder="As it appears on your account"
              className="mt-2"
              value={accountName}
              onChange={(event) => setAccountName(event.target.value)}
            />
          </div>
        </section>
      </div>

      <div className="sticky bottom-4 z-10 flex flex-wrap items-center gap-4 rounded-2xl bg-white/90 p-4 shadow-[0_12px_40px_-20px_rgba(16,20,26,0.5)] ring-1 ring-[#e2e6ea] backdrop-blur">
        <p className="min-w-0 flex-1 text-sm text-[#657080]">
          {blocker ?? (
            <>
              Send <span className="font-semibold text-[#141922]">{formatNaira(quote?.netNaira)}</span> to{" "}
              {accountName}
            </>
          )}
        </p>
        <Button className="cowry-press px-8" disabled={Boolean(blocker)} onClick={() => setStep("confirm")}>
          Continue
        </Button>
      </div>
    </div>
  )
}
