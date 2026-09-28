import { useEffect, useState } from "react"
import { Link } from "react-router"
import { toast } from "sonner"
import {
  ArrowDownLeft,
  ArrowRight,
  ArrowUpRight,
  Clock,
  Gift,
  History,
  Landmark,
  ShoppingCart,
  Smartphone,
  Sparkles,
  type LucideIcon,
} from "lucide-react"
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
import { celebrateOnce } from "@/components/cowry/celebrate"
import { cn } from "@/lib/utils"
import { Routes } from "@/routes/constants"
import { getAuthErrorMessage } from "@/utils/auth"
import { formatRelative } from "@/utils/careconnect/types"
import { isCowryPathEnabled } from "@/utils/careconnect/cowryPages"
import {
  getWallet,
  listTransactions,
  type CowryBucket,
  type CowryLedgerEntry,
  type CowryWallet,
  type CowryWalletType,
} from "@/utils/careconnect/services/cowryService"
import {
  CHEAPEST_PACKAGE_COWRIES,
  TRUST_BAND_LABELS,
  TRUST_BAND_STYLES,
  WALLET_BLURBS,
  WALLET_LABELS,
  allowanceSummary,
  cowriesToFirstReward,
  entryDescription,
  entryDirection,
  formatCowries,
  isOpeningState,
  redeemableTotal,
  signedAmount,
  spendableTotal,
} from "@/utils/careconnect/cowry"

/**
 * Cowry wallet.
 *
 * One Cowry to the user, three balances underneath. The split is not cosmetic: each is
 * funded differently and each can do different things, so the screen names what each one
 * is for rather than presenting a single total that would mislead.
 *
 * The hero shows what can be spent right now — the one number people come here for — and
 * the balances below say where it sits. Actions only appear for pages that are switched on,
 * so nothing here links to a route that does not exist.
 */

const WALLET_ORDER: CowryWalletType[] = ["reward", "purchased", "creator"]

const WALLET_STYLE: Record<
  CowryWalletType,
  { icon: LucideIcon; chip: string; bar: string; action?: { label: string; to: string } }
> = {
  reward: {
    icon: Sparkles,
    chip: "bg-[#fff4df] text-[#c8963e]",
    bar: "from-[#e0b872] to-[#c8963e]",
    action: { label: "Redeem for data", to: Routes.app.user.cowryRedeem },
  },
  purchased: {
    icon: ShoppingCart,
    chip: "bg-[#e0f2ff] text-[#0d8de0]",
    bar: "from-[#5ab8f5] to-[#0d8de0]",
    action: { label: "Buy more", to: Routes.app.user.cowryBuy },
  },
  creator: {
    icon: Gift,
    chip: "bg-[#fbe8f4] text-[#c0438f]",
    bar: "from-[#ec8cc4] to-[#c0438f]",
    action: { label: "Creator earnings", to: Routes.app.user.cowryCreator },
  },
}

const QUICK_ACTIONS: Array<{ label: string; hint: string; to: string; icon: LucideIcon; tint: string }> = [
  { label: "Earn", hint: "What pays today", to: Routes.app.user.cowryEarn, icon: Sparkles, tint: "bg-[#fff4df] text-[#c8963e]" },
  { label: "Get data", hint: "MTN, Airtel, Glo, 9mobile", to: Routes.app.user.cowryRedeem, icon: Smartphone, tint: "bg-[#e6f8f8] text-[#00868a]" },
  { label: "Buy", hint: "For sending gifts", to: Routes.app.user.cowryBuy, icon: ShoppingCart, tint: "bg-[#e0f2ff] text-[#0d8de0]" },
  { label: "Gifts", hint: "What you've received", to: Routes.app.user.cowryCreator, icon: Gift, tint: "bg-[#fbe8f4] text-[#c0438f]" },
  { label: "Cash out", hint: "Bought Cowries to bank", to: Routes.app.user.cowryWithdraw, icon: Landmark, tint: "bg-[#eceef1] text-[#565656]" },
  { label: "History", hint: "Every movement", to: Routes.app.user.cowryHistory, icon: History, tint: "bg-[#eceef1] text-[#565656]" },
]

