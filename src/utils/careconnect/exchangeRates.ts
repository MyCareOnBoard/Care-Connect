/**
 * Indicative exchange rates from the naira, for showing a withdrawal in other currencies.
 *
 * Display only. Withdrawals are paid in naira to a Nigerian bank; these figures answer "what
 * is that roughly worth to me", and are labelled as indicative wherever they appear. Nothing
 * here feeds the amount actually sent.
 *
 * SOURCE. The Cowry API has no rates endpoint, so this reads a free public feed
 * (open.er-api.com: no key, NGN base, refreshed daily). It sends nothing about the user —
 * only asks for today's table. When the backend grows a rates endpoint, replace `fetchTable`
 * and nothing else changes.
 */

const RATES_URL = "https://open.er-api.com/v6/latest/NGN"
const CACHE_KEY = "careconnect-fx-ngn"
/** The feed updates daily; six hours keeps it fresh without a request on every visit. */
const CACHE_MS = 6 * 60 * 60 * 1000

export interface RateTable {
  /** Units of each currency per one naira. */
  rates: Record<string, number>
  /** When the provider last updated the table. */
  updatedAt: Date
}

export interface CurrencyOption {
  code: string
  label: string
  flag: string
}

/** Offered in the picker. Naira first: it is what is actually paid. */
export const WITHDRAWAL_CURRENCIES: CurrencyOption[] = [
  { code: "NGN", label: "Nigerian naira", flag: "🇳🇬" },
  { code: "USD", label: "US dollar", flag: "🇺🇸" },
  { code: "GBP", label: "British pound", flag: "🇬🇧" },
  { code: "EUR", label: "Euro", flag: "🇪🇺" },
  { code: "CAD", label: "Canadian dollar", flag: "🇨🇦" },
  { code: "GHS", label: "Ghanaian cedi", flag: "🇬🇭" },
  { code: "KES", label: "Kenyan shilling", flag: "🇰🇪" },
  { code: "ZAR", label: "South African rand", flag: "🇿🇦" },
]

let pending: Promise<RateTable> | null = null

function readCache(): RateTable | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (!raw) return null
    const cached = JSON.parse(raw) as { rates: Record<string, number>; updatedAt: string; fetchedAt: number }
    if (Date.now() - cached.fetchedAt > CACHE_MS) return null
    return { rates: cached.rates, updatedAt: new Date(cached.updatedAt) }
  } catch {
    return null
  }
}

function writeCache(table: RateTable) {
  try {
    localStorage.setItem(
      CACHE_KEY,
      JSON.stringify({ rates: table.rates, updatedAt: table.updatedAt.toISOString(), fetchedAt: Date.now() }),
    )
  } catch {
    // No storage: the next visit fetches again, which is fine.
  }
}

async function fetchTable(): Promise<RateTable> {
  const response = await fetch(RATES_URL)
  if (!response.ok) throw new Error(`Exchange rates unavailable (${response.status})`)
  const body = (await response.json()) as {
    result?: string
    rates?: Record<string, number>
    time_last_update_unix?: number
  }
  if (body.result !== "success" || !body.rates) throw new Error("Exchange rates unavailable")
  return {
    rates: body.rates,
    updatedAt: new Date((body.time_last_update_unix ?? Date.now() / 1000) * 1000),
  }
}

/** Today's table, from cache when fresh. Concurrent callers share one request. */
export function getNairaRates(): Promise<RateTable> {
  const cached = readCache()
  if (cached) return Promise.resolve(cached)
  if (!pending) {
    pending = fetchTable()
      .then((table) => {
        writeCache(table)
        return table
      })
      .finally(() => {
        pending = null
      })
  }
  return pending
}

/** A naira amount in another currency, or null when the table has no rate for it. */
export function convertNaira(naira: number, currency: string, table: RateTable | null): number | null {
  if (currency === "NGN") return naira
  const rate = table?.rates[currency]
  return typeof rate === "number" && rate > 0 ? naira * rate : null
}

/** Money in its own currency's conventions: "$12.40", "£9.85", "GH₵150.00". */
export function formatMoney(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: currency === "NGN" ? 0 : 2,
    }).format(amount)
  } catch {
    return `${amount.toFixed(2)} ${currency}`
  }
}
