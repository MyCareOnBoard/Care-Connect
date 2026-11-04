import { useState, type ChangeEvent } from "react"
import { Bell, CircleCheck } from "lucide-react"
import type { HealthTip } from "@/utils/careconnect/services/healthTipsService"
import {
  describeRecurrence,
  formatReminderTime,
  reminderErrorMessage,
  type HealthTipReminder as Reminder,
  type NewHealthTipReminder,
  type ReminderRecurrence,
} from "@/utils/careconnect/services/healthTipRemindersService"

/**
 * "Remind me" under a tip. A few taps: pick a time of day and how often, then set it.
 *
 * It says plainly what the reminder will be: a short note that does not mention the topic, so
 * the person knows what will appear on a lock screen. There is no text box — the name is the
 * tip's own title, shown only in their own list.
 */
type Props = {
  tip: HealthTip
  /** Sets the reminder; rejects with the reason if it could not be set. */
  onCreate: (input: NewHealthTipReminder) => Promise<Reminder>
}

const TIMES = [
  { value: "08:00", label: "Morning" },
  { value: "12:00", label: "Midday" },
  { value: "18:00", label: "Evening" },
] as const

const REPEATS: { value: ReminderRecurrence; label: string }[] = [
  { value: "once", label: "Once" },
  { value: "daily", label: "Every day" },
  { value: "weekly", label: "Every week" },
]

type Step = "idle" | "choosing" | "set"

export function HealthTipReminder({ tip, onCreate }: Props) {
  const [step, setStep] = useState<Step>("idle")
  const [time, setTime] = useState<string>("08:00")
  const [recurrence, setRecurrence] = useState<ReminderRecurrence>("daily")
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [created, setCreated] = useState<Reminder | null>(null)

  async function submit() {
    setSending(true)
    setError(null)
    try {
      setCreated(await onCreate({ label: tip.title, time, recurrence, tip }))
      setStep("set")
    } catch (caught) {
      setError(reminderErrorMessage(caught))
    } finally {
      setSending(false)
    }
  }

  const chip = (selected: boolean) =>
    `rounded-full px-3 py-1.5 text-xs font-medium ring-1 transition focus-visible:outline-2 focus-visible:outline-[#00b4b8] disabled:opacity-60 ${
      selected
        ? "bg-[#e3f8f8] text-[#00898c] ring-[#00b4b8]"
        : "bg-white text-[#4a5260] ring-[#e2e6ea] hover:bg-[#e3f8f8] hover:text-[#00898c]"
    }`

  if (step === "set" && created) {
    return (
      <div role="status" className="ht-rise text-xs text-[#657080]">
        <p className="flex items-center gap-1.5 font-medium text-[#00898c]">
          <CircleCheck className="animate-check-pop size-4" aria-hidden="true" />
          Reminder set for {formatReminderTime(created.time)}, {describeRecurrence(created.recurrence)}.
        </p>
        <p className="mt-1">It will be a short note that doesn't mention the topic.</p>
      </div>
    )
  }

  if (step === "idle") {
    return (
      <button
        type="button"
        onClick={() => setStep("choosing")}
        className="group inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-[#4a5260] ring-1 ring-[#e2e6ea] transition hover:-translate-y-0.5 hover:bg-[#e3f8f8] hover:text-[#00898c] active:translate-y-0 active:scale-95 focus-visible:outline-2 focus-visible:outline-[#00b4b8]"
      >
        <Bell className="size-3.5 transition-transform group-hover:rotate-12" aria-hidden="true" />
        Remind me
      </button>
    )
  }

  return (
    <section aria-label="Set a reminder" className="ht-rise space-y-3">
      <fieldset disabled={sending} className="min-w-0 space-y-2">
        <legend className="text-xs font-medium text-[#4a5260]">When should we remind you?</legend>
        <div className="flex flex-wrap items-center gap-2">
          {TIMES.map((option) => (
            <button
              key={option.value}
              type="button"
              aria-pressed={time === option.value}
              className={chip(time === option.value)}
              onClick={() => setTime(option.value)}
            >
              {option.label} · {formatReminderTime(option.value)}
            </button>
          ))}
          <label className="flex items-center gap-1.5 text-xs text-[#4a5260]">
            <span>or at</span>
            <input
              type="time"
              value={time}
              required
              onChange={(event: ChangeEvent<HTMLInputElement>) => event.target.value && setTime(event.target.value)}
              className="rounded-lg bg-white px-2 py-1 text-xs ring-1 ring-[#e2e6ea] focus-visible:outline-2 focus-visible:outline-[#00b4b8]"
            />
          </label>
        </div>
      </fieldset>

      <fieldset disabled={sending} className="min-w-0 space-y-2">
        <legend className="text-xs font-medium text-[#4a5260]">How often?</legend>
        <div className="flex flex-wrap gap-2">
          {REPEATS.map((option) => (
            <button
              key={option.value}
              type="button"
              aria-pressed={recurrence === option.value}
              className={chip(recurrence === option.value)}
              onClick={() => setRecurrence(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </fieldset>

      <p className="text-xs text-[#657080]">
        The reminder is a short note that doesn't mention the topic. Reminders stop after 30 days
        unless you renew them.
      </p>

      {error && (
        <p role="alert" className="text-xs text-[#b42318]">
          {error}
        </p>
      )}

      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={sending}
          onClick={() => void submit()}
          className="rounded-full bg-[#00898c] px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-[#007477] disabled:opacity-60"
        >
          {sending ? "Setting…" : "Set reminder"}
        </button>
        <button
          type="button"
          disabled={sending}
          onClick={() => setStep("idle")}
          className="rounded-full px-3 py-1.5 text-xs font-semibold text-[#657080] transition hover:bg-[#f1f4f6] disabled:opacity-60"
        >
          Cancel
        </button>
      </div>
    </section>
  )
}
