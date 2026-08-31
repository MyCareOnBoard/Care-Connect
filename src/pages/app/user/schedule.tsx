import { useEffect, useMemo, useState } from "react"
import { Link } from "react-router"
import {
  format,
  addDays,
  addMonths,
  isSameDay,
  isWithinInterval,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
} from "date-fns"
import { Calendar, ChevronLeft, ChevronRight, Info, List, Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Routes } from "@/routes/constants"
import { getInitials } from "@/lib/utils"
import { listBookings } from "@/utils/careconnect/services/telehealthService"
import { listFollowUps } from "@/utils/careconnect/services/clinicalService"
import { minutesToLabel, toDateKey, type TelehealthBooking } from "@/utils/careconnect/types"
import { ROW_STATUS_PILL, bookingStart, formatDurationLabel, rowStatusFor } from "@/utils/careconnect/bookingStatus"
import { BookingDetailsDialog } from "@/components/professional/BookingDetailsDialog"
import { useRecordSurfaces } from "@/components/records/useRecordSurfaces"
import { BookingRowAction } from "@/components/professional/BookingRowAction"
import { isFollowUpExpired } from "@/components/records/FollowUpCard"

const isProfessional = false

const HOUR_HEIGHT = 96
const START_HOUR = 8
const END_HOUR = 16
const PX_PER_MIN = HOUR_HEIGHT / 60

function formatHourLabel(hour: number) {
  const period = hour >= 12 ? "pm" : "am"
  const displayHour = hour % 12 === 0 ? 12 : hour % 12
  return `${displayHour}:00 ${period}`
}

/** A schedule reads as "past" once it's completed/cancelled or its end time has already gone by. */
function isPastBooking(booking: TelehealthBooking): boolean {
  if (booking.status === "completed" || booking.status === "cancelled") return true
  const start = bookingStart(booking)
  return start.getTime() + booking.durationMinutes * 60000 < Date.now()
}

type LaidOutAppointment = {
  id: string
  title: string
  startLabel: string
  endLabel: string
  personName: string
  avatarBg: string
  accentColor: string
  top: number
  height: number
  booking: TelehealthBooking
}

type Appointment = LaidOutAppointment & {
  columnIndex: number
  columnCount: number
}

const APPT_PALETTE = ["bg-[#6b9cca]", "bg-[#c99b9b]", "bg-[#f5a623]", "bg-[#87c9a8]", "bg-[#a782d8]"]
const avatarForId = (id: string) =>
  APPT_PALETTE[[...id].reduce((acc, ch) => acc + ch.charCodeAt(0), 0) % APPT_PALETTE.length]

/**
 * Map a booking into a positioned calendar block, in minutes-from-midnight pixel terms
 * (column layout applied separately). The visible hour window is derived per-render from
 * the day's actual bookings, so `top` stays origin-agnostic here.
 */
function toAppointment(booking: TelehealthBooking): LaidOutAppointment {
  const top = booking.startMinutes * PX_PER_MIN
  const height = Math.max((booking.endMinutes - booking.startMinutes) * PX_PER_MIN, 28)
  return {
    id: booking.id,
    title: booking.serviceTitle,
    startLabel: minutesToLabel(booking.startMinutes),
    endLabel: minutesToLabel(booking.endMinutes),
    personName: isProfessional ? booking.clientName : booking.professionalName,
    avatarBg: avatarForId(booking.id),
    accentColor: "#00b4b8",
    top,
    height,
    booking,
  }
}

/**
 * Classic calendar column-packing: appointments that overlap in time get assigned
 * side-by-side columns instead of colliding at the same fixed position. A new cluster
 * starts whenever an appointment begins after every earlier one (in the running cluster)
 * has already ended.
 */
