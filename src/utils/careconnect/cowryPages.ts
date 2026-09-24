import { Routes } from "@/routes/constants"

/**
 * Which Cowry pages are switched on.
 *
 * The Cowry surface ships as seven separate screens that do not all become ready at the
 * same time — a rate change, a supplier contract or a payment provider can hold one back
 * while the rest are fine. This is the switch for that: a page can be turned off without
 * a code change, and turned on again the same way.
 *
 * Two variables, because they answer different questions:
 *
 *   VITE_COWRY_PAGES       which pages are on, as a comma-separated list
 *   VITE_COWRY_ENABLE_ALL  everything is on, ignore the list
 *
 * The override exists so that "we are confident in all of it now" is one boolean rather
 * than an edit to a list you then have to keep in step with the code. It wins outright.
 *
 * An unset list means **everything is on**. A deployment that has never heard of these
 * variables must not silently lose its navigation, so absence cannot mean "off" — turning
 * something off has to be something a person did on purpose.
 */

export const COWRY_PAGE_KEYS = [
  "wallet",
  "earn",
  "redeem",
  "buy",
  "creator",
  "withdraw",
  "history",
] as const

export type CowryPageKey = (typeof COWRY_PAGE_KEYS)[number]

/** The route each key controls. Also what the nav filter matches against. */
export const COWRY_PAGE_PATHS: Record<CowryPageKey, string> = {
  wallet: Routes.app.user.cowryWallet,
  earn: Routes.app.user.cowryEarn,
  redeem: Routes.app.user.cowryRedeem,
  buy: Routes.app.user.cowryBuy,
  creator: Routes.app.user.cowryCreator,
  withdraw: Routes.app.user.cowryWithdraw,
  history: Routes.app.user.cowryHistory,
}

const KEY_SET = new Set<string>(COWRY_PAGE_KEYS)

/** Is this one of the keys we recognise? */
export function isCowryPageKey(value: string): value is CowryPageKey {
  return KEY_SET.has(value)
}

/**
 * Read a boolean env var.
 *
 * Only an explicit affirmative counts. Vite hands every variable over as a string, so an
 * unset one is `undefined` and a set-but-empty one is `""` — neither of which should read
 * as true, and nor should the string "false", which is what you get from a CI template
 * that always writes the variable.
 */
function envFlag(raw: unknown): boolean {
  if (typeof raw !== "string") return false
  const value = raw.trim().toLowerCase()
  return value === "true" || value === "1" || value === "yes"
}

/**
 * Parse the list.
 *
 * Tolerant on purpose: this is typed into a hosting dashboard by hand, where spaces,
 * trailing commas and inconsistent casing are normal. An unrecognised key is dropped
 * rather than throwing — a typo should cost you one page, not the whole app.
 */
export function parseCowryPages(raw: unknown): CowryPageKey[] {
  if (typeof raw !== "string") return []
  return [
    ...new Set(
      raw
        .split(",")
        .map((part) => part.trim().toLowerCase())
        .filter((part): part is CowryPageKey => part.length > 0 && isCowryPageKey(part)),
    ),
  ]
}

export interface CowryPageConfig {
  /** VITE_COWRY_PAGES */
  list?: unknown
  /** VITE_COWRY_ENABLE_ALL */
  enableAll?: unknown
}

/**
 * The set of pages that should be reachable.
 *
 * Exported taking its config explicitly so the rules can be tested without touching
 * `import.meta.env`, which is fixed at build time and awkward to vary in a test.
 */
export function resolveEnabledCowryPages(config: CowryPageConfig): Set<CowryPageKey> {
  if (envFlag(config.enableAll)) return new Set(COWRY_PAGE_KEYS)

  const listed = parseCowryPages(config.list)
  // An unset or unparseable list means everything, not nothing. See the note above.
  if (listed.length === 0) return new Set(COWRY_PAGE_KEYS)

  return new Set(listed)
}

/** The live configuration, read once from the build's environment. */
const enabled = resolveEnabledCowryPages({
  list: import.meta.env.VITE_COWRY_PAGES,
  enableAll: import.meta.env.VITE_COWRY_ENABLE_ALL,
})

export function isCowryPageEnabled(key: CowryPageKey): boolean {
  return enabled.has(key)
}

/** Is any Cowry page on at all? When nothing is, the nav entry itself goes away. */
export function isAnyCowryPageEnabled(): boolean {
  return enabled.size > 0
}

/** Is this route path switched on? Paths that are not Cowry pages are unaffected. */
export function isCowryPathEnabled(path: string): boolean {
  const entry = (Object.entries(COWRY_PAGE_PATHS) as [CowryPageKey, string][]).find(
    ([, value]) => value === path,
  )
  return entry ? enabled.has(entry[0]) : true
}

/** Every enabled path, in the order the keys are declared. */
export function enabledCowryPaths(): string[] {
  return COWRY_PAGE_KEYS.filter((key) => enabled.has(key)).map((key) => COWRY_PAGE_PATHS[key])
}
