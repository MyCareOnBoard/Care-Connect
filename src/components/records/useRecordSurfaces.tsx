import { useState } from "react"
import { useNavigate } from "react-router"
import { RecordEditorDialog } from "@/components/records/RecordEditorDialog"
import { RecordViewerDialog } from "@/components/records/RecordViewerDialog"
import { FollowUpProposalDialog } from "@/components/records/FollowUpProposalDialog"
import { Routes } from "@/routes/constants"
import { useAuthUser } from "@/utils/auth"
import { getRecord } from "@/utils/careconnect/services/clinicalService"
import type { TelehealthBooking, VisitRecord } from "@/utils/careconnect/types"

/**
 * The clinical dialogs a schedule page needs, bundled.
 *
 * `user/schedule.tsx` and `professional/schedule.tsx` are ~95% duplicates of one
 * another, so anything added to them has to be written twice. Packaging the state
 * and the three dialogs here reduces each page's addition to a hook call and one
 * `{surfaces}` — which does not fix the duplication, but stops this feature
 * widening it.
 */
export function useRecordSurfaces({
  onBookingPatched,
}: {
  /** Lets the host refresh `hasRecord` on its local booking list. */
  onBookingPatched?: (booking: TelehealthBooking) => void
} = {}) {
  const navigate = useNavigate()
  const { user } = useAuthUser()
  const [editorBooking, setEditorBooking] = useState<TelehealthBooking | null>(null)
  const [followUpBooking, setFollowUpBooking] = useState<TelehealthBooking | null>(null)
  const [viewRecord, setViewRecord] = useState<VisitRecord | null>(null)

  /** A client opening the record written about them. */
  const openRecordViewer = async (booking: TelehealthBooking) => {
    try {
      setViewRecord(await getRecord(booking.id))
    } catch {
      // Nothing readable yet — the booking dialog is the better fallback than an
      // error the client can do nothing about.
    }
  }

  const surfaces = (
    <>
      <RecordEditorDialog
        booking={editorBooking}
        open={editorBooking !== null}
        onOpenChange={(next) => {
          if (!next) setEditorBooking(null)
        }}
        onSaved={(record) => {
          if (editorBooking) {
            onBookingPatched?.({ ...editorBooking, hasRecord: true })
          }
          setViewRecord((current) => (current?.id === record.id ? record : current))
        }}
      />

      <FollowUpProposalDialog
        booking={followUpBooking}
        open={followUpBooking !== null}
        onOpenChange={(next) => {
          if (!next) setFollowUpBooking(null)
        }}
      />

      <RecordViewerDialog
        record={viewRecord}
        open={viewRecord !== null}
        onOpenChange={(next) => {
          if (!next) setViewRecord(null)
        }}
        viewerUid={user?.uid ?? null}
        onAmended={setViewRecord}
      />
    </>
  )

  return {
    /** Professional: write or continue the visit record. */
    openRecordEditor: setEditorBooking,
    /** Professional: propose another visit. */
    openFollowUpProposal: setFollowUpBooking,
    /** Professional: the client's whole history. */
    openClientRecords: (booking: TelehealthBooking) =>
      navigate(Routes.app.user.clientRecords(booking.clientId)),
    /** Client: read the record written about a visit. */
    openRecordViewer,
    surfaces,
  }
}
