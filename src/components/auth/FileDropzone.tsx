import { useRef, useState, type DragEvent } from "react"
import { CloudUpload, File as FileIcon, X } from "lucide-react"

/**
 * Server-side limits this mirrors, from `controllers/uploads.js`:
 *   DOCUMENTS_CONFIG — 10 MB, PDF/JPEG/PNG/WEBP
 *   IMAGE_CONFIG     —  5 MB, JPEG/PNG/WEBP
 * Client checks are a courtesy, not the gate — the server still validates every upload.
 * Their job is to fail fast with a useful message instead of a round-trip to a 400.
 */
const DEFAULT_ACCEPT = ".pdf,.png,.jpg,.jpeg,.webp"
const DEFAULT_MAX_SIZE_MB = 10

type FileDropzoneProps = {
  /** Comma-separated extensions. Enforced here, not just handed to the file picker. */
  accept?: string
  /** Rejected above this size. Keep in step with the endpoint the file is posted to. */
  maxSizeMb?: number
  /** Overrides the hint derived from `accept` + `maxSizeMb`. */
  hint?: string
  file: File | null
  onFileChange: (file: File | null) => void
}

/** ".pdf,.png" -> "PDF, PNG" */
function describeAccept(accept: string): string {
  return accept
    .split(",")
    .map((ext) => ext.trim().replace(/^\./, "").toUpperCase())
    .filter(Boolean)
    .join(", ")
}

function extensionOf(name: string): string {
  const dot = name.lastIndexOf(".")
  return dot === -1 ? "" : name.slice(dot).toLowerCase()
}

/**
 * Why a file was rejected, or null when it's acceptable.
 *
 * Extension rather than MIME type: `accept` is expressed in extensions, and browsers report
 * an empty or wrong `type` often enough (notably for CSV and some Office formats) that
 * trusting it rejects valid files.
 */
function validationError(file: File, accept: string, maxSizeMb: number): string | null {
  const allowed = accept
    .split(",")
    .map((ext) => ext.trim().toLowerCase())
    .filter(Boolean)
  const extension = extensionOf(file.name)

  if (allowed.length && !allowed.includes(extension)) {
    return `${extension || "That file type"} isn't supported. Use ${describeAccept(accept)}.`
  }
  if (file.size > maxSizeMb * 1024 * 1024) {
    const sizeMb = (file.size / (1024 * 1024)).toFixed(1)
    return `That file is ${sizeMb} MB. The limit is ${maxSizeMb} MB.`
  }
  if (file.size === 0) {
    return "That file is empty."
  }
  return null
}

export function FileDropzone({
  accept = DEFAULT_ACCEPT,
  maxSizeMb = DEFAULT_MAX_SIZE_MB,
  hint,
  file,
  onFileChange,
}: FileDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Derived so the stated limit and the enforced one can't drift apart — the previous
  // version's hint was free text, and three call sites advertised 50 MB against a 10 MB API.
  const resolvedHint = hint ?? `${describeAccept(accept)} (Max. ${maxSizeMb} MB)`

  /** Shared by the picker and drag-and-drop, so neither path can skip validation. */
  const selectFile = (candidate: File | null | undefined) => {
    if (!candidate) {
      setError(null)
      onFileChange(null)
      return
    }
    const problem = validationError(candidate, accept, maxSizeMb)
    if (problem) {
      // Keep any previously-valid selection rather than clearing it for a bad attempt.
      setError(problem)
      return
    }
    setError(null)
    onFileChange(candidate)
  }

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setIsDragging(false)
    // Drag-and-drop ignores the input's `accept`, so this path has to validate too —
    // previously it took whatever was dropped, of any type or size.
    selectFile(event.dataTransfer.files?.[0])
  }

  return (
    <div>
      <div
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(event) => event.key === "Enter" && inputRef.current?.click()}
        onDragOver={(event) => {
          event.preventDefault()
          setIsDragging(true)
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={`flex flex-col items-center justify-center gap-2 rounded-b-lg border-2 border-dashed px-4 py-10 text-center transition-colors cursor-pointer ${
          isDragging
            ? "border-[#00b4b8] bg-[#eaf4ff]"
            : error
              ? "border-[#ff3e66] bg-[#fff5f7]"
              : "border-transparent bg-[#f4f4f5]"
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          className="hidden"
          onChange={(event) => {
            selectFile(event.target.files?.[0])
            // Let the same file be re-picked after a rejection.
            event.target.value = ""
          }}
        />

        {file ? (
          <>
            <span className="flex items-center justify-center bg-white rounded-full size-4">
              <FileIcon className="size-5 text-[#00b4b8]" />
            </span>
            <p className="flex items-center gap-2 text-sm">
              <span className="font-medium truncate max-w-70">{file.name}</span>
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation()
                  selectFile(null)
                }}
                className="text-[#565656] hover:text-[#ff3e66]"
                aria-label={`Remove ${file.name}`}
              >
                <X className="size-4" />
              </button>
            </p>
          </>
        ) : (
          <>
            <span className="flex items-center justify-center bg-white rounded-full size-4">
              <CloudUpload className="size-5 text-[#151922]" />
            </span>
            <p className="text-sm">
              <span className="font-semibold text-[#00b4b8]">Click to upload</span>{" "}
              <span className="text-[#151922]">or drag and drop</span>
            </p>
            <p className="text-xs text-[#8a8a8a]">{resolvedHint}</p>
          </>
        )}
      </div>

      {error && (
        <p role="alert" className="mt-2 text-xs text-[#ff3e66]">
          {error}
        </p>
      )}
    </div>
  )
}
