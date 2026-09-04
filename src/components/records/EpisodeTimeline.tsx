import { useEffect, useState } from "react"
import { FileText, Users } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { getApiErrorStatus, getAuthErrorMessage } from "@/utils/auth"
import { getCareEpisode } from "@/utils/careconnect/services/clinicalService"
import { formatDate, minutesToLabel, type CareEpisode } from "@/utils/careconnect/types"

/**
 * One course of care, as a thread.
 *
 * Answers the question a clinician picking up a referral actually has — "what has already
 * happened to this person, and who has seen them" — without pretending to answer the next
 * one. It shows *that* a visit produced a record, never the record: content still comes
 * from the records list, under the client's sharing consent. So a professional can see
 * there are three prior notes they cannot read, which is the honest state and the thing
 * that makes it worth asking the client for access.
 *
 * A 403 is a normal outcome, not an error: it means the viewer was not part of this
 * episode. It renders as an explanation rather than a failure.
 */
export function EpisodeTimeline({
  episodeId,
  currentBookingId,
}: {
  episodeId: string
  /** Marked in the list so the reader can place themselves in the thread. */
  currentBookingId?: string
}) {
  const [episode, setEpisode] = useState<CareEpisode | null>(null)
  const [loading, setLoading] = useState(true)
  const [blocked, setBlocked] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    setLoading(true)
    setBlocked(false)
    setError(null)
    getCareEpisode(episodeId)
      .then((data) => {
        if (active) setEpisode(data)
      })
      .catch((requestError) => {
        if (!active) return
        if (getApiErrorStatus(requestError) === 403) {
          setBlocked(true)
          return
        }
        setError(getAuthErrorMessage(requestError))
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [episodeId])

  if (loading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-14 rounded-xl" />
        <Skeleton className="h-14 rounded-xl" />
      </div>
    )
  }

  if (blocked) {
    return (
      <p className="rounded-xl bg-[#fdf3e3] px-4 py-3 text-sm text-[#8a6d1f]">
        You are not part of this course of care, so its history is not shown.
      </p>
    )
  }

  if (error) {
    return <p className="text-sm text-[#657080]">{error}</p>
  }

  if (!episode || episode.visits.length === 0) {
    return <p className="text-sm text-[#657080]">No visits in this course of care yet.</p>
  }

  const withRecords = episode.visits.filter((visit) => visit.hasRecord).length

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[#657080]">
        <span>
          {episode.visits.length} visit{episode.visits.length === 1 ? "" : "s"}
        </span>
        <span className="flex items-center gap-1">
          <FileText className="size-3.5" />
          {withRecords} with a record
        </span>
        {episode.careTeam.length > 1 && (
          <span className="flex items-center gap-1">
            <Users className="size-3.5" />
            {episode.careTeam.length} professionals
          </span>
        )}
      </div>

      <ol className="space-y-2">
        {episode.visits.map((visit) => {
          const isCurrent = visit.bookingId === currentBookingId
          return (
            <li
              key={visit.bookingId}
              className={`rounded-xl border px-4 py-3 ${
                isCurrent ? "border-[#00b4b8] bg-[#f2fbfb]" : "border-[#eef1f3] bg-white"
              }`}
            >
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                <p className="text-sm font-semibold text-[#151922]">
                  {visit.serviceTitle || "Visit"}
                  {isCurrent && (
                    <span className="ml-2 text-xs font-medium text-[#00898c]">this visit</span>
                  )}
                </p>
                <p className="text-xs text-[#657080]">
                  {visit.dateKey ? formatDate(visit.dateKey) : "Date not set"}
                  {visit.startMinutes !== null ? ` · ${minutesToLabel(visit.startMinutes)}` : ""}
                </p>
              </div>
              <p className="mt-0.5 text-sm text-[#657080]">
                {visit.professionalName || "Professional not assigned"}
                {visit.agencyName ? ` · ${visit.agencyName}` : ""}
              </p>
              <div className="mt-1.5 flex items-center gap-3 text-xs text-[#657080]">
                <span className="capitalize">{visit.status || "unknown"}</span>
                {/* Says a record exists; says nothing about what is in it. */}
                {visit.hasRecord && (
                  <span className="flex items-center gap-1 text-[#00898c]">
                    <FileText className="size-3.5" />
                    Record signed
                  </span>
                )}
                {visit.followUpOf && <span>Follow-up</span>}
              </div>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
