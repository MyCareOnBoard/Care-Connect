import { useRef, useState, type DragEvent } from "react"
import { CloudUpload, File as FileIcon, X } from "lucide-react"

type FileDropzoneProps = {
  accept?: string
  hint?: string
  file: File | null
  onFileChange: (file: File | null) => void
}

export function FileDropzone({
  accept = ".pdf,.png,.doc,.docx",
  hint = "PDF, PNG, or Docs (Max. 50 MB)",
  file,
  onFileChange,
}: FileDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setIsDragging(false)
    const droppedFile = event.dataTransfer.files?.[0]
    if (droppedFile) onFileChange(droppedFile)
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
          isDragging ? "border-[#087fff] bg-[#eaf4ff]" : "border-transparent bg-[#f4f4f5]"
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          className="hidden"
          onChange={(event) => onFileChange(event.target.files?.[0] ?? null)}
        />

        {file ? (
          <>
            <span className="flex items-center justify-center bg-white rounded-full size-4">
              <FileIcon className="size-5 text-[#087fff]" />
            </span>
            <p className="flex items-center gap-2 text-sm">
              <span className="font-medium truncate max-w-70">{file.name}</span>
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation()
                  onFileChange(null)
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
              <span className="font-semibold text-[#087fff]">Click to upload</span>{" "}
              <span className="text-[#151922]">or drag and drop</span>
            </p>
            <p className="text-xs text-[#8a8a8a]">{hint}</p>
          </>
        )}
      </div>
    </div>
  )
}
