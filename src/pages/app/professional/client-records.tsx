import { useEffect, useMemo, useState } from "react"
import { Link, Navigate, useParams } from "react-router"
import { ChevronLeft, FileText, UserX } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { RecordCard } from "@/components/records/RecordCard"
import { RecordViewerDialog } from "@/components/records/RecordViewerDialog"
import { RecordEditorDialog } from "@/components/records/RecordEditorDialog"
import { FollowUpProposalDialog } from "@/components/records/FollowUpProposalDialog"
import {
  HealthProfileSummary,
  SharingDisabledPanel,
} from "@/components/health/HealthProfileSummary"
import { MedicalDocumentViewer } from "@/components/health/MedicalDocumentViewer"
import { Routes } from "@/routes/constants"
import { useAuthUser } from "@/utils/auth"
import { useProfessionalMembership } from "@/utils/professional/useProfessionalMembership"
import { listBookings } from "@/utils/careconnect/services/telehealthService"
import {
  getBookingIntake,
  listClientRecords,
  listMedicalDocuments,
} from "@/utils/careconnect/services/clinicalService"
import { ROW_STATUS_PILL, recordWriteState, rowStatusFor } from "@/utils/careconnect/bookingStatus"
import {
  formatDate,
  minutesToLabel,
  MEDICAL_DOCUMENT_CATEGORY_LABELS,
  formatFileSize,
  type HealthProfileSnapshot,
  type MedicalDocument,
  type TelehealthBooking,
  type VisitRecord,
} from "@/utils/careconnect/types"

/**
 * One client's history, as seen by a professional who treats them.
 *
 * Reached only from a booking row — there is no nav entry — because a booking is
 * the only context in which a professional has a legitimate reason to be here.
 * The server enforces that independently: without a confirmed or completed
 * booking with this client, the record list returns 403.
 */

type Tab = "records" | "health" | "documents" | "visits"

const TABS: { id: Tab; label: string }[] = [
  { id: "records", label: "Records" },
  { id: "health", label: "Health profile" },
  { id: "documents", label: "Documents" },
  { id: "visits", label: "Visits" },
]

function ClientRecordsSkeleton() {
  return (
    <div className="space-y-6 p-5 sm:p-8">
      <Skeleton className="h-5 w-32" />
      <Skeleton className="h-16 w-72" />
      <Skeleton className="h-10 w-80 rounded-xl" />
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <Skeleton key={index} className="h-32 rounded-2xl" />
        ))}
      </div>
    </div>
  )
}

/** Shown when the server says there is no treating relationship at all. */
function NotAssignedPanel() {
  return (
    <div className="space-y-6 p-5 sm:p-8">
      <Link
        to={Routes.app.user.schedule}
        className="inline-flex items-center gap-1 text-sm font-semibold text-[#657080] hover:text-[#151922]"
      >
        <ChevronLeft className="size-4" />
        Schedule
      </Link>
      <div className="rounded-2xl border border-dashed border-[#e5ecf5] p-10 text-center">
        <UserX className="mx-auto size-7 text-[#657080]" />
        <p className="mt-3 text-base font-semibold text-[#151922]">
          You do not have a booking with this client
        </p>
        <p className="mx-auto mt-1 max-w-md text-sm text-[#657080]">
          Records are only available to professionals assigned to a confirmed or completed booking
          with the client.
        </p>
      </div>
    </div>
  )
}

