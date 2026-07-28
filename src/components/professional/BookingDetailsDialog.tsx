import { format } from "date-fns"
import { Dialog, DialogBody, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { BOOKING_STATUS_LABELS, SERVICE_MODE_LABELS, minutesToLabel, type TelehealthBooking } from "@/utils/careconnect/types"
import { bookingStart, formatDurationLabel } from "@/utils/careconnect/bookingStatus"

function formatPrice(price: number, currency: string): string {
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 0 }).format(price)
  } catch {
    return `${currency} ${price}`
  }
}

/** Read-only booking details — backs "View"/"Details" actions (no dedicated detail page yet). */
export function BookingDetailsDialog({
  booking,
  onOpenChange,
}: {
  booking: TelehealthBooking | null
  onOpenChange: (open: boolean) => void
}) {
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
          </DialogBody>
        )}
      </DialogContent>
    </Dialog>
  )
}