/** How many rows the wallet previews before sending you to the full history. */
const PREVIEW_ROWS = 5

function WalletSkeleton() {
  return (
    <div className="space-y-6 p-5 sm:p-8">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-52 rounded-3xl" />
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-2xl" />
        ))}
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <Skeleton className="h-44 rounded-2xl" />
        <Skeleton className="h-44 rounded-2xl" />
        <Skeleton className="h-44 rounded-2xl" />
      </div>
    </div>
  )
}

/** One balance, with its three states shown separately because they behave differently. */
function BalanceCard({ type, bucket }: { type: CowryWalletType; bucket: CowryBucket }) {
  const style = WALLET_STYLE[type]
  const Icon = style.icon
  const action = style.action && isCowryPathEnabled(style.action.to) ? style.action : null

  return (
    <div className="cowry-lift cowry-hover relative flex flex-col overflow-hidden rounded-2xl bg-white p-5 ring-1 ring-[#e2e6ea]">
      <span className={cn("absolute inset-x-0 top-0 h-1 bg-gradient-to-r", style.bar)} aria-hidden="true" />

      <div className="flex items-center gap-2.5">
        <span className={cn("flex size-9 items-center justify-center rounded-xl", style.chip)}>
          <Icon className="cowry-wobble size-4.5" aria-hidden="true" />
        </span>
        <h3 className="text-sm font-semibold text-[#141922]">{WALLET_LABELS[type]}</h3>
      </div>

      <p className="mt-4 flex items-center gap-2 text-3xl font-bold text-[#141922]">
        <CowryIcon size={24} />
        <AnimatedCowries value={bucket.available} />
      </p>
      <p className="text-xs text-[#657080]">available to use</p>

      {/* Pending and reserved are only shown when they exist — a row of zeroes on a new
          account reads as clutter, and neither needs explaining until it happens. */}
      {(bucket.pending > 0 || bucket.reserved > 0) && (
        <dl className="mt-3 space-y-1 border-t border-[#eef1f3] pt-3 text-xs">
          {bucket.pending > 0 && (
            <div className="flex justify-between">
              <dt className="inline-flex items-center gap-1 text-[#657080]">
                <Clock className="size-3" aria-hidden="true" />
                Pending
              </dt>
              <dd className="font-medium tabular-nums text-[#565656]">
                {formatCowries(bucket.pending)}
              </dd>
            </div>
          )}
          {bucket.reserved > 0 && (
            <div className="flex justify-between">
              <dt className="text-[#657080]">Held for a data request</dt>
              <dd className="font-medium tabular-nums text-[#565656]">
                {formatCowries(bucket.reserved)}
              </dd>
            </div>
          )}
        </dl>
      )}

      <p className="mt-3 flex-1 text-xs leading-relaxed text-[#657080]">{WALLET_BLURBS[type]}</p>

      {action && (
        <Link
          to={action.to}
          className="group mt-4 inline-flex items-center gap-1 text-sm font-semibold text-[#00868a]"
        >
          {action.label}
          <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
        </Link>
      )}
    </div>
  )
}

const DIRECTION_STYLE = {
  in: { icon: ArrowDownLeft, chip: "bg-[#e2f7e8] text-[#1f9c4c]", text: "text-[#1f9c4c]" },
  out: { icon: ArrowUpRight, chip: "bg-[#ffe9e6] text-[#b4372c]", text: "text-[#b4372c]" },
  neutral: { icon: Clock, chip: "bg-[#eceef1] text-[#657080]", text: "text-[#657080]" },
}

