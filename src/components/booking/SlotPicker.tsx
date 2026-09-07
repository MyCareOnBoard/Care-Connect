import { useEffect, useMemo, useState } from "react"
import { format, addDays } from "date-fns"
import { Skeleton } from "@/components/ui/skeleton"
import { getSlots } from "@/utils/careconnect/services/telehealthService"
import { toDateKey, type BookingSlot } from "@/utils/careconnect/types"

/**
 * Date strip + availability-constrained time grid for one service/professional.
 *
 * Extracted from `BookServiceDialog` so the follow-up proposal flow picks slots
 * through exactly the same surface and the same `getSlots` contract — a second
 * implementation would drift from the server's availability maths.
 *
 * Owns its own date and slot state and reports the chosen `dateKey` upward, so
 * callers hold two primitives (`dateKey`, `startMinutes`) rather than a date
 * index they have to translate.
 */
export function SlotPicker({
  serviceId,
  teamMemberId,
  startMinutes,
  onStartMinutesChange,
  onDateKeyChange,
  dayCount = 10,
  label = "Select date & time",
  helpText = "Available slots for this professional",
}: {
  serviceId: string | null
  teamMemberId: string | null
  startMinutes: number | null
  onStartMinutesChange: (value: number | null) => void
  onDateKeyChange: (dateKey: string) => void
  dayCount?: number
  label?: string
  helpText?: string
}) {
  const [slots, setSlots] = useState<BookingSlot[]>([])
  const [loading, setLoading] = useState(false)

  // Computed once per mount so `selectedDate` keeps a stable reference across
  // renders — an unstable one previously looped the slots effect.
  const dates = useMemo(
    () => Array.from({ length: dayCount }, (_, index) => addDays(new Date(), index)),
    [dayCount],
  )
  const todayKey = useMemo(() => toDateKey(new Date()), [])

  /**
   * The chosen date, held as a key rather than an index into the strip.
   *
   * The strip used to be the only way to pick a date, which capped the picker at the next
   * `dayCount` days — a professional could not propose a follow-up a month out. The strip
   * remains as the quick path for the common case; the date field below it reaches any
   * future date. `min` stops a past date being chosen, and the server refuses past start
   * times regardless (see `generateSlots`).
   */
  const [dateKey, setDateKey] = useState(todayKey)
  const selectedDate = useMemo(() => {
    const [year, month, day] = dateKey.split("-").map(Number)
    return new Date(year, month - 1, day)
  }, [dateKey])

  // Keep the caller's dateKey in step with the visible selection, including on
  // first mount so it never has to guess the default.
  useEffect(() => {
    onDateKeyChange(dateKey)
    // Only the resolved key matters; the callback identity is the caller's concern.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateKey])

  useEffect(() => {
    if (!serviceId || !teamMemberId) return
    let active = true
    setLoading(true)
    // A slot chosen on the previous day/professional is no longer meaningful.
    onStartMinutesChange(null)
    getSlots(serviceId, teamMemberId, dateKey)
      .then((result) => {
        if (active) setSlots(result.slots)
      })
      .catch(() => {
        if (active) setSlots([])
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
    // Depend on primitives only: object/callback identities change every render
    // and would refire this on every one.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serviceId, teamMemberId, dateKey])

  return (
    <>
      <div>
        <label className="mb-2 block text-sm font-medium text-[#151922]">{label}</label>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-base font-semibold text-[#151922]">{format(selectedDate, "MMM d")}</p>
            <p className="text-sm text-[#656f80]">{format(selectedDate, "EEEE")}</p>
          </div>
        </div>
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
          {dates.map((date) => (
            <button
              key={date.toISOString()}
              type="button"
              onClick={() => setDateKey(toDateKey(date))}
              className={`flex shrink-0 flex-col items-center rounded-xl border px-3 py-2 text-sm transition ${
                toDateKey(date) === dateKey
                  ? "border-[#00b4b8] bg-[#e3f8f8] text-[#00b4b8]"
                  : "border-[#eef1f3] text-[#656f80]"
              }`}
            >
              <span className="font-semibold">{format(date, "d")}</span>
              <span className="text-xs">{format(date, "EEE")}</span>
            </button>
          ))}
        </div>

        {/* Any date, not just the next few. Kept alongside the strip rather than replacing
            it: most follow-ups are within a week, and a date field is slower for those. */}
        <label className="mt-3 flex flex-wrap items-center gap-2 text-sm text-[#656f80]">
          <span>Or pick a date</span>
          <input
            type="date"
            value={dateKey}
            min={todayKey}
            onChange={(event) => {
              if (event.target.value) setDateKey(event.target.value)
            }}
            className="h-10 rounded-xl border border-[#eef1f3] px-3 text-sm text-[#151922] outline-none focus:border-[#00b4b8]"
          />
        </label>
      </div>

      <div>
        <p className="text-sm font-medium text-[#151922]">Select time</p>
        <p className="text-sm text-[#656f80]">{helpText}</p>
        {loading ? (
          <div className="mt-3 grid grid-cols-3 gap-2">
            {Array.from({ length: 6 }).map((_, index) => (
              <Skeleton key={index} className="h-10 rounded-xl" />
            ))}
          </div>
        ) : slots.length === 0 ? (
          <p className="mt-3 rounded-xl border border-dashed border-[#e5ecf5] p-4 text-center text-sm text-[#657080]">
            No open slots on this day.
          </p>
        ) : (
          <div className="mt-3 grid grid-cols-3 gap-2">
            {slots.map((slot) => (
              <button
                key={slot.value}
                type="button"
                onClick={() => onStartMinutesChange(slot.value)}
                className={`rounded-xl border px-4 py-2 text-sm font-semibold transition ${
                  startMinutes === slot.value
                    ? "border-[#00b4b8] bg-[#e3f8f8] text-[#00b4b8]"
                    : "border-[#eef1f3] text-[#151922]"
                }`}
              >
                {slot.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </>
  )
}
