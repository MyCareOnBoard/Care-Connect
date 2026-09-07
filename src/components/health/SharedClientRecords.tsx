import { useEffect, useMemo, useState } from "react"
import { Link } from "react-router"
import { ChevronRight, Users } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { Routes } from "@/routes/constants"
import { getInitials } from "@/lib/utils"
import { getAuthErrorMessage } from "@/utils/auth"
import { listBookings } from "@/utils/careconnect/services/telehealthService"
import { formatDate, type TelehealthBooking } from "@/utils/careconnect/types"
import { toast } from "sonner"

interface SharedClient {
  clientId: string
  clientName: string
  visitsShared: number
  latestServiceTitle: string
  latestSharedDateKey: string
}

/**
 * One row per client who has attached their health profile to a booking with this
 * professional — the directory a professional needs to find "whose health record did
 * I have again". Each row only ever shows what a booking list already carries (name,
 * service, date); the health details themselves stay a deliberate, per-client PHI read
 * on `ClientRecordsPage`, exactly like the "Health profile" tab there already works.
 */
export function SharedClientRecords() {
  const [bookings, setBookings] = useState<TelehealthBooking[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    listBookings({ scope: "professional" })
      .then((list) => {
        if (active) setBookings(list)
      })
      .catch((error: unknown) => {
        if (active) toast.error(getAuthErrorMessage(error))
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  const clients = useMemo<SharedClient[]>(() => {
    const shared = bookings.filter((booking) => booking.hasIntakeSnapshot)
    const byClient = new Map<string, TelehealthBooking[]>()
    for (const booking of shared) {
      byClient.set(booking.clientId, [...(byClient.get(booking.clientId) ?? []), booking])
    }
    return [...byClient.entries()]
      .map(([clientId, visits]) => {
        const newestFirst = [...visits].sort((a, b) => (a.dateKey < b.dateKey ? 1 : -1))
        return {
          clientId,
          clientName: newestFirst[0].clientName,
          visitsShared: visits.length,
          latestServiceTitle: newestFirst[0].serviceTitle,
          latestSharedDateKey: newestFirst[0].dateKey,
        }
      })
      .sort((a, b) => (a.latestSharedDateKey < b.latestSharedDateKey ? 1 : -1))
  }, [bookings])

  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-20 rounded-2xl" />
        <Skeleton className="h-20 rounded-2xl" />
        <Skeleton className="h-20 rounded-2xl" />
      </div>
    )
  }

  if (clients.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-[#e5ecf5] bg-white p-8 text-center">
        <Users className="mx-auto size-6 text-[#8a8f98]" />
        <p className="mt-3 text-sm font-semibold text-[#151922]">No shared health records yet</p>
        <p className="mx-auto mt-1 max-w-sm text-sm text-[#657080]">
          When a client attaches their health profile to a booking with you, they&apos;ll show up
          here.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {clients.map((client) => (
        <Link
          key={client.clientId}
          to={`${Routes.app.user.clientRecords(client.clientId)}?tab=health`}
          className="flex items-center justify-between gap-3 rounded-2xl border border-[#e5ecf5] bg-white p-4 transition hover:border-[#00b4b8]/40"
        >
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-[#1f2430] text-sm font-semibold text-white">
              {getInitials(client.clientName)}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-[#151922]">{client.clientName}</p>
              <p className="mt-0.5 truncate text-sm text-[#657080]">
                {client.visitsShared} shared visit{client.visitsShared === 1 ? "" : "s"} ·{" "}
                {client.latestServiceTitle}
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2 text-sm text-[#657080]">
            <span>Shared {formatDate(client.latestSharedDateKey)}</span>
            <ChevronRight className="size-4" />
          </div>
        </Link>
      ))}
    </div>
  )
}
