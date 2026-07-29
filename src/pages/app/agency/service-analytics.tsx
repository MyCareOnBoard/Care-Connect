import { useEffect, useMemo, useState } from "react"
import { Link, useNavigate, useParams } from "react-router"
import { format } from "date-fns"
import { ChevronLeft, Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Routes } from "@/routes/constants"
import { getService, listBookings } from "@/utils/careconnect/services/telehealthService"
import { listMyTeam } from "@/utils/careconnect/services/teamService"
import { minutesToLabel, toDateKey, type TelehealthBooking, type TelehealthService } from "@/utils/careconnect/types"
import { ROW_STATUS_PILL, bookingStart, formatDurationLabel, rowStatusFor } from "@/utils/careconnect/bookingStatus"
import { BookingDetailsDialog } from "@/components/professional/BookingDetailsDialog"
import { BookingRowAction } from "@/components/professional/BookingRowAction"

function formatPrice(price: number, currency: string): string {
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 0 }).format(price)
  } catch {
    return `${currency} ${price}`
  }
}

function OverviewCard({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-2xl border border-[#e5ecf5] bg-white p-4">
      <p className="text-2xl font-bold text-[#151922]">{value}</p>
      <p className="mt-1 text-sm text-[#657080]">{label}</p>
    </div>
  )
}

export default function ServiceAnalyticsPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [service, setService] = useState<TelehealthService | null>(null)
  const [bookings, setBookings] = useState<TelehealthBooking[]>([])
  const [activeStaffCount, setActiveStaffCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [detailsBooking, setDetailsBooking] = useState<TelehealthBooking | null>(null)

  useEffect(() => {
    if (!id) return
    let active = true
    ;(async () => {
      setLoading(true)
      try {
        const [svc, allBookings, team] = await Promise.all([
          getService(id),
          listBookings({ scope: "agency" }).catch(() => []),
          listMyTeam().catch(() => []),
        ])
        if (!active) return
        setService(svc)
        setBookings(allBookings.filter((booking) => booking.serviceId === id))
        const activeMemberIds = new Set(team.filter((member) => member.status === "active").map((member) => member.id))
        setActiveStaffCount(svc.teamMemberIds.filter((memberId) => activeMemberIds.has(memberId)).length)
      } catch {
        if (active) setService(null)
      } finally {
        if (active) setLoading(false)
      }
    })()
    return () => {
      active = false
    }
  }, [id])

  const stats = useMemo(() => {
    const now = new Date()
    const todayKey = toDateKey(now)
    const nonCancelled = bookings.filter((booking) => booking.status !== "cancelled")
    const completed = bookings.filter((booking) => booking.status === "completed")
    const completedThisMonth = completed.filter((booking) => {
      const start = bookingStart(booking)
      return start.getMonth() === now.getMonth() && start.getFullYear() === now.getFullYear()
    })
    const amountMade = completed.reduce((sum, booking) => sum + booking.price, 0)
    const currency = bookings[0]?.currency || service?.currency || "USD"
    const today = nonCancelled.filter((booking) => booking.dateKey === todayKey)
    const completionRate = nonCancelled.length > 0 ? Math.round((completed.length / nonCancelled.length) * 100) : 0

    return [
      { label: "Amount made", value: formatPrice(amountMade, currency) },
      { label: "Today's Shifts", value: String(today.length) },
      { label: "Completed This Month", value: String(completedThisMonth.length) },
      { label: "Active Staff", value: String(activeStaffCount) },
      { label: "Service Completion Rate", value: `${completionRate}%` },
    ]
  }, [bookings, activeStaffCount, service])

  const sorted = useMemo(
    () => [...bookings].sort((a, b) => bookingStart(b).getTime() - bookingStart(a).getTime()),
    [bookings],
  )

  const visibleRows = search
    ? sorted.filter((booking) => {
        const term = search.toLowerCase()
        return (
          booking.clientName.toLowerCase().includes(term) ||
          booking.professionalName.toLowerCase().includes(term) ||
          format(bookingStart(booking), "MMM d, yyyy").toLowerCase().includes(term)
        )
      })
    : sorted

  if (loading) {
    return (
      <div className="p-5 space-y-6 sm:p-8">
        <Skeleton className="h-10 w-60" />
        <div className="space-y-4">
          <Skeleton className="h-32 rounded-3xl" />
          <Skeleton className="h-32 rounded-3xl" />
        </div>
      </div>
    )
  }

  if (!service) {
    return (
      <div className="p-5 sm:p-8">
        <p className="rounded-3xl border border-dashed border-[#e5ecf5] p-10 text-center text-sm text-[#657080]">
          Service not found.
        </p>
      </div>
    )
  }

  return (
    <div className="p-5 sm:p-8">
      <button
        type="button"
        onClick={() => navigate(Routes.app.agency.telehealth)}
        className="mb-6 flex w-fit items-center gap-1 rounded-full border border-[#e2e2e2] px-4 py-2 text-sm font-medium text-[#151922] hover:bg-[#f2f6f8]"
      >
        <ChevronLeft className="size-4" />
        Back
      </button>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-[#151922]">{service.title}</h1>
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#8a8f98]" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="client, keywords, or date"
            className="pl-9"
          />
        </div>
      </div>

      <section className="mt-6">
        <h2 className="mb-3 text-sm font-semibold text-[#151922]">Overview</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
          {stats.map((stat) => (
            <OverviewCard key={stat.label} value={stat.value} label={stat.label} />
          ))}
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-semibold text-[#151922]">Schedule</h2>

        {visibleRows.length === 0 ? (
          <p className="mt-6 rounded-3xl border border-dashed border-[#e5ecf5] p-10 text-center text-sm text-[#657080]">
            No bookings yet.
          </p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-180 border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-[#eef1f3] text-[#8a8f98]">
                  <th className="py-3 pr-4 font-medium">Date</th>
                  <th className="py-3 pr-4 font-medium">Time</th>
                  <th className="py-3 pr-4 font-medium">Client</th>
                  <th className="py-3 pr-4 font-medium">Care Professional</th>
                  <th className="py-3 pr-4 font-medium">Duration</th>
                  <th className="py-3 pr-4 font-medium">PA Rate</th>
                  <th className="py-3 pr-4 font-medium text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {visibleRows.map((booking) => {
                  const rowStatus = rowStatusFor(booking)
                  const pill = ROW_STATUS_PILL[rowStatus]

                  return (
                    <tr key={booking.id} className="border-b border-[#f2f5f8] last:border-0">
                      <td className="py-4 pr-4 whitespace-nowrap text-[#151922]">{format(bookingStart(booking), "EEE, d MMM")}</td>
                      <td className="py-4 pr-4 whitespace-nowrap text-[#151922]">{minutesToLabel(booking.startMinutes)}</td>
                      <td className="py-4 pr-4 whitespace-nowrap text-[#151922]">{booking.clientName}</td>
                      <td className="py-4 pr-4 whitespace-nowrap">
                        {booking.professionalUid ? (
                          <Link to={Routes.app.agency.viewProfile(booking.professionalUid)} className="font-semibold text-[#151922] underline">
                            {booking.professionalName}
                          </Link>
                        ) : (
                          <span className="text-[#151922]">{booking.professionalName}</span>
                        )}
                      </td>
                      <td className="py-4 pr-4 whitespace-nowrap text-[#151922]">{formatDurationLabel(booking.durationMinutes)}</td>
                      <td className="py-4 pr-4 whitespace-nowrap">
                        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${pill.className}`}>{pill.label}</span>
                      </td>
                      <td className="py-4 pr-4 whitespace-nowrap text-right">
                        <BookingRowAction booking={booking} rowStatus={rowStatus} isProfessional onDetails={setDetailsBooking} />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <BookingDetailsDialog
        booking={detailsBooking}
        onOpenChange={(open) => !open && setDetailsBooking(null)}
        canManage
        onStatusChanged={(updated) =>
          setBookings((current) => current.map((booking) => (booking.id === updated.id ? updated : booking)))
        }
      />
    </div>
  )
}