function layoutAppointments(list: LaidOutAppointment[]): Appointment[] {
  const sorted = [...list].sort((a, b) => a.top - b.top)
  const columnIndexById = new Map<string, number>()
  const clusterIndexById = new Map<string, number>()
  const clusterColumnCounts: number[] = []

  let clusterIndex = -1
  let clusterEnd = -Infinity
  let columnEnds: number[] = []

  for (const appt of sorted) {
    if (clusterIndex === -1 || appt.top >= clusterEnd) {
      clusterIndex++
      columnEnds = []
      clusterColumnCounts.push(0)
      clusterEnd = -Infinity
    }
    let col = columnEnds.findIndex((end) => end <= appt.top)
    if (col === -1) {
      col = columnEnds.length
      columnEnds.push(appt.top + appt.height)
    } else {
      columnEnds[col] = appt.top + appt.height
    }
    columnIndexById.set(appt.id, col)
    clusterIndexById.set(appt.id, clusterIndex)
    clusterColumnCounts[clusterIndex] = Math.max(clusterColumnCounts[clusterIndex], columnEnds.length)
    clusterEnd = Math.max(clusterEnd, appt.top + appt.height)
  }

  return sorted.map((appt) => ({
    ...appt,
    columnIndex: columnIndexById.get(appt.id)!,
    columnCount: clusterColumnCounts[clusterIndexById.get(appt.id)!],
  }))
}

const views = ["Day", "Week", "Month"] as const
type ScheduleViewMode = (typeof views)[number]

type ViewMode = "calendar" | "table"

