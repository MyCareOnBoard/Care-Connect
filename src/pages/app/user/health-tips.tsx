import { useRef, useState, type FormEvent } from "react"
import { toast } from "sonner"
import { AlertTriangle, Search, Sparkles } from "lucide-react"
import { PageHeader } from "@/components/app/PageHeader"
import { AiDisclaimer, AI_DISCLAIMER_EMERGENCY } from "@/components/health-tips/AiDisclaimer"
import { Skeleton } from "@/components/ui/skeleton"
import {
  HealthTipsQueryError,
  MAX_QUERY_LENGTH,
  healthTipsErrorMessage,
  searchHealthTips,
  type HealthTipsResult,
} from "@/utils/careconnect/services/healthTipsService"

/**
 * Health Tips — search for general wellness tips.
 *
 * Everything on this page is AI-generated, so the disclaimer is not dismissible and is not
 * behind a checkbox: the full notice sits above the search where it is read before anyone
 * types, and a short reminder repeats under the results so it is still on screen after
 * scrolling. Both come from AiDisclaimer so the wording stays in one place.
 */

const SUGGESTIONS = [
  "Sleeping better",
  "Staying hydrated in hot weather",
  "Managing stress",
  "Healthy eating on a budget",
  "Getting started with walking",
  "Protecting my back at a desk",
]

type Status = "idle" | "loading" | "done" | "error"

function ResultsSkeleton() {
  return (
    <div className="space-y-3" aria-hidden="true">
      {Array.from({ length: 3 }).map((_, i) => (
        <Skeleton key={i} className="h-28 rounded-2xl" />
      ))}
    </div>
  )
}

export default function HealthTipsPage() {
  const [query, setQuery] = useState("")
  const [status, setStatus] = useState<Status>("idle")
  const [result, setResult] = useState<HealthTipsResult | null>(null)
  const [errorMessage, setErrorMessage] = useState("")
  // Guards against an older, slower response overwriting a newer search.
  const requestId = useRef(0)

  async function runSearch(text: string) {
    const id = ++requestId.current
    setStatus("loading")
    try {
      const next = await searchHealthTips(text)
      if (id !== requestId.current) return
      setResult(next)
      setStatus("done")
    } catch (error) {
      if (id !== requestId.current) return
      if (error instanceof HealthTipsQueryError) {
        toast.error(error.message)
        setStatus(result ? "done" : "idle")
        return
      }
      const message = healthTipsErrorMessage(error)
      setErrorMessage(message)
      toast.error(message)
      setStatus("error")
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
        </form>

        {status === "loading" && <ResultsSkeleton />}

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

            {!result.urgent && result.tips.length > 0 && (
              <h2 className="flex items-center gap-2 text-lg font-bold text-[#141922]">
                <Sparkles className="size-4 text-[#00b4b8]" aria-hidden="true" />
                Tips for &ldquo;{result.query}&rdquo;
              </h2>
            )}

            {result.urgent ? null : result.tips.length === 0 ? (
              // No tips and no emergency: the server declined (a diagnosis or dose question) or
              // nothing safe came back. Say why when it told us; otherwise suggest rewording.
              <p className="rounded-2xl bg-white p-5 text-sm text-[#657080] ring-1 ring-[#e2e6ea]">
                {result.notice ??
                  "No tips came back for that. Try rewording it, or pick one of the topics above."}
              </p>
            ) : (
              <ul className="space-y-3">
                {result.tips.map((tip) => (
                  <li
                    key={tip.id}
                    className="rounded-2xl bg-white p-5 ring-1 ring-[#e2e6ea]"
                  >
                    <h3 className="text-base font-semibold text-[#141922]">{tip.title}</h3>
                    <p className="mt-1.5 text-sm leading-6 text-[#4a5260]">{tip.summary}</p>
                    {tip.steps && tip.steps.length > 0 && (
                      <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-[#4a5260]">
                        {tip.steps.map((step, index) => (
                          <li key={index}>{step}</li>
                        ))}
                      </ul>
                    )}
                    {tip.whenToSeeAProfessional && (
                      <p className="mt-3 text-xs font-medium text-[#8a5a2b]">
                        See a professional if: {tip.whenToSeeAProfessional}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            )}

            {/* Only where there is AI-written content for it to qualify. */}
            {!result.urgent && result.tips.length > 0 && <AiDisclaimer variant="inline" />}
          </section>
        )}
      </div>
    </div>
  )
}
