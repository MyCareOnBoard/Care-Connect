/**
 * Health Tips — thin axios wrapper around the AI health-tips endpoint.
 *
 * Served by the `careconnectHealthTips` Cloud Function in CareOnBoard-Backend:
 *
 *   POST /careconnectHealthTips/search   body: { query: string }
 *   200  { success, data: { tips, urgent, notice }, aiGenerated }
 *   400  validation failed      429  rate limited      503  the model is unavailable
 *
 * What the server guarantees, so the page doesn't have to re-check it:
 *   - an emergency comes back as `urgent: true` with `tips: []` and a `notice` telling the
 *     person to call emergency services;
 *   - a question the model should not answer (a diagnosis, a medicine dose) comes back with
 *     `tips: []` and a `notice` saying so;
 *   - there is never a canned fallback — if the model is down the request fails (503).
 *
 * The model call happens on the server only; the key cannot live in a Vite bundle.
 */

import axiosClient from "@/lib/axios"

export const HEALTH_TIPS_PATH = "/careconnectHealthTips/search"

/** Mirrors the server's Joi bounds. Short enough that nobody pastes a record into it. */
export const MAX_QUERY_LENGTH = 200
export const MIN_QUERY_LENGTH = 3

export interface HealthTip {
  id: string
  title: string
  summary: string
  /** Optional short actionable steps. */
  steps?: string[]
  /** Optional "see a professional if..." line. */
  whenToSeeAProfessional?: string
}

export interface HealthTipsResult {
  query: string
  tips: HealthTip[]
  /** The query read as an emergency. `tips` is then empty and `notice` says what to do. */
  urgent: boolean
  /** A sentence to show instead of tips: the emergency instruction, or why there are none. */
  notice: string | null
}

export class HealthTipsQueryError extends Error {}

/** Trim and validate before spending a request. Throws HealthTipsQueryError with a user-facing message. */
export function normalizeQuery(raw: string): string {
  const query = raw.replace(/\s+/g, " ").trim()
  if (query.length < MIN_QUERY_LENGTH) {
    throw new HealthTipsQueryError("Type a few more words about what you'd like tips on.")
  }
  if (query.length > MAX_QUERY_LENGTH) {
    throw new HealthTipsQueryError(`Keep it under ${MAX_QUERY_LENGTH} characters.`)
  }
  return query
}

const FALLBACK_ERROR = "We couldn't get tips just now."

/**
 * A message fit to show for a failed search.
 *
 * The server words its 429 and 503 for people ("You're searching too quickly…"), so those are
 * passed through. Anything else gets the generic line rather than a raw status or stack.
 */
export function healthTipsErrorMessage(error: unknown): string {
  const response = (error as { response?: { status?: number; data?: { error?: unknown } } } | null)
    ?.response
  const message = response?.data?.error
  if ((response?.status === 429 || response?.status === 503) && typeof message === "string" && message) {
    return message
  }
  return FALLBACK_ERROR
}

export async function searchHealthTips(rawQuery: string): Promise<HealthTipsResult> {
  const query = normalizeQuery(rawQuery)
  const { data } = await axiosClient.post(HEALTH_TIPS_PATH, { query })

  // Care Connect routes use a { success, data } envelope.
  const body = data?.data ?? {}
  const tips: HealthTip[] = Array.isArray(body.tips)
    ? body.tips.map((tip: Partial<HealthTip>, index: number) => ({
        id: tip.id ?? `tip-${index}`,
        title: tip.title ?? "Health tip",
        summary: tip.summary ?? "",
        steps: Array.isArray(tip.steps) ? tip.steps : undefined,
        whenToSeeAProfessional: tip.whenToSeeAProfessional,
      }))
    : []

  return {
    query,
    tips,
    urgent: body.urgent === true,
    notice: typeof body.notice === "string" && body.notice ? body.notice : null,
  }
}
