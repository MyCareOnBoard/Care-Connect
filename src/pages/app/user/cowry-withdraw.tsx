import { useEffect, useState } from "react"
import { Link, useNavigate } from "react-router"
import { toast } from "sonner"
import { ArrowLeft, Check, Info, Loader2, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Routes } from "@/routes/constants"
import { getAuthErrorMessage } from "@/utils/auth"
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

/** Debounce on the quote, so typing an amount does not hammer the endpoint. */
const QUOTE_DEBOUNCE_MS = 400

function WithdrawSkeleton() {
  return (
    <div className="space-y-6 p-5 sm:p-8">
      <Skeleton className="h-6 w-40" />
      <Skeleton className="h-40 rounded-xl" />
      <Skeleton className="h-52 rounded-xl" />
    </div>
  )
}

export default function CowryWithdrawPage() {
  const navigate = useNavigate()

  const [initial, setInitial] = useState<CowryWithdrawalQuote | null>(null)
  const [loading, setLoading] = useState(true)
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
      try {
        const opening = await getWithdrawalQuote(1)
        if (!active) return
        setInitial(opening)
        if (opening.rateSet) setAmount(String(Math.min(opening.available, opening.minimumCowries)))
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
        // A failed quote leaves the last good one showing rather than blanking the
        // screen; Continue is still gated on the amount being affordable.
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

  const header = (
    <header>
      <Link
        to={Routes.app.user.cowryWallet}
        className="inline-flex items-center gap-1 text-sm font-semibold text-[#0d8de0] hover:underline"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Cowry wallet
      </Link>
      <h1 className="mt-2 text-xl font-bold">Cash out</h1>
    </header>
  )

  /* ── not available yet ────────────────────────────────────────────────── */
  if (!initial || !initial.rateSet) {
    return (
      <div className="animate-fade-in-up space-y-6 p-5 sm:p-8">
        {header}
        <div className="max-w-lg rounded-xl border border-[#e2e2e2] bg-white p-6">
          <div className="flex items-start gap-3">
            <Info className="mt-0.5 size-5 shrink-0 text-[#0d8de0]" aria-hidden="true" />
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
            <Button asChild>
              <Link to={Routes.app.user.cowryRedeem}>Redeem for data</Link>
            </Button>
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
      <div className="animate-fade-in-up space-y-6 p-5 sm:p-8">
        <div className="mx-auto max-w-lg rounded-xl border border-[#e2e2e2] bg-white p-8 text-center">
          <div
            className={`mx-auto flex size-12 items-center justify-center rounded-full ${
              paid ? "bg-[#e2f7e8]" : pending ? "bg-[#fff6ec]" : "bg-[#ffe0dd]"
            }`}
          >
            {paid ? (
              <Check className="size-6 text-[#1f9c4c]" aria-hidden="true" />
            ) : pending ? (
              <Loader2 className="size-6 animate-spin text-[#d97a2b]" aria-hidden="true" />
            ) : (
              <X className="size-6 text-[#b4372c]" aria-hidden="true" />
            )}
          </div>

          <h1 className="mt-4 text-xl font-bold">
            {paid ? "Money sent" : pending ? "Sending to your bank" : "Not completed"}
          </h1>

          <p className="mx-auto mt-2 max-w-sm text-sm text-[#657080]">
            {paid &&
              `${formatNaira(result.withdrawal?.netNaira)} is on its way to your ${accountName || "bank"} account.`}
            {pending &&
              "Your bank hasn't confirmed yet. If it doesn't go through, your Cowries come back automatically within half an hour."}
            {result.released &&
              "Your bank didn't accept the transfer, and your Cowries have already been returned."}
            {refused && !result.released && WITHDRAWAL_REFUSAL_MESSAGES[result.reason ?? ""]}
          </p>

          {paid && result.withdrawal && (
            <dl className="mt-5 divide-y divide-[#eef1f3] border-y border-[#eef1f3] text-left text-sm">
              <div className="flex justify-between py-3">
                <dt className="text-[#657080]">Cowries used</dt>
                <dd className="tabular-nums">{formatCowries(result.withdrawal.cowries)}</dd>
              </div>
              <div className="flex justify-between py-3">
                <dt className="text-[#657080]">Fee</dt>
                <dd className="tabular-nums text-[#565656]">
                  {formatNaira(result.withdrawal.feeNaira)}
                </dd>
              </div>
              <div className="flex justify-between py-3">
                <dt className="font-semibold">Sent to your bank</dt>
                <dd className="font-bold tabular-nums">
                  {formatNaira(result.withdrawal.netNaira)}
                </dd>
              </div>
            </dl>
          )}

          {result.withdrawal?.id && (
            <p className="mt-4 font-mono text-xs text-[#657080]">
              Reference {result.withdrawal.id}
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
  if (step === "confirm" && quote) {
    const bank = NIGERIAN_BANKS.find((b) => b.code === bankCode)
    return (
      <div className="animate-fade-in-up space-y-6 p-5 sm:p-8">
        <button
          type="button"
          onClick={() => setStep("amount")}
          className="inline-flex items-center gap-1 text-sm font-semibold text-[#0d8de0] hover:underline"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          Change
        </button>

        <div className="mx-auto max-w-lg rounded-xl border border-[#e2e2e2] bg-white p-6">
          <h1 className="text-xl font-bold">Confirm your withdrawal</h1>
          <p className="mt-1 text-sm text-[#657080]">
            Check the account number. A transfer to the wrong account can&apos;t be recalled.
          </p>

          <dl className="mt-5 divide-y divide-[#eef1f3] border-y border-[#eef1f3] text-sm">
            <div className="flex justify-between py-3">
              <dt className="text-[#657080]">Cowries used</dt>
              <dd className="font-semibold tabular-nums">{formatCowries(quote.cowries)}</dd>
            </div>
            <div className="flex justify-between py-3">
              <dt className="text-[#657080]">Worth</dt>
              <dd className="tabular-nums">{formatNaira(quote.grossNaira)}</dd>
            </div>
            <div className="flex justify-between py-3">
              <dt className="text-[#657080]">
                Fee ({Math.round(quote.withdrawalFeeRate * 100)}%)
              </dt>
              <dd className="tabular-nums text-[#d97a2b]">{formatNaira(quote.feeNaira)}</dd>
            </div>
            <div className="flex justify-between py-3">
              <dt className="font-semibold">You receive</dt>
              <dd className="text-lg font-bold tabular-nums">{formatNaira(quote.netNaira)}</dd>
            </div>
            <div className="flex justify-between py-3">
              <dt className="text-[#657080]">To</dt>
              <dd className="text-right">
                <span className="block font-semibold">{accountName}</span>
                <span className="block tabular-nums text-[#565656]">{accountNumber}</span>
                <span className="block text-xs text-[#657080]">{bank?.name}</span>
              </dd>
            </div>
          </dl>

          <Button className="mt-6 w-full" onClick={submit} disabled={submitting}>
            {submitting ? "Sending…" : `Send ${formatNaira(quote.netNaira)}`}
          </Button>
        </div>
      </div>
    )
  }

  /* ── amount and destination ───────────────────────────────────────────── */
  const cowries = Number(amount)
  const affordable = Number.isFinite(cowries) && cowries > 0 && cowries <= initial.available
  const aboveMinimum = Number.isFinite(cowries) && cowries >= initial.minimumCowries
  const destinationReady =
    isValidAccountNumber(accountNumber) && Boolean(bankCode) && accountName.trim().length > 1

  return (
    <div className="animate-fade-in-up space-y-6 p-5 sm:p-8">
      {header}
      <p className="-mt-3 text-sm text-[#657080]">
        Bought Cowries only. Cowries you earned are for mobile data rather than cash.
      </p>

      <section className="max-w-lg space-y-4 rounded-xl border border-[#e2e2e2] bg-white p-5">
        <div>
          <Label htmlFor="withdraw-amount">How many Cowries?</Label>
          <Input
            id="withdraw-amount"
            type="number"
            inputMode="numeric"
            min={initial.minimumCowries}
            max={initial.available}
            className="mt-2"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
          />
          <div className="mt-1.5 flex flex-wrap justify-between gap-2 text-xs text-[#657080]">
            <span>
              You have{" "}
              <span className="font-semibold tabular-nums">
                {formatCowries(initial.available)}
              </span>{" "}
              bought Cowries
            </span>
            <button
              type="button"
              className="font-semibold text-[#0d8de0] hover:underline"
              onClick={() => setAmount(String(initial.available))}
            >
              Use all
            </button>
          </div>
          {!aboveMinimum && amount !== "" && (
            <p className="mt-1.5 text-xs text-[#b4372c]">
              The smallest withdrawal is {formatCowries(initial.minimumCowries)} Cowries.
            </p>
          )}
          {!affordable && amount !== "" && (
            <p className="mt-1.5 text-xs text-[#b4372c]">
              That&apos;s more than you have.
            </p>
          )}
        </div>

        {/* The net is the largest figure; nobody should have to subtract to learn it. */}
        <div className="rounded-lg bg-[#f7f9fb] p-4">
          {quoting && !quote ? (
            <Skeleton className="h-16" />
          ) : quote ? (
            <dl className="space-y-1.5 text-sm">
              <div className="flex justify-between">
                <dt className="text-[#657080]">Worth</dt>
                <dd className="tabular-nums text-[#565656]">{formatNaira(quote.grossNaira)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-[#657080]">
                  Fee ({Math.round(quote.withdrawalFeeRate * 100)}%)
                </dt>
                <dd className="tabular-nums text-[#d97a2b]">{formatNaira(quote.feeNaira)}</dd>
              </div>
              <div className="flex justify-between border-t border-[#e2e6ea] pt-1.5">
                <dt className="font-semibold text-[#141922]">You receive</dt>
                <dd className="text-lg font-bold tabular-nums text-[#141922]">
                  {formatNaira(quote.netNaira)}
                </dd>
              </div>
            </dl>
          ) : (
            <p className="text-sm text-[#657080]">Enter an amount to see what you&apos;d receive.</p>
          )}
        </div>
      </section>

      <section className="max-w-lg space-y-4 rounded-xl border border-[#e2e2e2] bg-white p-5">
        <h2 className="text-sm font-semibold text-[#141922]">Where should it go?</h2>

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
            className="mt-2"
            value={accountNumber}
            onChange={(event) => setAccountNumber(event.target.value.replace(/\D/g, ""))}
          />
          {accountNumber !== "" && !isValidAccountNumber(accountNumber) && (
            <p className="mt-1.5 text-xs text-[#b4372c]">An account number is 10 digits.</p>
          )}
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

      <Button
        className="w-full sm:w-auto"
        disabled={!quote || !affordable || !aboveMinimum || !destinationReady}
        onClick={() => setStep("confirm")}
      >
        Continue
      </Button>
    </div>
  )
}
