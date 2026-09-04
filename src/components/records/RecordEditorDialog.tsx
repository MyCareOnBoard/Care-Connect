import { useEffect, useRef, useState } from "react"
import { toast } from "sonner"
import { FilePenLine, FileText, Info, Lock, Maximize2, Minus, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ChipMultiSelect } from "@/components/health/ChipMultiSelect"
import { canAmendNow } from "@/components/records/RecordViewerDialog"
import {
  getApiErrorStatus,
  getApiFieldErrors,
  getAuthErrorMessage,
  useAuthUser,
  type ApiFieldError,
} from "@/utils/auth"
import {
  createRecord,
  getRecord,
  signRecord,
  updateRecord,
  type VisitRecordInput,
} from "@/utils/careconnect/services/clinicalService"
import {
  CARE_TASKS,
  formatDate,
  formatRelative,
  type GlucoseUnit,
  type RecordVitals,
  type TelehealthBooking,
  type VisitRecord,
} from "@/utils/careconnect/types"

/**
 * Where a professional writes the visit record.
 *
 * Its own dialog rather than another step inside BookingDetailsDialog: that file
 * already carries an eight-value step machine and six effects, and a note editor
 * needs its own draft state, autosave timer, and dirty-close guard. It is also
 * opened from three places, which a nested step could not serve.
 *
 * Draft vs signed is the load-bearing distinction. A draft is the author's own
 * working copy and reaches nobody else; signing is what makes the record the
 * account of the visit that the client and the next professional will read.
 */

const AUTOSAVE_INTERVAL_MS = 20_000
const GLUCOSE_UNITS: GlucoseUnit[] = ["mmol/L", "mg/dL"]

const EMPTY_DRAFT: VisitRecordInput = {
  visitSummary: "",
  observations: "",
  concerns: "",
  vitalsObserved: null,
  careProvided: [],
  followUpNeeded: false,
  followUpNotes: "",
}

function toDraft(record: VisitRecord): VisitRecordInput {
  return {
    visitSummary: record.visitSummary ?? "",
    observations: record.observations ?? "",
    concerns: record.concerns ?? "",
    vitalsObserved: record.vitalsObserved ?? null,
    careProvided: record.careProvided ?? [],
    followUpNeeded: record.followUpNeeded ?? false,
    followUpNotes: record.followUpNotes ?? "",
  }
}

function toNumberOrNull(raw: string): number | null {
  const trimmed = raw.trim()
  if (!trimmed) return null
  const parsed = Number(trimmed)
  return Number.isFinite(parsed) ? parsed : null
}

function VitalField({
  label,
  value,
  onChange,
  placeholder,
  error,
}: {
  label: string
  value: number | null | undefined
  onChange: (next: number | null) => void
  placeholder?: string
  /** Message from the API's rejection for this field, if it had one. */
  error?: string
}) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium text-[#657080]">{label}</label>
      <Input
        type="number"
        inputMode="decimal"
        value={value ?? ""}
        onChange={(event) => onChange(toNumberOrNull(event.target.value))}
        placeholder={placeholder}
        aria-invalid={error ? true : undefined}
        className={`h-10 ${error ? "border-[#ff3e66] focus:border-[#ff3e66]" : ""}`}
      />
      {error && (
        <p role="alert" className="mt-1 text-xs text-[#ff3e66]">
          {error}
        </p>
      )}
    </div>
  )
}

