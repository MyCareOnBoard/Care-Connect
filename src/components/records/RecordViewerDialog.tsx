import { useState } from "react"
import { toast } from "sonner"
import { FilePenLine, Lock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { getAuthErrorMessage } from "@/utils/auth"
import { amendRecord } from "@/utils/careconnect/services/clinicalService"
import { formatBloodPressure } from "@/utils/careconnect/healthProfile"
import {
  formatDate,
  formatRelative,
  toDate,
  type VisitRecord,
} from "@/utils/careconnect/types"

/**
 * Read-only view of a signed visit record, shared by the client and by
 * professionals.
 *
 * One component for both roles rather than two near-identical views; `canAmend`
 * is the only behavioural difference and the server enforces it regardless.
 */

/** Matches AMEND_WINDOW_MS in the backend's client-record.schema.js. */
const AMEND_WINDOW_MS = 24 * 60 * 60 * 1000

function Row({ label, value }: { label: string; value: string }) {
  if (!value.trim()) return null
  return (
    <div className="grid gap-1 px-4 py-3 sm:grid-cols-3">
      <dt className="text-sm text-[#657080]">{label}</dt>
      <dd className="whitespace-pre-wrap text-sm text-[#151922] sm:col-span-2">{value}</dd>
    </div>
  )
}

/** Whether the amend window is still open, mirroring the server's rule. */
export function canAmendNow(record: VisitRecord | null, viewerUid: string | null): boolean {
  if (!record || !viewerUid) return false
  if (record.professionalUid !== viewerUid) return false
  if (record.status !== "signed") return false
  const signedAt = toDate(record.signedAt)
  if (!signedAt) return false
  return Date.now() - signedAt.getTime() <= AMEND_WINDOW_MS
}

export function RecordViewerDialog({
  record,
  open,
  onOpenChange,
  viewerUid,
  onAmended,
}: {
  record: VisitRecord | null
  open: boolean
  onOpenChange: (open: boolean) => void
  viewerUid: string | null
  onAmended?: (record: VisitRecord) => void
}) {
  const [amendText, setAmendText] = useState("")
  const [amending, setAmending] = useState(false)
  const [showAmendBox, setShowAmendBox] = useState(false)

  if (!record) return null

  const canAmend = canAmendNow(record, viewerUid)
  const vitals = record.vitalsObserved
  const bp = formatBloodPressure(vitals?.systolic, vitals?.diastolic)

  const submitAmendment = async () => {
    const text = amendText.trim()
    if (!text) return
    setAmending(true)
    try {
      const updated = await amendRecord(record.bookingId, text)
      onAmended?.(updated)
      setAmendText("")
      setShowAmendBox(false)
      toast.success("Amendment added")
    } catch (error) {
      toast.error(getAuthErrorMessage(error))
    } finally {
      setAmending(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          setShowAmendBox(false)
          setAmendText("")
        }
        onOpenChange(next)
      }}
    >
      <DialogContent showCloseButton className="p-0 max-w-160">
        <DialogHeader className="px-6 pt-6 text-left">
          <DialogTitle className="text-xl font-semibold text-[#151922]">Visit record</DialogTitle>
          <p className="mt-1 text-sm text-[#657080]">
            {record.serviceTitle} · {formatDate(record.visitDateKey)} · {record.professionalName}
          </p>
        </DialogHeader>

        <DialogBody className="max-h-[70vh] space-y-5 overflow-y-auto px-6 pt-4 pb-6">
          {record.status === "draft" ? (
            <div className="flex items-start gap-2 rounded-xl bg-[#fdf3e3] px-4 py-3 text-sm text-[#8a6d1f]">
              <Lock className="mt-0.5 size-4 shrink-0" />
              <span>This record is still a draft and has not been shared.</span>
            </div>
          ) : (
            <p className="text-sm text-[#657080]">
              Signed {record.signedAt ? formatRelative(record.signedAt) : ""}
            </p>
          )}

          <dl className="divide-y divide-[#eef1f3] rounded-xl border border-[#eef1f3]">
            <Row label="What happened" value={record.visitSummary || ""} />
            <Row label="Observations" value={record.observations || ""} />
            {bp && <Row label="Blood pressure" value={bp} />}
            {vitals?.heartRate != null && (
              <Row label="Heart rate" value={`${vitals.heartRate} bpm`} />
            )}
            {vitals?.temperatureC != null && (
              <Row label="Temperature" value={`${vitals.temperatureC} °C`} />
            )}
            {vitals?.oxygenSaturation != null && (
              <Row label="Oxygen saturation" value={`${vitals.oxygenSaturation}%`} />
            )}
            {vitals?.bloodGlucose != null && (
              <Row
                label="Blood glucose"
                value={`${vitals.bloodGlucose} ${vitals.bloodGlucoseUnit || ""}`.trim()}
              />
            )}
            {record.careProvided?.length > 0 && (
              <Row label="Care provided" value={record.careProvided.join(", ")} />
            )}
            <Row label="Concerns" value={record.concerns || ""} />
            {/* followUpNotes is stripped server-side for anyone but the author,
                so rendering it here is safe: it is simply absent otherwise. */}
            <Row label="Follow-up notes (private)" value={record.followUpNotes || ""} />
          </dl>

          {record.amendments && record.amendments.length > 0 && (
            <section>
              <h4 className="text-sm font-semibold text-[#151922]">Amendments</h4>
              <p className="mt-1 text-sm text-[#657080]">
                A signed record is never rewritten; corrections are added below it.
              </p>
              <ul className="mt-2 space-y-2">
                {record.amendments.map((amendment, index) => (
                  <li key={index} className="rounded-xl border border-[#eef1f3] px-4 py-3">
                    <p className="whitespace-pre-wrap text-sm text-[#151922]">{amendment.text}</p>
                    <p className="mt-1 text-xs text-[#657080]">
                      {formatRelative(amendment.createdAt)}
                    </p>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {canAmend && (
            <section className="rounded-xl border border-[#eef1f3] p-4">
              {showAmendBox ? (
                <div className="space-y-3">
                  <label className="block text-sm font-medium text-[#151922]">
                    Add an amendment
                  </label>
                  <Textarea
                    value={amendText}
                    onChange={(event) => setAmendText(event.target.value)}
                    placeholder="What needs correcting or adding?"
                    className="min-h-24"
                  />
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => {
                        setShowAmendBox(false)
                        setAmendText("")
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      className="flex-1 bg-[#00b4b8] text-white hover:opacity-90"
                      disabled={!amendText.trim() || amending}
                      onClick={submitAmendment}
                    >
                      {amending ? "Adding..." : "Add amendment"}
                    </Button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowAmendBox(true)}
                  className="flex items-center gap-1.5 text-sm font-semibold text-[#00898c] hover:opacity-80"
                >
                  <FilePenLine className="size-4" />
                  Add an amendment
                </button>
              )}
            </section>
          )}

          {record.clientId === viewerUid && (
            <p className="text-sm text-[#657080]">
              Records are written by your professional and cannot be changed by you. If something
              here is wrong, raise an issue on the booking.
            </p>
          )}
        </DialogBody>
      </DialogContent>
    </Dialog>
  )
}
