import { useEffect, useMemo, useState } from "react"
import { format } from "date-fns"
import { getInitials } from "@/lib/utils"
import { Skeleton } from "@/components/ui/skeleton"
import { listBookings } from "@/utils/careconnect/services/telehealthService"
import { minutesToLabel, type TelehealthBooking } from "@/utils/careconnect/types"

const bookingTabs = ["Upcoming", "Previous"] as const
type BookingTab = (typeof bookingTabs)[number]

const AVATAR_PALETTE = ["bg-[#e7b8c9]", "bg-[#6b9cca]", "bg-[#87c9a8]", "bg-[#f5a623]", "bg-[#a782d8]"]
const avatarFor = (id: string) =>
  AVATAR_PALETTE[[...id].reduce((acc, ch) => acc + ch.charCodeAt(0), 0) % AVATAR_PALETTE.length]

/** Booking instant from its dateKey + startMinutes (local). */
function bookingDate(booking: TelehealthBooking): Date {
  const [year, month, day] = booking.dateKey.split("-").map(Number)
  return new Date(year, month - 1, day, Math.floor(booking.startMinutes / 60), booking.startMinutes % 60)
}

function BookingRow({ booking }: { booking: TelehealthBooking }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-[#eef1f3] px-4 py-3">
      <div className="flex items-center gap-3">
        <span className={`flex size-9 items-center justify-center rounded-full text-xs font-semibold text-white ${avatarFor(booking.id)}`}>
          {getInitials(booking.clientName)}
        </span>
        <div>
          <p className="text-sm font-semibold text-[#151922]">{booking.clientName}</p>
          <p className="text-sm text-[#657080]">{booking.serviceTitle}</p>
        </div>
      </div>
      <span className="text-sm font-medium text-[#151922]">
        {format(bookingDate(booking), "MMM d, yyyy")} · {minutesToLabel(booking.startMinutes)}
      </span>
    </div>
  )
}

export function BookingsTab() {
  const [tab, setTab] = useState<BookingTab>("Upcoming")
  const [bookings, setBookings] = useState<TelehealthBooking[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    ;(async () => {
      try {
        const list = await listBookings({ scope: "professional" })
        if (active) setBookings(list)
      } catch {
        // non-critical
      } finally {
        if (active) setLoading(false)
      }
    })()
    return () => {
      active = false
    }
  }, [])

  const { upcoming, previous } = useMemo(() => {
    const now = Date.now()
    const up: TelehealthBooking[] = []
    const prev: TelehealthBooking[] = []
    for (const booking of bookings) {
      if (bookingDate(booking).getTime() >= now) up.push(booking)
      else prev.push(booking)
    }
    up.sort((a, b) => bookingDate(a).getTime() - bookingDate(b).getTime())
    prev.sort((a, b) => bookingDate(b).getTime() - bookingDate(a).getTime())
    return { upcoming: up, previous: prev }
  }, [bookings])

  const visible = tab === "Upcoming" ? upcoming : previous

  return (
    <div className="mt-8">
      <div className="flex items-center gap-1 rounded-xl border border-[#e2e2e2] p-1 w-fit">
        {bookingTabs.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setTab(item)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
              tab === item ? "bg-[#eef1f3] text-[#151922]" : "text-[#657080] hover:text-[#151922]"
            }`}
          >
            {item}
          </button>
        ))}
      </div>

      <div className="mt-4 space-y-3">
        {loading ? (
          <>
            <Skeleton className="h-16 rounded-xl" />
            <Skeleton className="h-16 rounded-xl" />
          </>
        ) : visible.length ? (
          visible.map((booking) => <BookingRow key={booking.id} booking={booking} />)
        ) : (
          <p className="rounded-3xl border border-dashed border-[#e5ecf5] p-10 text-center text-sm text-[#657080]">
            No {tab.toLowerCase()} bookings.
          </p>
        )}
      </div>
    </div>
  )
}
