import { useEffect, useRef, type CSSProperties, type ReactNode } from "react"
import { Link } from "react-router"
import { ArrowLeft, Check, Copy, Loader2, RefreshCw, X } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Routes } from "@/routes/constants"
import { formatCowries } from "@/utils/careconnect/cowry"
import { CowryIcon } from "@/components/cowry/CowryIcon"
import { celebrateCowries, originOf, type CelebrationSize } from "@/components/cowry/celebrate"
import { useCountUp } from "@/components/cowry/useCountUp"

/**
 * Shared pieces for the Cowry screens.
 *
 * Seven member pages had grown seven copies of the same header, the same result card and the
 * same "couldn't load" box. They live here now, so a change to how a success looks is one
 * change rather than three that drift.
 */

/* ── numbers ──────────────────────────────────────────────────────────────── */

/** A Cowry figure that counts up to its value. */
export function AnimatedCowries({ value, className }: { value: number; className?: string }) {
  const shown = useCountUp(Math.trunc(value ?? 0))
  return <span className={cn("tabular-nums", className)}>{formatCowries(shown)}</span>
}

/* ── page chrome ──────────────────────────────────────────────────────────── */

interface CowryPageHeaderProps {
  title: string
  subtitle?: ReactNode
  /** Show the link back to the wallet. Off on the wallet itself. */
  back?: boolean
  /** Anything that belongs at the right of the title row: a badge, a button. */
  aside?: ReactNode
}

export function CowryPageHeader({ title, subtitle, back = true, aside }: CowryPageHeaderProps) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        {back && (
          <Link
            to={Routes.app.user.cowryWallet}
            className="group inline-flex items-center gap-1 text-sm font-semibold text-[#00868a] hover:underline"
          >
            <ArrowLeft className="size-4 transition-transform group-hover:-translate-x-0.5" aria-hidden="true" />
            Cowry wallet
          </Link>
        )}
        <h1 className={cn("flex items-center gap-2 text-xl font-bold sm:text-2xl", back && "mt-2")}>
          <span className="cowry-hover inline-flex">
            <CowryIcon size={26} className="cowry-wobble" />
          </span>
          {title}
        </h1>
        {subtitle && <p className="mt-1 text-sm text-[#657080]">{subtitle}</p>}
      </div>
      {aside}
    </header>
  )
}

/** A load that failed, with a way to try again that is not "refresh the whole page". */
export function CowryLoadError({
  title,
  message,
  onRetry,
}: {
  title: string
  message: string
  onRetry: () => void
}) {
  return (
    <div className="space-y-6 p-5 sm:p-8">
      <CowryPageHeader title={title} back={title !== "Cowry wallet"} />
      <div className="animate-fade-in-up rounded-2xl border border-dashed border-[#d7dde3] bg-white/60 p-10 text-center">
        <CowryIcon size={44} className="mx-auto opacity-60 grayscale" />
        <p className="mx-auto mt-4 max-w-sm text-sm text-[#657080]">{message}</p>
        <Button variant="outline" className="mt-5" onClick={onRetry}>
          <RefreshCw className="size-4" aria-hidden="true" />
          Try again
        </Button>
      </div>
    </div>
  )
}

