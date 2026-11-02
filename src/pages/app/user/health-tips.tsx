import { useRef, useState, type FormEvent } from "react"
import { toast } from "sonner"
import { AlertTriangle, RefreshCw, Search, Sparkles } from "lucide-react"
import { PageHeader } from "@/components/app/PageHeader"
import { AiDisclaimer, AI_DISCLAIMER_EMERGENCY } from "@/components/health-tips/AiDisclaimer"
import { HealthTipCard } from "@/components/health-tips/HealthTipCard"
import { HealthTipFeedback } from "@/components/health-tips/HealthTipFeedback"
import { HealthTipQuestionCard } from "@/components/health-tips/HealthTipQuestionCard"
import { Checkbox } from "@/components/ui/checkbox"
import { Skeleton } from "@/components/ui/skeleton"
import {
  HealthTipsQueryError,
  MAX_QUERY_LENGTH,
  healthTipsErrorMessage,
  searchHealthTips,
  sendHealthTipFeedback,
  type HealthTipAnswers,
  type HealthTipsResult,
} from "@/utils/careconnect/services/healthTipsService"

/**
 * Health Tips — search for one general wellness tip.
 *
 * Everything on this page is AI-generated, so the disclaimer is not dismissible and is not
 * behind a checkbox: the full notice sits above the search where it is read before anyone
 * types, and a short reminder repeats under the results so it is still on screen after
 * scrolling. Both come from AiDisclaimer so the wording stays in one place.
 *
 * Personalising is a separate, off-by-default choice. With it on, a search can come back
 * with a few questions instead of a tip ("asking"); answering or skipping them repeats the
 * search and returns the tip. The profile itself never travels from this page — the server
 * reads it — and the answers are used for that tip only.
 *
 * "Show me another" asks for a different tip on the same topic, sending the titles already
 * shown (and the same answers, so it stays personalised the same way). When nothing new is
 * left the tip on screen stays and a short note says so. Each tip can be rated; only the
 * rating is sent.
 */

const SUGGESTIONS = [
  "Sleeping better",
  "Staying hydrated in hot weather",
  "Managing stress",
  "Healthy eating on a budget",
  "Getting started with walking",
  "Protecting my back at a desk",
]

type Status = "idle" | "loading" | "asking" | "done" | "error"

// One block, because one tip comes back — not a stack of placeholder cards.
function ResultsSkeleton() {
  return <Skeleton className="h-40 rounded-2xl" aria-hidden="true" />
}

/** The result is a set of questions, not a tip: an emergency or a tip always wins over them. */
function isAsking(result: HealthTipsResult | null): boolean {
  if (!result) return false
  return !result.urgent && !result.tip && result.needs.length > 0
}

