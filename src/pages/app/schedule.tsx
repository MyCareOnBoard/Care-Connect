import { useEffect, useMemo, useState } from "react"
import { Link } from "react-router"
import { format, addDays, isSameDay, isWithinInterval, startOfWeek, endOfWeek } from "date-fns"
import { Calendar, ChevronLeft, ChevronRight, List, Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Routes } from "@/routes/constants"
import { getInitials } from "@/lib/utils"
import { useProfessionalMembership } from "@/utils/professional/useProfessionalMembership"
import { listBookings } from "@/utils/careconnect/services/telehealthService"
import { minutesToLabel, toDateKey, type TelehealthBooking } from "@/utils/careconnect/types"
import { ROW_STATUS_PILL, bookingStart, formatDurationLabel, rowStatusFor } from "@/utils/careconnect/bookingStatus"
import { BookingDetailsDialog } from "@/components/professional/BookingDetailsDialog"
import { BookingRowAction } from "@/components/professional/BookingRowAction"

const HOUR_HEIGHT = 96
const START_HOUR = 8
const END_HOUR = 16
const PX_PER_MIN = HOUR_HEIGHT / 60

const hours = Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, index) => START_HOUR + index)

function formatHourLabel(hour: number) {
  const period = hour >= 12 ? "pm" : "am"
  const displayHour = hour % 12 === 0 ? 12 : hour % 12
  return `${displayHour}:00 ${period}`
}

type Appointment = {
  id: string
  title: string
  startLabel: string
  endLabel: string
  personName: string
  avatarBg: string
  accentColor: string
  top: number
  height: number
  column: "wide" | "narrow"
}

const APPT_PALETTE = ["bg-[#6b9cca]", "bg-[#c99b9b]", "bg-[#f5a623]", "bg-[#87c9a8]", "bg-[#a782d8]"]
const avatarForId = (id: string) =>
  APPT_PALETTE[[...id].reduce((acc, ch) => acc + ch.charCodeAt(0), 0) % APPT_PALETTE.length]

/** Map a booking into a positioned calendar block. */
function toAppointment(booking: TelehealthBooking, isProfessional: boolean): Appointment {
  const top = Math.max((booking.startMinutes - START_HOUR * 60) * PX_PER_MIN, 0)
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
    column: "wide",
  }
}

