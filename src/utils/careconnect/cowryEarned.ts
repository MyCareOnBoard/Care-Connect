/**
 * Care Connect — announcing a Cowry award.
 *
 * The post, comment and feed endpoints each return a `cowry` field alongside their own
 * data. Threading that through every caller's return type would change a lot of signatures
 * for something that is, in the end, one transient piece of chrome — so it travels as a
 * window event instead, the same way `POST_CREATED_EVENT` already does in postsService.
 *
 * One listener renders it. See CowryEarnedLayer.
 */

/** The award shape the backend returns. Null when nothing was recorded. */
export interface CowryAward {
  awarded: boolean
  amount?: number | null
  releaseAt?: string | null
  reason?: string | null
}

/**
 * What the user just did.
 *
 * This is not cosmetic. A refusal is worth saying out loud for something the user chose to
 * do — "that is your third post today" is useful. For the feed it would be noise: the
 * daily visit is capped at one, so *every* load after the first comes back refused, and
 * announcing that would put a "daily limit reached" message on screen all day.
 */
export type CowryEarnSource = "post" | "comment" | "visit"

export interface CowryEarnedDetail {
  award: CowryAward
  source: CowryEarnSource
}

export const COWRY_EARNED_EVENT = "careconnect:cowry-earned"

/** Human wording for the refusals worth mentioning. Anything else stays quiet. */
export const COWRY_REFUSAL_MESSAGES: Record<string, string> = {
  daily_cap_reached: "You've reached today's limit for this, so it didn't earn Cowries.",
  pool_exhausted: "Today's reward budget is used up. This didn't earn Cowries.",
}

/**
 * Should this outcome be shown at all?
 *
 * Exported so the decision is testable on its own, rather than buried in a component that
 * needs a DOM to exercise.
 */
export function shouldAnnounce(detail: CowryEarnedDetail | null | undefined): boolean {
  if (!detail?.award) return false
  if (detail.award.awarded) return (detail.award.amount ?? 0) > 0
  // A refusal the user did not ask for is noise; one following a deliberate action is not.
  if (detail.source === "visit") return false
  return Boolean(detail.award.reason && detail.award.reason in COWRY_REFUSAL_MESSAGES)
}

/**
 * Publish an award, if there is one.
 *
 * Accepts the raw field straight off a response — including `undefined`, which is what an
 * older backend or a stripped proxy would give — so callers do not each have to guard.
 */
export function publishCowryAward(award: unknown, source: CowryEarnSource): void {
  if (!award || typeof award !== "object") return
  if (typeof window === "undefined") return

  const detail: CowryEarnedDetail = { award: award as CowryAward, source }
  if (!shouldAnnounce(detail)) return

  window.dispatchEvent(new CustomEvent<CowryEarnedDetail>(COWRY_EARNED_EVENT, { detail }))
}

/** Subscribe to awards. Returns the unsubscribe function. */
export function onCowryEarned(handler: (detail: CowryEarnedDetail) => void): () => void {
  const listener = (event: Event) => {
    const detail = (event as CustomEvent<CowryEarnedDetail>).detail
    if (detail) handler(detail)
  }
  window.addEventListener(COWRY_EARNED_EVENT, listener)
  return () => window.removeEventListener(COWRY_EARNED_EVENT, listener)
}
