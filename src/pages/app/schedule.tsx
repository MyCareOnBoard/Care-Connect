import { Skeleton } from "@/components/ui/skeleton"
import { useProfessionalMembership } from "@/utils/professional/useProfessionalMembership"
import ProfessionalSchedulePage from "@/pages/app/professional/schedule"
import UserSchedulePage from "@/pages/app/user/schedule"

/**
 * Schedule route entry point — picks the professional or user schedule page.
 * Both live under their own folder (src/pages/app/{professional,user}/schedule.tsx)
 * as fully independent implementations; this just resolves which role is signed in
 * (there's no separate `/professional/*` route prefix — professionals use this same
 * `/user/schedule` URL) before mounting the right one.
 */
export default function SchedulePage() {
  const { isProfessional, loading } = useProfessionalMembership()

  if (loading) {
    return (
      <div className="p-5 space-y-6 sm:p-8">
        <Skeleton className="h-10 w-60" />
        <div className="space-y-4">
          <Skeleton className="h-32 rounded-3xl" />
          <Skeleton className="h-32 rounded-3xl" />
        </div>
      </div>
    )
  }

  return isProfessional ? <ProfessionalSchedulePage /> : <UserSchedulePage />
}
