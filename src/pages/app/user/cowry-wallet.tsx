import { useEffect, useState } from "react"
import { Link } from "react-router"
import { toast } from "sonner"
import { ArrowRight, Gift, ShoppingCart, Smartphone, Sparkles } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { Routes } from "@/routes/constants"
import { getAuthErrorMessage } from "@/utils/auth"
import { formatRelative } from "@/utils/careconnect/types"
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
} from "@/utils/careconnect/cowry"

/**
 * Cowry wallet.
 *
 * One Cowry to the user, three balances underneath. The split is not cosmetic: each is
 * funded differently and each can do different things, so the screen names what each one
 * is for rather than presenting a single total that would mislead.
 *
 * Earning, redeeming, buying and gifting arrive in later phases. Rather than render
 * buttons that do nothing, the screen says plainly what is coming — a dead control is
 * worse than an absent one.
 */

const WALLET_ORDER: CowryWalletType[] = ["reward", "purchased", "creator"]

const WALLET_ICONS: Record<CowryWalletType, typeof Smartphone> = {
  reward: Sparkles,
  purchased: ShoppingCart,
  creator: Gift,
}

/** How many rows the wallet previews before sending you to the full history. */
const PREVIEW_ROWS = 5

function WalletSkeleton() {
  return (
    <div className="space-y-6 p-5 sm:p-8">
      <Skeleton className="h-6 w-40" />
      <Skeleton className="h-28 rounded-xl" />
      <div className="grid gap-4 sm:grid-cols-3">
        <Skeleton className="h-40 rounded-xl" />
        <Skeleton className="h-40 rounded-xl" />
        <Skeleton className="h-40 rounded-xl" />
      </div>
      <Skeleton className="h-56 rounded-xl" />
    </div>
  )
}

