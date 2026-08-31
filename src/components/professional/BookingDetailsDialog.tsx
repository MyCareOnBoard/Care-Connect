import { useEffect, useState } from "react"
import { Link, useNavigate } from "react-router"
import { format } from "date-fns"
import { LocationMap } from "@/components/maps/LocationMap"
import { directionsUrl } from "@/components/maps/directions"
import {
  CalendarDays,
  CalendarPlus,
  Check,
  ChevronDown,
  Clock,
  Copy,
  FileText,
  HeartPulse,
  Info,
  MessageSquare,
  Navigation,
  Users,
} from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Dialog, DialogBody, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Switch } from "@/components/ui/switch"
import {
  HealthProfileSummary,
  IntakeConsentBlocked,
} from "@/components/health/HealthProfileSummary"
import { useCareFlow } from "@/components/app/useCareFlow"
import { Routes } from "@/routes/constants"
import { cn, getInitials } from "@/lib/utils"
import { getAuthErrorMessage } from "@/utils/auth"
import { getProfile } from "@/utils/careconnect/services/profilesService"
import {
  getBooking,
  recordVisitEvent,
  reportBookingIssue,
  updateBookingRecordConsent,
  updateBookingStatus,
} from "@/utils/careconnect/services/telehealthService"
import {
  getBookingIntake,
  getConsentPolicies,
} from "@/utils/careconnect/services/clinicalService"
import {
  SERVICE_MODE_LABELS,
  minutesToLabel,
  toDate,
  type CareConnectProfile,
  type HealthProfileSnapshot,
  type TelehealthBooking,
} from "@/utils/careconnect/types"
import { bookingStart, formatDurationLabel, videoJoinWindow } from "@/utils/careconnect/bookingStatus"
import { VideoCallFrame } from "@/components/professional/VideoCallFrame"

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

/**
 * Seconds left in a service that began at a persisted `startedAt`, or null if
 * it hasn't started. Deriving from the stored instant (rather than a local
 * decrement) keeps the countdown correct across dialog close/reopen.
 */
function remainingFromStartedAt(booking: TelehealthBooking | null): number | null {
  const started = toDate(booking?.startedAt)
  if (!booking || !started) return null
  const elapsed = Math.floor((Date.now() - started.getTime()) / 1000)
  return Math.max(0, booking.durationMinutes * 60 - elapsed)
}

type Step = "details" | "location" | "service" | "call" | "completed" | "call-ended" | "tracking-map" | "raise-issue"

type TrackingPhase = "approaching" | "arrived" | "in-progress"

/** How often the client re-reads the booking while waiting for the professional to arrive. */
const ARRIVAL_POLL_MS = 20_000

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
 * - "Join video call" (either role, online-mode bookings) → Daily Prebuilt via
 *   `VideoCallFrame`, joinable only inside the booking's window (see `videoJoinWindow`;
 *   the server enforces the same bounds) → leaving the call either completes the booking
 *   (professional) or shows a lightweight "call ended" closure (client).
 * - "Get location" (professional only, in-person bookings) → the client's real address on a
 *   `LocationMap`, plus a "Get directions" hand-off to the device's maps app → Start service
 *   → a countdown to completion → Complete service, alongside the existing quick
 *   Cancel/Mark-complete shortcut.
 * - Client, in-person bookings → a tracking panel (approaching → arrived → in progress)
 *   with a "Raise an issue" side-branch. The map renders the booking's own coordinates,
 *   and arrival comes from polling the server-stamped `arrivedAt` (`ARRIVAL_POLL_MS`).
 *   What still does not exist is any reporting of the professional's live position, so
 *   the panel shows the destination rather than their whereabouts.
 * - Clinical layer → the frozen intake snapshot (fetched only when asked for, so opening
 *   a booking does not record a PHI read), the visit record, follow-up proposals, and the
 *   client's per-visit record consent. All handed off via optional callbacks, so this
 *   component holds no record state.
 * All status changes call the real backend status endpoint. The service countdown resumes
 * from the persisted `startedAt`.
 */
