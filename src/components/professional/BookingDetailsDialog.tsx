import { useEffect, useState } from "react"
import { Link, useNavigate } from "react-router"
import { format } from "date-fns"
import {
  Building2,
  CalendarDays,
  Check,
  Clock,
  Copy,
  Heart,
  Info,
  MapPin,
  MessageSquare,
  Mic,
  MicOff,
  MoreHorizontal,
  PhoneOff,
  ScreenShare,
  UserRound,
  Users,
  Video,
  VideoOff,
} from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Dialog, DialogBody, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useCareFlow } from "@/components/app/useCareFlow"
import { Routes } from "@/routes/constants"
import { cn, getInitials } from "@/lib/utils"
import { getAuthErrorMessage } from "@/utils/auth"
import { getProfile } from "@/utils/careconnect/services/profilesService"
import { updateBookingStatus } from "@/utils/careconnect/services/telehealthService"
import { SERVICE_MODE_LABELS, minutesToLabel, type CareConnectProfile, type TelehealthBooking } from "@/utils/careconnect/types"
import { bookingStart, formatDurationLabel } from "@/utils/careconnect/bookingStatus"

function formatPrice(price: number, currency: string): string {
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 0 }).format(price)
  } catch {
    return `${currency} ${price}`
  }
}

/** "00:30:00" from a seconds count. */
function formatCountdown(totalSeconds: number): string {
  const hrs = Math.floor(totalSeconds / 3600)
  const mins = Math.floor((totalSeconds % 3600) / 60)
  const secs = totalSeconds % 60
  return [hrs, mins, secs].map((n) => String(n).padStart(2, "0")).join(":")
}

