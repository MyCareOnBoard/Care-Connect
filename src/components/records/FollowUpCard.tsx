import { useState } from "react"
import { toast } from "sonner"
import { CalendarClock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { PaymentMethodDialog } from "@/components/booking/PaymentMethodDialog"
import { getAuthErrorMessage } from "@/utils/auth"
import {
  getConsentPolicies,
  respondToFollowUp,
  withdrawFollowUp,
} from "@/utils/careconnect/services/clinicalService"
import { getInitials } from "@/lib/utils"
import {
  FOLLOW_UP_STATUS_LABELS,
  SERVICE_MODE_LABELS,
  formatDate,
  minutesToLabel,
  type FollowUp,
  type TelehealthBooking,
} from "@/utils/careconnect/types"

/**
 * Whether a proposed slot has already passed. Mirrors `isFollowUpExpired` in the
 * backend's follow-up.schema.js, and uses the same local date composition as
 * `bookingStart` so it never expires an hour early in a different offset.
 */
export function isFollowUpExpired(
  followUp: Pick<FollowUp, "dateKey" | "startMinutes">,
  now = Date.now(),
): boolean {
  if (!followUp.dateKey || typeof followUp.startMinutes !== "number") return false
  const [year, month, day] = followUp.dateKey.split("-").map(Number)
  const start = new Date(
    year,
    month - 1,
    day,
    Math.floor(followUp.startMinutes / 60),
    followUp.startMinutes % 60,
    0,
    0,
  ).getTime()
  return start < now
}

function formatPrice(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency || "USD",
      maximumFractionDigits: 0,
    }).format(amount)
  } catch {
    return `${currency || ""} ${amount}`.trim()
  }
}

const STATUS_PILL: Record<string, string> = {
  proposed: "border-[#d97a2b] bg-white text-[#d97a2b]",
  accepted: "border-[#10ad58] bg-white text-[#10ad58]",
  declined: "border-[#ff3e66] bg-white text-[#ff3e66]",
  withdrawn: "border-[#eef1f3] bg-[#f5f8fb] text-[#657080]",
  expired: "border-[#eef1f3] bg-[#f5f8fb] text-[#657080]",
}

