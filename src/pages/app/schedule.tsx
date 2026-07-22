import { useState } from "react"
import { format, addDays, isSameDay } from "date-fns"
import { ChevronLeft, ChevronRight, Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import { getInitials } from "@/lib/utils"
import { useAuthUser } from "@/utils/auth"
import { isProfessionalAccount } from "@/utils/professional/professionalAccount"
import { BookingsTab } from "@/components/professional/BookingsTab"

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

function minutesFromStart(hour: number, minute: number) {
  return (hour - START_HOUR) * 60 + minute
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

const appointments: Appointment[] = [
  {
    id: "apt-1",
    title: "Morning physical therapy.",
    startLabel: "8:00 am",
    endLabel: "9:10am",
    personName: "Bobby afriye",
    avatarBg: "bg-[#6b9cca]",
    accentColor: "#10ad58",
    top: minutesFromStart(8, 0) * PX_PER_MIN,
    height: minutesFromStart(9, 10) * PX_PER_MIN,
    column: "wide",
  },
  {
    id: "apt-2",
    title: "Care giver visit",
    startLabel: "10:00 am",
    endLabel: "2:00 pm",
    personName: "Arlene McCoy",
    avatarBg: "bg-[#c99b9b]",
    accentColor: "#087fff",
    top: minutesFromStart(10, 0) * PX_PER_MIN,
    height: (minutesFromStart(14, 0) - minutesFromStart(10, 0)) * PX_PER_MIN,
    column: "wide",
  },
  {
    id: "apt-3",
    title: "Noon physical therapy",
    startLabel: "11:00 am",
    endLabel: "12:00 am",
    personName: "Jerome Bell",
    avatarBg: "bg-[#f5a623]",
    accentColor: "#087fff",
    top: minutesFromStart(11, 0) * PX_PER_MIN,
    height: (minutesFromStart(12, 0) - minutesFromStart(11, 0)) * PX_PER_MIN,
    column: "narrow",
  },
  {
    id: "apt-4",
    title: "Care giver visit",
    startLabel: "2:30 pm",
    endLabel: "5:00 pm",
    personName: "Sarah K.",
    avatarBg: "bg-[#3a3a3a]",
    accentColor: "#c7ccd4",
    top: minutesFromStart(14, 30) * PX_PER_MIN,
    height: (minutesFromStart(17, 0) - minutesFromStart(14, 30)) * PX_PER_MIN,
    column: "wide",
  },
]

const currentTimeOffset = minutesFromStart(11, 15) * PX_PER_MIN

const views = ["Day", "Week", "Month"] as const
type ScheduleView = (typeof views)[number]

const pageTabs = ["Calendar", "Bookings"] as const
type PageTab = (typeof pageTabs)[number]

export default function SchedulePage() {
  const { user } = useAuthUser()
  const isProfessional = isProfessionalAccount(user?.uid)
  const [pageTab, setPageTab] = useState<PageTab>("Calendar")
  const [view, setView] = useState<ScheduleView>("Day")
  const [currentDate, setCurrentDate] = useState(() => new Date())
  const [search, setSearch] = useState("")

  const dateLabel = isSameDay(currentDate, new Date()) ? "Today" : format(currentDate, "MMM d")

  return (
    <div className="p-5 sm:p-8">
      {isProfessional ? (
        <div className="mb-4 flex items-center gap-1 rounded-xl border border-[#e2e2e2] p-1 w-fit">
          {pageTabs.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setPageTab(item)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                pageTab === item ? "bg-[#eef1f3] text-[#151922]" : "text-[#657080] hover:text-[#151922]"
              }`}
            >
              {item}
            </button>
          ))}
        </div>
      ) : null}

      {isProfessional && pageTab === "Bookings" ? (
        <BookingsTab />
      ) : (
      <>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
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
      </div>

      {view !== "Day" ? (
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

            <div className="absolute inset-x-0 z-10 flex items-center gap-2" style={{ top: currentTimeOffset }}>
              <span className="rounded-md bg-[#087fff] px-2 py-0.5 text-xs font-semibold text-white">
                {formatHourLabel(11).replace(":00", ":15")}
              </span>
              <span className="h-px flex-1 bg-[#087fff]" />
              <span className="size-2 rounded-full bg-[#087fff]" />
            </div>

            {appointments.map((appointment) => (
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
      </>
      )}
    </div>
  )
}
