/**
 * Health Tips — thin axios wrapper around the AI health-tips endpoint.
 *
 * Served by the `careconnectHealthTips` Cloud Function in CareOnBoard-Backend:
 *
 *   POST /careconnectHealthTips/search   body: { query, personalize?, answers?, exclude? }
 *   200  { success, data: { tip, tips, urgent, notice, personalized, needs? }, aiGenerated }
 *   400  validation failed      429  rate limited      503  the model is unavailable
 *   POST /careconnectHealthTips/feedback body: { rating, reason?, concerning?, personalized?, imageKey? }
 *   POST /careconnectHealthTips/image/:key   200 { data: { status: ready|pending|failed, url?, alt? } }
 *
 * "Show me another" repeats the search with `exclude` set to the titles already shown. When
 * nothing new is left the server sends no tip and a notice. Feedback is stored without the
 * query, the tip text or who sent it, so nothing the person typed travels with it.
 *
 * Illustrations are optional and AI-generated. A tip may carry `image`: either ready (a url)
 * or pending (a key to fetch it with). `fetchHealthTipImage` asks for a pending one; if it
 * never comes the tip is just text.
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

const HEALTH_TIPS_BASE = "/careconnectHealthTips"
export const HEALTH_TIPS_PATH = `${HEALTH_TIPS_BASE}/search`
export const HEALTH_TIPS_FEEDBACK_PATH = `${HEALTH_TIPS_BASE}/feedback`
const imagePath = (key: string) => `${HEALTH_TIPS_BASE}/image/${key}`

/** The server's illustration ids: 32 lowercase hex characters. Anything else is never sent back. */
const IMAGE_KEY = /^[a-f0-9]{32}$/

/** "Show me another" sends at most this many titles; mirrors the server. */
export const MAX_EXCLUDE = 5

/** Mirrors the server's Joi bounds. Short enough that nobody pastes a record into it. */
export const MAX_QUERY_LENGTH = 200
export const MIN_QUERY_LENGTH = 3

/**
 * An AI-generated picture that goes with a tip. Optional: most tips are text only.
 * `ready` can be shown now; `pending` is still being drawn and is fetched by `key`.
 * `alt` is always present: an image without a description is dropped rather than shown.
 */
export type HealthTipImage =
  | { status: "ready"; url: string; alt: string; key?: string }
  | { status: "pending"; alt: string; key: string }

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
  /** Titles of tips already shown for this query ("show me another"). The newest are kept. */
  exclude?: string[]
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
 * Accept an image only when it can be shown safely and described: a non-empty alt text and
 * either an https URL (ready) or a valid key to fetch it with (pending). Anything else is
 * dropped, and the tip simply renders as text.
 */
function mapImage(raw: unknown): HealthTipImage | undefined {
  if (!raw || typeof raw !== "object") return undefined
  const { url, alt, key, status } = raw as { url?: unknown; alt?: unknown; key?: unknown; status?: unknown }
  if (typeof alt !== "string" || !alt.trim()) return undefined
  const validKey = typeof key === "string" && IMAGE_KEY.test(key) ? key : undefined

  if (status === "pending") {
    return validKey ? { status: "pending", alt: alt.trim(), key: validKey } : undefined
  }
  if (typeof url !== "string" || !/^https:\/\//i.test(url)) return undefined
  return { status: "ready", url, alt: alt.trim(), ...(validKey ? { key: validKey } : {}) }
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
  { personalize = false, answers, exclude }: SearchHealthTipsOptions = {},
): Promise<HealthTipsResult> {
  const query = normalizeQuery(rawQuery)
  // Unpersonalised requests send exactly what they always did. Answers only travel with an
  // opt-in; the server ignores them otherwise, and there is no reason to send them.
  const payload: { query: string; personalize?: true; answers?: HealthTipAnswers; exclude?: string[] } = { query }
  if (personalize) {
    payload.personalize = true
    if (answers) payload.answers = answers
  }
  const shown = (exclude ?? []).map((title) => title.trim().slice(0, 120)).filter(Boolean)
  if (shown.length > 0) payload.exclude = shown.slice(-MAX_EXCLUDE)
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

export type HealthTipRating = "up" | "down"

export type HealthTipFeedbackReason = "not_relevant" | "unclear" | "not_safe" | "already_know" | "bad_image"

export interface HealthTipFeedback {
  rating: HealthTipRating
  /** Only sent with a thumbs-down. */
  reason?: HealthTipFeedbackReason
  /** "This worried me." */
  concerning?: boolean
  personalized?: boolean
  /** The illustration being reported, with `bad_image`. */
  imageKey?: string
}

/**
 * Send a thumbs up or down. The server keeps the rating, the reason and two flags — never the
 * query, the tip's text or who sent it — so none of those are in the request either.
 */
export async function sendHealthTipFeedback(feedback: HealthTipFeedback): Promise<void> {
  const payload: HealthTipFeedback = { rating: feedback.rating }
  if (feedback.rating === "down" && feedback.reason) payload.reason = feedback.reason
  if (feedback.concerning) payload.concerning = true
  if (feedback.personalized) payload.personalized = true
  if (feedback.imageKey && IMAGE_KEY.test(feedback.imageKey)) payload.imageKey = feedback.imageKey
  await axiosClient.post(HEALTH_TIPS_FEEDBACK_PATH, payload)
}

export type HealthTipImageResult =
  | { status: "ready"; url: string; alt?: string }
  | { status: "pending" }
  | { status: "failed" }

/**
 * Ask for a pending illustration. The first request may generate it; later ones return it.
 * Anything unexpected — a bad key, a bad URL, an unknown status — reads as "failed", and
 * the tip stays text. The key is checked before a request is spent on it.
 */
export async function fetchHealthTipImage(key: string): Promise<HealthTipImageResult> {
  if (!IMAGE_KEY.test(key)) return { status: "failed" }
  const { data } = await axiosClient.post(imagePath(key))
  const body = data?.data ?? {}
  if (body.status === "pending") return { status: "pending" }
  if (body.status === "ready" && typeof body.url === "string" && /^https:\/\//i.test(body.url)) {
    return {
      status: "ready",
      url: body.url,
      ...(typeof body.alt === "string" && body.alt.trim() ? { alt: body.alt.trim() } : {}),
    }
  }
  return { status: "failed" }
}
