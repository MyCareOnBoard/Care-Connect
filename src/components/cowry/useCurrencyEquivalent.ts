import { useCallback, useEffect, useState } from "react"
import {
  WITHDRAWAL_CURRENCIES,
  convertNaira,
  formatMoney,
  getNairaRates,
  type RateTable,
} from "@/utils/careconnect/exchangeRates"

const PREFERENCE_KEY = "careconnect-withdraw-currency"

export type RateStatus = "idle" | "loading" | "ready" | "failed"

function readPreference(): string {
  try {
    const saved = localStorage.getItem(PREFERENCE_KEY)
    return saved && WITHDRAWAL_CURRENCIES.some((c) => c.code === saved) ? saved : "NGN"
  } catch {
    return "NGN"
  }
}

/**
 * The currency a member wants to see their withdrawal in, and the rates to show it.
 *
 * Rates are only fetched once a currency other than naira is picked, so someone who never
 * opens the picker never makes the request. The choice is remembered for next time.
 */
export function useCurrencyEquivalent() {
  const [currency, setCurrencyState] = useState<string>(readPreference)
  const [table, setTable] = useState<RateTable | null>(null)
  const [status, setStatus] = useState<RateStatus>("idle")
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    if (currency === "NGN" || table) return
    let active = true
    setStatus("loading")
    getNairaRates()
      .then((next) => {
        if (!active) return
        setTable(next)
        setStatus("ready")
      })
      .catch(() => {
        if (active) setStatus("failed")
      })
    return () => {
      active = false
    }
  }, [currency, table, attempt])

  const setCurrency = useCallback((code: string) => {
    setCurrencyState(code)
    try {
      localStorage.setItem(PREFERENCE_KEY, code)
    } catch {
      // Not remembered; still applies now.
    }
  }, [])

  /** The naira amount in the chosen currency, formatted; null when there is no rate yet. */
  const format = useCallback(
    (naira: number | null | undefined) => {
      const value = convertNaira(naira ?? 0, currency, table)
      return value === null ? null : formatMoney(value, currency)
    },
    [currency, table],
  )

  return {
    currency,
    setCurrency,
    /** True when a non-naira currency is chosen and should be shown alongside naira. */
    converting: currency !== "NGN",
    status,
    table,
    format,
    retry: () => setAttempt((n) => n + 1),
  }
}