export default function HealthTipsPage() {
  const [query, setQuery] = useState("")
  const [status, setStatus] = useState<Status>("idle")
  const [result, setResult] = useState<HealthTipsResult | null>(null)
  const [errorMessage, setErrorMessage] = useState("")
  // Off until the person turns it on. Deliberately not remembered between visits.
  const [personalize, setPersonalize] = useState(false)
  // Guards against an older, slower response overwriting a newer search.
  const requestId = useRef(0)
  // For "show me another": the titles already shown for this topic, and the answers the tips
  // were made with, so the next one is different and personalised the same way.
  const shownTitles = useRef<string[]>([])
  const usedAnswers = useRef<HealthTipAnswers | undefined>(undefined)
  const [noMore, setNoMore] = useState<string | null>(null)

  async function runSearch(text: string, answers?: HealthTipAnswers) {
    const id = ++requestId.current
    // Every search starts the topic afresh; only "show me another" builds on what was shown.
    shownTitles.current = []
    usedAnswers.current = answers
    setNoMore(null)
    setStatus("loading")
    try {
      const next = await searchHealthTips(text, { personalize, answers })
      if (id !== requestId.current) return
      if (next.tip) shownTitles.current = [next.tip.title]
      setResult(next)
      // Once the questions have been answered or skipped there is nothing left to ask, so a
      // reply that still carries some is shown as it is rather than asked about again.
      setStatus(answers === undefined && isAsking(next) ? "asking" : "done")
    } catch (error) {
      if (id !== requestId.current) return
      if (error instanceof HealthTipsQueryError) {
        toast.error(error.message)
        setStatus(result ? (isAsking(result) ? "asking" : "done") : "idle")
        return
      }
      const message = healthTipsErrorMessage(error)
      setErrorMessage(message)
      toast.error(message)
      setStatus("error")
    }
  }

  async function showAnother() {
    if (!result?.tip) return
    const id = ++requestId.current
    const previous = result
    setNoMore(null)
    setStatus("loading")
    try {
      const next = await searchHealthTips(previous.query, {
        personalize,
        answers: usedAnswers.current,
        exclude: shownTitles.current,
      })
      if (id !== requestId.current) return
      if (next.tip) {
        shownTitles.current = [...shownTitles.current, next.tip.title]
        setResult(next)
      } else if (next.urgent) {
        // An emergency replaces the tip: it is the one thing that must never be missed.
        setResult(next)
      } else {
        // Nothing new: keep the tip on screen and say so, rather than replacing it with a blank.
        setNoMore(next.notice ?? "That's all the tips we have for this topic right now.")
      }
      setStatus("done")
    } catch (error) {
      if (id !== requestId.current) return
      // The tip they had is still there; keep it and say what happened.
      toast.error(healthTipsErrorMessage(error))
      setStatus("done")
    }
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault()
    void runSearch(query)
  }

  function pickSuggestion(text: string) {
    setQuery(text)
    void runSearch(text)
  }

  function onTogglePersonalize(next: boolean) {
    setPersonalize(next)
    // Questions only make sense while personalising. Turning it off drops them rather than
    // leaving a card on screen that would send answers the person no longer wants used.
    if (!next && status === "asking") setStatus("idle")
  }

  return (
    <div className="animate-fade-in-up">
      <PageHeader
        title="Health tips"
        description="Search for general wellness tips on everyday health topics."
      />

      <div className="mx-auto max-w-3xl space-y-6 p-5 sm:p-8">
        <AiDisclaimer />

        <form onSubmit={onSubmit} className="space-y-3" role="search">
          <label htmlFor="health-tips-query" className="sr-only">
            What would you like tips on?
          </label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search
                className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[#8a94a3]"
                aria-hidden="true"
              />
              <input
                id="health-tips-query"
                type="search"
                value={query}
                maxLength={MAX_QUERY_LENGTH}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="e.g. tips for sleeping better"
                className="h-12 w-full rounded-full border border-[#dfe4ea] bg-white pl-10 pr-4 text-sm outline-none transition focus:border-[#00b4b8] focus:ring-2 focus:ring-[#00b4b8]/20"
              />
            </div>
            <button
              type="submit"
              disabled={status === "loading"}
              className="h-12 shrink-0 rounded-full bg-[#00b4b8] px-6 text-sm font-semibold text-white transition hover:bg-[#00989c] disabled:opacity-60"
            >
              {status === "loading" ? "Searching…" : "Search"}
            </button>
          </div>

          <div className="flex flex-wrap gap-2" aria-label="Suggested topics">
            {SUGGESTIONS.map((text) => (
              <button
                key={text}
                type="button"
                onClick={() => pickSuggestion(text)}
                disabled={status === "loading"}
                className="rounded-full bg-white px-3 py-1.5 text-xs font-medium text-[#4a5260] ring-1 ring-[#e2e6ea] transition hover:bg-[#e3f8f8] hover:text-[#00898c] disabled:opacity-60"
              >
                {text}
              </button>
            ))}
          </div>

          <div className="rounded-2xl bg-white p-4 ring-1 ring-[#e2e6ea]">
            <Checkbox
              label="Personalize using my health profile"
              checked={personalize}
              disabled={status === "loading"}
              onChange={(event) => onTogglePersonalize(event.target.checked)}
              aria-describedby="health-tips-personalize-note"
            />
            <p
              id="health-tips-personalize-note"
              className="mt-2 text-xs leading-5 text-[#657080]"
            >
              Tailors the tip using only your age group, how you get around, and your smoking
              and alcohol use, from your health profile or from a few quick questions. Your
              name, medicines, allergies and conditions are never used. This is sent to an AI
              service to write the tip. Off unless you turn it on.
            </p>
          </div>
        </form>

        {status === "loading" && <ResultsSkeleton />}

        {status === "asking" && result && (
          <HealthTipQuestionCard
            key={result.query}
            questions={result.needs}
            onSubmit={(answers) => void runSearch(result.query, answers)}
          />
        )}

        {status === "error" && (
          <div role="alert" className="rounded-2xl bg-white p-5 text-sm ring-1 ring-[#e2e6ea]">
            <p className="font-semibold text-[#141922]">{errorMessage}</p>
            <p className="mt-1 text-[#657080]">Check your connection and try again in a moment.</p>
            <button
              type="button"
              onClick={() => void runSearch(query)}
              className="mt-3 rounded-full bg-[#00b4b8] px-4 py-2 text-xs font-semibold text-white"
            >
              Try again
            </button>
          </div>
        )}

        {status === "done" && result && (
          <section aria-live="polite" className="space-y-4">
            {result.urgent && (
              <div
                role="alert"
                className="flex gap-3 rounded-2xl border border-[#f2b8b5] bg-[#fdecea] p-4 text-sm text-[#8c1d18]"
              >
                <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                {/* The server's own wording first; the shared emergency line only if it sent none. */}
                <p className="font-medium">{result.notice ?? AI_DISCLAIMER_EMERGENCY}</p>
              </div>
            )}

            {!result.urgent && result.tip && (
              <h2 className="flex items-center gap-2 text-lg font-bold text-[#141922]">
                <Sparkles className="size-4 text-[#00b4b8]" aria-hidden="true" />
                A tip for &ldquo;{result.query}&rdquo;
              </h2>
            )}

            {!result.urgent && result.tip && result.personalized && (
              <p className="-mt-2 text-xs font-medium text-[#00898c]">Personalized for you</p>
            )}

            {result.urgent ? null : !result.tip ? (
              // No tip and no emergency: the server declined (a diagnosis or dose question) or
              // nothing safe came back. Say why when it told us; otherwise suggest rewording.
              <p className="rounded-2xl bg-white p-5 text-sm text-[#657080] ring-1 ring-[#e2e6ea]">
                {result.notice ??
                  "No tip came back for that. Try rewording it, or pick one of the topics above."}
              </p>
            ) : (
              <HealthTipCard key={result.tip.title} tip={result.tip} />
            )}

            {!result.urgent && result.tip && (
              <div className="space-y-3">
                {noMore ? (
                  <p role="status" className="text-sm text-[#657080]">
                    {noMore}
                  </p>
                ) : (
                  <button
                    type="button"
                    onClick={() => void showAnother()}
                    className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-medium text-[#00898c] ring-1 ring-[#e2e6ea] transition hover:bg-[#e3f8f8] focus-visible:outline-2 focus-visible:outline-[#00b4b8]"
                  >
                    <RefreshCw className="size-3.5" aria-hidden="true" />
                    Show me another
                  </button>
                )}

                <HealthTipFeedback
                  key={result.tip.title}
                  tip={result.tip}
                  personalized={result.personalized}
                  onSubmit={sendHealthTipFeedback}
                />
              </div>
            )}

            {/* Only where there is AI-written content for it to qualify. */}
            {!result.urgent && result.tip && <AiDisclaimer variant="inline" />}
          </section>
        )}
      </div>
    </div>
  )
}
