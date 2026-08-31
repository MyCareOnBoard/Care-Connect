import { FileText } from "lucide-react"
import { formatDate, type VisitRecord } from "@/utils/careconnect/types"

/**
 * One visit record in a history list.
 *
 * Refuses to render a draft to anyone but its author, independently of the
 * server filter and the list-level filter. Belt and braces on purpose: the
 * failure mode is a client reading a half-formed clinical impression as fact.
 */
export function RecordCard({
  record,
  viewerUid,
  onOpen,
}: {
  record: VisitRecord
  viewerUid: string | null
  onOpen: (record: VisitRecord) => void
}) {
  const isAuthor = record.professionalUid === viewerUid
  if (record.status === "draft" && !isAuthor) return null

  const excerpt = (record.visitSummary || "").trim()

  return (
    <button
      type="button"
      onClick={() => onOpen(record)}
      className="w-full rounded-2xl border border-[#e5ecf5] bg-white p-4 text-left transition hover:border-[#d7dde5]"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-[#151922]">{record.serviceTitle}</p>
          <p className="mt-0.5 text-sm text-[#657080]">
            {formatDate(record.visitDateKey)} · {record.professionalName}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1.5">
          {record.status === "draft" ? (
            <span className="rounded-full border border-[#d97a2b] bg-white px-2.5 py-0.5 text-xs font-medium text-[#d97a2b]">
              Draft
            </span>
          ) : (
            <span
              className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${
                isAuthor
                  ? "border-[#00b4b8] bg-white text-[#00898c]"
                  : "border-[#eef1f3] bg-[#f5f8fb] text-[#657080]"
              }`}
            >
              {isAuthor ? "Yours" : "Shared"}
            </span>
          )}
        </div>
      </div>

      {record.careProvided?.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {record.careProvided.slice(0, 4).map((task) => (
            <span
              key={task}
              className="rounded-full bg-[#f5f8fb] px-2.5 py-0.5 text-xs text-[#657080]"
            >
              {task}
            </span>
          ))}
          {record.careProvided.length > 4 && (
            <span className="rounded-full bg-[#f5f8fb] px-2.5 py-0.5 text-xs text-[#657080]">
              +{record.careProvided.length - 4}
            </span>
          )}
        </div>
      )}

      {excerpt && (
        <p className="mt-3 line-clamp-2 text-sm text-[#657080]">{excerpt}</p>
      )}

      {record.amendments && record.amendments.length > 0 && (
        <p className="mt-2 flex items-center gap-1.5 text-xs text-[#657080]">
          <FileText className="size-3.5" />
          {record.amendments.length} amendment{record.amendments.length === 1 ? "" : "s"}
        </p>
      )}
    </button>
  )
}
