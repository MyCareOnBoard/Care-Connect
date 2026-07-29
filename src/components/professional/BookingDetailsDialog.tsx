import { useState } from "react"
import { format } from "date-fns"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Dialog, DialogBody, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { getAuthErrorMessage } from "@/utils/auth"
import { updateBookingStatus } from "@/utils/careconnect/services/telehealthService"
import { BOOKING_STATUS_LABELS, SERVICE_MODE_LABELS, minutesToLabel, type TelehealthBooking } from "@/utils/careconnect/types"
import { bookingStart, formatDurationLabel } from "@/utils/careconnect/bookingStatus"

function formatPrice(price: number, currency: string): string {
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 0 }).format(price)
  } catch {
    return `${currency} ${price}`
  }
}

/**
 * Booking details — backs "View"/"Details" actions. When `canManage` is set (the
 * owning agency or assigned professional), it also offers Cancel / Mark-complete,
 * which call the backend status endpoint and report the updated booking upward.
 */
export function BookingDetailsDialog({
  booking,
  onOpenChange,
  canManage = false,
  onStatusChanged,
}: {
  booking: TelehealthBooking | null
  onOpenChange: (open: boolean) => void
  canManage?: boolean
  onStatusChanged?: (updated: TelehealthBooking) => void
}) {
  const [pending, setPending] = useState(false)
  const isTerminal = booking?.status === "completed" || booking?.status === "cancelled"

  const changeStatus = async (status: "completed" | "cancelled") => {
    if (!booking) return
    setPending(true)
    try {
      const updated = await updateBookingStatus(booking.id, status)
      onStatusChanged?.(updated)
      toast.success(status === "completed" ? "Booking marked complete" : "Booking cancelled")
      onOpenChange(false)
    } catch (error) {
      toast.error(getAuthErrorMessage(error))
    } finally {
      setPending(false)
    }
  }

  return (
    <Dialog open={booking != null} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton className="p-0 max-w-120">
        <DialogHeader className="px-6 pt-6 text-left">
          <DialogTitle className="text-xl font-semibold text-[#151922]">{booking?.serviceTitle}</DialogTitle>
        </DialogHeader>
        {booking && (
          <DialogBody className="px-6 pt-4 pb-6 space-y-4 text-sm">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-[#8a8f98]">Client</p>
                <p className="font-semibold text-[#151922]">{booking.clientName}</p>
              </div>
              <div>
                <p className="text-[#8a8f98]">Care professional</p>
                <p className="font-semibold text-[#151922]">{booking.professionalName}</p>
              </div>
              <div>
                <p className="text-[#8a8f98]">Status</p>
                <p className="font-semibold text-[#151922]">{BOOKING_STATUS_LABELS[booking.status]}</p>
              </div>
              <div>
                <p className="text-[#8a8f98]">Date & time</p>
                <p className="font-semibold text-[#151922]">
                  {format(bookingStart(booking), "MMM d, yyyy")} · {minutesToLabel(booking.startMinutes)}
                </p>
              </div>
              <div>
                <p className="text-[#8a8f98]">Duration</p>
                <p className="font-semibold text-[#151922]">{formatDurationLabel(booking.durationMinutes)}</p>
              </div>
              <div>
                <p className="text-[#8a8f98]">Mode</p>
                <p className="font-semibold text-[#151922]">{SERVICE_MODE_LABELS[booking.mode]}</p>
              </div>
              <div>
                <p className="text-[#8a8f98]">Price</p>
                <p className="font-semibold text-[#151922]">{formatPrice(booking.price, booking.currency)}</p>
              </div>
            </div>
            {booking.note && (
              <div>
                <p className="text-[#8a8f98]">Note</p>
                <p className="mt-1 text-[#151922]">{booking.note}</p>
              </div>
            )}

            {canManage && !isTerminal && (
              <div className="flex justify-end gap-2 border-t border-[#eef1f3] pt-4">
                <Button
                  type="button"
                  variant="outline"
                  disabled={pending}
                  className="border-[#ff3e66] text-[#ff3e66] hover:bg-[#fff1f4]"
                  onClick={() => changeStatus("cancelled")}
                >
                  Cancel booking
                </Button>
                <Button
                  type="button"
                  disabled={pending}
                  className="bg-[#00b4b8] text-white hover:opacity-90"
                  onClick={() => changeStatus("completed")}
                >
                  Mark complete
                </Button>
              </div>
            )}
          </DialogBody>
        )}
      </DialogContent>
    </Dialog>
  )
}