const views = ["Day", "Week", "Month"] as const
type ScheduleView = (typeof views)[number]

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
  isProfessional,
}: {
  bookings: TelehealthBooking[]
  isProfessional: boolean
}) {
  const [tableSearch, setTableSearch] = useState("")
  const [detailsBooking, setDetailsBooking] = useState<TelehealthBooking | null>(null)

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
  }, [bookings, isProfessional])

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
      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map((stat) => (
          <OverviewCard key={stat.label} value={stat.value} label={stat.label} />
        ))}
      </div>

      <div className="mt-8 flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-lg font-semibold text-[#151922]">Schedule</h2>
        <div className="relative w-full max-w-xs">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#8a8f98]" />
          <Input
            value={tableSearch}
            onChange={(event) => setTableSearch(event.target.value)}
            placeholder="Search client name here"
            className="border-0 pl-9 shadow-none focus-visible:ring-0"
          />
        </div>
      </div>

      {visibleRows.length === 0 ? (
        <p className="mt-6 rounded-3xl border border-dashed border-[#e5ecf5] p-10 text-center text-sm text-[#657080]">
          No appointments yet.
        </p>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-180 border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-[#eef1f3] text-[#8a8f98]">
                <th className="py-3 pr-4 font-medium">Date</th>
                <th className="py-3 pr-4 font-medium">Time</th>
                <th className="py-3 pr-4 font-medium">{isProfessional ? "Client" : "Care Professional"}</th>
                {!isProfessional && <th className="py-3 pr-4 font-medium">Service</th>}
                <th className="py-3 pr-4 font-medium">Duration</th>
                <th className="py-3 pr-4 font-medium">PA Rate</th>
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
                    <td className="py-4 pr-4 whitespace-nowrap text-right">
                      <BookingRowAction booking={booking} rowStatus={rowStatus} isProfessional={isProfessional} onDetails={setDetailsBooking} />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <BookingDetailsDialog booking={detailsBooking} onOpenChange={(open) => !open && setDetailsBooking(null)} />
    </div>
  )
}

export default function SchedulePage() {
  const { isProfessional } = useProfessionalMembership()
  const [viewMode, setViewMode] = useState<ViewMode>("calendar")
  const [view, setView] = useState<ScheduleView>("Day")
  const [currentDate, setCurrentDate] = useState(() => new Date())
  const [search, setSearch] = useState("")
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [allBookings, setAllBookings] = useState<TelehealthBooking[]>([])

  // Load bookings for the visible day (as professional or as client) — powers the Calendar view.
  useEffect(() => {
    let active = true
    const dateKey = toDateKey(currentDate)
    listBookings({ scope: isProfessional ? "professional" : "client", from: dateKey, to: dateKey })
      .then((list) => {
        if (active) setAppointments(list.map((booking) => toAppointment(booking, isProfessional)))
      })
      .catch(() => {
        if (active) setAppointments([])
      })
    return () => {
      active = false
    }
  }, [currentDate, isProfessional])

  // Full booking history (no date filter) — powers the Table view's Overview stats + rows.
  useEffect(() => {
    let active = true
    listBookings({ scope: isProfessional ? "professional" : "client" })
      .then((list) => {
        if (active) setAllBookings(list)
      })
      .catch(() => {
        if (active) setAllBookings([])
      })
    return () => {
      active = false
    }
  }, [isProfessional])

  const dateLabel = isSameDay(currentDate, new Date()) ? "Today" : format(currentDate, "MMM d")

  const now = new Date()
  const nowMinutes = now.getHours() * 60 + now.getMinutes()
  const showNowLine =
    isSameDay(currentDate, now) && nowMinutes >= START_HOUR * 60 && nowMinutes <= END_HOUR * 60
  const currentTimeOffset = (nowMinutes - START_HOUR * 60) * PX_PER_MIN

  const visibleAppointments = search
    ? appointments.filter(
        (appointment) =>
          appointment.title.toLowerCase().includes(search.toLowerCase()) ||
          appointment.personName.toLowerCase().includes(search.toLowerCase()),
      )
    : appointments

  return (
    <div className="p-5 sm:p-8">
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
              aria-label="Previous day"
              onClick={() => setCurrentDate((current) => addDays(current, -1))}
              className="flex size-6 items-center justify-center rounded-md text-[#657080] hover:bg-[#f2f6f8]"
            >
              <ChevronLeft className="size-4" />
            </button>
            <span className="px-1 text-sm font-semibold text-[#151922]">{dateLabel}</span>
            <button
              type="button"
              aria-label="Next day"
              onClick={() => setCurrentDate((current) => addDays(current, 1))}
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
            className={`flex size-9 items-center justify-center rounded-lg transition ${
              viewMode === "calendar" ? "bg-[#eef1f3] text-[#151922]" : "text-[#657080] hover:text-[#151922]"
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
              viewMode === "table" ? "bg-[#eef1f3] text-[#151922]" : "text-[#657080] hover:text-[#151922]"
            }`}
          >
            <List className="size-4" />
          </button>
        </div>
      </div>

      {viewMode === "table" ? (
        <ScheduleTable bookings={allBookings} isProfessional={isProfessional} />
      ) : view !== "Day" ? (
        <p className="mt-10 rounded-3xl border border-dashed border-[#e5ecf5] p-10 text-center text-sm text-[#657080]">
          {view} view is coming soon.
        </p>
      ) : (
        <div className="mt-8 flex">
          <div className="w-20 shrink-0 sm:w-24">
            {hours.map((hour) => (
              <div key={hour} className="text-sm text-[#657080]" style={{ height: HOUR_HEIGHT }}>
                {formatHourLabel(hour)}
              </div>
            ))}
          </div>

          <div className="relative flex-1 border-l border-[#eef1f3]" style={{ height: HOUR_HEIGHT * hours.length }}>
            {hours.map((hour) => (
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

            {visibleAppointments.map((appointment) => (
              <div
                key={appointment.id}
                className="absolute rounded-xl border bg-white p-3 shadow-sm"
                style={{
                  top: appointment.top,
                  height: appointment.height,
                  left: appointment.column === "wide" ? 8 : 220,
                  width: appointment.column === "wide" ? 260 : 210,
                  borderLeftColor: appointment.accentColor,
                  borderLeftWidth: 4,
                }}
              >
                <p className="text-sm font-semibold text-[#151922]">{appointment.title}</p>
                <p className="mt-1 text-sm font-medium text-[#151922]">
                  {appointment.startLabel} - {appointment.endLabel}
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <span className={`flex size-6 items-center justify-center rounded-full text-[10px] font-semibold text-white ${appointment.avatarBg}`}>
                    {getInitials(appointment.personName)}
                  </span>
                  <span className="text-sm text-[#657080]">{appointment.personName}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
