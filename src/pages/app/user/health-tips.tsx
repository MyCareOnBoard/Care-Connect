import { useEffect, useRef, useState, type CSSProperties, type FormEvent } from "react"
import { toast } from "sonner"
import {
  AlertTriangle,
  Armchair,
  Brain,
  ChevronDown,
  Droplets,
  Footprints,
  Lightbulb,
  Loader2,
  Moon,
  Salad,
  Search,
  Sparkles,
  UserRound,
  type LucideIcon,
} from "lucide-react"
import { PageHeader } from "@/components/app/PageHeader"
import { AiDisclaimer, AI_DISCLAIMER_EMERGENCY } from "@/components/health-tips/AiDisclaimer"
import { HealthTipCard } from "@/components/health-tips/HealthTipCard"
import { HealthTipFeedback } from "@/components/health-tips/HealthTipFeedback"
import { HealthTipReminder } from "@/components/health-tips/HealthTipReminder"
import { HealthTipQuestionCard } from "@/components/health-tips/HealthTipQuestionCard"
import { EmptyState } from "@/components/ui/empty-state"
import { createHealthTipReminder } from "@/utils/careconnect/services/healthTipRemindersService"
import {
  HealthTipsQueryError,
  MAX_QUERY_LENGTH,
  healthTipsErrorMessage,
  searchHealthTips,
  sendHealthTipFeedback,
  picksFromAnswers,
  type HealthTipAnswers,
  type HealthTipFollowUp,
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
 * One search, one tip: the single best recommendation. Each tip can be rated; only the
 * rating is sent.
 */

const SUGGESTIONS: { text: string; icon: LucideIcon }[] = [
  { text: "Sleeping better", icon: Moon },
  { text: "Staying hydrated in hot weather", icon: Droplets },
  { text: "Managing stress", icon: Brain },
  { text: "Healthy eating on a budget", icon: Salad },
  { text: "Getting started with walking", icon: Footprints },
  { text: "Protecting my back at a desk", icon: Armchair },
]

type Status = "idle" | "loading" | "asking" | "done" | "error"

/** Stagger for things that rise into place one after another (see styles/health-tips.css). */
const delay = (index: number, step = 60, start = 0) =>
  ({ "--ht-delay": `${start + index * step}ms` }) as CSSProperties

const THINKING = ["Reading your question…", "Picking the best tip…", "Checking it reads safely…"]

/**
 * One card, because one tip comes back — not a stack of placeholder cards. A pulsing bulb and
 * a line that changes every so often show the search is moving; the changing line is hidden
 * from screen readers, which hear the one steady label instead.
 */
function ResultsSkeleton() {
  const [line, setLine] = useState(0)
  useEffect(() => {
    const timer = setInterval(() => setLine((current) => (current + 1) % THINKING.length), 1600)
    return () => clearInterval(timer)
  }, [])

  return (
    <div
      role="status"
      aria-label="Finding a tip"
      className="ht-rise rounded-2xl bg-white p-5 ring-1 ring-[#e2e6ea] sm:p-6"
    >
      <div className="flex items-center gap-3">
        <span className="ht-glow flex size-9 shrink-0 items-center justify-center rounded-xl bg-[#e3f8f8] text-[#00898c]">
          <Lightbulb className="size-4.5" aria-hidden="true" />
        </span>
        <p key={line} aria-hidden="true" className="ht-fade-swap text-sm font-medium text-[#4a5260]">
          {THINKING[line]}
        </p>
      </div>
      <div className="mt-5 space-y-2.5" aria-hidden="true">
        {["w-3/4", "w-full", "w-5/6", "w-2/3"].map((width) => (
          <div key={width} className={`skeleton-shimmer h-3 rounded-full bg-[#eef1f3] ${width}`} />
        ))}
      </div>
    </div>
  )
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

  async function runSearch(text: string, answers?: HealthTipAnswers, followUp?: HealthTipFollowUp) {
    const id = ++requestId.current
    setStatus("loading")
    try {
      const next = await searchHealthTips(text, { personalize, answers, followUp })
      if (id !== requestId.current) return
      setResult(next)
      // Once the questions have been answered or skipped there is nothing left to ask, so a
      // reply that still carries some is shown as it is rather than asked about again.
      setStatus(answers === undefined && followUp === undefined && isAsking(next) ? "asking" : "done")
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
              className="inline-flex h-12 shrink-0 items-center gap-2 rounded-full bg-[#00b4b8] px-6 text-sm font-semibold text-white shadow-sm shadow-[#00b4b8]/30 transition hover:-translate-y-0.5 hover:bg-[#00989c] hover:shadow-md active:translate-y-0 active:scale-[0.97] disabled:translate-y-0 disabled:opacity-60"
            >
              {status === "loading" && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
              {status === "loading" ? "Searching…" : "Search"}
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2" aria-label="Suggested topics">
            <span className="text-xs font-medium text-[#8a94a3]">Try:</span>
            {SUGGESTIONS.map(({ text, icon: Icon }, index) => (
              <button
                key={text}
                type="button"
                onClick={() => pickSuggestion(text)}
                disabled={status === "loading"}
                style={delay(index)}
                className={`ht-rise group inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium ring-1 transition hover:-translate-y-0.5 hover:bg-[#e3f8f8] hover:text-[#00898c] hover:shadow-sm hover:ring-[#b3e8e9] active:translate-y-0 active:scale-95 disabled:translate-y-0 disabled:opacity-60 ${
                  query === text ? "bg-[#e3f8f8] text-[#00898c] ring-[#b3e8e9]" : "bg-white text-[#4a5260] ring-[#e2e6ea]"
                }`}
              >
                <Icon
                  className="size-3.5 text-[#00b4b8] transition-transform group-hover:-rotate-6 group-hover:scale-110"
                  aria-hidden="true"
                />
                {text}
              </button>
            ))}
          </div>

          {/* A native checkbox drawn as a switch, so it stays a checkbox to assistive tech. */}
          <div className="rounded-2xl bg-white px-4 py-3 ring-1 ring-[#e2e6ea]">
            <label className="flex cursor-pointer items-center gap-3">
              <UserRound className="size-4 shrink-0 text-[#00898c]" aria-hidden="true" />
              <span className="flex-1 text-sm font-medium text-[#141922]">
                Personalize using my health profile
              </span>
              <input
                type="checkbox"
                checked={personalize}
                disabled={status === "loading"}
                onChange={(event) => onTogglePersonalize(event.target.checked)}
                aria-describedby="health-tips-personalize-note"
                className="peer sr-only"
              />
              <span
                aria-hidden="true"
                className="relative h-6 w-11 shrink-0 rounded-full bg-[#e2e8f0] transition-colors after:absolute after:left-0.5 after:top-0.5 after:size-5 after:rounded-full after:bg-white after:shadow after:transition-transform after:duration-300 after:ease-[cubic-bezier(0.34,1.56,0.64,1)] peer-checked:bg-[#00b4b8] peer-checked:after:translate-x-5 peer-focus-visible:ring-2 peer-focus-visible:ring-[#00b4b8]/30 peer-disabled:opacity-50"
              />
            </label>
            <p id="health-tips-personalize-note" className="mt-1.5 pl-7 text-xs leading-5 text-[#657080]">
              Off unless you turn it on. Your name is never used.
            </p>
            <details className="group mt-1 pl-7">
              <summary className="inline-flex cursor-pointer list-none items-center gap-1 text-xs font-semibold text-[#00898c] [&::-webkit-details-marker]:hidden">
                What&apos;s used
                <ChevronDown className="size-3.5 transition-transform group-open:rotate-180" aria-hidden="true" />
              </summary>
              <p className="ht-rise mt-1.5 text-xs leading-5 text-[#657080]">
                Your age group, how you get around, and your smoking and alcohol use from your
                health profile, plus a few quick multiple-choice questions about what you&apos;re
                after. You&apos;re never asked about symptoms, medicines, allergies or conditions.
                This is sent to an AI service to write the tip.
              </p>
            </details>
          </div>
        </form>

        {status === "idle" && (
          <EmptyState
            className="ht-rise"
            icon={
              <span className="relative">
                <span className="ht-float ht-glow flex size-14 items-center justify-center rounded-2xl bg-[#e3f8f8] text-[#00898c]">
                  <Lightbulb className="size-7" aria-hidden="true" />
                </span>
                <Sparkles
                  className="ht-twinkle absolute -right-3 -top-2 size-4 text-[#00b4b8]"
                  aria-hidden="true"
                />
                <Sparkles
                  className="ht-twinkle absolute -bottom-1 -left-3 size-3 text-[#7fd9db]"
                  style={delay(1, 700)}
                  aria-hidden="true"
                />
              </span>
            }
            title="Ask about an everyday health topic"
          >
            Search above or pick a topic, and you&apos;ll get one practical tip with simple steps
            to try.
          </EmptyState>
        )}

        {status === "loading" && <ResultsSkeleton />}

        {status === "asking" && result && (
          <HealthTipQuestionCard
            key={result.query}
            questions={result.needs}
            onSubmit={(answers) =>
              // Questions written for this search come back as picks plus the signed token;
              // the fixed ones go back as named answers.
              result.followUpToken
                ? void runSearch(result.query, undefined, {
                    token: result.followUpToken,
                    picks: picksFromAnswers(result.needs, answers),
                  })
                : void runSearch(result.query, answers)
            }
          />
        )}

        {status === "error" && (
          <div role="alert" className="ht-rise rounded-2xl bg-white p-5 text-sm ring-1 ring-[#e2e6ea]">
            <p className="font-semibold text-[#141922]">{errorMessage}</p>
            <p className="mt-1 text-[#657080]">Check your connection and try again in a moment.</p>
            <button
              type="button"
              onClick={() => void runSearch(query)}
              className="mt-3 rounded-full bg-[#00b4b8] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#00989c] active:scale-95"
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
                className="ht-rise flex gap-3 rounded-2xl border border-[#f2b8b5] bg-[#fdecea] p-4 text-sm text-[#8c1d18]"
              >
                <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                {/* The server's own wording first; the shared emergency line only if it sent none. */}
                <p className="font-medium">{result.notice ?? AI_DISCLAIMER_EMERGENCY}</p>
              </div>
            )}

            {!result.urgent && result.tip && (
              <div className="ht-rise flex flex-wrap items-center gap-x-3 gap-y-1.5">
                <h2 className="flex items-center gap-2 text-base font-semibold text-[#4a5260]">
                  <Sparkles className="size-4 text-[#00b4b8]" aria-hidden="true" />
                  A tip for &ldquo;{result.query}&rdquo;
                </h2>
                {result.personalized && (
                  <p className="ht-pop rounded-full bg-[#e3f8f8] px-2.5 py-0.5 text-xs font-medium text-[#00898c]">
                    Personalized for you
                  </p>
                )}
              </div>
            )}

            {result.urgent ? null : !result.tip ? (
              // No tip and no emergency: the server declined (a diagnosis or dose question) or
              // nothing safe came back. Say why when it told us; otherwise suggest rewording.
              <p className="ht-rise rounded-2xl bg-white p-5 text-sm text-[#657080] ring-1 ring-[#e2e6ea]">
                {result.notice ??
                  "No tip came back for that. Try rewording it, or pick one of the topics above."}
              </p>
            ) : (
              <HealthTipCard key={result.tip.title} tip={result.tip} />
            )}

            {!result.urgent && result.tip && (
              <div className="ht-rise space-y-3" style={delay(0, 0, 250)}>
                <HealthTipFeedback
                  key={result.tip.title}
                  tip={result.tip}
                  personalized={result.personalized}
                  onSubmit={sendHealthTipFeedback}
                />
                <HealthTipReminder
                  key={`reminder-${result.tip.title}`}
                  tip={result.tip}
                  onCreate={createHealthTipReminder}
                />
              </div>
            )}

            {/* Only where there is AI-written content for it to qualify. */}
            {!result.urgent && result.tip && (
              <div className="ht-rise" style={delay(0, 0, 350)}>
                <AiDisclaimer variant="inline" />
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  )
}
