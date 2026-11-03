import { useEffect, useRef, useState, type CSSProperties } from "react"
import type {
  HealthTipAnswers,
  HealthTipQuestion,
} from "@/utils/careconnect/services/healthTipsService"

/**
 * The questions asked before a personalised tip, one at a time.
 *
 * Tapping an option answers and moves on; the last answer submits. "Skip" submits whatever
 * has been answered so far (possibly nothing) — the tip is then made with what is known, so
 * a person is never stuck behind a questionnaire. Nothing here is saved: the card says so,
 * because the person is being asked about their health.
 */
type HealthTipQuestionCardProps = {
  questions: HealthTipQuestion[]
  /** Called once, with the answers given (an empty object if they were all skipped). */
  onSubmit: (answers: HealthTipAnswers) => void
  /** True while the tip is being fetched, so a double tap cannot send twice. */
  disabled?: boolean
}

export function HealthTipQuestionCard({ questions, onSubmit, disabled = false }: HealthTipQuestionCardProps) {
  const [index, setIndex] = useState(0)
  const [answers, setAnswers] = useState<HealthTipAnswers>({})
  const questionRef = useRef<HTMLLegendElement>(null)

  // Move focus to the question when the card appears and on each step, so a keyboard or
  // screen reader user lands on what to answer instead of being left on the search box.
  useEffect(() => {
    questionRef.current?.focus()
  }, [index])

  const question = questions[index]
  if (!question) return null

  const choose = (value: string) => {
    const next: HealthTipAnswers = { ...answers, [question.field]: value }
    if (index >= questions.length - 1) {
      onSubmit(next)
      return
    }
    setAnswers(next)
    setIndex(index + 1)
  }

  return (
    <section
      aria-label="A few quick questions"
      className="ht-rise rounded-2xl bg-white p-5 ring-1 ring-[#e2e6ea]"
    >
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-medium text-[#657080]">
          Question {index + 1} of {questions.length}
        </p>
        <div className="flex gap-1.5" aria-hidden="true">
          {questions.map((item, i) => (
            <span
              key={item.field}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i < index ? "w-4 bg-[#00b4b8]" : i === index ? "w-6 bg-[#00b4b8]" : "w-4 bg-[#e2e6ea]"
              }`}
            />
          ))}
        </div>
      </div>

      {/* Keyed by step so each new question slides in rather than swapping in place. */}
      <fieldset key={index} disabled={disabled} className="ht-slide-in mt-2 min-w-0">
        <legend
          ref={questionRef}
          tabIndex={-1}
          className="text-base font-semibold text-[#141922] outline-none"
        >
          {question.question}
        </legend>
        <div className="mt-3 flex flex-wrap gap-2">
          {question.options.map((option, i) => (
            <button
              key={option.value}
              type="button"
              onClick={() => choose(option.value)}
              style={{ "--ht-delay": `${80 + i * 50}ms` } as CSSProperties}
              className="ht-rise rounded-full bg-white px-4 py-2 text-sm font-medium text-[#4a5260] ring-1 ring-[#e2e6ea] transition hover:-translate-y-0.5 hover:bg-[#e3f8f8] hover:text-[#00898c] hover:shadow-sm active:translate-y-0 active:scale-95 focus-visible:outline-2 focus-visible:outline-[#00b4b8] disabled:opacity-60"
            >
              {option.label}
            </button>
          ))}
        </div>
      </fieldset>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-[#657080]">
          Used for this tip only. Your answers are not saved.
        </p>
        <button
          type="button"
          onClick={() => onSubmit(answers)}
          disabled={disabled}
          className="rounded-full px-3 py-1.5 text-xs font-semibold text-[#00898c] transition hover:bg-[#e3f8f8] disabled:opacity-60"
        >
          Skip
        </button>
      </div>
    </section>
  )
}
