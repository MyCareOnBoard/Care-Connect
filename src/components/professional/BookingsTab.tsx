import { useState } from "react"
import { getInitials } from "@/lib/utils"
import { previousBookings, upcomingBookings, type ProfessionalBooking } from "@/utils/professional/mockBookings"

const bookingTabs = ["Upcoming", "Previous"] as const
type BookingTab = (typeof bookingTabs)[number]

function BookingRow({ booking }: { booking: ProfessionalBooking }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-[#eef1f3] px-4 py-3">
      <div className="flex items-center gap-3">
        <span className={`flex size-9 items-center justify-center rounded-full text-xs font-semibold text-white ${booking.avatarBg}`}>
          {getInitials(booking.clientName)}
        </span>
        <div>
          <p className="text-sm font-semibold text-[#151922]">{booking.clientName}</p>
          <p className="text-sm text-[#657080]">{booking.serviceTitle}</p>
        </div>
      </div>
      <span className="text-sm font-medium text-[#151922]">{booking.when}</span>
    </div>
  )
}

export function BookingsTab() {
  const [tab, setTab] = useState<BookingTab>("Upcoming")
  const bookings = tab === "Upcoming" ? upcomingBookings : previousBookings

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
        {bookings.length ? (
          bookings.map((booking) => <BookingRow key={booking.id} booking={booking} />)
        ) : (
          <p className="rounded-3xl border border-dashed border-[#e5ecf5] p-10 text-center text-sm text-[#657080]">
            No {tab.toLowerCase()} bookings.
          </p>
        )}
      </div>
    </div>
  )
}