export function FollowUpCard({
  followUp,
  /** "client" gets accept/decline; "professional" gets withdraw. */
  role,
  onChanged,
  onBooked,
}: {
  followUp: FollowUp
  role: "client" | "professional"
  onChanged?: (followUp: FollowUp) => void
  onBooked?: (booking: TelehealthBooking) => void
}) {
  const [busy, setBusy] = useState(false)
  // Off by default: a pre-ticked box is not a decision. See the label below.
  const [shareEpisode, setShareEpisode] = useState(false)
  const [paymentOpen, setPaymentOpen] = useState(false)

  const expired = followUp.status === "proposed" && isFollowUpExpired(followUp)
  const open = followUp.status === "proposed" && !expired
  const statusKey = expired ? "expired" : followUp.status

  const accept = async (paymentMethod?: string) => {
    setBusy(true)
    try {
      // Consent is captured fresh for each visit; it never carries over from the
      // one that prompted this follow-up.
      let recordConsent: { accepted: boolean; policyVersion: string } | undefined
      let episodeShare: { accepted: boolean; policyVersion: string } | undefined
      try {
        const policies = await getConsentPolicies()
        recordConsent = { accepted: true, policyVersion: policies.record.version }
        // Only claim it when the client actually ticked the box AND we know which wording
        // they were shown. Same rule as record consent: no wording, no claim of consent.
        if (shareEpisode && policies.episodeShare) {
          episodeShare = { accepted: true, policyVersion: policies.episodeShare.version }
        }
      } catch {
        // Without the wording we cannot claim informed consent, so book without
        // it — the client can allow a record from the booking afterwards.
        recordConsent = undefined
        episodeShare = undefined
      }

      const result = await respondToFollowUp(followUp.id, "accepted", {
        paymentMethod,
        recordConsent,
        episodeShare,
      })
      onChanged?.(result.followUp)
      if (result.booking) onBooked?.(result.booking)
      toast.success("Follow-up booked")
    } catch (error) {
      const status = (error as { response?: { status?: number } })?.response?.status
      if (status === 409) {
        toast.error("That time is no longer available. Ask for another time.")
      } else {
        toast.error(getAuthErrorMessage(error))
      }
    } finally {
      setBusy(false)
    }
  }

  const decline = async () => {
    setBusy(true)
    try {
      const result = await respondToFollowUp(followUp.id, "declined")
      onChanged?.(result.followUp)
      toast.success("Follow-up declined")
    } catch (error) {
      toast.error(getAuthErrorMessage(error))
    } finally {
      setBusy(false)
    }
  }

  const withdraw = async () => {
    setBusy(true)
    try {
      await withdrawFollowUp(followUp.id)
      onChanged?.({ ...followUp, status: "withdrawn" })
      toast.success("Follow-up withdrawn")
    } catch (error) {
      toast.error(getAuthErrorMessage(error))
    } finally {
      setBusy(false)
    }
  }

  const counterpartName = role === "client" ? followUp.professionalName : followUp.clientName
  // `kind` is absent on follow-ups written before referrals existed, and the name check
  // covers a referral recorded without one.
  const isReferral =
    followUp.kind === "referral" ||
    Boolean(followUp.referredByUid && followUp.referredByUid !== followUp.professionalUid)

  return (
    <>
      <article className="rounded-2xl border border-[#e5ecf5] bg-white p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#00b4b8] text-sm font-semibold text-white">
              {getInitials(counterpartName || "?")}
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-[#151922]">{followUp.serviceTitle}</p>
              <p className="mt-0.5 text-sm text-[#657080]">
                {role === "client"
                  ? isReferral
                    ? // On a referral the proposer and the person delivering it are two
                      // different people. Naming only one of them would make the client's
                      // acceptance uninformed — they would be agreeing to see someone
                      // whose name they were never shown.
                      `${followUp.referredByName || "Your professional"} referred you to ${counterpartName}`
                    : `Proposed by ${counterpartName}`
                  : `For ${counterpartName}`}
              </p>
            </div>
          </div>
          <span
            className={`shrink-0 rounded-full border px-2.5 py-0.5 text-xs font-medium ${
              STATUS_PILL[statusKey] ?? STATUS_PILL.withdrawn
            }`}
          >
            {expired ? "Expired" : FOLLOW_UP_STATUS_LABELS[followUp.status]}
          </span>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-[#657080]">
          <span className="flex items-center gap-1.5">
            <CalendarClock className="size-4" />
            {formatDate(followUp.dateKey)} at {minutesToLabel(followUp.startMinutes)}
          </span>
          <span>{SERVICE_MODE_LABELS[followUp.mode]}</span>
          <span className="font-medium text-[#151922]">
            {followUp.paid ? formatPrice(followUp.price, followUp.currency) : "Free"}
          </span>
        </div>

        {followUp.message && (
          <p className="mt-3 rounded-xl bg-[#f5f8fb] px-4 py-3 text-sm text-[#151922]">
            {followUp.message}
          </p>
        )}

        {open && role === "client" && (
          <>
            {/* Only on a referral, and only as an explicit choice. The professional being
                referred to has no history with this client, so this is the moment the
                question is real — a specific thread and a named colleague, rather than the
                account-wide switch buried in settings. Defaulting it on would make the
                consent nominal, so it starts off. */}
            {isReferral && (
              <div className="mt-4 flex items-start gap-3 rounded-xl border border-[#eef1f3] bg-[#f7fafb] px-4 py-3">
                <Checkbox
                  id={`share-episode-${followUp.id}`}
                  checked={shareEpisode}
                  onChange={(event) => setShareEpisode(event.target.checked)}
                />
                <label
                  htmlFor={`share-episode-${followUp.id}`}
                  className="cursor-pointer text-sm text-[#151922]"
                >
                  Let {counterpartName} read the visit records from this course of care
                  <span className="mt-0.5 block text-xs text-[#657080]">
                    Only this course of care, not your other records. Lasts six months
                    unless you end it sooner, and you can withdraw it any time in Privacy
                    and security.
                  </span>
                </label>
              </div>
            )}

            <div className="mt-4 flex gap-2">
              <Button variant="outline" className="flex-1" disabled={busy} onClick={decline}>
                Decline
              </Button>
              <Button
                className="flex-1 bg-[#00b4b8] text-white hover:opacity-90"
                disabled={busy}
                onClick={() => {
                  if (followUp.paid && followUp.price > 0) {
                    setPaymentOpen(true)
                    return
                  }
                  void accept()
                }}
              >
                {busy
                  ? "Working..."
                  : followUp.paid && followUp.price > 0
                    ? `Confirm & book · ${formatPrice(followUp.price, followUp.currency)}`
                    : "Confirm & book"}
              </Button>
            </div>
            {followUp.paid && followUp.price > 0 && (
              <p className="mt-2 text-center text-xs text-[#657080]">
                Payment is recorded, not charged - your professional will confirm arrangements.
              </p>
            )}
          </>
        )}

        {open && role === "professional" && (
          <div className="mt-4">
            <Button variant="outline" className="w-full" disabled={busy} onClick={withdraw}>
              Withdraw proposal
            </Button>
          </div>
        )}

        {expired && (
          <p className="mt-3 text-sm text-[#657080]">
            This time has passed.{" "}
            {role === "professional" ? "Propose another." : "Ask for another time."}
          </p>
        )}
      </article>

      <PaymentMethodDialog
        open={paymentOpen}
        onOpenChange={setPaymentOpen}
        selected={null}
        onSelect={(label) => {
          void accept(label)
        }}
      />
    </>
  )
}