/** The empty state, with a shell rather than a blank box. */
export function CowryEmpty({
  title,
  children,
  action,
}: {
  title: string
  children?: ReactNode
  action?: ReactNode
}) {
  return (
    <div className="rounded-2xl border border-dashed border-[#d7dde3] bg-white/60 p-10 text-center">
      <CowryIcon size={40} className="animate-cowry-float mx-auto" />
      <p className="mt-4 text-sm font-semibold text-[#141922]">{title}</p>
      {children && <p className="mx-auto mt-2 max-w-md text-sm text-[#657080]">{children}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}

/* ── progress ─────────────────────────────────────────────────────────────── */

interface CowryProgressProps {
  /** 0–100. */
  value: number
  label: string
  tone?: "teal" | "gold" | "green" | "orange"
  className?: string
  /** aria values, when the bar measures something other than a percentage. */
  ariaNow?: number
  ariaMax?: number
}

const PROGRESS_TONES = {
  teal: "from-[#00b4b8] to-[#0d8de0]",
  gold: "from-[#e0b872] to-[#c8963e]",
  green: "from-[#34c26b] to-[#1f9c4c]",
  orange: "from-[#f3a55a] to-[#d97a2b]",
}

export function CowryProgress({
  value,
  label,
  tone = "teal",
  className,
  ariaNow,
  ariaMax,
}: CowryProgressProps) {
  const width = Math.max(0, Math.min(100, value))
  return (
    <div
      className={cn("h-2.5 overflow-hidden rounded-full bg-[#eef1f3]", className)}
      role="progressbar"
      aria-valuenow={ariaNow ?? Math.round(width)}
      aria-valuemin={0}
      aria-valuemax={ariaMax ?? 100}
      aria-label={label}
    >
      <div
        className={cn(
          "relative h-full overflow-hidden rounded-full bg-gradient-to-r transition-[width] duration-1000 ease-out",
          PROGRESS_TONES[tone],
        )}
        style={{ width: `${width}%` }}
      >
        {width > 0 && width < 100 && (
          <span className="animate-shimmer absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent" />
        )}
      </div>
    </div>
  )
}

/* ── steps ────────────────────────────────────────────────────────────────── */

/** Where someone is in a multi-step flow. Completed steps tick over as they pass. */
export function CowrySteps({ steps, current }: { steps: string[]; current: number }) {
  return (
    <ol className="flex items-center gap-2 text-xs font-semibold" aria-label="Progress">
      {steps.map((step, index) => {
        const done = index < current
        const active = index === current
        return (
          <li key={step} className="flex items-center gap-2" aria-current={active ? "step" : undefined}>
            <span
              className={cn(
                "flex size-6 items-center justify-center rounded-full transition-all duration-300",
                done && "bg-[#00b4b8] text-white",
                active && "animate-cowry-glow bg-[#10141a] text-white",
                !done && !active && "bg-[#e7ebef] text-[#8a94a3]",
              )}
            >
              {done ? <Check className="size-3.5" aria-hidden="true" /> : index + 1}
            </span>
            <span className={cn("hidden sm:inline", active ? "text-[#141922]" : "text-[#8a94a3]")}>
              {step}
            </span>
            {index < steps.length - 1 && (
              <span
                className={cn(
                  "h-0.5 w-6 rounded-full transition-colors duration-500 sm:w-10",
                  done ? "bg-[#00b4b8]" : "bg-[#e7ebef]",
                )}
                aria-hidden="true"
              />
            )}
          </li>
        )
      })}
    </ol>
  )
}

/* ── choices ──────────────────────────────────────────────────────────────── */

interface ChoiceCardProps {
  selected: boolean
  onSelect: () => void
  children: ReactNode
  className?: string
  /** Dims the card without disabling it: seeing what is out of reach is useful. */
  muted?: boolean
}

/** A selectable tile. Lifts on hover, presses on tap, and ticks when chosen. */
export function ChoiceCard({ selected, onSelect, children, className, muted }: ChoiceCardProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={cn(
        "cowry-lift cowry-press cowry-hover relative rounded-2xl border-2 bg-white p-4 text-left transition-colors",
        selected
          ? "border-[#00b4b8] bg-[#effbfb] shadow-[0_10px_30px_-14px_rgba(0,180,184,0.6)]"
          : "border-transparent ring-1 ring-[#e2e6ea] hover:ring-[#c8cdd4]",
        muted && !selected && "opacity-60",
        className,
      )}
    >
      {selected && (
        <span className="animate-check-pop absolute right-2.5 top-2.5 flex size-5 items-center justify-center rounded-full bg-[#00b4b8] text-white">
          <Check className="size-3" aria-hidden="true" />
        </span>
      )}
      {children}
    </button>
  )
}

/* ── results ──────────────────────────────────────────────────────────────── */

export type ResultTone = "success" | "pending" | "error"

interface CowryResultCardProps {
  tone: ResultTone
  title: string
  children?: ReactNode
  /** Rows under the message: what was paid, what arrived. */
  details?: ReactNode
  reference?: string | null
  actions?: ReactNode
  /** How big the confetti is on success. */
  celebration?: CelebrationSize
}

/**
 * The end of a flow, told honestly.
 *
 * Success gets confetti from the icon itself, pending gets a patient spinner, and a refusal
 * gets a small shake — enough to register, not enough to feel like a scolding.
 */
export function CowryResultCard({
  tone,
  title,
  children,
  details,
  reference,
  actions,
  celebration = "burst",
}: CowryResultCardProps) {
  const iconRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (tone !== "success") return
    const timer = setTimeout(() => celebrateCowries(celebration, originOf(iconRef.current)), 250)
    return () => clearTimeout(timer)
  }, [tone, celebration])

  async function copyReference() {
    if (!reference) return
    try {
      await navigator.clipboard.writeText(reference)
      toast.success("Reference copied")
    } catch {
      toast.error("Couldn't copy. Select the reference and copy it instead.")
    }
  }

  return (
    <div className="animate-fade-in-up p-5 sm:p-8">
      <div
        className={cn(
          "relative mx-auto max-w-lg overflow-hidden rounded-3xl bg-white p-8 text-center shadow-[0_24px_60px_-30px_rgba(16,20,26,0.35)] ring-1 ring-[#e2e6ea]",
          tone === "error" && "animate-cowry-shake",
        )}
      >
        {tone === "success" && (
          <div
            className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-[#effbfb] to-transparent"
            aria-hidden="true"
          />
        )}

        <div ref={iconRef} className="relative mx-auto flex size-20 items-center justify-center">
          {tone === "success" && (
            <>
              <span className="animate-check-ring absolute size-16 rounded-full bg-[#00b4b8]" />
              <span className="animate-cowry-pop relative flex size-16 items-center justify-center rounded-full bg-[#00b4b8] text-white">
                <Check className="size-8" aria-hidden="true" />
              </span>
              <CowryIcon size={26} className="animate-cowry-pop absolute -right-1 -top-1 [animation-delay:250ms]" />
            </>
          )}
          {tone === "pending" && (
            <span className="relative flex size-16 items-center justify-center rounded-full bg-[#fff6ec]">
              <Loader2 className="size-8 animate-spin text-[#d97a2b]" aria-hidden="true" />
              <CowryIcon size={22} className="animate-cowry-float absolute -right-1 -top-1" />
            </span>
          )}
          {tone === "error" && (
            <span className="animate-cowry-pop flex size-16 items-center justify-center rounded-full bg-[#ffe0dd]">
              <X className="size-8 text-[#b4372c]" aria-hidden="true" />
            </span>
          )}
        </div>

        <h1 className="relative mt-5 text-2xl font-bold" aria-live="polite">
          {title}
        </h1>
        {children && (
          <div className="relative mx-auto mt-2 max-w-sm text-sm leading-relaxed text-[#657080]">
            {children}
          </div>
        )}

        {details && (
          <dl className="cowry-stagger relative mt-6 divide-y divide-[#eef1f3] rounded-2xl bg-[#f7f9fb] px-4 text-left text-sm">
            {details}
          </dl>
        )}

        {reference && (
          <button
            type="button"
            onClick={copyReference}
            className="relative mt-4 inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-mono text-xs text-[#657080] transition hover:bg-[#eef1f3]"
            title="Copy reference"
          >
            Reference {reference}
            <Copy className="size-3" aria-hidden="true" />
          </button>
        )}

        {actions && <div className="relative mt-6 flex flex-wrap justify-center gap-3">{actions}</div>}
      </div>
    </div>
  )
}

