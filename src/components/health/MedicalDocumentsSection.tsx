import { useEffect, useState } from "react"
import { toast } from "sonner"
import { Eye, FileText, Info, Lock, Plus, Trash2, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
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
import { FileDropzone } from "@/components/auth/FileDropzone"
import { MedicalDocumentViewer } from "@/components/health/MedicalDocumentViewer"
import { getAuthErrorMessage } from "@/utils/auth"
import {
  deleteMedicalDocument,
  listMedicalDocuments,
  updateMedicalDocument,
  uploadMedicalDocument,
} from "@/utils/careconnect/services/clinicalService"
import {
  MEDICAL_DOCUMENT_ACCEPT,
  MEDICAL_DOCUMENT_CATEGORIES,
  MEDICAL_DOCUMENT_CATEGORY_LABELS,
  formatFileSize,
  formatRelative,
  type MedicalDocument,
  type MedicalDocumentCategory,
  type MedicalDocumentVisibility,
} from "@/utils/careconnect/types"

/**
 * The client's own medical records — upload, view, share or hide, delete.
 *
 * Entirely optional: an empty state is a perfectly good outcome, so nothing here
 * nags and no other flow depends on a document existing.
 *
 * The files are never public. There is no URL to copy or share, by design; a
 * document is read by streaming it through an authorized endpoint, which is why
 * viewing is a button rather than a link.
 */

const ACCEPT_LABEL = "PDF or photo, up to 10MB"

function VisibilityPill({ visibility }: { visibility: MedicalDocumentVisibility }) {
  const shared = visibility === "care_team"
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium ${
        shared
          ? "border-[#00b4b8] bg-white text-[#00898c]"
          : "border-[#eef1f3] bg-[#f5f8fb] text-[#657080]"
      }`}
    >
      {shared ? <Users className="size-3" /> : <Lock className="size-3" />}
      {shared ? "Care team" : "Private"}
    </span>
  )
}

function UploadForm({
  onUploaded,
  onCancel,
}: {
  onUploaded: (document: MedicalDocument) => void
  onCancel: () => void
}) {
  const [file, setFile] = useState<File | null>(null)
  const [title, setTitle] = useState("")
  const [category, setCategory] = useState<MedicalDocumentCategory>("other")
  const [visibility, setVisibility] = useState<MedicalDocumentVisibility>("care_team")
  const [notes, setNotes] = useState("")
  const [uploading, setUploading] = useState(false)

  const submit = async () => {
    if (!file) return
    setUploading(true)
    try {
      const created = await uploadMedicalDocument(file, { title, category, visibility, notes })
      onUploaded(created)
      toast.success("Document added")
    } catch (error) {
      toast.error(getAuthErrorMessage(error))
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="space-y-4 rounded-xl border border-[#eef1f3] p-4">
      <FileDropzone
        accept={MEDICAL_DOCUMENT_ACCEPT}
        maxSizeMb={10}
        hint={ACCEPT_LABEL}
        file={file}
        onFileChange={setFile}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-[#151922]">Title</label>
          <Input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder={file ? file.name : "e.g. Blood test, March"}
            className="h-11"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-[#151922]">What is it?</label>
          <Select
            value={category}
            onValueChange={(next) => setCategory(next as MedicalDocumentCategory)}
          >
            <SelectTrigger className="h-11 w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MEDICAL_DOCUMENT_CATEGORIES.map((option) => (
                <SelectItem key={option} value={option}>
                  {MEDICAL_DOCUMENT_CATEGORY_LABELS[option]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <p className="mb-2 text-sm font-medium text-[#151922]">Who can see it?</p>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setVisibility("care_team")}
            className={`rounded-xl border px-4 py-2 text-sm font-semibold transition ${
              visibility === "care_team"
                ? "border-[#00b4b8] bg-[#e3f8f8] text-[#00b4b8]"
                : "border-[#eef1f3] text-[#151922]"
            }`}
          >
            My care team
          </button>
          <button
            type="button"
            onClick={() => setVisibility("private")}
            className={`rounded-xl border px-4 py-2 text-sm font-semibold transition ${
              visibility === "private"
                ? "border-[#00b4b8] bg-[#e3f8f8] text-[#00b4b8]"
                : "border-[#eef1f3] text-[#151922]"
            }`}
          >
            Only me
          </button>
        </div>
        <p className="mt-2 text-sm text-[#657080]">
          {visibility === "care_team"
            ? "Professionals you have a booking with can open this."
            : "Nobody else can open it, or see that it exists. You can change this later."}
        </p>
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-[#151922]">
          Anything to add? (optional)
        </label>
        <Textarea
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          placeholder="e.g. From my GP, after the follow-up in March."
          className="min-h-20"
        />
      </div>

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onCancel} disabled={uploading}>
          Cancel
        </Button>
        <Button
          className="bg-[#00b4b8] text-white hover:opacity-90"
          disabled={!file || uploading}
          onClick={submit}
        >
          {uploading ? "Uploading..." : "Add document"}
        </Button>
      </div>
    </div>
  )
}

function DocumentRow({
  document,
  onView,
  onChanged,
  onDeleted,
}: {
  document: MedicalDocument
  onView: (document: MedicalDocument) => void
  onChanged: (document: MedicalDocument) => void
  onDeleted: (id: string) => void
}) {
  const [busy, setBusy] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const toggleVisibility = async () => {
    const next: MedicalDocumentVisibility =
      document.visibility === "care_team" ? "private" : "care_team"
    setBusy(true)
    try {
      onChanged(await updateMedicalDocument(document.id, { visibility: next }))
      toast.success(next === "care_team" ? "Shared with your care team" : "Made private")
    } catch (error) {
      toast.error(getAuthErrorMessage(error))
    } finally {
      setBusy(false)
    }
  }

  const remove = async () => {
    setBusy(true)
    try {
      await deleteMedicalDocument(document.id)
      onDeleted(document.id)
      toast.success("Document deleted")
    } catch (error) {
      toast.error(getAuthErrorMessage(error))
    } finally {
      setBusy(false)
      setConfirmDelete(false)
    }
  }

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#eef1f3] p-4">
        <div className="flex min-w-0 items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#f5f8fb]">
            <FileText className="size-4 text-[#657080]" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-[#151922]">{document.title}</p>
            <p className="mt-0.5 text-sm text-[#657080]">
              {MEDICAL_DOCUMENT_CATEGORY_LABELS[document.category]}
              {document.sizeBytes ? ` · ${formatFileSize(document.sizeBytes)}` : ""}
              {document.uploadedAt ? ` · ${formatRelative(document.uploadedAt)}` : ""}
            </p>
            {document.notes && (
              <p className="mt-1 line-clamp-2 text-sm text-[#657080]">{document.notes}</p>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <VisibilityPill visibility={document.visibility} />
          <button
            type="button"
            onClick={() => onView(document)}
            className="flex items-center gap-1.5 text-sm font-semibold text-[#00898c] hover:opacity-80"
          >
            <Eye className="size-4" />
            View
          </button>
          <button
            type="button"
            onClick={toggleVisibility}
            disabled={busy}
            className="text-sm font-semibold text-[#151922] hover:underline disabled:opacity-40"
          >
            {document.visibility === "care_team" ? "Make private" : "Share"}
          </button>
          <button
            type="button"
            onClick={() => setConfirmDelete(true)}
            disabled={busy}
            aria-label={`Delete ${document.title}`}
            className="text-[#657080] transition hover:text-[#ff3e66] disabled:opacity-40"
          >
            <Trash2 className="size-4" />
          </button>
        </div>
      </div>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this document?</AlertDialogTitle>
            <AlertDialogDescription>
              {document.title} will be permanently deleted. This cannot be undone, and any
              professional who could see it will lose access straight away.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep it</AlertDialogCancel>
            <AlertDialogAction onClick={remove}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

export function MedicalDocumentsSection() {
  const [loading, setLoading] = useState(true)
  const [documents, setDocuments] = useState<MedicalDocument[]>([])
  const [adding, setAdding] = useState(false)
  const [viewing, setViewing] = useState<MedicalDocument | null>(null)

  useEffect(() => {
    let active = true
    listMedicalDocuments()
      .then((list) => {
        if (active) setDocuments(list)
      })
      .catch(() => {
        if (active) setDocuments([])
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  return (
    <section className="rounded-2xl border border-[#e5ecf5] bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h3 className="text-base font-semibold text-[#151922]">My medical records</h3>
          <p className="mt-1 text-sm text-[#657080]">
            Optional. Upload results, letters or discharge notes so a professional can read them
            before your visit.
          </p>
        </div>
        {!adding && (
          <Button
            variant="outline"
            className="border-[#00b4b8] text-[#00b4b8] hover:bg-[#e3f8f8]"
            onClick={() => setAdding(true)}
          >
            <Plus className="size-4" />
            Add a document
          </Button>
        )}
      </div>

      <p className="mt-4 flex items-start gap-2 rounded-xl bg-[#f5f8fb] px-4 py-3 text-sm text-[#657080]">
        <Info className="mt-0.5 size-4 shrink-0" />
        <span>
          These files are stored privately. There is no shareable link — they can only be opened
          from inside CareConnect, and every time a professional opens one it is recorded in your
          access log.
        </span>
      </p>

      <div className="mt-5 space-y-3">
        {adding && (
          <UploadForm
            onCancel={() => setAdding(false)}
            onUploaded={(created) => {
              setDocuments((current) => [created, ...current])
              setAdding(false)
            }}
          />
        )}

        {loading ? (
          <>
            <Skeleton className="h-20 rounded-xl" />
            <Skeleton className="h-20 rounded-xl" />
          </>
        ) : documents.length === 0 ? (
          !adding && (
            <p className="rounded-xl border border-dashed border-[#e5ecf5] p-6 text-center text-sm text-[#657080]">
              No documents yet. This is entirely optional — add one whenever it is useful.
            </p>
          )
        ) : (
          documents.map((document) => (
            <DocumentRow
              key={document.id}
              document={document}
              onView={setViewing}
              onChanged={(updated) =>
                setDocuments((current) =>
                  current.map((item) => (item.id === updated.id ? updated : item)),
                )
              }
              onDeleted={(id) =>
                setDocuments((current) => current.filter((item) => item.id !== id))
              }
            />
          ))
        )}
      </div>

      <MedicalDocumentViewer
        document={viewing}
        open={viewing !== null}
        onOpenChange={(next) => {
          if (!next) setViewing(null)
        }}
      />
    </section>
  )
}