export function BookingDetailsDialog({
  booking,
  onOpenChange,
  canManage = false,
  onStatusChanged,
  onWriteRecord,
  onProposeFollowUp,
  onViewRecords,
}: {
  booking: TelehealthBooking | null
  onOpenChange: (open: boolean) => void
  canManage?: boolean
  onStatusChanged?: (updated: TelehealthBooking) => void
  /**
   * Clinical-layer hand-offs. All optional, and all callbacks rather than state,
   * so this dialog holds no record state and gains no new `Step` values — the
   * host renders the record and follow-up dialogs as siblings.
   */
  onWriteRecord?: (booking: TelehealthBooking) => void
  onProposeFollowUp?: (booking: TelehealthBooking) => void
  onViewRecords?: (booking: TelehealthBooking) => void
}) {
  const navigate = useNavigate()
  const { flow } = useCareFlow()
  const messagesPath = flow === "agency" ? Routes.app.agency.messages : Routes.app.user.messages
  const [pending, setPending] = useState(false)
  const [step, setStep] = useState<Step>("details")
  const [remainingSeconds, setRemainingSeconds] = useState(0)
  const [professionalProfile, setProfessionalProfile] = useState<CareConnectProfile | null>(null)
  const [agencyProfile, setAgencyProfile] = useState<CareConnectProfile | null>(null)
  const [trackingPhase, setTrackingPhase] = useState<TrackingPhase>("approaching")
  const [issueReason, setIssueReason] = useState<string | null>(null)
  // Intake is fetched only when the professional asks for it, so opening a
  // booking does not record a PHI read nobody wanted.
  const [intakeOpen, setIntakeOpen] = useState(false)
  const [intake, setIntake] = useState<HealthProfileSnapshot | null>(null)
  const [intakeLoading, setIntakeLoading] = useState(false)
  const [intakeDenied, setIntakeDenied] = useState(false)
  const [consentSaving, setConsentSaving] = useState(false)
  const [localConsent, setLocalConsent] = useState<boolean | null>(null)

  // Clear per-booking clinical state when the dialog switches booking.
  useEffect(() => {
    setIntakeOpen(false)
    setIntake(null)
    setIntakeDenied(false)
    setLocalConsent(null)
  }, [booking?.id])
  const isTerminal = booking?.status === "completed" || booking?.status === "cancelled"
  const totalSeconds = booking ? booking.durationMinutes * 60 : 0
  const isClientInPersonTracking = !canManage && booking?.mode === "in_person" && !isTerminal
  // Whether the call is joinable now. The server enforces the same window — this only
  // decides the button's state and its explanation.
  const joinWindow = booking && booking.mode === "online" ? videoJoinWindow(booking) : null
  // Null when the booking has neither coordinates nor an address — older in-person bookings
  // predate the Places autocomplete and may carry nothing to navigate to.
  const locationDirectionsUrl = booking?.location ? directionsUrl(booking.location) : null

  // Reset to the right starting step whenever the dialog opens for a (possibly different) booking.
  useEffect(() => {
    if (!booking) return
    // If the service already started, resume mid-visit from the persisted
    // `startedAt` instead of a fresh full-duration countdown.
    const startedRemaining = remainingFromStartedAt(booking)
    const inProgress = startedRemaining !== null
    const terminal = booking.status === "completed" || booking.status === "cancelled"
    // The professional lands back on their live "service" view; the client resumes
    // the in-progress tracking panel (which lives on the "details" step).
    const resumeService = inProgress && !terminal && canManage && booking.mode === "in_person"
    setStep(booking.status === "completed" ? "completed" : resumeService ? "service" : "details")
    setRemainingSeconds(startedRemaining ?? booking.durationMinutes * 60)
    setProfessionalProfile(null)
    setAgencyProfile(null)
    // Phase comes from the persisted visit timestamps, so reopening the dialog resumes
    // where the visit actually is rather than restarting a simulation.
    setTrackingPhase(inProgress ? "in-progress" : booking.arrivedAt ? "arrived" : "approaching")
    setIssueReason(null)
  }, [booking?.id, booking?.status, booking?.durationMinutes, booking?.startedAt, canManage, booking?.mode])

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

  /**
   * Arrival is reported by the professional (PATCH /:id/visit stamps `arrivedAt`), so the
   * client learns about it by re-reading the booking. Polling while the panel is open is
   * the honest version of what used to be a 9-second local timer that "arrived" on its own
   * regardless of where anyone was.
   */
  useEffect(() => {
    const watching =
      step === "details" && isClientInPersonTracking && trackingPhase === "approaching" && booking?.id
    if (!watching) return
    let active = true
    const poll = async () => {
      try {
        const fresh = await getBooking(booking.id)
        if (!active) return
        if (fresh.arrivedAt || fresh.startedAt) {
          setTrackingPhase(fresh.startedAt ? "in-progress" : "arrived")
          onStatusChanged?.(fresh)
        }
      } catch {
        // Transient failure — the next tick tries again.
      }
    }
    const timer = window.setInterval(poll, ARRIVAL_POLL_MS)
    return () => {
      active = false
      window.clearInterval(timer)
    }
  }, [step, isClientInPersonTracking, trackingPhase, booking?.id, onStatusChanged])

  // Local countdown while the service is in progress (professional's own flow, or the
  // client's in-person tracking panel once they've confirmed the service started).
  useEffect(() => {
    const counting = step === "service" || (step === "details" && isClientInPersonTracking && trackingPhase === "in-progress")
    if (!counting) return
    const timer = window.setInterval(() => {
      // Prefer the persisted start instant; fall back to a local decrement only
      // while the "started" write is still in flight.
      const fromStarted = remainingFromStartedAt(booking)
      setRemainingSeconds((seconds) => (fromStarted !== null ? fromStarted : Math.max(0, seconds - 1)))
    }, 1000)
    return () => window.clearInterval(timer)
  }, [step, isClientInPersonTracking, trackingPhase, booking?.startedAt])

  /** Fetch the frozen intake snapshot on demand. */
  const loadIntake = async () => {
    if (!booking) return
    setIntakeOpen(true)
    if (intake || intakeDenied) return
    setIntakeLoading(true)
    try {
      setIntake(await getBookingIntake(booking.id))
    } catch (error) {
      const status = (error as { response?: { status?: number } })?.response?.status
      // 403 here means the client did not consent for this visit - a choice, not
      // a failure, so it gets an explanatory panel rather than a toast.
      if (status === 403) setIntakeDenied(true)
      else toast.error(getAuthErrorMessage(error))
    } finally {
      setIntakeLoading(false)
    }
  }

  /** The client allows or withdraws record consent for this visit. */
  const toggleRecordConsent = async (next: boolean) => {
    if (!booking) return
    const previous = localConsent ?? booking.recordConsent?.granted === true
    setLocalConsent(next)
    setConsentSaving(true)
    try {
      let policyVersion: string | undefined
      if (next) {
        const policies = await getConsentPolicies()
        policyVersion = policies.record.version
      }
      const updated = await updateBookingRecordConsent(booking.id, next, policyVersion)
      onStatusChanged?.(updated)
      setLocalConsent(updated.recordConsent?.granted === true)
      toast.success(next ? "Visit record allowed" : "Visit record not allowed")
    } catch (error) {
      setLocalConsent(previous)
      toast.error(getAuthErrorMessage(error))
    } finally {
      setConsentSaving(false)
    }
  }

  const changeStatus = async (status: "completed" | "cancelled" | "confirmed") => {
    if (!booking) return
    setPending(true)
    try {
      const updated = await updateBookingStatus(booking.id, status)
      onStatusChanged?.(updated)
      if (status === "completed") {
        setStep("completed")
      } else if (status === "confirmed") {
        toast.success("Booking accepted")
        onOpenChange(false)
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

  /**
   * Professional reports reaching the client. This is the only thing that moves the
   * client's tracking panel off "waiting" — without it the client has no signal at all,
   * which is why the panel used to fake one with a timer.
   */
  const markArrived = async () => {
    if (!booking) return
    setPending(true)
    try {
      const updated = await recordVisitEvent(booking.id, "arrived")
      onStatusChanged?.(updated)
      toast.success("Client notified that you've arrived")
    } catch (error) {
      toast.error(getAuthErrorMessage(error))
    } finally {
      setPending(false)
    }
  }

  // Professional begins the in-person service: persist the start instant (so the
  // countdown survives a reload) then switch to the live service view.
  const startService = async () => {
    if (!booking) return
    setPending(true)
    try {
      const updated = await recordVisitEvent(booking.id, "started")
      onStatusChanged?.(updated)
      setStep("service")
    } catch (error) {
      toast.error(getAuthErrorMessage(error))
    } finally {
      setPending(false)
    }
  }

  // Client-side acknowledgement that the service has begun. The authoritative
  // start instant comes from the professional's `startedAt`; this is only a
  // local advance for when that write hasn't propagated to the client yet.
  const confirmServiceStarted = () => {
    if (!booking) return
    setRemainingSeconds(remainingFromStartedAt(booking) ?? booking.durationMinutes * 60)
    setTrackingPhase("in-progress")
  }

  const submitIssue = async () => {
    if (!booking || !issueReason) return
    setPending(true)
    try {
      await reportBookingIssue(booking.id, issueReason)
      toast.success("Issue reported. Our support team will reach out shortly.")
      setIssueReason(null)
      setStep("details")
    } catch (error) {
      toast.error(getAuthErrorMessage(error))
    } finally {
      setPending(false)
    }
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
                {/* The scheduled time, labelled as such. Nothing tracks the professional's
                    position, so this must not be dressed up as a live estimate. */}
                <p className="text-[#8a8f98]">Waiting for your professional to arrive</p>
                <div className="mt-2 flex items-baseline justify-between">
                  <span className="text-4xl font-semibold text-[#151922]">{minutesToLabel(booking.startMinutes)}</span>
                  <span className="text-xs text-[#8a8f98]">Scheduled start</span>
                </div>
                <p className="mt-2 text-xs text-[#8a8f98]">
                  You&apos;ll see this update as soon as they mark themselves arrived.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  className="mt-4 w-full border-[#00b4b8] text-[#00b4b8] hover:bg-[#e3f8f8]"
                  onClick={() => setStep("tracking-map")}
                >
                  View meeting location
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

            {!isTerminal && booking.mode === "online" && joinWindow && (
              <div className="border-t border-[#eef1f3] pt-4">
                <Button
                  type="button"
                  disabled={joinWindow.state !== "open"}
                  className="w-full bg-[#00b4b8] text-white hover:opacity-90 disabled:bg-[#e2e2e2] disabled:text-[#8a8f98]"
                  onClick={() => setStep("call")}
                >
                  Join video call
                </Button>
                {/* Say why it's unavailable rather than leaving a dead button. */}
                {joinWindow.state === "too_early" && (
                  <p className="mt-2 text-center text-xs text-[#8a8f98]">
                    Available from {format(joinWindow.opensAt, "h:mm a")} on{" "}
                    {format(joinWindow.opensAt, "MMM d")}
                  </p>
                )}
                {joinWindow.state === "ended" && (
                  <p className="mt-2 text-center text-xs text-[#8a8f98]">This session has ended.</p>
                )}
              </div>
            )}

            {/* ── Clinical layer ─────────────────────────────────────────
                All hand-offs are callbacks, so this dialog stays free of record
                state and keeps its existing step machine untouched. */}
            {canManage && booking.hasIntakeSnapshot && (
              <div className="border-t border-[#eef1f3] pt-4">
                <button
                  type="button"
                  onClick={() => (intakeOpen ? setIntakeOpen(false) : void loadIntake())}
                  className="flex w-full items-center justify-between gap-2 text-left"
                >
                  <span className="flex items-center gap-2 text-sm font-semibold text-[#151922]">
                    <HeartPulse className="size-4 text-[#00898c]" />
                    Health details the client shared
                  </span>
                  <ChevronDown
                    className={cn(
                      "size-4 shrink-0 text-[#8a8f98] transition-transform",
                      intakeOpen && "rotate-180",
                    )}
                  />
                </button>
                {intakeOpen && (
                  <div className="mt-3">
                    {intakeDenied ? (
                      <IntakeConsentBlocked />
                    ) : (
                      <HealthProfileSummary
                        profile={intake}
                        loading={intakeLoading}
                        capturedFor={booking.dateKey}
                        emptyMessage="The client attached their profile but it has no details in it."
                      />
                    )}
                  </div>
                )}
              </div>
            )}

            {canManage && (
              <div className="space-y-3 border-t border-[#eef1f3] pt-4">
                {booking.status === "completed" ? (
                  booking.recordConsent?.granted === true ? (
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full border-[#00b4b8] text-[#00b4b8] hover:bg-[#e3f8f8]"
                      onClick={() => onWriteRecord?.(booking)}
                    >
                      <FileText className="size-4" />
                      {booking.hasRecord ? "Open visit record" : "Write visit record"}
                    </Button>
                  ) : (
                    <p className="flex items-start gap-2 rounded-xl bg-[#fdf3e3] px-4 py-3 text-sm text-[#8a6d1f]">
                      <Info className="mt-0.5 size-4 shrink-0" />
                      <span>
                        {booking.clientName} has not consented to a visit record for this
                        appointment, so one cannot be written. They can allow it from their booking.
                      </span>
                    </p>
                  )
                ) : null}

                {booking.status === "completed" && onProposeFollowUp && (
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={() => onProposeFollowUp(booking)}
                  >
                    <CalendarPlus className="size-4" />
                    Propose a follow-up
                  </Button>
                )}

                {onViewRecords && (
                  <button
                    type="button"
                    onClick={() => onViewRecords(booking)}
                    className="flex w-full items-center justify-center gap-1.5 text-sm font-semibold text-[#00898c] hover:opacity-80"
                  >
                    <Users className="size-4" />
                    All records for {booking.clientName}
                  </button>
                )}
              </div>
            )}

            {/* The client's own control over this visit's record. Locked once a
                record has been signed - that consent authorized documenting a
                visit that happened, and the honest remedy is record sharing. */}
            {!canManage && !booking.hasRecord && (
              <div className="border-t border-[#eef1f3] pt-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-[#151922]">Visit record</p>
                    <p className="mt-1 text-sm text-[#657080]">
                      Let {booking.professionalName} write a record of this visit.
                    </p>
                  </div>
                  <Switch
                    checked={localConsent ?? booking.recordConsent?.granted === true}
                    disabled={consentSaving}
                    onCheckedChange={toggleRecordConsent}
                    aria-label="Allow a visit record for this booking"
                  />
                </div>
              </div>
            )}

            {!canManage && booking.hasRecord && (
              <div className="border-t border-[#eef1f3] pt-4">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => onViewRecords?.(booking)}
                  disabled={!onViewRecords}
                >
                  <FileText className="size-4" />
                  View visit record
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
                  {booking.status === "requested" ? "Decline" : "Cancel booking"}
                </Button>
                {booking.status === "requested" ? (
                  <Button
                    type="button"
                    disabled={pending}
                    className="bg-[#00b4b8] text-white hover:opacity-90"
                    onClick={() => changeStatus("confirmed")}
                  >
                    Accept
                  </Button>
                ) : (
                  <Button
                    type="button"
                    disabled={pending}
                    variant="outline"
                    className="border-[#00b4b8] text-[#00b4b8] hover:bg-[#e3f8f8]"
                    onClick={() => changeStatus("completed")}
                  >
                    Mark complete
                  </Button>
                )}
              </div>
            )}
          </DialogBody>
        )}

        {booking && step === "location" && (
          <DialogBody className="px-6 pt-4 pb-6 space-y-4 text-sm">
            <div>
              <h3 className="text-base font-semibold text-[#151922]">Client location</h3>
              <p className="mt-1 text-[#657080]">{booking.location?.address || "No address provided."}</p>
            </div>
            <LocationMap
              address={booking.location?.address}
              lat={booking.location?.lat}
              lng={booking.location?.lng}
              className="h-64 w-full overflow-hidden rounded-2xl"
            />
            {/* The embedded map is display-only (no UI controls, cooperative gestures), so
                actually travelling there means handing off to the device's maps app. */}
            {locationDirectionsUrl && (
              <a
                href={locationDirectionsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-[#00b4b8] text-sm font-semibold text-[#00b4b8] transition hover:bg-[#e3f8f8]"
              >
                <Navigation className="size-4" />
                Get directions
              </a>
            )}
            <div className="flex flex-wrap justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setStep("details")}>
                Cancel
              </Button>
              {/* Distinct from Start service: arrival is what the client is waiting to see,
                  and it often happens minutes before the visit actually begins. */}
              <Button
                type="button"
                variant="outline"
                disabled={pending || Boolean(booking.arrivedAt)}
                className="border-[#00b4b8] text-[#00b4b8] hover:bg-[#e3f8f8] disabled:border-[#e2e2e2] disabled:text-[#8a8f98]"
                onClick={markArrived}
              >
                {booking.arrivedAt ? "Arrival sent" : "I've arrived"}
              </Button>
              <Button
                type="button"
                disabled={pending}
                className="bg-[#00b4b8] text-white hover:opacity-90 disabled:opacity-60"
                onClick={startService}
              >
                Start service
              </Button>
            </div>
          </DialogBody>
        )}

        {booking && step === "tracking-map" && (
          <DialogBody className="px-6 pt-4 pb-6 space-y-4 text-sm">
            <div>
              <h3 className="text-base font-semibold text-[#151922]">Meeting location</h3>
              <p className="mt-1 text-[#657080]">{booking.location?.address || "No address provided."}</p>
            </div>
            {/* The confirmed meeting point, from the address the booking was made against.
                This is deliberately not a live view of the professional: nothing reports
                their position, and the previous version's two pins and route line were
                fixed pixel positions that rendered identically for every booking. */}
            <LocationMap
              address={booking.location?.address}
              lat={booking.location?.lat}
              lng={booking.location?.lng}
              className="h-72 w-full overflow-hidden rounded-2xl sm:h-80"
            />
            <p className="text-xs text-[#8a8f98]">
              {trackingPhase === "arrived"
                ? "Your professional has marked themselves as arrived."
                : "Live location sharing isn't available yet — you'll be updated when your professional marks themselves arrived."}
            </p>
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
              disabled={!issueReason || pending}
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
          <VideoCallFrame bookingId={booking.id} onLeave={handleHangup} />
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
