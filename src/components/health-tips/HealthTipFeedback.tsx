import { useState } from "react"
import { CircleCheck, ThumbsDown, ThumbsUp } from "lucide-react"
import type {
  HealthTip,
  HealthTipFeedback as Feedback,
  HealthTipFeedbackReason,
} from "@/utils/careconnect/services/healthTipsService"

/**
 * "Was this tip helpful?" — a thumbs up or down, and for a thumbs-down an optional reason.
 *
 * One tap on a thumbs-up is the whole interaction. A thumbs-down offers a few reasons, a
 * "this worried me" toggle and a way to send without either, so nobody is made to explain.
 * There is deliberately no text box: what a person types about their health does not belong
 * in a feedback form, and the server would not keep it.
 *
 * It says plainly what is sent. When a tip worried the person, the thanks points them to a
 * doctor, nurse or pharmacist rather than leaving them with just "thanks".
 */
type Props = {
  tip: HealthTip
  personalized: boolean
  /** Sends the feedback; rejects if it could not be sent. */
  onSubmit: (feedback: Feedback) => Promise<void>
}

type Step = "ask" | "reasons" | "sent"

const REASONS: { value: HealthTipFeedbackReason; label: string }[] = [
  { value: "not_relevant", label: "Not relevant to me" },
  { value: "unclear", label: "Hard to understand" },
  { value: "not_safe", label: "Seemed unsafe" },
  { value: "already_know", label: "I already knew this" },
]

export function HealthTipFeedback({ tip, personalized, onSubmit }: Props) {
  const [step, setStep] = useState<Step>("ask")
  const [sending, setSending] = useState(false)
  const [failed, setFailed] = useState(false)
  const [concerning, setConcerning] = useState(false)
  const [sentConcerning, setSentConcerning] = useState(false)

  const imageKey = tip.image?.key
  const reasons = imageKey
    ? [...REASONS, { value: "bad_image" as const, label: "The picture is wrong" }]
    : REASONS

  async function send(feedback: Feedback) {
    setSending(true)
    setFailed(false)
    try {
      await onSubmit({
        ...feedback,
        personalized,
        ...(feedback.rating === "down" && concerning ? { concerning: true } : {}),
        // Only a report about the picture names it; it is what takes that picture down.
        ...(feedback.reason === "bad_image" && imageKey ? { imageKey } : {}),
      })
      setSentConcerning(feedback.rating === "down" && (concerning || feedback.reason === "not_safe"))
      setStep("sent")
    } catch {
      setFailed(true)
    } finally {
      setSending(false)
    }
  }

  if (step === "sent") {
    return (
      <div role="status" className="ht-rise text-xs text-[#657080]">
        <p className="flex items-center gap-1.5 font-medium text-[#00898c]">
          <CircleCheck className="animate-check-pop size-4" aria-hidden="true" />
          Thanks for letting us know.
        </p>
        {sentConcerning && (
          <p className="mt-1">
            If something about your health is worrying you, a doctor, nurse or pharmacist can help.
          </p>
        )}
      </div>
    )
  }

  const chip =
    "rounded-full bg-white px-3 py-1.5 text-xs font-medium text-[#4a5260] ring-1 ring-[#e2e6ea] transition hover:-translate-y-0.5 hover:bg-[#e3f8f8] hover:text-[#00898c] active:translate-y-0 active:scale-95 focus-visible:outline-2 focus-visible:outline-[#00b4b8] disabled:opacity-60"

  return (
    <section aria-label="Feedback on this tip" className="space-y-3">
      {step === "ask" ? (
        <div className="flex flex-wrap items-center gap-2">
          <p className="mr-1 text-xs font-medium text-[#4a5260]">Was this tip helpful?</p>
          <button
            type="button"
            className={`${chip} group inline-flex items-center gap-1.5`}
            disabled={sending}
            onClick={() => void send({ rating: "up" })}
          >
            <ThumbsUp className="size-3.5 transition-transform group-hover:-rotate-12 group-hover:scale-110" aria-hidden="true" />
            Yes
          </button>
          <button
            type="button"
            className={`${chip} group inline-flex items-center gap-1.5`}
            disabled={sending}
            onClick={() => setStep("reasons")}
          >
            <ThumbsDown className="size-3.5 transition-transform group-hover:rotate-12 group-hover:scale-110" aria-hidden="true" />
            No
          </button>
        </div>
      ) : (
        <fieldset disabled={sending} className="ht-rise min-w-0 space-y-3">
          <legend className="text-xs font-medium text-[#4a5260]">What was wrong? (optional)</legend>
          <div className="flex flex-wrap gap-2">
            {reasons.map((reason) => (
              <button
                key={reason.value}
                type="button"
                className={chip}
                onClick={() => void send({ rating: "down", reason: reason.value })}
              >
                {reason.label}
              </button>
            ))}
            <button
              type="button"
              aria-pressed={concerning}
              className={`${chip} ${concerning ? "bg-[#e3f8f8] text-[#00898c] ring-[#00b4b8]" : ""}`}
              onClick={() => setConcerning((value) => !value)}
            >
              This worried me
            </button>
          </div>
          <button
            type="button"
            className="rounded-full px-3 py-1.5 text-xs font-semibold text-[#00898c] transition hover:bg-[#e3f8f8] disabled:opacity-60"
            onClick={() => void send({ rating: "down" })}
          >
            Send without a reason
          </button>
        </fieldset>
      )}

      {failed && (
        <p role="alert" className="text-xs text-[#8c1d18]">
          We couldn&apos;t send that. Please try again.
        </p>
      )}

      <p className="text-xs text-[#8a94a3]">
        Only your rating is sent. Not what you searched for, the tip itself, or who you are.
      </p>
    </section>
  )
}