/** "08:24" elapsed-call timer from a seconds count. */
function formatCallTimer(totalSeconds: number): string {
  const mins = Math.floor(totalSeconds / 60)
  const secs = totalSeconds % 60
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`
}

type Step = "details" | "location" | "service" | "call" | "completed" | "call-ended" | "tracking-map" | "raise-issue"

type TrackingPhase = "approaching" | "arrived" | "in-progress"

const ISSUE_REASONS = [
  "Professional didn't show up",
  "Service wasn't completed",
  "Quality of care concern",
  "Wrong service provided",
  "Billing concern",
  "Need agency assistance",
  "Other",
] as const

/**
 * Booking details — backs "View"/"Details" actions, plus the onsite/video service flow:
 * - "Join video call" (either role, online-mode bookings) → a mock full-screen call view
 *   (no real video/WebRTC infra exists in this app) → hanging up either completes the
 *   booking (professional) or shows a lightweight "call ended" closure (client).
 * - "Get location" (professional only, in-person bookings) → a mock map (no maps/geocoding
 *   integration exists) → Start service → a local countdown to completion → Complete
 *   service, alongside the existing quick Cancel/Mark-complete shortcut.
 * - Client, in-person bookings → a live-tracking panel (approaching → arrived → in
 *   progress) with its own mock map and a "Raise an issue" side-branch. There's no real
 *   GPS/dispatch integration, so "approaching → arrived" is a short local timer.
 * All status changes call the real backend status endpoint. The countdown/call/tracking
 * timers are local-only — there's no field to persist "service started at", so they reset
 * if the dialog is closed and reopened mid-session.
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
  const navigate = useNavigate()
  const { flow } = useCareFlow()
  const messagesPath = flow === "agency" ? Routes.app.agency.messages : Routes.app.user.messages
  const [pending, setPending] = useState(false)
  const [step, setStep] = useState<Step>("details")
  const [remainingSeconds, setRemainingSeconds] = useState(0)
  const [callSeconds, setCallSeconds] = useState(0)
  const [micOn, setMicOn] = useState(true)
  const [camOn, setCamOn] = useState(true)
  const [professionalProfile, setProfessionalProfile] = useState<CareConnectProfile | null>(null)
  const [agencyProfile, setAgencyProfile] = useState<CareConnectProfile | null>(null)
  const [trackingPhase, setTrackingPhase] = useState<TrackingPhase>("approaching")
  const [trackingProgress, setTrackingProgress] = useState(0)
  const [issueReason, setIssueReason] = useState<string | null>(null)
  const isTerminal = booking?.status === "completed" || booking?.status === "cancelled"
  const totalSeconds = booking ? booking.durationMinutes * 60 : 0
  const isClientInPersonTracking = !canManage && booking?.mode === "in_person" && !isTerminal

  // Reset to the right starting step whenever the dialog opens for a (possibly different) booking.
  useEffect(() => {
    if (!booking) return
    setStep(booking.status === "completed" ? "completed" : "details")
    setRemainingSeconds(booking.durationMinutes * 60)
    setMicOn(true)
    setCamOn(true)
    setProfessionalProfile(null)
    setAgencyProfile(null)
    setTrackingPhase("approaching")
    setTrackingProgress(0)
    setIssueReason(null)
  }, [booking?.id, booking?.status, booking?.durationMinutes])

  // The completion confirmation always credits the professional, and the client's live-tracking
  // panel shows both parties — fetch real photos/titles for those views.
  useEffect(() => {
    const wantsProfessional = step === "completed" || step === "call-ended" || (step === "details" && isClientInPersonTracking)
    if (!wantsProfessional || !booking?.professionalUid) return
    let active = true
    getProfile(booking.professionalUid)
      .then((profile) => {
        if (active) setProfessionalProfile(profile)
      })
      .catch(() => undefined)
    return () => {
      active = false
    }
  }, [step, isClientInPersonTracking, booking?.professionalUid])

  // Agency/hospital card on the client's in-person tracking panel.
  useEffect(() => {
    if (!(step === "details" && isClientInPersonTracking) || !booking?.posterId) return
    let active = true
    getProfile(booking.posterId)
      .then((profile) => {
        if (active) setAgencyProfile(profile)
      })
      .catch(() => undefined)
    return () => {
      active = false
    }
  }, [step, isClientInPersonTracking, booking?.posterId])

  // Mock "professional is approaching" progress — no real GPS/dispatch integration exists,
  // so arrival is simulated with a short local timer instead of live location data.
  useEffect(() => {
    if (!(step === "details" && isClientInPersonTracking) || trackingPhase !== "approaching") return
    const startedAt = Date.now()
    const mockDurationMs = 9000
    const timer = window.setInterval(() => {
      const pct = Math.min(100, ((Date.now() - startedAt) / mockDurationMs) * 100)
      setTrackingProgress(pct)
      if (pct >= 100) {
        window.clearInterval(timer)
        setTrackingPhase("arrived")
      }
    }, 200)
    return () => window.clearInterval(timer)
  }, [step, isClientInPersonTracking, trackingPhase, booking?.id])

  // Local countdown while the service is in progress (professional's own flow, or the
  // client's in-person tracking panel once they've confirmed the service started).
  useEffect(() => {
    const counting = step === "service" || (step === "details" && isClientInPersonTracking && trackingPhase === "in-progress")
    if (!counting) return
    const timer = window.setInterval(() => {
      setRemainingSeconds((seconds) => Math.max(0, seconds - 1))
    }, 1000)
    return () => window.clearInterval(timer)
  }, [step, isClientInPersonTracking, trackingPhase])

  // Elapsed-time counter while the mock video call is active.
  useEffect(() => {
    if (step !== "call") return
    setCallSeconds(0)
    const timer = window.setInterval(() => {
      setCallSeconds((seconds) => seconds + 1)
    }, 1000)
    return () => window.clearInterval(timer)
  }, [step])

  const changeStatus = async (status: "completed" | "cancelled") => {
    if (!booking) return
    setPending(true)
    try {
      const updated = await updateBookingStatus(booking.id, status)
      onStatusChanged?.(updated)
      if (status === "completed") {
        setStep("completed")
      } else {
        toast.success("Booking cancelled")
        onOpenChange(false)
      }
    } catch (error) {
      toast.error(getAuthErrorMessage(error))
    } finally {
      setPending(false)
    }
  }

  const handleHangup = () => {
    if (canManage) {
      void changeStatus("completed")
    } else {
      setStep("call-ended")
    }
  }

  const confirmServiceStarted = () => {
    if (!booking) return
    setRemainingSeconds(booking.durationMinutes * 60)
    setTrackingPhase("in-progress")
  }

  // No "raise an issue" endpoint exists yet — this is a local-only report, clearly
  // separate from the real status-changing actions above.
  const submitIssue = () => {
    if (!issueReason) return
    toast.success("Issue reported. Our support team will reach out shortly.")
    setIssueReason(null)
    setStep("details")
  }

  const goHome = () => {
    onOpenChange(false)
    navigate(Routes.app.user.dashboard)
  }

  const isCallStep = step === "call"

  return (
    <Dialog open={booking != null} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={!isCallStep}
        layout={isCallStep ? "custom" : "center"}
        className={
          isCallStep
            ? "fixed inset-4 z-50 flex flex-col overflow-hidden rounded-3xl bg-[#101318] p-0 shadow-2xl sm:inset-10"
            : step === "tracking-map"
              ? "p-0 max-w-3xl"
              : "p-0 max-w-120"
        }
      >
        {isCallStep ? (
          <DialogTitle className="sr-only">{booking?.serviceTitle} video call</DialogTitle>
        ) : (
          <DialogHeader className="px-6 pt-6 text-left">
            <DialogTitle className="text-xl font-semibold text-[#151922]">
              {step === "tracking-map" ? "Professional location" : booking?.serviceTitle}
            </DialogTitle>
          </DialogHeader>
        )}

        {booking && step === "details" && isClientInPersonTracking && (
          <DialogBody className="px-6 pt-4 pb-6 space-y-4 text-sm">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-[#8a8f98]">Hospital information</p>
              <div className="mt-2 flex items-center justify-between gap-3 rounded-xl border border-[#eef1f3] px-3 py-2.5">
                <div className="flex min-w-0 items-center gap-3">
                  {agencyProfile?.photo ? (
                    <img src={agencyProfile.photo} alt="" className="size-9 shrink-0 rounded-full object-cover" />
                  ) : (
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#e3f8f8] text-xs font-semibold text-[#00898c]">
                      {getInitials(booking.agencyName || "Agency")}
                    </span>
                  )}
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-[#151922]">{booking.agencyName || "Agency"}</p>
                    {agencyProfile?.location && <p className="truncate text-xs text-[#657080]">{agencyProfile.location}</p>}
                  </div>
                </div>
                {booking.posterId && (
                  <Link
                    to={`${messagesPath}?to=${booking.posterId}`}
                    aria-label="Message"
                    className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-[#f2f5f8] text-[#151922] transition-colors hover:bg-[#e5ecf5]"
                  >
                    <MessageSquare className="size-4" />
                  </Link>
                )}
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-[#8a8f98]">Professional information</p>
              <div className="mt-2 flex items-center justify-between gap-3 rounded-xl border border-[#eef1f3] px-3 py-2.5">
                <div className="flex min-w-0 items-center gap-3">
                  {professionalProfile?.photo ? (
                    <img src={professionalProfile.photo} alt="" className="size-9 shrink-0 rounded-full object-cover" />
                  ) : (
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#e3f8f8] text-xs font-semibold text-[#00898c]">
                      {getInitials(booking.professionalName)}
                    </span>
                  )}
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-[#151922]">{booking.professionalName}</p>
                    {(professionalProfile?.profession || professionalProfile?.headline) && (
                      <p className="truncate text-xs text-[#657080]">
                        {[professionalProfile.profession, professionalProfile.headline].filter(Boolean).join(" | ")}
                      </p>
                    )}
                  </div>
                </div>
                {booking.professionalUid && (
                  <Link
                    to={`${messagesPath}?to=${booking.professionalUid}`}
                    aria-label="Message"
                    className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-[#f2f5f8] text-[#151922] transition-colors hover:bg-[#e5ecf5]"
                  >
                    <MessageSquare className="size-4" />
                  </Link>
                )}
              </div>
            </div>

            {trackingPhase === "approaching" && (
              <div className="border-t border-[#eef1f3] pt-4">
                <p className="text-[#8a8f98]">Professional is approaching……</p>
                <div className="mt-2 flex items-baseline justify-between">
                  <span className="text-4xl font-semibold text-[#151922]">{minutesToLabel(booking.startMinutes)}</span>
                  <span className="text-xs text-[#8a8f98]">Estimated arrival</span>
                </div>
                <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-[#eef1f3]">
                  <div className="h-full rounded-full bg-[#00b4b8] transition-all duration-200 ease-linear" style={{ width: `${trackingProgress}%` }} />
                </div>
                <Button
                  type="button"
                  className="mt-4 w-full bg-[#00b4b8] text-white hover:opacity-90"
                  onClick={() => setStep("tracking-map")}
                >
                  View current location
                </Button>
              </div>
            )}

            {trackingPhase === "arrived" && (
              <div className="border-t border-[#eef1f3] pt-4">
                <p className="text-[#8a8f98]">Professional</p>
                <p className="mt-1 text-3xl font-semibold text-[#151922]">Has arrived</p>
                <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-[#00b4b8]" />
                <Button type="button" className="mt-4 w-full bg-[#00b4b8] text-white hover:opacity-90" onClick={confirmServiceStarted}>
                  Confirm service started
                </Button>
              </div>
            )}

            {trackingPhase === "in-progress" && (
              <div className="border-t border-[#eef1f3] pt-4">
                <p className="text-[#8a8f98]">Professional is here……</p>
                <div className="mt-2 flex items-baseline justify-between">
                  <span
                    className={cn(
                      "text-4xl font-semibold tabular-nums",
                      remainingSeconds === 0 ? "text-[#151922]" : remainingSeconds < totalSeconds * 0.2 ? "text-[#d1453b]" : "text-[#151922]",
                    )}
                  >
                    {formatCountdown(remainingSeconds)}
                  </span>
                  <span className="text-xs text-[#8a8f98]">Time remaining</span>
                </div>
                <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-[#eef1f3]">
                  <div
                    className="h-full rounded-full bg-[#00b4b8] transition-all duration-1000 ease-linear"
                    style={{ width: `${totalSeconds > 0 ? ((totalSeconds - remainingSeconds) / totalSeconds) * 100 : 100}%` }}
                  />
                </div>
                {remainingSeconds === 0 && (
                  <p className="mt-3 flex items-start gap-2 rounded-lg bg-[#fdf3e3] px-3 py-2 text-xs text-[#8a6d1f]">
                    <Info className="mt-0.5 size-3.5 shrink-0" />
                    If no updates are made, this service will automatically move to Completed 2 days after the scheduled end time.
                  </p>
                )}
                <div className="mt-4 space-y-2">
                  <Button
                    type="button"
                    disabled={remainingSeconds > 0 || pending}
                    className="w-full bg-[#00b4b8] text-white hover:opacity-90 disabled:bg-[#e2e2e2] disabled:text-[#8a8f98]"
                    onClick={() => changeStatus("completed")}
                  >
                    Confirm service completion
                  </Button>
                  <Button type="button" variant="outline" className="w-full" onClick={() => setStep("raise-issue")}>
                    Raise an issue
                  </Button>
                </div>
              </div>
            )}
          </DialogBody>
        )}

        {booking && step === "details" && !isClientInPersonTracking && (
          <DialogBody className="px-6 pt-4 pb-6 space-y-4 text-sm">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-[#8a8f98]">
                {canManage ? "Client information" : "Care professional information"}
              </p>
              <div className="mt-2 flex items-center justify-between gap-3 rounded-xl border border-[#eef1f3] px-3 py-2.5">
                <div className="flex items-center min-w-0 gap-3">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#e3f8f8] text-xs font-semibold text-[#00898c]">
                    {getInitials(canManage ? booking.clientName : booking.professionalName)}
                  </span>
                  <span className="truncate font-semibold text-[#151922]">
                    {canManage ? booking.clientName : booking.professionalName}
                  </span>
                </div>
                {(() => {
                  const otherUid = canManage ? booking.clientId : booking.professionalUid
                  return otherUid ? (
                    <Link
                      to={`${messagesPath}?to=${otherUid}`}
                      aria-label="Message"
                      className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-[#f2f5f8] text-[#151922] transition-colors hover:bg-[#e5ecf5]"
                    >
                      <MessageSquare className="size-4" />
                    </Link>
                  ) : null
                })()}
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-[#8a8f98]">Service details</p>
              <div className="mt-2 space-y-3">
                <div>
                  <p className="mb-1 text-[#657080]">Service date</p>
                  <div className="flex items-center justify-between rounded-xl border border-[#eef1f3] px-3 py-2.5">
                    <span className="font-medium text-[#151922]">{format(bookingStart(booking), "MMMM d, yyyy")}</span>
                    <CalendarDays className="size-4 text-[#8a8f98]" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="mb-1 text-[#657080]">Start time</p>
                    <div className="flex items-center justify-between rounded-xl border border-[#eef1f3] px-3 py-2.5">
                      <span className="font-medium text-[#151922]">{minutesToLabel(booking.startMinutes)}</span>
                      <Clock className="size-4 text-[#8a8f98]" />
                    </div>
                  </div>
                  <div>
                    <p className="mb-1 text-[#657080]">End time</p>
                    <div className="flex items-center justify-between rounded-xl border border-[#eef1f3] px-3 py-2.5">
                      <span className="font-medium text-[#151922]">{minutesToLabel(booking.endMinutes)}</span>
                      <Clock className="size-4 text-[#8a8f98]" />
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3 pt-1">
                  <div>
                    <p className="text-[#8a8f98]">Mode</p>
                    <p className="font-semibold text-[#151922]">{SERVICE_MODE_LABELS[booking.mode]}</p>
                  </div>
                  <div>
                    <p className="text-[#8a8f98]">Duration</p>
                    <p className="font-semibold text-[#151922]">{formatDurationLabel(booking.durationMinutes)}</p>
                  </div>
                  <div>
                    <p className="text-[#8a8f98]">Price</p>
                    <p className="font-semibold text-[#151922]">{formatPrice(booking.price, booking.currency)}</p>
                  </div>
                </div>
              </div>
            </div>

            {booking.note && (
              <div>
                <p className="text-[#8a8f98]">Note</p>
                <p className="mt-1 text-[#151922]">{booking.note}</p>
              </div>
            )}

            {!isTerminal && booking.mode === "online" && (
              <div className="border-t border-[#eef1f3] pt-4">
                <Button type="button" className="w-full bg-[#00b4b8] text-white hover:opacity-90" onClick={() => setStep("call")}>
                  Join video call
                </Button>
              </div>
            )}

            {canManage && !isTerminal && booking.mode === "in_person" && (
              <div className="border-t border-[#eef1f3] pt-4">
                <Button type="button" className="w-full bg-[#00b4b8] text-white hover:opacity-90" onClick={() => setStep("location")}>
                  Get location
                </Button>
              </div>
            )}

            {canManage && !isTerminal && (
              <div className="flex justify-end gap-2">
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
                  variant="outline"
                  className="border-[#00b4b8] text-[#00b4b8] hover:bg-[#e3f8f8]"
                  onClick={() => changeStatus("completed")}
                >
                  Mark complete
                </Button>
              </div>
            )}
          </DialogBody>
        )}

        {booking && step === "location" && (
          <DialogBody className="px-6 pt-4 pb-6 space-y-4 text-sm">
            <div>
              <h3 className="text-base font-semibold text-[#151922]">Client location</h3>
              <p className="mt-1 text-[#657080]">Client is waiting on you.</p>
            </div>
            <div className="relative h-64 overflow-hidden rounded-2xl bg-[linear-gradient(135deg,#dff3ee_0%,#eaf4fb_60%,#dbe9f7_100%)]">
              <div
                className="absolute inset-0 opacity-40"
                style={{
                  backgroundImage:
                    "linear-gradient(#c8d8e4 1px, transparent 1px), linear-gradient(90deg, #c8d8e4 1px, transparent 1px)",
                  backgroundSize: "28px 28px",
                }}
              />
              <span className="absolute left-[38%] top-[42%] flex size-9 -translate-x-1/2 -translate-y-full items-center justify-center rounded-full bg-[#00b4b8] text-white shadow-lg">
                <MapPin className="size-5" />
              </span>
              <span className="absolute left-[58%] top-[62%] flex size-9 -translate-x-1/2 -translate-y-full items-center justify-center rounded-full bg-[#151922] text-white shadow-lg">
                <MapPin className="size-5" />
              </span>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setStep("details")}>
                Cancel
              </Button>
              <Button type="button" className="bg-[#00b4b8] text-white hover:opacity-90" onClick={() => setStep("service")}>
                Start service
              </Button>
            </div>
          </DialogBody>
        )}

        {booking && step === "tracking-map" && (
          <DialogBody className="px-6 pt-4 pb-6 space-y-4 text-sm">
            <div className="relative h-80 overflow-hidden rounded-2xl bg-[linear-gradient(135deg,#dff3ee_0%,#eaf4fb_60%,#dbe9f7_100%)] sm:h-96">
              <div
                className="absolute inset-0 opacity-40"
                style={{
                  backgroundImage:
                    "linear-gradient(#c8d8e4 1px, transparent 1px), linear-gradient(90deg, #c8d8e4 1px, transparent 1px)",
                  backgroundSize: "28px 28px",
                }}
              />
              <svg className="absolute inset-0 size-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                <polyline
                  points="30,60 45,45 60,50 75,35"
                  fill="none"
                  stroke="#00b4b8"
                  strokeWidth="1.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  vectorEffect="non-scaling-stroke"
                />
              </svg>
              <span className="absolute left-[30%] top-[60%] flex size-9 -translate-x-1/2 -translate-y-full items-center justify-center rounded-full bg-[#00b4b8] text-white shadow-lg">
                <UserRound className="size-5" />
              </span>
              <span className="absolute left-[75%] top-[35%] flex size-9 -translate-x-1/2 -translate-y-full items-center justify-center rounded-full bg-[#151922] text-white shadow-lg">
                <Building2 className="size-5" />
              </span>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setStep("details")}>
                Cancel
              </Button>
              <Button
                type="button"
                disabled={trackingPhase !== "arrived"}
                className="bg-[#00b4b8] text-white hover:opacity-90 disabled:bg-[#e2e2e2] disabled:text-[#8a8f98]"
                onClick={() => {
                  confirmServiceStarted()
                  setStep("details")
                }}
              >
                Confirm service started
              </Button>
            </div>
          </DialogBody>
        )}

        {booking && step === "raise-issue" && (
          <DialogBody className="px-6 pt-4 pb-6 text-sm">
            <div className="space-y-1">
              {ISSUE_REASONS.map((reason) => (
                <button
                  key={reason}
                  type="button"
                  onClick={() => setIssueReason(reason)}
                  className="flex w-full items-center gap-3 rounded-lg px-1 py-2 text-left hover:bg-[#f7fafc]"
                >
                  {issueReason === reason ? (
                    <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-[#10ad58] text-white">
                      <Check className="size-3.5 stroke-3" />
                    </span>
                  ) : (
                    <span className="size-5 shrink-0 rounded-full border-2 border-[#00b4b8]" />
                  )}
                  <span className="text-[#151922]">{reason}</span>
                </button>
              ))}
            </div>
            <Button
              type="button"
              disabled={!issueReason}
              className="mt-4 w-full bg-[#00b4b8] text-white hover:opacity-90 disabled:bg-[#e2e2e2] disabled:text-[#8a8f98]"
              onClick={submitIssue}
            >
              Raise issue
            </Button>
          </DialogBody>
        )}

        {booking && step === "service" && (
          <DialogBody className="px-6 pt-4 pb-6 space-y-5 text-sm">
            <div>
              <p className="text-[#8a8f98]">Client information</p>
              <div className="mt-2 flex items-center gap-3 rounded-xl border border-[#eef1f3] px-3 py-2.5">
                <span className="flex size-9 items-center justify-center rounded-full bg-[#e3f8f8] text-xs font-semibold text-[#00898c]">
                  {getInitials(booking.clientName)}
                </span>
                <span className="font-semibold text-[#151922]">{booking.clientName}</span>
              </div>
            </div>

            <div>
              <p className="text-[#8a8f98]">Service time countdown</p>
              <div className="flex items-baseline justify-between mt-2">
                <span
                  className={cn(
                    "text-4xl font-semibold tabular-nums",
                    remainingSeconds === 0
                      ? "text-[#10ad58]"
                      : remainingSeconds < totalSeconds * 0.2
                        ? "text-[#d97a2b]"
                        : "text-[#151922]",
                  )}
                >
                  {formatCountdown(remainingSeconds)}
                </span>
                <span className="text-xs text-[#8a8f98]">Time remaining</span>
              </div>
              <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-[#eef1f3]">
                <div
                  className="h-full rounded-full bg-[#00b4b8] transition-all duration-1000 ease-linear"
                  style={{
                    width: `${totalSeconds > 0 ? ((totalSeconds - remainingSeconds) / totalSeconds) * 100 : 100}%`,
                  }}
                />
              </div>
            </div>

            <Button
              type="button"
              disabled={remainingSeconds > 0 || pending}
              className="w-full bg-[#00b4b8] text-white hover:opacity-90 disabled:bg-[#e2e2e2] disabled:text-[#8a8f98]"
              onClick={() => changeStatus("completed")}
            >
              Complete service
            </Button>
          </DialogBody>
        )}

        {booking && isCallStep && (
          <>
            <div className="relative flex-1 overflow-hidden">
              <div className="absolute inset-0 flex items-center justify-center bg-[linear-gradient(135deg,#1f2430_0%,#0c0e12_100%)]">
                <UserRound className="size-32 text-white/10" />
              </div>
              <div className="absolute left-4 top-4 flex flex-col gap-0.5 rounded-lg bg-black/30 px-3 py-1.5 text-white backdrop-blur-sm">
                <span className="text-sm font-semibold">{canManage ? booking.clientName : booking.professionalName}</span>
                <span className="text-xs text-white/70">{formatCallTimer(callSeconds)}</span>
              </div>
              <div className="absolute bottom-4 right-4 flex size-20 items-center justify-center overflow-hidden rounded-xl bg-[#1f2430] ring-2 ring-white/20 sm:size-28">
                <span className="flex size-11 items-center justify-center rounded-full bg-[#00b4b8] text-sm font-semibold text-white">
                  {getInitials(canManage ? booking.professionalName : booking.clientName)}
                </span>
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-3 px-4 py-4 bg-black sm:gap-4">
              <button type="button" className="flex flex-col items-center gap-1 text-xs text-white/70 hover:text-white" onClick={() => toast("Chat isn't available in this demo")}>
                <span className="flex items-center justify-center rounded-full size-11 bg-white/10">
                  <MessageSquare className="size-4" />
                </span>
                Chat
              </button>
              <button type="button" className="flex flex-col items-center gap-1 text-xs text-white/70 hover:text-white" onClick={() => toast("💙")}>
                <span className="flex items-center justify-center rounded-full size-11 bg-white/10">
                  <Heart className="size-4" />
                </span>
                React
              </button>
              <button
                type="button"
                aria-label={micOn ? "Mute microphone" : "Unmute microphone"}
                onClick={() => setMicOn((current) => !current)}
                className={cn(
                  "flex size-11 items-center justify-center rounded-full transition-colors",
                  micOn ? "bg-[#00b4b8] text-white" : "bg-white/15 text-white/70",
                )}
              >
                {micOn ? <Mic className="size-4" /> : <MicOff className="size-4" />}
              </button>
              <button
                type="button"
                aria-label={camOn ? "Turn camera off" : "Turn camera on"}
                onClick={() => setCamOn((current) => !current)}
                className={cn(
                  "flex size-11 items-center justify-center rounded-full transition-colors",
                  camOn ? "bg-[#00b4b8] text-white" : "bg-white/15 text-white/70",
                )}
              >
                {camOn ? <Video className="size-4" /> : <VideoOff className="size-4" />}
              </button>
              <button type="button" aria-label="More options" className="flex items-center justify-center text-white rounded-full size-11 bg-white/10 hover:bg-white/20">
                <MoreHorizontal className="size-4" />
              </button>
              <button
                type="button"
                aria-label="End call"
                onClick={handleHangup}
                disabled={pending}
                className="flex size-11 items-center justify-center rounded-full bg-[#ff3e66] text-white transition-transform hover:scale-105 active:scale-95"
              >
                <PhoneOff className="size-4" />
              </button>
              <button type="button" className="flex flex-col items-center gap-1 text-xs text-white/70 hover:text-white" onClick={() => toast("Screen sharing isn't available in this demo")}>
                <span className="flex items-center justify-center rounded-full size-11 bg-white/10">
                  <ScreenShare className="size-4" />
                </span>
                Share screen
              </button>
              <button type="button" className="flex flex-col items-center gap-1 text-xs text-white/70 hover:text-white" onClick={() => toast("Just the two of you on this call")}>
                <span className="flex items-center justify-center rounded-full size-11 bg-white/10">
                  <Users className="size-4" />
                </span>
                Participants
              </button>
              <button type="button" className="flex flex-col items-center gap-1 text-xs text-white/70 hover:text-white" onClick={() => toast("Nothing more here yet")}>
                <span className="flex items-center justify-center rounded-full size-11 bg-white/10">
                  <MoreHorizontal className="size-4" />
                </span>
                More
              </button>
            </div>
          </>
        )}

        {booking && (step === "completed" || step === "call-ended") && (
          <DialogBody className="px-6 pt-4 pb-6">
            <div className="flex items-center gap-3 border-b border-[#eef1f3] pb-4">
              {professionalProfile?.photo ? (
                <img src={professionalProfile.photo} alt="" className="object-cover rounded-full size-12 shrink-0" />
              ) : (
                <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-[#e3f8f8] text-sm font-semibold text-[#00898c]">
                  {getInitials(booking.professionalName)}
                </span>
              )}
              <div className="min-w-0">
                <p className="truncate font-semibold text-[#151922]">{booking.professionalName}</p>
                {(professionalProfile?.profession || professionalProfile?.headline) && (
                  <p className="truncate text-xs text-[#657080]">
                    {[professionalProfile.profession, professionalProfile.headline].filter(Boolean).join(" | ")}
                  </p>
                )}
              </div>
            </div>

            <div className="flex flex-col items-center py-4 text-center">
              <Check className="size-10 stroke-3 text-[#d97a2b] animate-check-pop" />
              <div className="mt-4 flex items-center gap-2 rounded-lg border border-[#eef1f3] px-3 py-1.5 text-sm font-semibold text-[#151922]">
                {booking.bookingCode}
                <button
                  type="button"
                  aria-label="Copy booking code"
                  onClick={() => navigator.clipboard?.writeText(booking.bookingCode).catch(() => undefined)}
                >
                  <Copy className="size-4 text-[#8a8f98]" />
                </button>
              </div>
              <h3 className="mt-4 text-xl font-semibold text-[#151922]">Service completed</h3>
              <p className="mt-2 text-sm text-[#656f80]">Your appointment has been completed. Please help us confirm</p>
              <Button className="mt-6 w-full bg-[#00b4b8] text-white hover:opacity-90" onClick={goHome}>
                Confirm completion
              </Button>
            </div>
          </DialogBody>
        )}
      </DialogContent>
    </Dialog>
  )
}
