import { useCallback, useEffect, useRef, useState } from "react"
import { useLocation, useNavigate } from "react-router"
import { ArrowRight, Clock, Gift, ShoppingCart, Sparkles, X, type LucideIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog"
import { CowryIcon } from "@/components/cowry/CowryIcon"
import { CowryRain, RAIN_MS } from "@/components/cowry/CowryRain"
import { AnimatedCowries } from "@/components/cowry/CowryUI"
import { celebrateCowries } from "@/components/cowry/celebrate"
import { cn } from "@/lib/utils"
import { Routes } from "@/routes/constants"
import { onCowryEarned } from "@/utils/careconnect/cowryEarned"
import {
  enabledCowryPaths,
  isAnyCowryPageEnabled,
  isCowryPathEnabled,
} from "@/utils/careconnect/cowryPages"
import {
  getWallet,
  type CowryWallet,
  type CowryWalletType,
} from "@/utils/careconnect/services/cowryService"
import { WALLET_LABELS, formatCowries, spendableTotal } from "@/utils/careconnect/cowry"

/**
 * The Cowry balance, always in the header.
 *
 * Shows what can be spent right now — the same "spendable" figure the wallet's hero leads
 * with, so the two never disagree. Tapping it opens a popup with the full breakdown and a
 * shower of shells, and a way through to the wallet.
 *
 * It stays hidden until a balance has actually loaded. A chip showing 0 because a request
 * failed would tell someone their Cowries had gone.
 */

/** Refetch at most this often on navigation, so moving between pages is not a request each. */
const REFRESH_THROTTLE_MS = 30_000


const BUCKETS: Array<{ type: CowryWalletType; icon: LucideIcon; tint: string }> = [
  { type: "reward", icon: Sparkles, tint: "bg-[#fff4df] text-[#c8963e]" },
  { type: "purchased", icon: ShoppingCart, tint: "bg-[#e0f2ff] text-[#0d8de0]" },
  { type: "creator", icon: Gift, tint: "bg-[#fbe8f4] text-[#c0438f]" },
]

/** Compact figure for the chip: 12,480 → "12.5K" so the header never reflows. */
function compact(amount: number): string {
  if (amount < 10_000) return formatCowries(amount)
  if (amount < 1_000_000) return `${(amount / 1000).toFixed(amount < 100_000 ? 1 : 0).replace(/\.0$/, "")}K`
  return `${(amount / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`
}

export function CowryBalanceChip() {
  const navigate = useNavigate()
  const location = useLocation()
  const [wallet, setWallet] = useState<CowryWallet | null>(null)
  const [open, setOpen] = useState(false)
  const [rain, setRain] = useState<number | null>(null)
  const lastFetch = useRef(0)

  const enabled = isAnyCowryPageEnabled()

  const refresh = useCallback(async (force = false) => {
    if (!force && Date.now() - lastFetch.current < REFRESH_THROTTLE_MS) return
    lastFetch.current = Date.now()
    try {
      setWallet(await getWallet())
    } catch {
      // Keep whatever was last shown. The header is not the place to report a failed
      // background refresh; the wallet page says so when it is actually opened.
    }
  }, [])

  // On mount, and on navigation (throttled) — spending happens on other pages, and the
  // header should have caught up by the time someone looks back at it.
  useEffect(() => {
    if (enabled) void refresh()
  }, [enabled, refresh, location.pathname])

  // An award has just landed: it shows as pending, so fetch now rather than in 30s.
  useEffect(() => {
    if (!enabled) return
    return onCowryEarned(() => void refresh(true))
  }, [enabled, refresh])

  useEffect(() => {
    if (!enabled) return
    const onFocus = () => void refresh()
    window.addEventListener("focus", onFocus)
    return () => window.removeEventListener("focus", onFocus)
  }, [enabled, refresh])

  useEffect(() => {
    if (rain === null) return
    const timer = setTimeout(() => setRain(null), RAIN_MS)
    return () => clearTimeout(timer)
  }, [rain])

  if (!enabled || !wallet) return null

  const spendable = spendableTotal(wallet)
  const pending =
    (wallet.reward?.pending ?? 0) + (wallet.purchased?.pending ?? 0) + (wallet.creator?.pending ?? 0)
  const walletPath = isCowryPathEnabled(Routes.app.user.cowryWallet)
    ? Routes.app.user.cowryWallet
    : enabledCowryPaths()[0]

  function openPopup() {
    setOpen(true)
    setRain(Date.now())
    void refresh(true)
    // A beat after the dialog lands, so the burst comes out of the shell rather than
    // before it is on screen.
    setTimeout(() => celebrateCowries("burst", { x: 0.5, y: 0.32 }), 220)
  }

  return (
    <>
      <button
        type="button"
        onClick={openPopup}
        aria-label={`${formatCowries(spendable)} Cowries. Open your Cowry balance`}
        aria-haspopup="dialog"
        className="cowry-hover cowry-press group flex h-9 shrink-0 items-center gap-1 rounded-full border-2 border-[#f3e6c8] bg-[linear-gradient(135deg,#fffaf0,#fbeed2)] pl-1 pr-2.5 sm:h-10 sm:gap-1.5 sm:border-[3px] sm:pl-1.5 sm:pr-3 shadow-[0_4px_14px_-6px_rgba(200,150,62,0.6)] transition hover:border-[#e8d1a0] hover:shadow-[0_6px_18px_-6px_rgba(200,150,62,0.8)]"
      >
        <span className="flex">
          <CowryIcon size={22} className="cowry-wobble" />
        </span>
        <span className="text-xs font-bold tabular-nums text-[#7a5310] sm:text-sm">{compact(spendable)}</span>
        {pending > 0 && (
          <span
            className="size-1.5 rounded-full bg-[#00b4b8] animate-cowry-glow"
            title={`${formatCowries(pending)} pending`}
            aria-hidden="true"
          />
        )}
      </button>

      {rain !== null && <CowryRain seed={rain} />}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm p-0">
          <div className="cowry-shine relative bg-[linear-gradient(160deg,#0c2a33_0%,#0b5f68_55%,#00a3a7_100%)] px-6 pb-7 pt-8 text-center text-white">
            <DialogClose
              className="absolute z-10 flex items-center justify-center text-white transition rounded-full right-4 top-4 size-9 bg-white/15 hover:bg-white/25"
              aria-label="Close"
            >
              <X className="size-4" aria-hidden="true" />
            </DialogClose>

            <div className="relative flex items-center justify-center mx-auto size-24">
              <span className="animate-check-ring absolute size-20 rounded-full bg-[#f3dfb3]" />
              <CowryIcon size={84} className="animate-cowry-pop relative drop-shadow-[0_10px_16px_rgba(0,0,0,0.35)]" />
            </div>

            <DialogTitle className="relative mt-4 text-sm font-medium text-white/75">
              Your Cowries
            </DialogTitle>
            <p className="relative mt-1 break-all text-4xl font-bold tracking-tight sm:text-5xl">
              <AnimatedCowries value={spendable} />
            </p>
            <DialogDescription className="relative mt-2 text-xs text-white/75">
              Spendable now
              {pending > 0 && (
                <>
                  {" "}· <Clock className="inline size-3 align-[-1px]" aria-hidden="true" />{" "}
                  {formatCowries(pending)} pending
                </>
              )}
            </DialogDescription>
          </div>

          <div className="p-5 space-y-4">
            <ul className="space-y-2 cowry-stagger">
              {BUCKETS.map(({ type, icon: Icon, tint }) => (
                <li key={type} className="flex items-center gap-3 rounded-2xl bg-[#f7f9fb] px-3 py-2.5">
                  <span className={cn("flex size-8 items-center justify-center rounded-xl", tint)}>
                    <Icon className="size-4" aria-hidden="true" />
                  </span>
                  <span className="flex-1 text-sm text-[#565656]">{WALLET_LABELS[type]}</span>
                  <span className="flex items-center gap-1 text-sm font-bold tabular-nums text-[#141922]">
                    <CowryIcon size={14} />
                    {formatCowries(wallet[type]?.available)}
                  </span>
                </li>
              ))}
            </ul>

            <p className="text-center text-xs text-[#8a94a3]">
              Lifetime earned{" "}
              <span className="font-semibold text-[#565656]">{formatCowries(wallet.lifetimeEarned)}</span>
            </p>

            {walletPath && (
              <Button
                className="w-full h-12 text-base bg-[#00b4b8] cowry-press"
                onClick={() => {
                  setOpen(false)
                  navigate(walletPath)
                }}
              >
                View cowry wallet
                <ArrowRight className="size-4" aria-hidden="true" />
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