export default function CowryWalletPage() {
  const [wallet, setWallet] = useState<CowryWallet | null>(null)
  const [recent, setRecent] = useState<CowryLedgerEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let active = true
    ;(async () => {
      setLoading(true)
      try {
        const [walletResult, transactions] = await Promise.all([
          getWallet(),
          listTransactions({ limit: PREVIEW_ROWS }),
        ])
        if (!active) return
        setWallet(walletResult)
        setRecent(transactions)
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

  const shortfall = cowriesToFirstReward(wallet)
  const canRedeem = Boolean(wallet?.canRedeem)

  // The first time a reward is within reach is worth marking — once per session, so the
  // wallet does not throw confetti on every visit.
  useEffect(() => {
    if (wallet && shortfall === 0 && canRedeem) celebrateOnce("first-reward-ready", "shower")
  }, [wallet, shortfall, canRedeem])

  if (loading) return <WalletSkeleton />

  if (!wallet) {
    return (
      <CowryLoadError
        title="Cowry wallet"
        message="We couldn't load your wallet."
        onRetry={() => setAttempt((n) => n + 1)}
      />
    )
  }

  const redeemable = redeemableTotal(wallet)
  const spendable = spendableTotal(wallet)
  const opening = isOpeningState(wallet)
  const progress = Math.min(100, (redeemable / CHEAPEST_PACKAGE_COWRIES) * 100)
  const actions = QUICK_ACTIONS.filter((action) => isCowryPathEnabled(action.to))
  const redeemEnabled = isCowryPathEnabled(Routes.app.user.cowryRedeem)

  return (
    <div className="animate-fade-in-up space-y-7 p-5 sm:p-8">
      <CowryPageHeader
        title="Cowry wallet"
        back={false}
        subtitle="Take part, earn Cowries, turn them into mobile data."
        aside={
          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold ${TRUST_BAND_STYLES[wallet.trustBand]}`}
          >
            {TRUST_BAND_LABELS[wallet.trustBand]}
          </span>
        }
      />

      {/* The hero: what can be spent now, and how far off the first reward is. On a new
          account the balance is far below it, so without the bar the wallet reads as
          though nothing works. */}
      <section className="cowry-shine rounded-3xl bg-[linear-gradient(135deg,#0c2a33_0%,#0b5f68_55%,#00a3a7_100%)] p-6 text-white shadow-[0_24px_50px_-28px_rgba(0,120,125,0.8)] sm:p-8">
        <CowryScatter className="opacity-90 max-sm:opacity-40" />

        <div className="relative max-w-xl">
          <p className="text-sm font-medium text-white/70">Spendable now</p>
          <p className="mt-2 flex min-w-0 items-center gap-2 text-4xl font-bold tracking-tight sm:gap-3 sm:text-5xl">
            <CowryIcon size={40} className="animate-cowry-pop shrink-0" />
            <AnimatedCowries value={spendable} />
          </p>
          <p className="mt-2 text-xs text-white/70">
            Lifetime earned{" "}
            <span className="font-semibold text-white">{formatCowries(wallet.lifetimeEarned)}</span>
            {" "}· this never goes down, so spending costs you no standing.
          </p>

          <div className="mt-6 rounded-2xl bg-white/10 p-4 backdrop-blur-sm">
            <div className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
              <span className="text-white/80">Toward your first data reward</span>
              <span className="font-semibold tabular-nums">
                {formatCowries(redeemable)} / {formatCowries(CHEAPEST_PACKAGE_COWRIES)}
              </span>
            </div>
            <CowryProgress
              value={progress}
              tone="gold"
              label="Progress toward your first data reward"
              className="mt-3 bg-white/15"
            />
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs text-white/75">
                {shortfall > 0
                  ? `${formatCowries(shortfall)} to go for 500 MB. ${allowanceSummary(wallet)}`
                  : allowanceSummary(wallet)}
              </p>
              {shortfall === 0 && canRedeem && redeemEnabled && (
                <Button asChild size="sm" className="animate-cowry-glow bg-white text-[#0b5f68] hover:bg-white">
                  <Link to={Routes.app.user.cowryRedeem}>
                    <Smartphone className="size-4" aria-hidden="true" />
                    Get your data
                  </Link>
                </Button>
              )}
            </div>
          </div>
        </div>
      </section>

      {actions.length > 0 && (
        <nav aria-label="Cowry actions" className="cowry-stagger grid grid-cols-3 gap-3 sm:grid-cols-6">
          {actions.map(({ label, hint, to, icon: Icon, tint }) => (
            <Link
              key={to}
              to={to}
              className="cowry-lift cowry-press cowry-hover flex flex-col items-center gap-2 rounded-2xl bg-white p-3 text-center ring-1 ring-[#e2e6ea] sm:p-4"
            >
              <span className={cn("flex size-11 items-center justify-center rounded-2xl", tint)}>
                <Icon className="cowry-wobble size-5" aria-hidden="true" />
              </span>
              <span className="text-sm font-semibold text-[#141922]">{label}</span>
              <span className="hidden text-[11px] leading-tight text-[#8a94a3] sm:block">{hint}</span>
            </Link>
          ))}
        </nav>
      )}

      <section>
        <h2 className="mb-4 text-lg font-bold">Your balances</h2>
        <div className="cowry-stagger grid gap-4 sm:grid-cols-3">
          {WALLET_ORDER.map((type) => (
            <BalanceCard key={type} type={type} bucket={wallet[type]} />
          ))}
        </div>
      </section>

      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold">Recent activity</h2>
          {recent.length > 0 && isCowryPathEnabled(Routes.app.user.cowryHistory) && (
            <Link
              to={Routes.app.user.cowryHistory}
              className="group inline-flex items-center gap-1 text-sm font-semibold text-[#00868a]"
            >
              See all
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
            </Link>
          )}
        </div>

        {recent.length === 0 ? (
          <CowryEmpty title={opening ? "Your Cowries start here" : "Nothing yet"}>
            {opening
              ? "Every Cowry you earn or spend will be listed here, with a line explaining what happened."
              : "No Cowry movements on this account yet."}
          </CowryEmpty>
        ) : (
          <ul className="cowry-stagger divide-y divide-[#eef1f3] overflow-hidden rounded-2xl bg-white ring-1 ring-[#e2e6ea]">
            {recent.map((entry) => {
              const direction = DIRECTION_STYLE[entryDirection(entry)]
              const DirectionIcon = direction.icon
              return (
                <li
                  key={entry.id}
                  className="flex items-center gap-3 p-4 transition-colors hover:bg-[#f9fafb]"
                >
                  <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-full", direction.chip)}>
                    <DirectionIcon className="size-4" aria-hidden="true" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-[#141922]">
                      {entryDescription(entry)}
                    </p>
                    <p className="mt-0.5 text-xs text-[#657080]">
                      {WALLET_LABELS[entry.walletType]} · {formatRelative(entry.createdAt)}
                    </p>
                  </div>
                  <span className={cn("shrink-0 text-sm font-bold tabular-nums", direction.text)}>
                    {signedAmount(entry)}
                  </span>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      {/* Replaces the old "Coming next" note, which described earning, redeeming and
          buying as future work after those screens had shipped. */}
      <section className="rounded-2xl bg-[#f7f9fb] p-5 ring-1 ring-[#e2e6ea]">
        <h2 className="text-sm font-semibold text-[#141922]">How Cowries work</h2>
        <ol className="cowry-stagger mt-4 grid gap-4 sm:grid-cols-3">
          {[
            { title: "Take part", body: "Post, comment, finish challenges and keep a weekly streak." },
            { title: "Cowries land", body: "They arrive as pending and become spendable a day later." },
            { title: "Turn them into data", body: "Redeem reward and creator Cowries for mobile data." },
          ].map((step, index) => (
            <li key={step.title} className="flex gap-3">
              <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-white text-xs font-bold text-[#00868a] ring-1 ring-[#e2e6ea]">
                {index + 1}
              </span>
              <div>
                <p className="text-sm font-semibold text-[#141922]">{step.title}</p>
                <p className="mt-0.5 text-xs leading-relaxed text-[#657080]">{step.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>
    </div>
  )
}