/** One label/value row for a receipt-style list. */
export function ReceiptRow({
  label,
  children,
  strong,
  tone,
}: {
  label: ReactNode
  children: ReactNode
  strong?: boolean
  tone?: "fee"
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <dt className={strong ? "font-semibold text-[#141922]" : "text-[#657080]"}>{label}</dt>
      <dd
        className={cn(
          "text-right tabular-nums",
          strong ? "text-lg font-bold text-[#141922]" : "font-semibold",
          tone === "fee" && "text-[#d97a2b]",
        )}
      >
        {children}
      </dd>
    </div>
  )
}

/* ── decoration ───────────────────────────────────────────────────────────── */

const SCATTER = [
  { top: "8%", right: "6%", size: 54, tilt: -18, delay: "0s" },
  { top: "52%", right: "18%", size: 34, tilt: 24, delay: "-2s" },
  { top: "18%", right: "30%", size: 22, tilt: 40, delay: "-4s" },
  { top: "64%", right: "3%", size: 28, tilt: -32, delay: "-1s" },
]

/** Shells drifting in the corner of a hero card. Purely decorative. */
export function CowryScatter({ className }: { className?: string }) {
  return (
    <div className={cn("pointer-events-none absolute inset-0", className)} aria-hidden="true">
      {SCATTER.map((shell, index) => (
        <span
          key={index}
          className="animate-cowry-float absolute drop-shadow-[0_6px_10px_rgba(0,0,0,0.25)]"
          style={
            {
              top: shell.top,
              right: shell.right,
              animationDelay: shell.delay,
              "--cowry-tilt": `${shell.tilt}deg`,
            } as CSSProperties
          }
        >
          <CowryIcon size={shell.size} />
        </span>
      ))}
    </div>
  )
}
