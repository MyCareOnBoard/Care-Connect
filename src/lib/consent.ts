import { useSyncExternalStore } from "react"

/**
 * Consent: what this browser has agreed to store and load, and what each account has agreed to.
 *
 * Two kinds, kept apart because they are given by different people at different times:
 *
 * - **Cookies and storage** (per browser). Necessary storage — sign-in, the session, the
 *   sign-up steps, security checks — is always on: the service cannot run without it, and it
 *   needs no consent. "Preferences" (theme, sound, drafts, recent and saved searches, cached
 *   rates) and "third-party services" (Google Maps place search) are off until chosen.
 * - **Agreements** (per account): accepting the Terms and Privacy Policy at sign-up, and the
 *   optional marketing opt-ins, which start unticked.
 *
 * Every record carries the policy version it was given against and when. Raising
 * `CONSENT_VERSION` after a material policy change asks everyone again.
 *
 * Stored in this browser for now. `onConsentRecorded` is the one place a backend call slots in
 * for an auditable server-side record (see `ConsentRecord` for the shape to send).
 */

/** Bump when the cookie or privacy policy changes materially; everyone is asked again. */
export const CONSENT_VERSION = "2026-10-22"

export type ConsentCategory = "necessary" | "preferences" | "thirdParty"

export interface CookieConsent {
  version: string
  decidedAt: string
  preferences: boolean
  thirdParty: boolean
}

export interface AccountAgreement {
  version: string
  /** Terms of Service and Privacy Policy, accepted at sign-up. */
  termsAcceptedAt?: string
  marketingEmail: boolean
  marketingSms: boolean
  updatedAt: string
}

/** The shape a backend consent log would take — one row per decision. */
export interface ConsentRecord {
  kind: "cookies" | "terms" | "marketing"
  version: string
  at: string
  uid?: string
  choices: Record<string, boolean>
}

const COOKIE_KEY = "careconnect.consent.cookies"
const AGREEMENT_KEY = (uid: string) => `careconnect.consent.account:${uid}`
const OPEN_EVENT = "careconnect:open-cookie-settings"
const CHANGE_EVENT = "careconnect:consent-changed"

/**
 * Storage that only remembers preferences once they are allowed. Every key here is removed
 * when preferences are turned off, so declining also clears what was kept before.
 */
const PREFERENCE_KEYS = [
  "careconnect-theme",
  "careconnect-sound",
  "careconnect-feed-focus",
  "careconnect-recent-searches",
  "careconnect-withdraw-currency",
  "careconnect-fx-ngn",
  "careconnect.savedJobSearches",
]
const PREFERENCE_PREFIXES = ["careconnect-tour-v", "careconnect-post-draft:", "careconnect-gifts-seen:"]

const isPreferenceKey = (key: string) =>
  PREFERENCE_KEYS.includes(key) || PREFERENCE_PREFIXES.some((prefix) => key.startsWith(prefix))

/* ── reading and writing ─────────────────────────────────────────────────── */

function read<T>(key: string): T | null {
  try {
    const raw = window.localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : null
  } catch {
    return null
  }
}

function write(key: string, value: unknown): boolean {
  try {
    window.localStorage.setItem(key, JSON.stringify(value))
    return true
  } catch {
    return false
  }
}

/** Only used when storage is blocked: the choice then holds for this visit, and is asked again next time. */
let memoryCookies: CookieConsent | null = null

/** The current choice, or null when none has been made for this policy version. */
export function getCookieConsent(): CookieConsent | null {
  const stored = read<CookieConsent>(COOKIE_KEY) ?? memoryCookies
  return stored && stored.version === CONSENT_VERSION ? stored : null
}

export function hasConsent(category: ConsentCategory): boolean {
  if (category === "necessary") return true
  return Boolean(getCookieConsent()?.[category])
}

/** Hook for the backend: called with every decision. Browser-only until an endpoint exists. */
function onConsentRecorded(record: ConsentRecord) {
  // POST /careconnectConsent { ...record } — to be added when the backend can store it.
  void record
}

