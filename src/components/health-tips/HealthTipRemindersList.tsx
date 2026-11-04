import { useCallback, useEffect, useState } from "react"
import { Bell } from "lucide-react"
import {
  deleteHealthTipReminder,
  describeRecurrence,
  formatReminderTime,
  listHealthTipReminders,
  setHealthTipReminderStatus,
  type HealthTipReminder,
} from "@/utils/careconnect/services/healthTipRemindersService"

/**
 * "Your reminders": what the person has set, with pause / resume / delete.
 *
 * Shows nothing at all until there is a reminder, and nothing if the list can't be loaded —
 * it is a convenience, never a reason for the page to show an error. The name shown is the
 * tip's title; it appears here and nowhere else (the notification itself is generic).
 *
 * Delete asks once, inline, with no browser dialog.
 */
type Props = {
  /** Change this to reload the list, e.g. after a reminder was just set. */
  refreshKey?: number
}

function nextLabel(reminder: HealthTipReminder): string {
  if (reminder.status === "paused") return "Paused"
  if (!reminder.nextAt) return ""
  const when = new Date(reminder.nextAt)
  if (Number.isNaN(when.getTime())) return ""
  return `Next: ${when.toLocaleString(undefined, { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}`
}

export function HealthTipRemindersList({ refreshKey = 0 }: Props) {
  const [reminders, setReminders] = useState<HealthTipReminder[]>([])
  const [max, setMax] = useState(5)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const result = await listHealthTipReminders()
      setReminders(result.reminders)
      setMax(result.max)
    } catch {
      // Quietly nothing: the page works without this list.
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load, refreshKey])

  async function act(id: string, action: () => Promise<void>) {
    setBusyId(id)
    setError(null)
    try {
      await action()
      await load()
    } catch {
      setError("That didn't work. Please try again.")
    } finally {
      setBusyId(null)
      setConfirmId(null)
    }
  }

  if (reminders.length === 0) return null

  const button =
    "rounded-full px-3 py-1 text-xs font-semibold text-[#00898c] transition hover:bg-[#e3f8f8] disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-[#00b4b8]"

  return (
    <section aria-label="Your reminders" className="ht-rise space-y-2 rounded-2xl bg-white p-4 ring-1 ring-[#e2e6ea]">
      <h2 className="flex items-center gap-1.5 text-sm font-semibold text-[#151922]">
        <Bell className="size-4 text-[#00898c]" aria-hidden="true" />
        Your reminders
        <span className="text-xs font-normal text-[#657080]">
          ({reminders.length} of {max})
        </span>
      </h2>
      <ul className="divide-y divide-[#eef1f3]">
        {reminders.map((reminder) => (
          <li key={reminder.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-[#151922]">{reminder.label}</p>
              <p className="text-xs text-[#657080]">
                {formatReminderTime(reminder.time)}, {describeRecurrence(reminder.recurrence)}
                {nextLabel(reminder) ? ` · ${nextLabel(reminder)}` : ""}
              </p>
            </div>
            <div className="flex items-center gap-1">
              {confirmId === reminder.id ? (
                <>
                  <span className="text-xs text-[#4a5260]">Delete this reminder?</span>
                  <button
                    type="button"
                    className={button}
                    disabled={busyId === reminder.id}
                    onClick={() => void act(reminder.id, () => deleteHealthTipReminder(reminder.id))}
                  >
                    Yes, delete
                  </button>
                  <button type="button" className={button} onClick={() => setConfirmId(null)}>
                    Keep
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    className={button}
                    disabled={busyId === reminder.id}
                    onClick={() =>
                      void act(reminder.id, async () => {
                        await setHealthTipReminderStatus(
                          reminder.id,
                          reminder.status === "active" ? "paused" : "active",
                        )
                      })
                    }
                  >
                    {reminder.status === "active" ? "Pause" : "Resume"}
                  </button>
                  <button
                    type="button"
                    className={button}
                    disabled={busyId === reminder.id}
                    onClick={() => setConfirmId(reminder.id)}
                  >
                    Delete
                  </button>
                </>
              )}
            </div>
          </li>
        ))}
      </ul>
      {error && (
        <p role="alert" className="text-xs text-[#b42318]">
          {error}
        </p>
      )}
      <p className="text-xs text-[#657080]">
        Reminders stop after 30 days. Resume one to renew it. You can turn all of them off under
        Notification Preferences &gt; Wellness.
      </p>
    </section>
  )
}
