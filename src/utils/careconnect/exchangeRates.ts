/**
 * Indicative exchange rates from the naira, for showing a withdrawal in other currencies.
 *
 * Display only. Withdrawals are paid in naira to a Nigerian bank; these figures answer "what
 * is that roughly worth to me", and are labelled as indicative wherever they appear. Nothing
 * here feeds the amount actually sent.
 *
 * SOURCE. The Cowry API now serves the table: GET /careconnectCowry/rates, refreshed once a
 * day server-side from a free public feed. This used to call that feed from the browser,
 * which meant one request per user per six hours, a figure that differed between two people
 * depending on when their cache filled, and a third-party host an ad blocker or a corporate
 * proxy could quietly refuse — emptying the cash-out screen for that one person with nobody
 * the wiser.
 *
 * The server may answer with a table older than it would like, flagged stale. That is
 * deliberate and it is passed through: two-day-old figures are far more useful than none,
 * provided the screen says so, which RateNote does.
 */

// The default client, not careconnectClient: the Cowry API is its own function, so it is
// addressed from the root. careconnectClient prefixes /careconnectCore and would send this
// to /careconnectCore/careconnectCowry/rates.
import axiosClient from "@/lib/axios"

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
  const { data } = await axiosClient.get("/careconnectCowry/rates")
  const payload = data?.data as
    | { rates?: Record<string, number>; updatedAt?: string; stale?: boolean }
    | undefined

  if (!payload?.rates || Object.keys(payload.rates).length === 0) {
    throw new Error("Exchange rates unavailable")
  }

  return {
    rates: payload.rates,
    updatedAt: payload.updatedAt ? new Date(payload.updatedAt) : new Date(),
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
