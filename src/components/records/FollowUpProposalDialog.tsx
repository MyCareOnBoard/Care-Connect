import { useEffect, useState } from "react"
import { toast } from "sonner"
import { Info } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { SlotPicker } from "@/components/booking/SlotPicker"
import { getAuthErrorMessage } from "@/utils/auth"
import { listServices } from "@/utils/careconnect/services/telehealthService"
import { proposeFollowUp } from "@/utils/careconnect/services/clinicalService"
import {
  SERVICE_MODE_LABELS,
  type FollowUp,
  type ServiceMode,
  type TelehealthBooking,
  type TelehealthService,
} from "@/utils/careconnect/types"

/**
 * The professional proposes another visit after one they delivered.
 *
 * Slots come from the shared `SlotPicker`, so this respects exactly the same
 * availability maths the client's booking flow does — and the server revalidates
 * the slot again on acceptance.
 *
 * Note the price: the professional chooses WHETHER to charge, not how much. The
 * amount belongs to the service, and the request body carries no price at all.
 */
export function FollowUpProposalDialog({
  booking,
  open,
  onOpenChange,
  onProposed,
}: {
  booking: TelehealthBooking | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onProposed?: (followUp: FollowUp) => void
}) {
  const [loading, setLoading] = useState(false)
  const [services, setServices] = useState<TelehealthService[]>([])
  const [serviceId, setServiceId] = useState<string>("")
  const [dateKey, setDateKey] = useState("")
  const [startMinutes, setStartMinutes] = useState<number | null>(null)
  const [mode, setMode] = useState<ServiceMode>("online")
  const [paid, setPaid] = useState(false)
  const [message, setMessage] = useState("")
  const [submitting, setSubmitting] = useState(false)

  const posterId = booking?.posterId ?? null
  // The booking already names the right roster row. Using it avoids the
  // ambiguity of `GET /careconnectTeam/me` for a professional on two rosters.
  const teamMemberId = booking?.teamMemberId ?? null

  useEffect(() => {
    if (!open || !posterId) return
    let active = true
    setLoading(true)
    setDateKey("")
    setStartMinutes(null)
    setPaid(false)
    setMessage("")
    listServices({ posterId })
      .then((all) => {
        if (!active) return
        // Only services this professional is actually assigned to deliver.
        const mine = all.filter(
          (service) =>
            service.status === "active" &&
            (!teamMemberId || service.teamMemberIds.includes(teamMemberId)),
        )
        setServices(mine)
        const preferred =
          mine.find((service) => service.id === booking?.serviceId) ?? mine[0] ?? null
        setServiceId(preferred?.id ?? "")
        setMode(preferred?.modes[0] ?? "online")
      })
      .catch(() => {
        if (active) setServices([])
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
    // Primitives only: `booking` is recreated by its host on every render.
  }, [open, posterId, teamMemberId, booking?.serviceId])

  const service = services.find((item) => item.id === serviceId) ?? null

  const submit = async () => {
    if (!booking || !service || startMinutes == null || !dateKey) return
    setSubmitting(true)
    try {
      const followUp = await proposeFollowUp({
        sourceBookingId: booking.id,
        serviceId: service.id,
        dateKey,
        startMinutes,
        mode,
        paid,
        message,
      })
      onProposed?.(followUp)
      toast.success("Follow-up proposed")
      onOpenChange(false)
    } catch (error) {
      toast.error(getAuthErrorMessage(error))
    } finally {
      setSubmitting(false)
    }
  }

  if (!booking) return null

  const priceLabel = service
    ? new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: service.currency || "USD",
        maximumFractionDigits: 0,
      }).format(service.price || 0)
    : ""

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton className="p-0 max-w-140">
        <DialogHeader className="px-6 pt-6 text-left">
          <DialogTitle className="text-xl font-semibold text-[#151922]">
            Propose a follow-up
          </DialogTitle>
          <p className="mt-1 text-sm text-[#657080]">
            {booking.clientName} chooses whether to accept.
          </p>
        </DialogHeader>

        <DialogBody className="max-h-[70vh] space-y-5 overflow-y-auto px-6 pt-4 pb-6">
          {loading ? (
            <div className="space-y-4">
              <Skeleton className="h-11 rounded-xl" />
              <Skeleton className="h-24 rounded-xl" />
              <Skeleton className="h-32 rounded-xl" />
            </div>
          ) : services.length === 0 ? (
            <p className="rounded-xl border border-dashed border-[#e5ecf5] p-6 text-center text-sm text-[#657080]">
              You are not assigned to any active services, so there is nothing to propose yet.
            </p>
          ) : (
            <>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-[#151922]">Service</label>
                <Select
                  value={serviceId}
                  onValueChange={(next) => {
                    setServiceId(next)
                    const picked = services.find((item) => item.id === next)
                    if (picked) setMode(picked.modes[0])
                    setStartMinutes(null)
                  }}
                >
                  <SelectTrigger className="h-11 w-full">
                    <SelectValue placeholder="Choose a service" />
                  </SelectTrigger>
                  <SelectContent>
                    {services.map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {service && service.modes.length > 1 && (
                <div>
                  <p className="mb-2 text-sm font-medium text-[#151922]">Session type</p>
                  <div className="grid grid-cols-2 gap-2">
                    {service.modes.map((option) => (
                      <button
                        key={option}
                        type="button"
                        onClick={() => setMode(option)}
                        className={`rounded-xl border px-4 py-2 text-sm font-semibold transition ${
                          mode === option
                            ? "border-[#00b4b8] bg-[#e3f8f8] text-[#00b4b8]"
                            : "border-[#eef1f3] text-[#151922]"
                        }`}
                      >
                        {SERVICE_MODE_LABELS[option]}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {service && (
                <SlotPicker
                  serviceId={service.id}
                  teamMemberId={teamMemberId}
                  startMinutes={startMinutes}
                  onStartMinutesChange={setStartMinutes}
                  onDateKeyChange={setDateKey}
                  helpText="Times you are available"
                />
              )}

              <div>
                <p className="mb-2 text-sm font-medium text-[#151922]">Cost</p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPaid(false)}
                    className={`rounded-xl border px-4 py-2 text-sm font-semibold transition ${
                      !paid
                        ? "border-[#00b4b8] bg-[#e3f8f8] text-[#00b4b8]"
                        : "border-[#eef1f3] text-[#151922]"
                    }`}
                  >
                    Free follow-up
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaid(true)}
                    className={`rounded-xl border px-4 py-2 text-sm font-semibold transition ${
                      paid
                        ? "border-[#00b4b8] bg-[#e3f8f8] text-[#00b4b8]"
                        : "border-[#eef1f3] text-[#151922]"
                    }`}
                  >
                    Charge {priceLabel}
                  </button>
                </div>
                <p className="mt-2 text-sm text-[#657080]">
                  {paid
                    ? `${booking.clientName} will be asked to confirm ${priceLabel} at the service rate. Payment is recorded, not charged here.`
                    : `${booking.clientName} will not be asked to pay.`}
                </p>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-[#151922]">
                  Why you are recommending this
                </label>
                <Textarea
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  placeholder="A short note the client will read with your proposal."
                  className="min-h-24"
                />
              </div>

              <p className="flex items-start gap-2 rounded-xl bg-[#fdf3e3] px-4 py-3 text-sm text-[#8a6d1f]">
                <Info className="mt-0.5 size-4 shrink-0" />
                <span>
                  The slot is held only once the client accepts. If someone books it first, they
                  will be offered other times.
                </span>
              </p>
            </>
          )}
        </DialogBody>

        {!loading && services.length > 0 && (
          <div className="border-t border-[#eef1f3] px-6 py-4">
            <Button
              className="w-full bg-[#00b4b8] text-white hover:opacity-90"
              disabled={!service || startMinutes == null || !dateKey || submitting}
              onClick={submit}
            >
              {submitting ? "Sending..." : "Send proposal"}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
