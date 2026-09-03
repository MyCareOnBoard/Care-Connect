import { useEffect, useState } from "react"
import { toast } from "sonner"
import { Download, FileText } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { getAuthErrorMessage } from "@/utils/auth"
import {
  downloadMedicalDocument,
  fetchMedicalDocumentBlobUrl,
} from "@/utils/careconnect/services/clinicalService"
import {
  MEDICAL_DOCUMENT_CATEGORY_LABELS,
  formatFileSize,
  formatRelative,
  isViewableInline,
  type MedicalDocument,
} from "@/utils/careconnect/types"

/**
 * Renders one medical document.
 *
 * The file has no URL — it is private in storage and served only through an
 * authorized, audited endpoint — so it cannot be dropped into an `<img src>` or
 * an `<iframe src>` directly. The bytes are fetched with the auth header and
 * turned into a blob URL, which this component owns and must revoke.
 *
 * Used by both the client (their own documents) and the professional (a client's
 * care-team-visible ones); the server decides, so there is no role prop.
 */
export function MedicalDocumentViewer({
  document: medicalDocument,
  open,
  onOpenChange,
}: {
  document: MedicalDocument | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [failed, setFailed] = useState(false)
  const [downloading, setDownloading] = useState(false)

  const documentId = medicalDocument?.id ?? null
  const inline = isViewableInline(medicalDocument?.contentType)

  useEffect(() => {
    if (!open || !documentId || !inline) return
    let active = true
    // Held locally as well as in state: the cleanup below runs after state has
    // been torn down, so it needs its own reference to revoke.
    let created: string | null = null

    setLoading(true)
    setFailed(false)
    fetchMedicalDocumentBlobUrl(documentId)
      .then((url) => {
        created = url
        if (active) {
          setBlobUrl(url)
        } else {
          // Unmounted mid-flight — revoke immediately rather than leaking.
          URL.revokeObjectURL(url)
        }
      })
      .catch(() => {
        if (active) setFailed(true)
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
      if (created) URL.revokeObjectURL(created)
      setBlobUrl(null)
    }
  }, [open, documentId, inline])

  if (!medicalDocument) return null

  const isPdf =
    medicalDocument.contentType === "application/pdf" ||
    medicalDocument.contentType === "application/x-pdf"

  const download = async () => {
    setDownloading(true)
    try {
      await downloadMedicalDocument(medicalDocument.id, medicalDocument.fileName)
    } catch (error) {
      toast.error(getAuthErrorMessage(error))
    } finally {
      setDownloading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton className="p-0 max-w-180">
        <DialogHeader className="px-6 pt-6 text-left">
          <DialogTitle className="text-xl font-semibold text-[#151922]">
            {medicalDocument.title}
          </DialogTitle>
          <p className="mt-1 text-sm text-[#657080]">
            {MEDICAL_DOCUMENT_CATEGORY_LABELS[medicalDocument.category]}
            {medicalDocument.sizeBytes ? ` · ${formatFileSize(medicalDocument.sizeBytes)}` : ""}
            {medicalDocument.uploadedAt
              ? ` · added ${formatRelative(medicalDocument.uploadedAt)}`
              : ""}
          </p>
        </DialogHeader>

        <DialogBody className="max-h-[70vh] space-y-4 overflow-y-auto px-6 pt-4 pb-6">
          {medicalDocument.notes && (
            <p className="rounded-xl bg-[#f5f8fb] px-4 py-3 text-sm text-[#151922]">
              {medicalDocument.notes}
            </p>
          )}

          {!inline ? (
            <div className="rounded-xl border border-dashed border-[#e5ecf5] p-8 text-center">
              <FileText className="mx-auto size-6 text-[#657080]" />
              <p className="mt-3 text-sm font-semibold text-[#151922]">
                This file type cannot be previewed
              </p>
              <p className="mt-1 text-sm text-[#657080]">
                Download it to open in another app.
              </p>
            </div>
          ) : loading ? (
            <Skeleton className="h-96 rounded-xl" />
          ) : failed || !blobUrl ? (
            <div className="rounded-xl border border-dashed border-[#e5ecf5] p-8 text-center">
              <p className="text-sm font-semibold text-[#151922]">Could not open this document</p>
              <p className="mt-1 text-sm text-[#657080]">
                It may have been deleted, or your access may have changed.
              </p>
            </div>
          ) : isPdf ? (
            <object
              data={blobUrl}
              type="application/pdf"
              className="h-[60vh] w-full rounded-xl border border-[#eef1f3]"
              aria-label={medicalDocument.title}
            >
              <p className="p-4 text-sm text-[#657080]">
                Your browser cannot display this PDF. Download it instead.
              </p>
            </object>
          ) : (
            <img
              src={blobUrl}
              alt={medicalDocument.title}
              className="max-h-[60vh] w-full rounded-xl border border-[#eef1f3] object-contain"
            />
          )}
        </DialogBody>

        <div className="flex justify-end border-t border-[#eef1f3] px-6 py-4">
          <Button variant="outline" disabled={downloading} onClick={download}>
            <Download className="size-4" />
            {downloading ? "Preparing..." : "Download"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
