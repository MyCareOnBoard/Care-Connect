/**
 * Health Tips — thin axios wrapper around the AI health-tips endpoint.
 *
 * Served by the `careconnectHealthTips` Cloud Function in CareOnBoard-Backend:
 *
 *   POST /careconnectHealthTips/search   body: { query, personalize?, answers? }
 *   200  { success, data: { tip, tips, urgent, notice, personalized, needs? }, aiGenerated }
 *   400  validation failed      429  rate limited      503  the model is unavailable
 *
 * Personalising is opt-in. The server reads the person's own health profile itself — it is
 * never sent from here. When a relevant value is unknown it answers with `needs` (questions
 * to ask) and no tip; repeat the search with `answers`, or with `answers: {}` to skip them.
 * Answers are used for that request only.
 *
 * The page shows ONE tip. `tip` is that tip (or null); `tips` is the same tip as a 0-1 item
 * array that the server keeps for older clients. This reads `tip` first and falls back to
 * the first of `tips`, so it works whichever of the two deploys lands first.
 *
 * What the server guarantees, so the page doesn't have to re-check it:
 *   - an emergency comes back as `urgent: true` with no tip and a `notice` telling the
 *     person to call emergency services;
 *   - a question the model should not answer (a diagnosis, a medicine dose) comes back with
 *     no tip and a `notice` saying so;
 *   - there is never a canned fallback — if the model is down the request fails (503).
 *
 * The model call happens on the server only; the key cannot live in a Vite bundle.
 */

import axiosClient from "@/lib/axios"

export const HEALTH_TIPS_PATH = "/careconnectHealthTips/search"

/** Mirrors the server's Joi bounds. Short enough that nobody pastes a record into it. */
export const MAX_QUERY_LENGTH = 200
export const MIN_QUERY_LENGTH = 3

/** A picture that goes with a tip. Optional: most tips are text only. */
export interface HealthTipImage {
  url: string
  /** Always present: an image without a description is dropped rather than shown. */
  alt: string
}

export interface HealthTip {
  id: string
  title: string
  summary: string
  /** Optional short actionable steps. */
  steps?: string[]
  /** Optional "see a professional if..." line. */
  whenToSeeAProfessional?: string
  /** Optional illustration. */
  image?: HealthTipImage
}

/** What the server may ask before it personalises a tip. */
export type HealthTipQuestionField = "ageRange" | "mobility" | "smoking" | "alcohol"

const QUESTION_FIELDS: readonly HealthTipQuestionField[] = ["ageRange", "mobility", "smoking", "alcohol"]

/** Never show more than this, whatever the server sends: a questionnaire in front of a tip drives people away. */
export const MAX_QUESTIONS = 3

export interface HealthTipQuestionOption {
  /** What goes back in `answers`. */
  value: string
  /** What the person reads. */
  label: string
}

export interface HealthTipQuestion {
  field: HealthTipQuestionField
  question: string
  options: HealthTipQuestionOption[]
}

/** Answers keyed by question field; every value is one of that question's option values. */
export type HealthTipAnswers = Partial<Record<HealthTipQuestionField, string>>

export interface SearchHealthTipsOptions {
  /** Opt in to tailoring the tip to the person's health profile. Off unless set. */
  personalize?: boolean
  /**
   * Answers to the questions from an earlier result. `{}` means the person skipped them.
   * Only sent when `personalize` is on.
   */
  answers?: HealthTipAnswers
}

export interface HealthTipsResult {
  query: string
  /** The one tip for this query, or null when urgent, declined, asking, or nothing safe came back. */
  tip: HealthTip | null
  /** The query read as an emergency. `tip` is then null and `notice` says what to do. */
  urgent: boolean
  /** A sentence to show instead of a tip: the emergency instruction, or why there is none. */
  notice: string | null
  /** True when the person's profile or answers shaped this tip. */
  personalized: boolean
  /**
   * Questions to ask before a tip can be personalised. Non-empty only when personalising was
   * requested and something relevant is unknown; there is no tip in that case. Repeat the
   * search with `answers` once they are answered or skipped.
   */
  needs: HealthTipQuestion[]
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

/**
 * Accept an image only when it can be shown safely and described: an https URL and a
 * non-empty alt text. Anything else is dropped, and the tip simply renders as text.
 */
function mapImage(raw: unknown): HealthTipImage | undefined {
  if (!raw || typeof raw !== "object") return undefined
  const { url, alt } = raw as { url?: unknown; alt?: unknown }
  if (typeof url !== "string" || !/^https:\/\//i.test(url)) return undefined
  if (typeof alt !== "string" || !alt.trim()) return undefined
  return { url, alt: alt.trim() }
}

function mapTip(raw: unknown): HealthTip | null {
  if (!raw || typeof raw !== "object") return null
  const tip = raw as Partial<HealthTip> & { image?: unknown }
  const image = mapImage(tip.image)
  return {
    id: tip.id ?? "tip-1",
    title: tip.title ?? "Health tip",
    summary: tip.summary ?? "",
    steps: Array.isArray(tip.steps) ? tip.steps : undefined,
    whenToSeeAProfessional: tip.whenToSeeAProfessional,
    ...(image ? { image } : {}),
  }
}

/**
 * Keep only well-formed questions: a known field, some text, and at least two options to
 * choose between. A malformed one is dropped rather than shown half-built.
 */
function mapNeeds(raw: unknown): HealthTipQuestion[] {
  if (!Array.isArray(raw)) return []
  const questions: HealthTipQuestion[] = []
  for (const item of raw) {
    if (!item || typeof item !== "object") continue
    const { field, question, options } = item as {
      field?: unknown
      question?: unknown
      options?: unknown
    }
    if (!QUESTION_FIELDS.includes(field as HealthTipQuestionField)) continue
    if (typeof question !== "string" || !question.trim()) continue
    const mapped: HealthTipQuestionOption[] = []
    if (Array.isArray(options)) {
      for (const option of options) {
        const { value, label } = (option ?? {}) as { value?: unknown; label?: unknown }
        if (typeof value === "string" && value && typeof label === "string" && label) {
          mapped.push({ value, label })
        }
      }
    }
    if (mapped.length < 2) continue
    questions.push({ field: field as HealthTipQuestionField, question: question.trim(), options: mapped })
    if (questions.length >= MAX_QUESTIONS) break
  }
  return questions
}

export async function searchHealthTips(
  rawQuery: string,
  { personalize = false, answers }: SearchHealthTipsOptions = {},
): Promise<HealthTipsResult> {
  const query = normalizeQuery(rawQuery)
  // Unpersonalised requests send exactly what they always did. Answers only travel with an
  // opt-in; the server ignores them otherwise, and there is no reason to send them.
  const payload: { query: string; personalize?: true; answers?: HealthTipAnswers } = { query }
  if (personalize) {
    payload.personalize = true
    if (answers) payload.answers = answers
  }
  const { data } = await axiosClient.post(HEALTH_TIPS_PATH, payload)

  // Care Connect routes use a { success, data } envelope.
  const body = data?.data ?? {}
  // `tip` first; the first of `tips` covers a server that has not shipped `tip` yet.
  const tip = mapTip(body.tip ?? (Array.isArray(body.tips) ? body.tips[0] : null))
  const urgent = body.urgent === true

  return {
    query,
    tip,
    urgent,
    notice: typeof body.notice === "string" && body.notice ? body.notice : null,
    personalized: body.personalized === true,
    // An emergency is never answered with a question, whatever else arrived with it.
    needs: urgent || tip ? [] : mapNeeds(body.needs),
  }
}
