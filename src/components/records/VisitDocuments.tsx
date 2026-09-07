import { useEffect, useRef, useState } from "react"
import { toast } from "sonner"
import { FileText, Paperclip, Trash2 } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { MedicalDocumentViewer } from "@/components/health/MedicalDocumentViewer"
import { getApiErrorStatus, getAuthErrorMessage } from "@/utils/auth"
import {
  attachVisitDocument,
  deleteMedicalDocument,
  listMedicalDocuments,
} from "@/utils/careconnect/services/clinicalService"
import {
  MEDICAL_DOCUMENT_CATEGORY_LABELS,
  formatDate,
  formatFileSize,
  type MedicalDocument,
} from "@/utils/careconnect/types"

/**
 * Documents attached to one visit — a lab result, a wound photograph, a discharge summary.
 *
 * A service can be a lab test, so the record needs somewhere for the evidence to live. The
 * professional attaches; the client and every professional treating them can read. That
 * split is the server's (`care_team` visibility plus `canReadMedicalDocument`), not this
 * component's — this only decides what to offer.
 *
 * Two things it deliberately does not do:
 *
 *   - It does not offer the client an upload here. They have their own Documents area for
 *     their own files; this panel is the visit's clinical attachments.
 *   - It does not offer the client a delete. A clinician's attachment is part of the
 *     account of the visit, for the same reason a signed record is immutable, and the
 *     server refuses it — so showing the control would only produce a 403.
 */
export function VisitDocuments({
  bookingId,
  clientId,
  canAttach,
  viewerUid,
}: {
  bookingId: string
  clientId: string
  /** True for the assigned professional — the only party who may attach. */
  canAttach: boolean
  viewerUid: string | null
}) {
  const [documents, setDocuments] = useState<MedicalDocument[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [blocked, setBlocked] = useState(false)
  // The viewer streams the bytes through an authorized request — these objects have no
  // public URL by design, so a plain <a href> or <img src> cannot reach them.
  const [openDocument, setOpenDocument] = useState<MedicalDocument | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)

  const load = async () => {
    try {
      const all = await listMedicalDocuments({ clientId })
      // Only this visit's attachments. The client's own library is their own screen.
      setDocuments(all.filter((document) => document.bookingId === bookingId))
      setBlocked(false)
    } catch (error) {
      // A 403 means no treating relationship — a normal state, not a failure worth a toast.
      if (getApiErrorStatus(error) === 403) setBlocked(true)
      setDocuments([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let active = true
    setLoading(true)
    void load().then(() => {
      if (!active) return
    })
    return () => {
      active = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookingId, clientId])

  const attach = async (file: File) => {
    setUploading(true)
    try {
      await attachVisitDocument(bookingId, file)
      await load()
      toast.success("Document attached")
    } catch (error) {
      toast.error(getAuthErrorMessage(error))
    } finally {
      setUploading(false)
      if (fileInput.current) fileInput.current.value = ""
    }
  }

  const remove = async (document: MedicalDocument) => {
    try {
      await deleteMedicalDocument(document.id)
      await load()
      toast.success("Document removed")
    } catch (error) {
      // 403 here means the visit's record has been signed, so the attachment now stands.
      toast.error(getAuthErrorMessage(error))
    }
  }

  if (blocked) return null

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium text-[#151922]">Documents from this visit</p>
        {canAttach && (
          <>
            <input
              ref={fileInput}
              type="file"
              accept=".pdf,.png,.jpg,.jpeg,.webp,.heic"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0]
                if (file) void attach(file)
              }}
            />
            <button
              type="button"
              disabled={uploading}
              onClick={() => fileInput.current?.click()}
              className="flex items-center gap-1.5 text-sm font-semibold text-[#00898c] hover:opacity-80 disabled:opacity-50"
            >
              <Paperclip className="size-4" />
              {uploading ? "Attaching…" : "Attach a document"}
            </button>
          </>
        )}
      </div>

      <p className="mt-1 text-sm text-[#657080]">
        {canAttach
          ? "Lab results, images or summaries. Visible to your client and to the professionals treating them."
          : "Shared with you by the professionals treating you."}
      </p>

      {loading ? (
        <Skeleton className="mt-3 h-14 rounded-xl" />
      ) : documents.length === 0 ? (
        <p className="mt-3 rounded-xl border border-dashed border-[#e5ecf5] p-4 text-center text-sm text-[#657080]">
          No documents attached to this visit.
        </p>
      ) : (
        <ul className="mt-3 space-y-2">
          {documents.map((document) => (
            <li
              key={document.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#eef1f3] px-4 py-3"
            >
              <div className="flex min-w-0 items-start gap-2">
                <FileText className="mt-0.5 size-4 shrink-0 text-[#00898c]" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-[#151922]">{document.title}</p>
                  <p className="mt-0.5 text-xs text-[#657080]">
                    {MEDICAL_DOCUMENT_CATEGORY_LABELS[document.category] ?? document.category}
                    {document.sizeBytes ? ` · ${formatFileSize(document.sizeBytes)}` : ""}
                    {document.uploadedByName ? ` · ${document.uploadedByName}` : ""}
                    {document.uploadedAt ? ` · ${formatDate(document.uploadedAt)}` : ""}
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <button
                  type="button"
                  onClick={() => setOpenDocument(document)}
                  className="text-sm font-semibold text-[#00898c] hover:opacity-80"
                >
                  View
                </button>
                {/* Only the uploader, and the server still refuses once the record is
                    signed — so this can disappear from under them, which is correct. */}
                {document.uploadedByUid === viewerUid && (
                  <button
                    type="button"
                    onClick={() => void remove(document)}
                    aria-label={`Remove ${document.title}`}
                    className="text-[#ff3e66] hover:opacity-80"
                  >
                    <Trash2 className="size-4" />
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      <MedicalDocumentViewer
        document={openDocument}
        open={openDocument !== null}
        onOpenChange={(next) => {
          if (!next) setOpenDocument(null)
        }}
      />
    </div>
  )
}