export default function ClientRecordsPage() {
  const { clientId } = useParams<{ clientId: string }>()
  const { user } = useAuthUser()
  const { isProfessional, loading: roleLoading } = useProfessionalMembership()

  const [loading, setLoading] = useState(true)
  const [forbidden, setForbidden] = useState(false)
  const [records, setRecords] = useState<VisitRecord[]>([])
  const [sharingEnabled, setSharingEnabled] = useState(false)
  const [bookings, setBookings] = useState<TelehealthBooking[]>([])
  const [tab, setTab] = useState<Tab>("records")

  const [openRecord, setOpenRecord] = useState<VisitRecord | null>(null)
  const [editorBooking, setEditorBooking] = useState<TelehealthBooking | null>(null)
  const [followUpBooking, setFollowUpBooking] = useState<TelehealthBooking | null>(null)

  const [snapshot, setSnapshot] = useState<HealthProfileSnapshot | null>(null)
  const [snapshotLoading, setSnapshotLoading] = useState(false)
  const [snapshotBooking, setSnapshotBooking] = useState<TelehealthBooking | null>(null)

  // Documents the client chose to share with their care team. Fetched only when
  // the tab is opened, so simply viewing a client does not record a PHI read.
  const [documents, setDocuments] = useState<MedicalDocument[]>([])
  const [documentsLoading, setDocumentsLoading] = useState(false)
  const [documentsLoaded, setDocumentsLoaded] = useState(false)
  const [openDocument, setOpenDocument] = useState<MedicalDocument | null>(null)

  useEffect(() => {
    if (!clientId || roleLoading || !isProfessional) return
    let active = true
    ;(async () => {
      setLoading(true)
      setForbidden(false)
      try {
        const [recordResult, allBookings] = await Promise.all([
          listClientRecords(clientId),
          listBookings({ scope: "professional" }).catch(() => [] as TelehealthBooking[]),
        ])
        if (!active) return
        setRecords(recordResult.records)
        setSharingEnabled(recordResult.sharingEnabled)
        setBookings(allBookings.filter((booking) => booking.clientId === clientId))
      } catch (error) {
        if (!active) return
        const status = (error as { response?: { status?: number } })?.response?.status
        // A full-page panel, not a toast: a toast over a blank page is unreadable.
        if (status === 403) setForbidden(true)
        setRecords([])
      } finally {
        if (active) setLoading(false)
      }
    })()
    return () => {
      active = false
    }
  }, [clientId, roleLoading, isProfessional])

  // The most recent booking this professional holds that actually froze a
  // snapshot — what the client attested, not their live profile.
  const latestIntakeBooking = useMemo(() => {
    return (
      bookings
        .filter((booking) => booking.hasIntakeSnapshot)
        .sort((a, b) => (a.dateKey < b.dateKey ? 1 : -1))[0] ?? null
    )
  }, [bookings])

  useEffect(() => {
    if (tab !== "health" || !latestIntakeBooking) return
    if (snapshotBooking?.id === latestIntakeBooking.id) return
    let active = true
    setSnapshotLoading(true)
    getBookingIntake(latestIntakeBooking.id)
      .then((result) => {
        if (!active) return
        setSnapshot(result)
        setSnapshotBooking(latestIntakeBooking)
      })
      .catch(() => {
        if (active) setSnapshot(null)
      })
      .finally(() => {
        if (active) setSnapshotLoading(false)
      })
    return () => {
      active = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, latestIntakeBooking?.id])

  useEffect(() => {
    if (tab !== "documents" || !clientId || documentsLoaded) return
    let active = true
    setDocumentsLoading(true)
    listMedicalDocuments({ clientId })
      .then((list) => {
        if (!active) return
        setDocuments(list)
        setDocumentsLoaded(true)
      })
      .catch(() => {
        if (active) setDocuments([])
      })
      .finally(() => {
        if (active) setDocumentsLoading(false)
      })
    return () => {
      active = false
    }
  }, [tab, clientId, documentsLoaded])

  if (roleLoading) return <ClientRecordsSkeleton />
  // Not a professional: this page has nothing for them, so send them to their own.
  if (!isProfessional) return <Navigate to={Routes.app.user.records} replace />
  if (forbidden) return <NotAssignedPanel />
  if (loading) return <ClientRecordsSkeleton />

  // Denormalized names go stale, so take it from the most recent booking.
  const clientName =
    [...bookings].sort((a, b) => (a.dateKey < b.dateKey ? 1 : -1))[0]?.clientName ??
    records[0]?.clientName ??
    "This client"

  const myRecordCount = records.filter((record) => record.professionalUid === user?.uid).length
  const sharedCount = records.length - myRecordCount

  /**
   * Open this visit's record: a signed one read-only in the viewer, which is where
   * amendments are added; anything else in the editor. The records list is already loaded
   * on this page, so the decision costs no extra read — and if the record isn't in it, the
   * editor's own signed banner still offers the way across.
   */
  const openRecordFor = (booking: TelehealthBooking) => {
    const existing = records.find((record) => record.bookingId === booking.id)
    if (existing?.status === "signed") {
      setOpenRecord(existing)
      return
    }
    setEditorBooking(booking)
  }

  const patchRecord = (updated: VisitRecord) => {
    setRecords((current) => {
      const exists = current.some((record) => record.id === updated.id)
      return exists
        ? current.map((record) => (record.id === updated.id ? updated : record))
        : [updated, ...current]
    })
    setBookings((current) =>
      current.map((booking) =>
        booking.id === updated.bookingId ? { ...booking, hasRecord: true } : booking,
      ),
    )
  }

  return (
    <div className="space-y-6 p-5 sm:p-8">
      <div>
        <Link
          to={Routes.app.user.schedule}
          className="inline-flex items-center gap-1 text-sm font-semibold text-[#657080] hover:text-[#151922]"
        >
          <ChevronLeft className="size-4" />
          Schedule
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-[#151922]">{clientName}</h1>
        <p className="mt-1 text-sm text-[#657080]">
          {bookings.length} visit{bookings.length === 1 ? "" : "s"} with you
          {sharingEnabled && sharedCount > 0
            ? ` · ${sharedCount} record${sharedCount === 1 ? "" : "s"} shared by others`
            : ""}
        </p>
      </div>

      <div className="flex gap-1 overflow-x-auto rounded-xl border border-[#eef1f3] p-1">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={`shrink-0 rounded-lg px-4 py-2 text-sm font-semibold transition ${
              tab === item.id ? "bg-[#e3f8f8] text-[#00898c]" : "text-[#657080] hover:text-[#151922]"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {tab === "records" && (
        <section className="space-y-4">
          {!sharingEnabled && <SharingDisabledPanel clientName={clientName} />}
          <h2 className="text-sm font-semibold text-[#151922]">
            {sharingEnabled ? "All shared records" : "Your records with this client"}
          </h2>
          {records.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-[#e5ecf5] p-8 text-center text-sm text-[#657080]">
              No records yet.
            </p>
          ) : (
            <div className="space-y-3">
              {records.map((record) => (
                <RecordCard
                  key={record.id}
                  record={record}
                  viewerUid={user?.uid ?? null}
                  onOpen={setOpenRecord}
                />
              ))}
            </div>
          )}
        </section>
      )}

      {tab === "health" && (
        <section className="space-y-4">
          {latestIntakeBooking ? (
            <HealthProfileSummary
              profile={snapshot}
              loading={snapshotLoading}
              capturedFor={latestIntakeBooking.dateKey}
              emptyMessage="The client attached a health profile but it has no details in it."
            />
          ) : (
            <p className="rounded-2xl border border-dashed border-[#e5ecf5] p-8 text-center text-sm text-[#657080]">
              This client has not attached health information to any of your bookings.
            </p>
          )}
        </section>
      )}

      {tab === "documents" && (
        <section className="space-y-3">
          <p className="text-sm text-[#657080]">
            Files {clientName} uploaded and chose to share with their care team. Opening one is
            recorded in their access log.
          </p>
          {documentsLoading ? (
            <>
              <Skeleton className="h-20 rounded-2xl" />
              <Skeleton className="h-20 rounded-2xl" />
            </>
          ) : documents.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-[#e5ecf5] p-8 text-center text-sm text-[#657080]">
              No shared documents. The client may have none, or may have kept them private.
            </p>
          ) : (
            documents.map((document) => (
              <button
                key={document.id}
                type="button"
                onClick={() => setOpenDocument(document)}
                className="flex w-full flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#e5ecf5] bg-white p-4 text-left transition hover:border-[#d7dde5]"
              >
                <div className="flex min-w-0 items-start gap-3">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#f5f8fb]">
                    <FileText className="size-4 text-[#657080]" />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-[#151922]">
                      {document.title}
                    </p>
                    <p className="mt-0.5 text-sm text-[#657080]">
                      {MEDICAL_DOCUMENT_CATEGORY_LABELS[document.category]}
                      {document.sizeBytes ? ` · ${formatFileSize(document.sizeBytes)}` : ""}
                      {document.uploadedAt ? ` · ${formatDate(document.uploadedAt)}` : ""}
                    </p>
                    {document.notes && (
                      <p className="mt-1 line-clamp-2 text-sm text-[#657080]">{document.notes}</p>
                    )}
                  </div>
                </div>
                <span className="shrink-0 text-sm font-semibold text-[#00898c]">View</span>
              </button>
            ))
          )}
        </section>
      )}

      {tab === "visits" && (
        <section className="space-y-3">
          {bookings.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-[#e5ecf5] p-8 text-center text-sm text-[#657080]">
              No visits with this client yet.
            </p>
          ) : (
            [...bookings]
              .sort((a, b) => (a.dateKey < b.dateKey ? 1 : -1))
              .map((booking) => {
                const status = rowStatusFor(booking)
                const pill = ROW_STATUS_PILL[status]
                // In-progress visits count: a record can be written while the visit is
                // happening, not only after it (see recordWriteState).
                const canWrite = recordWriteState(booking).block === null
                return (
                  <div
                    key={booking.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#e5ecf5] bg-white p-4"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-[#151922]">{booking.serviceTitle}</p>
                      <p className="mt-0.5 text-sm text-[#657080]">
                        {formatDate(booking.dateKey)} at {minutesToLabel(booking.startMinutes)}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${pill.className}`}
                      >
                        {pill.label}
                      </span>
                      {canWrite && (
                        <button
                          type="button"
                          onClick={() => openRecordFor(booking)}
                          className="text-sm font-semibold text-[#00898c] hover:underline"
                        >
                          {booking.hasRecord ? "Open record" : "Add record"}
                        </button>
                      )}
                      {booking.status === "completed" && (
                        <button
                          type="button"
                          onClick={() => setFollowUpBooking(booking)}
                          className="text-sm font-semibold text-[#151922] hover:underline"
                        >
                          Follow-up
                        </button>
                      )}
                    </div>
                  </div>
                )
              })
          )}
        </section>
      )}

      <RecordViewerDialog
        record={openRecord}
        open={openRecord !== null}
        onOpenChange={(next) => {
          if (!next) setOpenRecord(null)
        }}
        viewerUid={user?.uid ?? null}
        onAmended={patchRecord}
      />

      <RecordEditorDialog
        booking={editorBooking}
        open={editorBooking !== null}
        onOpenChange={(next) => {
          if (!next) setEditorBooking(null)
        }}
        onSaved={patchRecord}
        onAmend={(record) => {
          setEditorBooking(null)
          setOpenRecord(record)
        }}
      />

      <MedicalDocumentViewer
        document={openDocument}
        open={openDocument !== null}
        onOpenChange={(next) => {
          if (!next) setOpenDocument(null)
        }}
      />

      <FollowUpProposalDialog
        booking={followUpBooking}
        open={followUpBooking !== null}
        onOpenChange={(next) => {
          if (!next) setFollowUpBooking(null)
        }}
      />
    </div>
  )
}