function OverviewCard({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-2xl border border-[#e5ecf5] bg-white p-4">
      <p className="text-2xl font-bold text-[#151922]">{value}</p>
      <p className="mt-1 text-sm text-[#657080]">{label}</p>
    </div>
  )
}

function ScheduleTable({
  bookings,
  onBookingUpdated,
  loading,
}: {
  bookings: TelehealthBooking[]
  onBookingUpdated: (updated: TelehealthBooking) => void
  loading: boolean
}) {
  const [tableSearch, setTableSearch] = useState("")
  const [detailsBooking, setDetailsBooking] = useState<TelehealthBooking | null>(null)

  // Clinical surfaces (record editor, follow-up proposal, record viewer). The
  // two schedule pages are near-duplicates, so this stays a single hook call
  // plus one {surfaces} in each rather than forty duplicated lines.
  const {
    openRecordEditor,
    openFollowUpProposal,
    openClientRecords,
    openRecordViewer,
    surfaces: recordSurfaces,
  } = useRecordSurfaces({ onBookingPatched: onBookingUpdated })

  const now = new Date()
  const todayKey = toDateKey(now)
  const week = { start: startOfWeek(now), end: endOfWeek(now) }

  const stats = useMemo(() => {
    const active = bookings.filter((booking) => booking.status !== "cancelled")
    const upcoming = bookings.filter((booking) => rowStatusFor(booking) === "upcoming")
    const completed = bookings.filter((booking) => booking.status === "completed")
    const completedThisMonth = completed.filter((booking) => {
      const start = bookingStart(booking)
      return start.getMonth() === now.getMonth() && start.getFullYear() === now.getFullYear()
    })
    const cancelled = bookings.filter((booking) => booking.status === "cancelled")
    const today = active.filter((booking) => booking.dateKey === todayKey)
    const thisWeek = active.filter((booking) => isWithinInterval(bookingStart(booking), week))

    return isProfessional
      ? [
          { label: "Today's Visits", value: String(today.length) },
          { label: "This Week", value: String(thisWeek.length) },
          { label: "Completed", value: String(completed.length) },
          { label: "Upcoming", value: String(upcoming.length) },
        ]
      : [
          { label: "Upcoming Visits", value: String(upcoming.length) },
          { label: "Today's Appointments", value: String(today.length) },
          { label: "Completed This Month", value: String(completedThisMonth.length) },
          { label: "Cancelled", value: String(cancelled.length) },
        ]
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookings])

  const sorted = useMemo(
    () => [...bookings].sort((a, b) => bookingStart(b).getTime() - bookingStart(a).getTime()),
    [bookings],
  )

  const visibleRows = tableSearch
    ? sorted.filter((booking) =>
        (isProfessional ? booking.clientName : booking.professionalName)
          .toLowerCase()
          .includes(tableSearch.toLowerCase()),
      )
    : sorted

  return (
    <div className="mt-6">
      <h2 className="text-lg font-semibold text-[#151922]">Overview</h2>
      <div className="grid grid-cols-2 gap-3 mt-3 sm:grid-cols-4">
        {loading
          ? Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="rounded-2xl border border-[#e5ecf5] bg-white p-4">
                <Skeleton className="w-10 h-7" />
                <Skeleton className="w-24 h-4 mt-2" />
              </div>
            ))
          : stats.map((stat) => <OverviewCard key={stat.label} value={stat.value} label={stat.label} />)}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4 mt-8">
        <h2 className="text-lg font-semibold text-[#151922]">Schedule</h2>
        <div className="relative w-full max-w-xs">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#8a8f98]" />
          <Input
            value={tableSearch}
            onChange={(event) => setTableSearch(event.target.value)}
            placeholder="Search client name here"
            className="border-0 shadow-none pl-9 focus-visible:ring-0"
          />
        </div>
      </div>

      {loading ? (
        <div className="mt-4 space-y-3">
          {Array.from({ length: 5 }).map((_, index) => (
            <Skeleton key={index} className="w-full h-12 rounded-xl" />
          ))}
        </div>
      ) : visibleRows.length === 0 ? (
        <p className="mt-6 rounded-3xl border border-dashed border-[#e5ecf5] p-10 text-center text-sm text-[#657080]">
          No appointments yet.
        </p>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm text-left border-collapse min-w-180">
            <thead>
              <tr className="border-b border-[#eef1f3] text-[#8a8f98]">
                <th className="py-3 pr-4 font-medium">Date</th>
                <th className="py-3 pr-4 font-medium">Time</th>
                <th className="py-3 pr-4 font-medium">{isProfessional ? "Client" : "Care Professional"}</th>
                {!isProfessional && <th className="py-3 pr-4 font-medium">Service</th>}
                <th className="py-3 pr-4 font-medium">Duration</th>
                <th className="py-3 pr-4 font-medium">Status</th>
                <th className="py-3 pr-4 font-medium text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {visibleRows.map((booking) => {
                const rowStatus = rowStatusFor(booking)
                const pill = ROW_STATUS_PILL[rowStatus]
                const personName = isProfessional ? booking.clientName : booking.professionalName
                const profileHref = !isProfessional && booking.professionalUid ? Routes.app.user.viewProfile(booking.professionalUid) : null

                return (
                  <tr key={booking.id} className="border-b border-[#f2f5f8] last:border-0">
                    <td className="py-4 pr-4 whitespace-nowrap text-[#151922]">{format(bookingStart(booking), "EEE, d MMM")}</td>
                    <td className="py-4 pr-4 whitespace-nowrap text-[#151922]">{minutesToLabel(booking.startMinutes)}</td>
                    <td className="py-4 pr-4 whitespace-nowrap">
                      {profileHref ? (
                        <Link to={profileHref} className="font-semibold text-[#151922] underline">
                          {personName}
                        </Link>
                      ) : (
                        <span className="text-[#151922]">{personName}</span>
                      )}
                    </td>
                    {!isProfessional && <td className="py-4 pr-4 whitespace-nowrap text-[#151922]">{booking.serviceTitle}</td>}
                    <td className="py-4 pr-4 whitespace-nowrap text-[#151922]">{formatDurationLabel(booking.durationMinutes)}</td>
                    <td className="py-4 pr-4 whitespace-nowrap">
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${pill.className}`}>{pill.label}</span>
                    </td>
                    <td className="py-4 pr-4 text-right whitespace-nowrap">
                      <BookingRowAction
                        booking={booking}
                        rowStatus={rowStatus}
                        isProfessional={isProfessional}
                        onDetails={setDetailsBooking}
                        onRecord={openRecordEditor}
                      />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <BookingDetailsDialog
        booking={detailsBooking}
        onOpenChange={(open) => !open && setDetailsBooking(null)}
        canManage={isProfessional}
        onStatusChanged={onBookingUpdated}
        onWriteRecord={openRecordEditor}
        onProposeFollowUp={openFollowUpProposal}
        onViewRecords={isProfessional ? openClientRecords : openRecordViewer}
      />

      {recordSurfaces}
    </div>
  )
}

export default function UserSchedulePage() {
  const [viewMode, setViewMode] = useState<ViewMode>("calendar")
  const [view, setView] = useState<ScheduleViewMode>("Day")
  const [currentDate, setCurrentDate] = useState(() => new Date())
  const [search, setSearch] = useState("")
  const [rangeBookings, setRangeBookings] = useState<TelehealthBooking[]>([])
  const [allBookings, setAllBookings] = useState<TelehealthBooking[]>([])
  const [calendarLoading, setCalendarLoading] = useState(true)
  const [tableLoading, setTableLoading] = useState(true)
  const [detailsBooking, setDetailsBooking] = useState<TelehealthBooking | null>(null)
  // Follow-up proposals awaiting an answer. Lives on the client page only: this
  // file already dispatches on role, so keeping the banner here means zero
  // duplication with professional/schedule.tsx.
  const [pendingFollowUps, setPendingFollowUps] = useState(0)

  useEffect(() => {
    let active = true
    listFollowUps({ scope: "client", status: "proposed" })
      .then((list) => {
        if (!active) return
        // A slot that has already passed is not awaiting anything.
        setPendingFollowUps(list.filter((item) => !isFollowUpExpired(item)).length)
      })
      .catch(() => {
        if (active) setPendingFollowUps(0)
      })
    return () => {
      active = false
    }
  }, [])

  // The visible date range depends on the active view — a single day, or a full month
  // (padded to whole weeks) for both Week and Month views. Week view shows every week of
  // that month at once (grouped below), not just the one containing `currentDate`.
  const rangeStart = useMemo(() => {
    if (view === "Week" || view === "Month") return startOfWeek(startOfMonth(currentDate))
    return currentDate
  }, [view, currentDate])
  const rangeEnd = useMemo(() => {
    if (view === "Week" || view === "Month") return endOfWeek(endOfMonth(currentDate))
    return currentDate
  }, [view, currentDate])

  // Load bookings across the visible range (day/week/month) — powers the Calendar view.
  useEffect(() => {
    let active = true
    setCalendarLoading(true)
    listBookings({ scope: isProfessional ? "professional" : "client", from: toDateKey(rangeStart), to: toDateKey(rangeEnd) })
      .then((list) => {
        if (active) setRangeBookings(list)
      })
      .catch(() => {
        if (active) setRangeBookings([])
      })
      .finally(() => {
        if (active) setCalendarLoading(false)
      })
    return () => {
      active = false
    }
  }, [rangeStart, rangeEnd])

  // Full booking history (no date filter) — powers the Table view's Overview stats + rows.
  useEffect(() => {
    let active = true
    setTableLoading(true)
    listBookings({ scope: isProfessional ? "professional" : "client" })
      .then((list) => {
        if (active) setAllBookings(list)
      })
      .catch(() => {
        if (active) setAllBookings([])
      })
      .finally(() => {
        if (active) setTableLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  // Reflect a status change (from the details dialog) in the table's list + the calendar range.
  const handleBookingUpdated = (updated: TelehealthBooking) => {
    setAllBookings((current) => current.map((booking) => (booking.id === updated.id ? updated : booking)))
    setRangeBookings((current) => current.map((booking) => (booking.id === updated.id ? updated : booking)))
  }

  // Clinical surfaces (record editor, follow-up proposal, record viewer). The
  // two schedule pages are near-duplicates, so this stays a single hook call
  // plus one {surfaces} in each rather than forty duplicated lines.
  const {
    openRecordEditor,
    openFollowUpProposal,
    openClientRecords,
    openRecordViewer,
    surfaces: recordSurfaces,
  } = useRecordSurfaces({ onBookingPatched: handleBookingUpdated })

  const goToPrevious = () => {
    setCurrentDate((current) => (view === "Month" || view === "Week" ? addMonths(current, -1) : addDays(current, -1)))
  }
  const goToNext = () => {
    setCurrentDate((current) => (view === "Month" || view === "Week" ? addMonths(current, 1) : addDays(current, 1)))
  }

  const dateLabel =
    view === "Week" || view === "Month"
      ? format(currentDate, "MMMM yyyy")
      : isSameDay(currentDate, new Date())
        ? "Today"
        : format(currentDate, "MMM d")

  const searchedRangeBookings = search
    ? rangeBookings.filter(
        (booking) =>
          booking.serviceTitle.toLowerCase().includes(search.toLowerCase()) ||
          (isProfessional ? booking.clientName : booking.professionalName).toLowerCase().includes(search.toLowerCase()),
      )
    : rangeBookings

  const appointments = useMemo(() => {
    const dateKey = toDateKey(currentDate)
    return layoutAppointments(searchedRangeBookings.filter((booking) => booking.dateKey === dateKey).map((booking) => toAppointment(booking)))
  }, [searchedRangeBookings, currentDate])

  const rangeDays = useMemo(() => eachDayOfInterval({ start: rangeStart, end: rangeEnd }), [rangeStart, rangeEnd])

  // Week view shows every week of the current month, each grouped into its own 7-day row.
  const weeksInMonth = useMemo(() => {
    const weeks: Date[][] = []
    for (let index = 0; index < rangeDays.length; index += 7) {
      weeks.push(rangeDays.slice(index, index + 7))
    }
    return weeks
  }, [rangeDays])

  // Default business-hours window, widened to fit any booking that falls outside it so
  // cards never render above/below the visible section.
  const calendarStartHour = useMemo(() => {
    if (appointments.length === 0) return START_HOUR
    const earliestMinutes = Math.min(...appointments.map((appointment) => appointment.booking.startMinutes))
    return Math.min(START_HOUR, Math.floor(earliestMinutes / 60))
  }, [appointments])
  const calendarEndHour = useMemo(() => {
    if (appointments.length === 0) return END_HOUR
    const latestMinutes = Math.max(...appointments.map((appointment) => appointment.booking.endMinutes))
    return Math.max(END_HOUR, Math.ceil(latestMinutes / 60))
  }, [appointments])
  const calendarHours = useMemo(
    () => Array.from({ length: calendarEndHour - calendarStartHour + 1 }, (_, index) => calendarStartHour + index),
    [calendarStartHour, calendarEndHour],
  )
  const dayOriginMinutes = calendarStartHour * 60

  const now = new Date()
  const nowMinutes = now.getHours() * 60 + now.getMinutes()
  const showNowLine =
    isSameDay(currentDate, now) && nowMinutes >= dayOriginMinutes && nowMinutes <= (calendarEndHour + 1) * 60
  const currentTimeOffset = (nowMinutes - dayOriginMinutes) * PX_PER_MIN

  const visibleAppointments = search
    ? appointments.filter(
        (appointment) =>
          appointment.title.toLowerCase().includes(search.toLowerCase()) ||
          appointment.personName.toLowerCase().includes(search.toLowerCase()),
      )
    : appointments

  return (
    <div className="p-5 sm:p-8">
      {pendingFollowUps > 0 && (
        <Link
          to={Routes.app.user.followUps}
          className="mb-5 flex items-center justify-between gap-3 rounded-2xl bg-[#fdf3e3] px-4 py-3 text-sm text-[#8a6d1f] transition hover:opacity-90"
        >
          <span className="flex items-center gap-2">
            <Info className="size-4 shrink-0" />
            {pendingFollowUps === 1
              ? "A professional has recommended a follow-up visit."
              : `${pendingFollowUps} professionals have recommended follow-up visits.`}
          </span>
          <span className="shrink-0 font-semibold underline">Review</span>
        </Link>
      )}

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center rounded-xl border border-[#e2e2e2] p-1">
            {views.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setView(item)}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                  view === item ? "bg-[#eef1f3] text-[#151922]" : "text-[#657080] hover:text-[#151922]"
                }`}
              >
                {item}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 rounded-xl border border-[#e2e2e2] px-2 py-1.5">
            <button
              type="button"
              aria-label={`Previous ${view.toLowerCase()}`}
              onClick={goToPrevious}
              className="flex size-6 items-center justify-center rounded-md text-[#657080] hover:bg-[#f2f6f8]"
            >
              <ChevronLeft className="size-4" />
            </button>
            <span className="px-1 text-sm font-semibold text-[#151922]">{dateLabel}</span>
            <button
              type="button"
              aria-label={`Next ${view.toLowerCase()}`}
              onClick={goToNext}
              className="flex size-6 items-center justify-center rounded-md text-[#657080] hover:bg-[#f2f6f8]"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>
        </div>

        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#8a8f98]" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search professional, service name, etc here"
            className="pl-9"
          />
        </div>

        <div className="flex items-center gap-2 rounded-xl border border-[#e2e2e2] p-1">
          <button
            type="button"
            aria-label="Calendar view"
            aria-pressed={viewMode === "calendar"}
            onClick={() => setViewMode("calendar")}
            className={`flex size-9 items-center justify-center rounded-lg transition cursor-pointer ${
              viewMode === "calendar" ? "bg-[#eef1f3] text-[#151922]" : "text-[#657080] hover:text-[#151922] cursor-pointer"
            }`}
          >
            <Calendar className="size-4" />
          </button>
          <button
            type="button"
            aria-label="Table view"
            aria-pressed={viewMode === "table"}
            onClick={() => setViewMode("table")}
            className={`flex size-9 items-center justify-center rounded-lg transition ${
              viewMode === "table" ? "bg-[#eef1f3] text-[#151922]" : "text-[#657080] hover:text-[#151922] cursor-pointer"
            }`}
          >
            <List className="size-4" />
          </button>
        </div>
      </div>

      {viewMode === "table" ? (
        <ScheduleTable bookings={allBookings} onBookingUpdated={handleBookingUpdated} loading={tableLoading} />
      ) : view === "Week" ? (
        <div className="mt-8 space-y-6">
          {calendarLoading
            ? Array.from({ length: 5 }).map((_, weekIndex) => (
                <div key={weekIndex} className="grid grid-cols-1 gap-3 sm:grid-cols-7">
                  {Array.from({ length: 7 }).map((_, dayIndex) => (
                    <Skeleton key={dayIndex} className="rounded-xl h-32" />
                  ))}
                </div>
              ))
            : weeksInMonth.map((days, weekIndex) => {
                const isActiveWeek = days.some((day) => isSameDay(day, new Date()))
                return (
                  <div key={weekIndex}>
                    <div className="flex items-center gap-2 mb-2">
                      <p className="text-sm font-semibold text-[#151922]">
                        Week {weekIndex + 1} · {format(days[0], "MMM d")} - {format(days[6], "MMM d")}
                      </p>
                      {isActiveWeek && (
                        <span className="rounded-full bg-[#00b4b8] px-2 py-0.5 text-[11px] font-semibold text-white">Active</span>
                      )}
                    </div>
                    <div
                      className={`grid grid-cols-1 gap-3 sm:grid-cols-7 ${isActiveWeek ? "rounded-2xl bg-[#e3f8f8]/40 p-2 ring-1 ring-[#00b4b8]/30" : ""}`}
                    >
                      {days.map((day) => {
                        const dateKey = toDateKey(day)
                        const dayBookings = searchedRangeBookings
                          .filter((booking) => booking.dateKey === dateKey)
                          .sort((a, b) => a.startMinutes - b.startMinutes)
                        const isToday = isSameDay(day, new Date())
                        const inCurrentMonth = day.getMonth() === currentDate.getMonth()

                        return (
                          <div
                            key={dateKey}
                            className={`min-h-32 rounded-xl border p-2.5 ${
                              isToday ? "border-[#00b4b8] bg-[#e3f8f8]/60" : "border-[#eef1f3] bg-white"
                            } ${inCurrentMonth ? "" : "opacity-40"}`}
                          >
                            <p className={`text-xs font-semibold ${isToday ? "text-[#00b4b8]" : "text-[#657080]"}`}>{format(day, "EEE")}</p>
                            <p className={`text-base font-bold ${isToday ? "text-[#00b4b8]" : "text-[#151922]"}`}>{format(day, "d")}</p>
                            <div className="mt-1.5 space-y-1">
                              {dayBookings.map((booking) => {
                                const past = isPastBooking(booking)
                                return (
                                  <button
                                    key={booking.id}
                                    type="button"
                                    onClick={() => setDetailsBooking(booking)}
                                    className={`block w-full truncate rounded-md border-l-2 px-1.5 py-1 text-left text-xs font-medium transition hover:-translate-y-0.5 ${
                                      past
                                        ? "border-[#c7ccd4] bg-[#f5f6f8] text-[#8a8f98]"
                                        : "border-[#00b4b8] bg-[#e3f8f8] text-[#0f5f61]"
                                    }`}
                                  >
                                    {minutesToLabel(booking.startMinutes)} · {booking.serviceTitle}
                                  </button>
                                )
                              })}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
        </div>
      ) : view === "Month" ? (
        <div className="mt-8 overflow-hidden rounded-xl border border-[#eef1f3] bg-[#eef1f3]">
          <div className="grid grid-cols-7 gap-px">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((label) => (
              <div key={label} className="bg-[#f7fafc] px-2 py-1.5 text-center text-xs font-semibold text-[#657080]">
                {label}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-px">
            {calendarLoading
              ? Array.from({ length: 35 }).map((_, index) => <Skeleton key={index} className="rounded-none h-24" />)
              : rangeDays.map((day) => {
                  const dateKey = toDateKey(day)
                  const dayBookings = searchedRangeBookings
                    .filter((booking) => booking.dateKey === dateKey)
                    .sort((a, b) => a.startMinutes - b.startMinutes)
                  const visibleBookings = dayBookings.slice(0, 2)
                  const overflowCount = dayBookings.length - visibleBookings.length
                  const inCurrentMonth = day.getMonth() === currentDate.getMonth()
                  const isToday = isSameDay(day, new Date())

                  return (
                    <div key={dateKey} className={`min-h-24 bg-white p-1.5 ${inCurrentMonth ? "" : "opacity-40"}`}>
                      <span
                        className={`inline-flex size-6 items-center justify-center rounded-full text-xs font-semibold ${
                          isToday ? "bg-[#00b4b8] text-white" : "text-[#151922]"
                        }`}
                      >
                        {format(day, "d")}
                      </span>
                      <div className="mt-1 space-y-1">
                        {visibleBookings.map((booking) => {
                          const past = isPastBooking(booking)
                          return (
                            <button
                              key={booking.id}
                              type="button"
                              onClick={() => setDetailsBooking(booking)}
                              className={`block w-full truncate rounded px-1 py-0.5 text-left text-[10px] font-medium ${
                                past ? "bg-[#f5f6f8] text-[#8a8f98]" : "bg-[#e3f8f8] text-[#0f5f61]"
                              }`}
                            >
                              {booking.serviceTitle}
                            </button>
                          )
                        })}
                        {overflowCount > 0 && <p className="px-1 text-[10px] text-[#8a8f98]">+{overflowCount} more</p>}
                      </div>
                    </div>
                  )
                })}
          </div>
        </div>
      ) : (
        <div className="flex mt-8">
          <div className="w-20 shrink-0 sm:w-24">
            {calendarHours.map((hour) => (
              <div key={hour} className="text-sm text-[#657080]" style={{ height: HOUR_HEIGHT }}>
                {formatHourLabel(hour)}
              </div>
            ))}
          </div>

          <div className="relative flex-1 border-l border-[#eef1f3]" style={{ height: HOUR_HEIGHT * calendarHours.length }}>
            {calendarHours.map((hour) => (
              <div key={hour} className="border-b border-[#f2f5f8]" style={{ height: HOUR_HEIGHT }} />
            ))}

            {showNowLine && (
              <div className="absolute inset-x-0 z-10 flex items-center gap-2" style={{ top: currentTimeOffset }}>
                <span className="rounded-md bg-[#00b4b8] px-2 py-0.5 text-xs font-semibold text-white">
                  {minutesToLabel(nowMinutes)}
                </span>
                <span className="h-px flex-1 bg-[#00b4b8]" />
                <span className="size-2 rounded-full bg-[#00b4b8]" />
              </div>
            )}

            {calendarLoading &&
              Array.from({ length: 3 }).map((_, index) => (
                <div
                  key={`skeleton-${index}`}
                  className="absolute left-2 rounded-xl border border-[#eef1f3] bg-white p-3 shadow-sm"
                  style={{ top: 16 + index * 150, height: 108, width: 260, borderLeftColor: "#e2e2e2", borderLeftWidth: 4 }}
                >
                  <Skeleton className="w-40 h-4" />
                  <Skeleton className="h-4 mt-2 w-28" />
                  <div className="flex items-center gap-2 mt-3">
                    <Skeleton className="rounded-full size-6" />
                    <Skeleton className="w-24 h-3" />
                  </div>
                </div>
              ))}

            {!calendarLoading &&
              visibleAppointments.map((appointment) => (
              <button
                key={appointment.id}
                type="button"
                onClick={() => setDetailsBooking(appointment.booking)}
                className="absolute cursor-pointer pr-10 overflow-hidden h-auto rounded-xl border border-gray-300 bg-white p-3 text-left shadow-sm transition-all duration-150 hover:-translate-y-0.5 hover:shadow-[0_8px_20px_rgba(16,20,26,0.12)]"
                style={{
                  top: appointment.top - dayOriginMinutes * PX_PER_MIN,
                  // height: appointment.height,
                  left: `calc(${(appointment.columnIndex / appointment.columnCount) * 100}% + 4px)`,
                  // width: `calc(${100 / appointment.columnCount}% - 8px)`,
                  borderLeftColor: appointment.accentColor,
                  borderLeftWidth: 4,
                }}
              >
                <p className="truncate text-sm font-semibold text-[#151922]">{appointment.title}</p>
                <p className="mt-1 truncate text-sm font-medium text-[#151922]">
                  {appointment.startLabel} - {appointment.endLabel}
                </p>
                <div className="flex items-center min-w-0 gap-2 mt-2">
                  <span className={`flex size-6 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold text-white ${appointment.avatarBg}`}>
                    {getInitials(appointment.personName)}
                  </span>
                  <span className="min-w-0 truncate text-sm text-[#657080]">{appointment.personName}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      <BookingDetailsDialog
        booking={detailsBooking}
        onOpenChange={(open) => !open && setDetailsBooking(null)}
        canManage={isProfessional}
        onStatusChanged={handleBookingUpdated}
        onWriteRecord={openRecordEditor}
        onProposeFollowUp={openFollowUpProposal}
        onViewRecords={isProfessional ? openClientRecords : openRecordViewer}
      />

      {recordSurfaces}
    </div>
  )
}