export function RecordEditorDialog({
  booking,
  open,
  onOpenChange,
  onSaved,
  onAmend,
}: {
  booking: TelehealthBooking | null
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Lets the host patch `hasRecord` on its local booking list. */
  onSaved?: (record: VisitRecord) => void
  /**
   * Hand a signed record to the viewer, where amendments are written. Callers normally
   * route signed records straight there (see `getSignedRecord`), so this covers the
   * remaining case: a record signed elsewhere while this editor was open.
   */
  onAmend?: (record: VisitRecord) => void
}) {
  const { user } = useAuthUser()
  const [loading, setLoading] = useState(false)
  const [record, setRecord] = useState<VisitRecord | null>(null)
  const [draft, setDraft] = useState<VisitRecordInput>(EMPTY_DRAFT)
  const [dirty, setDirty] = useState(false)
  // Per-field rejections from the API, keyed by the dotted path it reported
  // (e.g. "vitalsObserved.heartRate"), so each one renders next to its own input.
  const [fieldErrors, setFieldErrors] = useState<ApiFieldError[]>([])

  /** The API's message for one vital, e.g. vitalError("heartRate"). */
  const vitalError = (name: string) =>
    fieldErrors.find((item) => item.field === `vitalsObserved.${name}`)?.message?.replace(/"/g, "")
  const [saving, setSaving] = useState(false)
  const [signing, setSigning] = useState(false)
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null)
  const [confirmDiscard, setConfirmDiscard] = useState(false)
  // Docked out of the way so a visit in progress stays visible and usable.
  const [minimized, setMinimized] = useState(false)

  // Read inside the autosave interval so the timer never captures a stale draft.
  const draftRef = useRef(draft)
  draftRef.current = draft
  const recordRef = useRef(record)
  recordRef.current = record
  const dirtyRef = useRef(dirty)
  dirtyRef.current = dirty

  const bookingId = booking?.id ?? null
  const signed = record?.status === "signed"
  // Same rule the viewer's amend box uses, so the two agree on when it's still possible.
  const amendable = canAmendNow(record, user?.uid ?? null)

  // Load any existing record when the dialog opens.
  useEffect(() => {
    if (!open || !bookingId) return
    let active = true
    setLoading(true)
    setDirty(false)
    setLastSavedAt(null)
    setMinimized(false)
    getRecord(bookingId)
      .then((existing) => {
        if (!active) return
        setRecord(existing)
        setDraft(toDraft(existing))
      })
      .catch(() => {
        // No record yet is the normal first case, not an error worth a toast.
        if (!active) return
        setRecord(null)
        setDraft(EMPTY_DRAFT)
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [open, bookingId])

  const update = (patch: Partial<VisitRecordInput>) => {
    setDraft((current) => ({ ...current, ...patch }))
    setDirty(true)
  }

  const updateVitals = (patch: Partial<RecordVitals>) => {
    setDraft((current) => ({
      ...current,
      vitalsObserved: { ...(current.vitalsObserved ?? {}), ...patch },
    }))
    setDirty(true)
    // Drop the rejection for a field the moment it's edited — leaving it visible while the
    // value changes would keep flagging an input the professional has already corrected.
    setFieldErrors((current) =>
      current.filter((item) => !Object.keys(patch).some((key) => item.field === `vitalsObserved.${key}`)),
    )
  }

  /**
   * Persist the draft. The first save must be a POST to obtain the record, which
   * also means an untouched editor never leaves an empty record behind.
   */
  const persist = async (options: { silent?: boolean } = {}): Promise<VisitRecord | null> => {
    if (!bookingId) return null
    const body = draftRef.current
    try {
      const saved = recordRef.current
        ? await updateRecord(bookingId, body)
        : await createRecord(bookingId, body)
      setRecord(saved)
      setDraft(toDraft(saved))
      setDirty(false)
      setLastSavedAt(new Date().toISOString())
      onSaved?.(saved)
      if (!options.silent) toast.success("Draft saved")
      return saved
    } catch (error) {
      // POST /records answers 409 for more than one reason: the record already exists, or
      // the visit isn't completed / consent is missing. Only the first is adoptable —
      // treating them all as "already created" sent us to getRecord for a record that was
      // never written, turning a clear 409 into a misleading "Record not found".
      const status = getApiErrorStatus(error)
      const alreadyExists =
        status === 409 && /already exists/i.test(getAuthErrorMessage(error))
      if (alreadyExists) {
        // Another tab created it first; adopt that copy rather than surfacing a conflict
        // the professional can do nothing with.
        try {
          const existing = await getRecord(bookingId)
          setRecord(existing)
          setDraft(toDraft(existing))
          setDirty(false)
          toast.info("This record was already started - loaded the existing one.")
          return existing
        } catch {
          /* fall through to the generic message */
        }
      }
      // Show per-field validation failures against the inputs, not just in a toast.
      setFieldErrors(getApiFieldErrors(error))
      if (!options.silent) toast.error(getAuthErrorMessage(error))
      return null
    }
  }

  // Autosave, but only once the record exists and only while it is a draft.
  useEffect(() => {
    if (!open || signed) return
    const timer = window.setInterval(() => {
      if (!dirtyRef.current || !recordRef.current) return
      void persist({ silent: true })
    }, AUTOSAVE_INTERVAL_MS)
    return () => window.clearInterval(timer)
    // `persist` closes over refs, so it does not need to be a dependency.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, signed])

  const handleSaveDraft = async () => {
    setSaving(true)
    await persist()
    setSaving(false)
  }

  const handleSign = async () => {
    if (!bookingId) return
    setSigning(true)
    try {
      // Flush whatever is on screen first, so signing never publishes a stale body.
      const saved = await persist({ silent: true })
      if (!saved) return
      const finalRecord = await signRecord(bookingId)
      setRecord(finalRecord)
      setDraft(toDraft(finalRecord))
      setDirty(false)
      onSaved?.(finalRecord)
      toast.success("Visit record signed")
      onOpenChange(false)
    } catch (error) {
      toast.error(getAuthErrorMessage(error))
    } finally {
      setSigning(false)
    }
  }

  const requestClose = (next: boolean) => {
    if (!next && dirty && !signed) {
      // Expand first: the confirmation asks about work the professional should be able to
      // see, and the alert lives in the expanded branch.
      setMinimized(false)
      setConfirmDiscard(true)
      return
    }
    onOpenChange(next)
  }

  if (!booking) return null

  const summaryEmpty = !(draft.visitSummary ?? "").trim()

  /** What the docked bar reports, so minimizing never hides whether work is safe. */
  const saveStateLabel = saving
    ? "Saving…"
    : signed
      ? "Signed"
      : dirty
        ? "Unsaved changes"
        : lastSavedAt
          ? `Draft saved ${formatRelative(lastSavedAt)}`
          : "Draft"

  const title = signed ? "Visit record" : record ? "Continue visit record" : "Write visit record"

  /**
   * Minimized, this is a small docked bar instead of a centred modal — the point of
   * writing a record *during* a visit is that the visit carries on, and a full-screen
   * modal over a live call hides the video and puts the mute and hang-up controls out of
   * reach. The component stays mounted either way, so the draft and its autosave survive
   * being minimized; only the form is unmounted, and `draft` lives up here.
   */
  if (minimized) {
    return (
      <Dialog open={open} onOpenChange={requestClose} modal={false}>
        <DialogContent
          overlay={false}
          layout="custom"
          // Escape would close the record rather than restore it, which is not what a
          // minimized panel should do mid-visit.
          onEscapeKeyDown={(event) => event.preventDefault()}
          onInteractOutside={(event) => event.preventDefault()}
          className="fixed bottom-4 right-4 z-50 w-[min(20rem,calc(100vw-2rem))] rounded-2xl p-4 shadow-[0_18px_48px_rgba(17,24,39,0.24)]"
        >
          <div className="flex items-start gap-3">
            <FileText className="mt-0.5 size-4 shrink-0 text-[#00898c]" />
            <div className="min-w-0 flex-1">
              <DialogTitle className="truncate text-sm font-semibold text-[#151922]">
                {title}
              </DialogTitle>
              <p className="mt-0.5 truncate text-xs text-[#657080]">{booking.clientName}</p>
              <p className="mt-1 text-xs text-[#657080]">{saveStateLabel}</p>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <button
                type="button"
                onClick={() => setMinimized(false)}
                aria-label="Expand the visit record"
                className="flex size-8 items-center justify-center rounded-full text-[#565656] transition hover:bg-[#f2f6f8]"
              >
                <Maximize2 className="size-4" />
              </button>
              <button
                type="button"
                onClick={() => requestClose(false)}
                aria-label="Close the visit record"
                className="flex size-8 items-center justify-center rounded-full text-[#565656] transition hover:bg-[#f2f6f8]"
              >
                <X className="size-4" />
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <>
      <Dialog open={open} onOpenChange={requestClose}>
        <DialogContent showCloseButton className="p-0 max-w-160">
          <DialogHeader className="px-6 pt-6 text-left">
            <DialogTitle className="text-xl font-semibold text-[#151922]">{title}</DialogTitle>
            <p className="mt-1 text-sm text-[#657080]">
              {booking.clientName} · {booking.serviceTitle} · {formatDate(booking.dateKey)}
            </p>
            {/* Sits beside the close button, which is absolutely positioned at right-4. */}
            <button
              type="button"
              onClick={() => setMinimized(true)}
              aria-label="Minimize the visit record and keep the visit visible"
              title="Minimize — the draft and the call both keep going"
              className="absolute right-15 top-6 flex size-10 items-center justify-center rounded-full bg-[#f2f6f8] text-[#565656] transition hover:bg-[#e8edf2]"
            >
              <Minus className="size-4" />
            </button>
          </DialogHeader>

          <DialogBody className="max-h-[70vh] space-y-6 overflow-y-auto px-6 pt-4 pb-6">
            {loading ? (
              <div className="space-y-4">
                <Skeleton className="h-24 rounded-xl" />
                <Skeleton className="h-24 rounded-xl" />
                <Skeleton className="h-10 rounded-xl" />
              </div>
            ) : (
              <>
                {/* A signed record is immutable, so this banner has to lead somewhere:
                    without the action it told the professional to add an amendment on a
                    screen that has no way to add one. When the 24h window has closed
                    there is genuinely nothing to offer, so it says that instead. */}
                {signed && (
                  <div className="flex items-start gap-2 rounded-xl bg-[#e9f7ef] px-4 py-3 text-sm text-[#10ad58]">
                    <Lock className="mt-0.5 size-4 shrink-0" />
                    <div className="space-y-2">
                      <p>
                        Signed{record?.signedAt ? ` ${formatRelative(record.signedAt)}` : ""}.
                        {amendable
                          ? " A signed record is never rewritten - corrections are added as amendments."
                          : " The 24-hour window for amending it has closed, so it can no longer be changed."}
                      </p>
                      {amendable && record && onAmend && (
                        <button
                          type="button"
                          onClick={() => onAmend(record)}
                          className="flex items-center gap-1.5 text-sm font-semibold text-[#00898c] hover:opacity-80"
                        >
                          <FilePenLine className="size-4" />
                          Add an amendment
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {!signed && (
                  <div className="flex items-start gap-2 rounded-xl bg-[#fdf3e3] px-4 py-3 text-sm text-[#8a6d1f]">
                    <Info className="mt-0.5 size-4 shrink-0" />
                    <span>
                      Only you can see this while it is a draft. Signing shares it with{" "}
                      {booking.clientName}.
                    </span>
                  </div>
                )}

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-[#151922]">
                    What happened this visit
                  </label>
                  <Textarea
                    value={draft.visitSummary ?? ""}
                    onChange={(event) => update({ visitSummary: event.target.value })}
                    disabled={signed}
                    placeholder="A short account of the visit."
                    className="min-h-28"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-[#151922]">
                    Observations
                  </label>
                  <Textarea
                    value={draft.observations ?? ""}
                    onChange={(event) => update({ observations: event.target.value })}
                    disabled={signed}
                    placeholder="What you saw and measured."
                    className="min-h-24"
                  />
                </div>

                <div>
                  <p className="text-sm font-medium text-[#151922]">Vitals you measured</p>
                  <p className="mb-2 text-sm text-[#657080]">
                    Your own readings, separate from anything the client reported themselves.
                  </p>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    <VitalField
                      label="Systolic"
                      value={draft.vitalsObserved?.systolic}
                      onChange={(systolic) => updateVitals({ systolic })}
                      placeholder="120"
                      error={vitalError("systolic")}
                    />
                    <VitalField
                      label="Diastolic"
                      value={draft.vitalsObserved?.diastolic}
                      onChange={(diastolic) => updateVitals({ diastolic })}
                      placeholder="80"
                      error={vitalError("diastolic")}
                    />
                    <VitalField
                      label="Heart rate"
                      value={draft.vitalsObserved?.heartRate}
                      onChange={(heartRate) => updateVitals({ heartRate })}
                      placeholder="bpm"
                      error={vitalError("heartRate")}
                    />
                    <VitalField
                      label="Temperature (°C)"
                      value={draft.vitalsObserved?.temperatureC}
                      onChange={(temperatureC) => updateVitals({ temperatureC })}
                      placeholder="36.8"
                      error={vitalError("temperatureC")}
                    />
                    <VitalField
                      label="SpO2 (%)"
                      value={draft.vitalsObserved?.oxygenSaturation}
                      onChange={(oxygenSaturation) => updateVitals({ oxygenSaturation })}
                      placeholder="98"
                      error={vitalError("oxygenSaturation")}
                    />
                    <div>
                      <label className="mb-1.5 block text-xs font-medium text-[#657080]">
                        Blood glucose
                      </label>
                      <div className="flex gap-2">
                        <Input
                          type="number"
                          inputMode="decimal"
                          value={draft.vitalsObserved?.bloodGlucose ?? ""}
                          onChange={(event) =>
                            updateVitals({ bloodGlucose: toNumberOrNull(event.target.value) })
                          }
                          className="h-10"
                        />
                        <Select
                          value={draft.vitalsObserved?.bloodGlucoseUnit ?? ""}
                          onValueChange={(next) =>
                            updateVitals({ bloodGlucoseUnit: next as GlucoseUnit })
                          }
                        >
                          <SelectTrigger className="h-10 w-28 shrink-0">
                            <SelectValue placeholder="Unit" />
                          </SelectTrigger>
                          <SelectContent>
                            {GLUCOSE_UNITS.map((unit) => (
                              <SelectItem key={unit} value={unit}>
                                {unit}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <p className="mb-2 text-sm font-medium text-[#151922]">Care provided</p>
                  <ChipMultiSelect
                    options={CARE_TASKS}
                    selected={draft.careProvided ?? []}
                    onChange={(careProvided) => update({ careProvided })}
                    allowCustom={!signed}
                    customPlaceholder="Add another task"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-[#151922]">
                    Concerns for the next professional
                  </label>
                  <Textarea
                    value={draft.concerns ?? ""}
                    onChange={(event) => update({ concerns: event.target.value })}
                    disabled={signed}
                    placeholder="Anything whoever sees them next should know."
                    className="min-h-24"
                  />
                </div>

                <div className="space-y-3 rounded-xl border border-[#eef1f3] p-4">
                  <Checkbox
                    checked={draft.followUpNeeded ?? false}
                    disabled={signed}
                    onChange={(event) => update({ followUpNeeded: event.target.checked })}
                    label="A follow-up visit would help"
                  />
                  {draft.followUpNeeded && (
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-[#151922]">
                        Why (private to you)
                      </label>
                      <Textarea
                        value={draft.followUpNotes ?? ""}
                        onChange={(event) => update({ followUpNotes: event.target.value })}
                        disabled={signed}
                        placeholder="Your own reasoning. The client does not see this."
                        className="min-h-20"
                      />
                      <p className="mt-2 text-sm text-[#657080]">
                        Propose the follow-up from the booking once you have signed this record.
                      </p>
                    </div>
                  )}
                </div>
              </>
            )}
          </DialogBody>

          {!loading && !signed && (
            <div className="flex flex-col gap-3 border-t border-[#eef1f3] px-6 py-4">
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  disabled={saving || signing || !dirty}
                  onClick={handleSaveDraft}
                >
                  {saving ? "Saving..." : "Save draft"}
                </Button>
                <Button
                  className="flex-1 bg-[#00b4b8] text-white hover:opacity-90"
                  disabled={summaryEmpty || saving || signing}
                  onClick={handleSign}
                >
                  {signing ? "Signing..." : "Sign & save"}
                </Button>
              </div>
              <p className="text-center text-sm text-[#657080]">
                {summaryEmpty
                  ? "Add what happened this visit before signing."
                  : record
                    ? lastSavedAt
                      ? `Draft saved ${formatRelative(lastSavedAt)} · saves automatically`
                      : "Saves automatically while you type"
                    : "Save a draft to keep it without sharing it yet"}
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmDiscard} onOpenChange={setConfirmDiscard}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Keep this draft?</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved changes to this visit record. Saving keeps it private to you until
              you sign it.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setConfirmDiscard(false)
                setDirty(false)
                onOpenChange(false)
              }}
            >
              Discard
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                setConfirmDiscard(false)
                await persist()
                onOpenChange(false)
              }}
            >
              Save draft
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
