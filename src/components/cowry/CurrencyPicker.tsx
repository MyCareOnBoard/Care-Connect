import { Info, RefreshCw } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { WITHDRAWAL_CURRENCIES, formatMoney } from "@/utils/careconnect/exchangeRates"
import type { RateStatus } from "@/components/cowry/useCurrencyEquivalent"
import type { RateTable } from "@/utils/careconnect/exchangeRates"

/** The currency dropdown: flag, code and name. */
export function CurrencyPicker({
  value,
  onChange,
  className,
}: {
  value: string
  onChange: (code: string) => void
  className?: string
}) {
  const selected = WITHDRAWAL_CURRENCIES.find((c) => c.code === value)
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger
        aria-label="Show amounts in"
        className={cn("h-9 w-auto gap-1.5 rounded-full bg-white px-3 text-xs font-semibold", className)}
      >
        <SelectValue>
          <span aria-hidden="true">{selected?.flag}</span> {value}
        </SelectValue>
      </SelectTrigger>
      <SelectContent align="end">
        {WITHDRAWAL_CURRENCIES.map((option) => (
          <SelectItem key={option.code} value={option.code}>
            <span className="flex items-center gap-2">
              <span aria-hidden="true">{option.flag}</span>
              <span className="font-semibold">{option.code}</span>
              <span className="text-[#657080]">{option.label}</span>
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

/**
 * The small print under a converted figure: which rate, how fresh, and that it is naira
 * that actually arrives. Or, when rates would not load, a way to try again.
 */
export function RateNote({
  currency,
  status,
  table,
  onRetry,
  tone = "light",
}: {
  currency: string
  status: RateStatus
  table: RateTable | null
  onRetry: () => void
  tone?: "light" | "dark"
}) {
  const muted = tone === "dark" ? "text-white/65" : "text-[#8a94a3]"

  if (status === "failed") {
    return (
      <p className={cn("flex items-center gap-1.5 text-xs", muted)}>
        Couldn&apos;t load exchange rates.
        <button
          type="button"
          onClick={onRetry}
          className={cn(
            "inline-flex items-center gap-1 font-semibold underline-offset-2 hover:underline",
            tone === "dark" ? "text-white" : "text-[#00868a]",
          )}
        >
          <RefreshCw className="size-3" aria-hidden="true" />
          Retry
        </button>
      </p>
    )
  }

  const rate = table?.rates[currency]
  if (status !== "ready" || !rate) return null

  // Quoted the way people read rates: one unit of the foreign currency in naira.
  const nairaPerUnit = 1 / rate
  const updated = table.updatedAt.toLocaleDateString("en-US", { month: "short", day: "numeric" })

  return (
    <p className={cn("flex items-start gap-1.5 text-xs leading-relaxed", muted)}>
      <Info className="mt-0.5 size-3 shrink-0" aria-hidden="true" />
      <span>
        Indicative: {formatMoney(1, currency)} ≈ {formatMoney(nairaPerUnit, "NGN")}, updated {updated}. You&apos;re
        paid in naira — your bank sets the rate if it converts.
      </span>
    </p>
  )
}