/** One balance, with its three states shown separately because they behave differently. */
function BalanceCard({ type, bucket }: { type: CowryWalletType; bucket: CowryBucket }) {
  const Icon = WALLET_ICONS[type]
  return (
    <div className="rounded-xl border border-[#e2e2e2] bg-white p-5">
      <div className="flex items-center gap-2">
        <Icon className="size-4 text-[#657080]" aria-hidden="true" />
        <h3 className="text-sm font-semibold text-[#141922]">{WALLET_LABELS[type]}</h3>
      </div>

      <p className="mt-3 text-3xl font-bold tabular-nums text-[#141922]">
        {formatCowries(bucket.available)}
      </p>
      <p className="text-xs text-[#657080]">available to use</p>

      {/* Pending and reserved are only shown when they exist — a row of zeroes on a new
          account reads as clutter, and neither needs explaining until it happens. */}
      {(bucket.pending > 0 || bucket.reserved > 0) && (
        <dl className="mt-3 space-y-1 border-t border-[#eef1f3] pt-3 text-xs">
          {bucket.pending > 0 && (
            <div className="flex justify-between">
              <dt className="text-[#657080]">Pending</dt>
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

      <p className="mt-3 text-xs leading-relaxed text-[#657080]">{WALLET_BLURBS[type]}</p>
    </div>
  )
}

export default function CowryWalletPage() {
  const [wallet, setWallet] = useState<CowryWallet | null>(null)
  const [recent, setRecent] = useState<CowryLedgerEntry[]>([])
  const [loading, setLoading] = useState(true)

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
  }, [])

  if (loading) return <WalletSkeleton />

  if (!wallet) {
    return (
      <div className="space-y-6 p-5 sm:p-8">
        <h1 className="text-xl font-bold">Cowry wallet</h1>
        <p className="rounded-xl border border-dashed border-[#e2e2e2] p-10 text-center text-sm text-[#657080]">
          We couldn&apos;t load your wallet. Refresh the page to try again.
        </p>
      </div>
    )
  }

  const redeemable = redeemableTotal(wallet)
  const shortfall = cowriesToFirstReward(wallet)
  const opening = isOpeningState(wallet)
  const progress = Math.min(100, Math.round((redeemable / CHEAPEST_PACKAGE_COWRIES) * 100))

  return (
    <div className="animate-fade-in-up space-y-6 p-5 sm:p-8">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">Cowry wallet</h1>
          <p className="mt-1 text-sm text-[#657080]">
            Take part, earn Cowries, turn them into mobile data.
          </p>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold ${TRUST_BAND_STYLES[wallet.trustBand]}`}
        >
          {TRUST_BAND_LABELS[wallet.trustBand]}
        </span>
      </header>

      {/* Progress toward the cheapest reward. On a new account the balance is far below
          it, so without this the wallet reads as though nothing works. */}
      <section className="rounded-xl border border-[#e2e2e2] bg-white p-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-sm text-[#657080]">Toward your first data reward</p>
            <p className="mt-1 text-2xl font-bold tabular-nums text-[#141922]">
              {formatCowries(redeemable)}{" "}
              <span className="text-base font-medium text-[#657080]">
                / {formatCowries(CHEAPEST_PACKAGE_COWRIES)} Cowries
              </span>
            </p>
          </div>
          <p className="text-sm text-[#657080]">
            {shortfall > 0
              ? `${formatCowries(shortfall)} to go for 500 MB`
              : "You have enough for 500 MB"}
          </p>
        </div>

        <div
          className="mt-4 h-2 overflow-hidden rounded-full bg-[#eef1f3]"
          role="progressbar"
          aria-valuenow={progress}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Progress toward your first data reward"
        >
          <div
            className="h-full rounded-full bg-[#1f9c4c] transition-[width] duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>

        <p className="mt-3 text-xs text-[#657080]">{allowanceSummary(wallet)}</p>
      </section>

      <section>
        <h2 className="mb-4 text-xl font-bold">Your balances</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {WALLET_ORDER.map((type) => (
            <BalanceCard key={type} type={type} bucket={wallet[type]} />
          ))}
        </div>
        <p className="mt-3 text-xs text-[#657080]">
          Lifetime Cowries earned:{" "}
          <span className="font-semibold text-[#565656]">
            {formatCowries(wallet.lifetimeEarned)}
          </span>
          . This never goes down, so spending your Cowries never costs you standing.
        </p>
      </section>

      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold">Recent activity</h2>
          {recent.length > 0 && (
            <Link
              to={Routes.app.user.cowryHistory}
              className="inline-flex items-center gap-1 text-sm font-semibold text-[#0d8de0] hover:underline"
            >
              See all
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          )}
        </div>

        {recent.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[#e2e2e2] p-10 text-center">
            <p className="text-sm font-medium text-[#141922]">
              {opening ? "Your Cowries start here" : "Nothing yet"}
            </p>
            <p className="mx-auto mt-2 max-w-md text-sm text-[#657080]">
              {opening
                ? "Every Cowry you earn or spend will be listed here, with a line explaining what happened."
                : "No Cowry movements on this account yet."}
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-[#eef1f3] rounded-xl border border-[#e2e2e2] bg-white">
            {recent.map((entry) => {
              const direction = entryDirection(entry)
              return (
                <li key={entry.id} className="flex items-start justify-between gap-4 p-4">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-[#141922]">
                      {entryDescription(entry)}
                    </p>
                    <p className="mt-0.5 text-xs text-[#657080]">
                      {WALLET_LABELS[entry.walletType]} · {formatRelative(entry.createdAt)}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 text-sm font-semibold tabular-nums ${
                      direction === "in"
                        ? "text-[#1f9c4c]"
                        : direction === "out"
                          ? "text-[#b4372c]"
                          : "text-[#657080]"
                    }`}
                  >
                    {signedAmount(entry)}
                  </span>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      {/* Said once, plainly, rather than scattered as disabled buttons across the page. */}
      <section className="rounded-xl border border-[#e2e2e2] bg-[#f7f9fb] p-5">
        <h2 className="text-sm font-semibold text-[#141922]">Coming next</h2>
        <p className="mt-2 text-sm leading-relaxed text-[#657080]">
          Earning Cowries for what you post and take part in, then redeeming them for mobile
          data on MTN, Airtel, Glo and 9mobile. Buying Cowries and sending gifts follow after
          that. Your balances and history are live now, so everything you earn is already
          being recorded.
        </p>
      </section>
    </div>
  )
}
