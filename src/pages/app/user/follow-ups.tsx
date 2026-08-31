import { useEffect, useState } from "react"
import { useNavigate } from "react-router"
import { Skeleton } from "@/components/ui/skeleton"
import { FollowUpCard } from "@/components/records/FollowUpCard"
import { Routes } from "@/routes/constants"
import { useProfessionalMembership } from "@/utils/professional/useProfessionalMembership"
import { listFollowUps } from "@/utils/careconnect/services/clinicalService"
import { isFollowUpExpired } from "@/components/records/FollowUpCard"
import type { FollowUp } from "@/utils/careconnect/types"

/**
 * Follow-up proposals.
 *
 * One page for both sides, split by `useProfessionalMembership` the same way
 * `schedule.tsx` does: a client sees proposals awaiting their answer, a
 * professional sees the ones they have offered.
 */
export default function FollowUpsPage() {
  const navigate = useNavigate()
  const { isProfessional, loading: roleLoading } = useProfessionalMembership()
  const [loading, setLoading] = useState(true)
  const [followUps, setFollowUps] = useState<FollowUp[]>([])

  const role = isProfessional ? "professional" : "client"

  useEffect(() => {
    if (roleLoading) return
    let active = true
    setLoading(true)
    listFollowUps({ scope: role })
      .then((list) => {
        if (active) setFollowUps(list)
      })
      .catch(() => {
        if (active) setFollowUps([])
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [roleLoading, role])

  const patch = (updated: FollowUp) => {
    setFollowUps((current) =>
      current.map((item) => (item.id === updated.id ? { ...item, ...updated } : item)),
    )
  }

  // Anything still awaiting an answer floats to the top; a passed slot is not
  // awaiting anything, so it sinks with the rest of the history.
  const awaiting = followUps.filter(
    (item) => item.status === "proposed" && !isFollowUpExpired(item),
  )
  const past = followUps.filter(
    (item) => item.status !== "proposed" || isFollowUpExpired(item),
  )

  if (roleLoading || loading) {
    return (
      <div className="space-y-6 p-5 sm:p-8">
        <Skeleton className="h-9 w-48" />
        <div className="space-y-3">
          {Array.from({ length: 2 }).map((_, index) => (
            <Skeleton key={index} className="h-40 rounded-2xl" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-5 sm:p-8">
      <header>
        <h1 className="text-2xl font-bold text-[#151922]">Follow-ups</h1>
        <p className="mt-1 text-sm text-[#657080]">
          {role === "professional"
            ? "Follow-up visits you have proposed to your clients."
            : "Follow-up visits your professionals have recommended."}
        </p>
      </header>

      {followUps.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-[#e5ecf5] p-8 text-center text-sm text-[#657080]">
          {role === "professional"
            ? "You have not proposed any follow-ups yet. Propose one from a completed booking."
            : "No follow-ups right now."}
        </p>
      ) : (
        <>
          {awaiting.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-sm font-semibold text-[#151922]">
                {role === "professional" ? "Awaiting a response" : "Waiting on you"}
              </h2>
              {awaiting.map((followUp) => (
                <FollowUpCard
                  key={followUp.id}
                  followUp={followUp}
                  role={role}
                  onChanged={patch}
                  onBooked={() => navigate(Routes.app.user.schedule)}
                />
              ))}
            </section>
          )}

          {past.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-sm font-semibold text-[#151922]">Earlier</h2>
              {past.map((followUp) => (
                <FollowUpCard
                  key={followUp.id}
                  followUp={followUp}
                  role={role}
                  onChanged={patch}
                />
              ))}
            </section>
          )}
        </>
      )}
    </div>
  )
}
