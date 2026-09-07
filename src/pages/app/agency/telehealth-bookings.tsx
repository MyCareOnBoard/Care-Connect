import { useEffect, useMemo, useState } from "react"
import { Link, useNavigate } from "react-router"
import { format } from "date-fns"
import { ChevronLeft, ChevronRight, Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Routes } from "@/routes/constants"
import { listBookings, listMyServices } from "@/utils/careconnect/services/telehealthService"
import { listMyTeam } from "@/utils/careconnect/services/teamService"
import { minutesToLabel, toDateKey, type TelehealthBooking, type TelehealthService } from "@/utils/careconnect/types"
import { ROW_STATUS_PILL, bookingStart, formatDurationLabel, rowStatusFor, type RowStatus } from "@/utils/careconnect/bookingStatus"
import { BookingDetailsDialog } from "@/components/professional/BookingDetailsDialog"
import { BookingRowAction } from "@/components/professional/BookingRowAction"

const PAGE_SIZE = 15

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

const STATUS_FILTERS: { value: "all" | RowStatus; label: string }[] = [
  { value: "all", label: "All statuses" },
  { value: "upcoming", label: "Upcoming" },
  { value: "requested", label: "Requested" },
  { value: "in_progress", label: "In-progress" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
]

/**
 * Agency-wide bookings + analytics across every service, one level up from
 * `ServiceAnalyticsPage` (which is scoped to a single service). Reached from
 * "Your bookings" on the Telehealth page via the "View all" link.
 */
export default function AgencyTelehealthBookingsPage() {
  const navigate = useNavigate()
  const [bookings, setBookings] = useState<TelehealthBooking[]>([])
  const [services, setServices] = useState<TelehealthService[]>([])
  const [activeStaffCount, setActiveStaffCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [serviceFilter, setServiceFilter] = useState<string>("all")
  const [statusFilter, setStatusFilter] = useState<"all" | RowStatus>("all")
  const [page, setPage] = useState(1)
  const [detailsBooking, setDetailsBooking] = useState<TelehealthBooking | null>(null)

  useEffect(() => {
    let active = true
    ;(async () => {
      setLoading(true)
      try {
        const [allBookings, myServices, team] = await Promise.all([
          listBookings({ scope: "agency" }).catch(() => []),
          listMyServices().catch(() => []),
          listMyTeam().catch(() => []),
        ])
        if (!active) return
        setBookings(allBookings)
        setServices(myServices)
        setActiveStaffCount(team.filter((member) => member.status === "active").length)
      } finally {
        if (active) setLoading(false)
      }
    })()
    return () => {
      active = false
    }
  }, [])

  // Back to page 1 whenever a filter narrows (or widens) what's being paged through.
  useEffect(() => {
    setPage(1)
  }, [search, serviceFilter, statusFilter])

  const serviceTitleById = useMemo(() => new Map(services.map((service) => [service.id, service.title])), [services])

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
    const currency = bookings[0]?.currency || "USD"
    const today = nonCancelled.filter((booking) => booking.dateKey === todayKey)
    const completionRate = nonCancelled.length > 0 ? Math.round((completed.length / nonCancelled.length) * 100) : 0

    return [
      { label: "Total bookings", value: String(bookings.length) },
      { label: "Amount made", value: formatPrice(amountMade, currency) },
      { label: "Today's Shifts", value: String(today.length) },
      { label: "Completed This Month", value: String(completedThisMonth.length) },
      { label: "Active Staff", value: String(activeStaffCount) },
      { label: "Completion Rate", value: `${completionRate}%` },
    ]
  }, [bookings, activeStaffCount])

  const sorted = useMemo(
    () => [...bookings].sort((a, b) => bookingStart(b).getTime() - bookingStart(a).getTime()),
    [bookings],
  )

  const filtered = sorted
    .filter((booking) => serviceFilter === "all" || booking.serviceId === serviceFilter)
    .filter((booking) => statusFilter === "all" || rowStatusFor(booking) === statusFilter)
    .filter((booking) => {
      if (!search) return true
      const term = search.toLowerCase()
      return (
        booking.clientName.toLowerCase().includes(term) ||
        booking.professionalName.toLowerCase().includes(term) ||
        booking.serviceTitle.toLowerCase().includes(term) ||
        format(bookingStart(booking), "MMM d, yyyy").toLowerCase().includes(term)
      )
    })

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const visibleRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

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
        <h1 className="text-2xl font-bold text-[#151922]">All bookings</h1>
        <div className="flex flex-1 flex-wrap items-center justify-end gap-3">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#8a8f98]" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Client, professional, service, or date"
              className="pl-9"
            />
          </div>
          <Select value={serviceFilter} onValueChange={setServiceFilter}>
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All services</SelectItem>
              {services.map((service) => (
                <SelectItem key={service.id} value={service.id}>
                  {service.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as "all" | RowStatus)}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_FILTERS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <section className="mt-6">
        <h2 className="mb-3 text-sm font-semibold text-[#151922]">Overview</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
          {stats.map((stat) => (
            <OverviewCard key={stat.label} value={stat.value} label={stat.label} />
          ))}
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-semibold text-[#151922]">Bookings</h2>

        {visibleRows.length === 0 ? (
          <p className="mt-6 rounded-3xl border border-dashed border-[#e5ecf5] bg-white p-10 text-center text-sm text-[#657080]">
            {bookings.length === 0 ? "No bookings yet." : "No bookings match your filters."}
          </p>
        ) : (
          <>
            <div className="mt-4 overflow-x-auto rounded-3xl border border-[#e5ecf5] bg-white">
              <table className="w-full min-w-220 border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-[#eef1f3] text-[#8a8f98]">
                    <th className="py-3 pr-4 pl-5 font-medium">Date</th>
                    <th className="py-3 pr-4 font-medium">Time</th>
                    <th className="py-3 pr-4 font-medium">Client</th>
                    <th className="py-3 pr-4 font-medium">Service</th>
                    <th className="py-3 pr-4 font-medium">Care Professional</th>
                    <th className="py-3 pr-4 font-medium">Duration</th>
                    <th className="py-3 pr-4 font-medium">Status</th>
                    <th className="py-3 pr-5 font-medium text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleRows.map((booking) => {
                    const rowStatus = rowStatusFor(booking)
                    const pill = ROW_STATUS_PILL[rowStatus]

                    return (
                      <tr key={booking.id} className="border-b border-[#f2f5f8] last:border-0">
                        <td className="py-4 pr-4 pl-5 whitespace-nowrap text-[#151922]">{format(bookingStart(booking), "EEE, d MMM")}</td>
                        <td className="py-4 pr-4 whitespace-nowrap text-[#151922]">{minutesToLabel(booking.startMinutes)}</td>
                        <td className="py-4 pr-4 whitespace-nowrap text-[#151922]">{booking.clientName}</td>
                        <td className="py-4 pr-4 whitespace-nowrap">
                          <Link
                            to={Routes.app.agency.serviceAnalytics(booking.serviceId)}
                            className="text-[#151922] hover:underline"
                          >
                            {serviceTitleById.get(booking.serviceId) ?? booking.serviceTitle}
                          </Link>
                        </td>
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
                        <td className="py-4 pr-5 whitespace-nowrap text-right">
                          <BookingRowAction booking={booking} rowStatus={rowStatus} isProfessional onDetails={setDetailsBooking} />
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="mt-4 flex items-center justify-between">
                <button
                  type="button"
                  aria-label="Previous page"
                  disabled={page === 1}
                  onClick={() => setPage((current) => current - 1)}
                  className="flex size-9 items-center justify-center rounded-lg border border-[#e5ecf5] bg-white text-[#657080] transition hover:bg-[#f2f6f8] disabled:opacity-30"
                >
                  <ChevronLeft className="size-4" />
                </button>
                <span className="text-xs font-medium text-[#657080]">
                  Page {page} of {totalPages}
                </span>
                <button
                  type="button"
                  aria-label="Next page"
                  disabled={page === totalPages}
                  onClick={() => setPage((current) => current + 1)}
                  className="flex size-9 items-center justify-center rounded-lg border border-[#e5ecf5] bg-white text-[#657080] transition hover:bg-[#f2f6f8] disabled:opacity-30"
                >
                  <ChevronRight className="size-4" />
                </button>
              </div>
            )}
          </>
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