function notify() {
  window.dispatchEvent(new Event(CHANGE_EVENT))
}

export function setCookieConsent(choices: { preferences: boolean; thirdParty: boolean }) {
  const consent: CookieConsent = { version: CONSENT_VERSION, decidedAt: new Date().toISOString(), ...choices }
  memoryCookies = write(COOKIE_KEY, consent) ? null : consent
  if (!choices.preferences) clearPreferenceStorage()
  onConsentRecorded({ kind: "cookies", version: CONSENT_VERSION, at: consent.decidedAt, choices })
  notify()
}

export const acceptAllCookies = () => setCookieConsent({ preferences: true, thirdParty: true })
export const acceptNecessaryOnly = () => setCookieConsent({ preferences: false, thirdParty: false })

function clearPreferenceStorage() {
  try {
    const keys = Array.from({ length: window.localStorage.length }, (_, i) => window.localStorage.key(i) ?? "")
    keys.filter(isPreferenceKey).forEach((key) => window.localStorage.removeItem(key))
  } catch {
    // Nothing to clear when storage is blocked.
  }
}

/** localStorage for preferences: writes are dropped until preferences are allowed. */
export const preferenceStorage = {
  getItem: (key: string) => {
    try {
      return window.localStorage.getItem(key)
    } catch {
      return null
    }
  },
  setItem: (key: string, value: string) => {
    if (!hasConsent("preferences")) return
    window.localStorage.setItem(key, value)
  },
  removeItem: (key: string) => {
    try {
      window.localStorage.removeItem(key)
    } catch {
      // ignore
    }
  },
}

/* ── account agreements ──────────────────────────────────────────────────── */

export function getAccountAgreement(uid: string): AccountAgreement | null {
  return read<AccountAgreement>(AGREEMENT_KEY(uid))
}

export function recordAccountAgreement(
  uid: string,
  update: Partial<Pick<AccountAgreement, "termsAcceptedAt" | "marketingEmail" | "marketingSms">>,
) {
  const now = new Date().toISOString()
  const current = getAccountAgreement(uid)
  const next: AccountAgreement = {
    version: CONSENT_VERSION,
    marketingEmail: false,
    marketingSms: false,
    ...current,
    ...update,
    updatedAt: now,
  }
  write(AGREEMENT_KEY(uid), next)
  if (update.termsAcceptedAt) {
    onConsentRecorded({ kind: "terms", version: CONSENT_VERSION, at: now, uid, choices: { accepted: true } })
  }
  if ("marketingEmail" in update || "marketingSms" in update) {
    onConsentRecorded({
      kind: "marketing",
      version: CONSENT_VERSION,
      at: now,
      uid,
      choices: { email: next.marketingEmail, sms: next.marketingSms },
    })
  }
  notify()
}

/* ── React ───────────────────────────────────────────────────────────────── */

function subscribe(callback: () => void) {
  window.addEventListener(CHANGE_EVENT, callback)
  window.addEventListener("storage", callback) // another tab changed it
  return () => {
    window.removeEventListener(CHANGE_EVENT, callback)
    window.removeEventListener("storage", callback)
  }
}

let snapshotKey = ""
let snapshot: CookieConsent | null = null
function cookieSnapshot() {
  const current = getCookieConsent()
  const key = current ? `${current.decidedAt}|${current.preferences}|${current.thirdParty}` : ""
  if (key !== snapshotKey) {
    snapshotKey = key
    snapshot = current
  }
  return snapshot
}

/** The browser's cookie choice, kept current; null until one is made. */
export function useCookieConsent(): CookieConsent | null {
  return useSyncExternalStore(subscribe, cookieSnapshot, () => null)
}

/** Opens the cookie settings dialog from anywhere — Settings, a footer link, a policy page. */
export function openCookieSettings() {
  window.dispatchEvent(new Event(OPEN_EVENT))
}

export function onOpenCookieSettings(callback: () => void) {
  window.addEventListener(OPEN_EVENT, callback)
  return () => window.removeEventListener(OPEN_EVENT, callback)
}
