import { useEffect, useState } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { ListCard } from "@/components/app/ListCard"
import { PageHeader } from "@/components/app/PageHeader"
import { StatTile } from "@/components/app/StatTile"
import { StatusBadge } from "@/components/app/StatusBadge"
import { Skeleton } from "@/components/ui/skeleton"
import { useCareFlow } from "@/components/app/useCareFlow"
import { getAuthErrorMessage } from "@/utils/auth"
import { listMyApplications } from "@/utils/careconnect/services/applicationsService"
import {
  APPLICATION_STATUS_LABELS,
  EMPLOYMENT_TYPE_LABELS,
  formatDate,
  formatRelative,
  type Application,
  type ApplicationStats,
} from "@/utils/careconnect/types"

function ApplicationsSkeleton() {
  return (
    <div className="space-y-6 p-5 sm:p-8">
      <Skeleton className="h-6 w-48" />
      <div className="grid gap-4 sm:grid-cols-4">
        <Skeleton className="h-20 rounded-xl" />
        <Skeleton className="h-20 rounded-xl" />
        <Skeleton className="h-20 rounded-xl" />
        <Skeleton className="h-20 rounded-xl" />
      </div>
      <Skeleton className="h-64 rounded-xl" />
    </div>
  )
}

function UserApplications() {
  const [applications, setApplications] = useState<Application[]>([])
  const [stats, setStats] = useState<ApplicationStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    ;(async () => {
      setLoading(true)
      try {
        const result = await listMyApplications()
        if (!active) return
        setApplications(result.applications)
        setStats(result.stats)
      } catch (error) {
        toast.error(getAuthErrorMessage(error))
      } finally {
        if (active) setLoading(false)
      }
    })()
    return () => {
      active = false
    }
  }, [])

  if (loading) return <ApplicationsSkeleton />

  const tiles = [
    { label: "Application submitted", value: String(stats?.total ?? 0) },
    { label: "Under Review", value: String(stats?.under_review ?? 0) },
    {
      label: "Closed/Not Selected",
      value: String((stats?.closed ?? 0) + (stats?.not_selected ?? 0)),
    },
    { label: "Shortlisted", value: String(stats?.shortlisted ?? 0) },
  ]

  return (
    <div className="space-y-6 p-5 sm:p-8">
      <section>
        <h1 className="mb-4 text-xl font-bold">Application overview</h1>
        <div className="grid gap-4 sm:grid-cols-4">
          {tiles.map((tile) => (
            <StatTile key={tile.label} value={tile.value} label={tile.label} />
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-xl font-bold">All applications</h2>
        {applications.length === 0 ? (
          <p className="rounded-xl border border-dashed border-[#e2e2e2] p-10 text-center text-sm text-[#657080]">
            You haven&apos;t applied to any jobs yet.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-[#e2e2e2]">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-[#e2e2e2] text-[#657080]">
                <tr>
                  <th className="px-4 py-3 font-semibold">Position</th>
                  <th className="px-4 py-3 font-semibold">Employer</th>
                  <th className="px-4 py-3 font-semibold">Location</th>
                  <th className="px-4 py-3 font-semibold">Applied On</th>
                  <th className="px-4 py-3 font-semibold">Employment Type</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Last Updated</th>
                  <th className="px-4 py-3 font-semibold">Action</th>
                </tr>
              </thead>
              <tbody>
                {applications.map((application) => (
                  <tr key={application.id} className="border-b border-[#eef1f3] last:border-0">
                    <td className="px-4 py-3 font-medium">{application.jobTitle}</td>
                    <td className="px-4 py-3 text-[#565656]">{application.employer}</td>
                    <td className="px-4 py-3 text-[#565656]">{application.location}</td>
                    <td className="px-4 py-3 text-[#565656]">{formatDate(application.createdAt)}</td>
                    <td className="px-4 py-3 text-[#565656]">{EMPLOYMENT_TYPE_LABELS[application.employmentType]}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={APPLICATION_STATUS_LABELS[application.status]} />
                    </td>
                    <td className="px-4 py-3 text-[#565656]">{formatRelative(application.updatedAt)}</td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => toast(`Viewing application for ${application.jobTitle}`)}
                        className="font-semibold text-[#087fff] hover:underline"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {applications.length > 0 && (
          <div className="mt-4 flex items-center justify-between">
            <p className="text-sm text-[#657080]">Page 1 of 1</p>
            <div className="flex items-center gap-2">
              <button type="button" disabled className="flex size-8 items-center justify-center rounded-lg border border-[#e2e2e2] text-[#c4c9d0]">
                <ChevronLeft className="size-4" />
              </button>
              <button type="button" className="flex size-8 items-center justify-center rounded-lg border border-[#087fff] bg-[#087fff] text-sm font-semibold text-white">
                1
              </button>
              <button type="button" disabled className="flex size-8 items-center justify-center rounded-lg border border-[#e2e2e2] text-[#c4c9d0]">
                <ChevronRight className="size-4" />
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  )
}

function AgencyApplications() {
  const [applications, setApplications] = useState<Application[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    ;(async () => {
      setLoading(true)
      try {
        const result = await listMyApplications()
        if (active) setApplications(result.applications)
      } catch (error) {
        toast.error(getAuthErrorMessage(error))
      } finally {
        if (active) setLoading(false)
      }
    })()
    return () => {
      active = false
    }
  }, [])

  const stageCount = (statuses: Application["status"][]) =>
    applications.filter((application) => statuses.includes(application.status)).length

  const pipeline = [
    {
      title: "New",
      statuses: ["submitted", "received"] as Application["status"][],
      detail: "Awaiting first review and credential checks.",
    },
    {
      title: "Interviewing",
      statuses: ["under_review", "shortlisted", "interviewing"] as Application["status"][],
      detail: "In review with hiring managers.",
    },
    {
      title: "Offer stage",
      statuses: ["offer"] as Application["status"][],
      detail: "Compensation and start dates pending.",
    },
  ]

  return (
    <div>
      <PageHeader
        title="Applications"
        description="Track applicants from screening through offer, with credential status visible at every stage."
        actions={<Button className="bg-[#087fff]">Export pipeline</Button>}
      />

      {loading ? (
        <div className="grid gap-4 p-5 sm:p-8 xl:grid-cols-3">
          <Skeleton className="h-32 rounded-xl" />
          <Skeleton className="h-32 rounded-xl" />
          <Skeleton className="h-32 rounded-xl" />
        </div>
      ) : (
        <div className="grid gap-4 p-5 sm:p-8 xl:grid-cols-3">
          {pipeline.map((stage) => (
            <ListCard key={stage.title} title={stage.title} meta={`${stageCount(stage.statuses)} applicants`}>
              {stage.detail}
            </ListCard>
          ))}
        </div>
      )}
    </div>
  )
}

export default function ApplicationsPage() {
  const { flow } = useCareFlow()

  return (
    <div className="animate-fade-in-up">
      {flow === "agency" ? <AgencyApplications /> : <UserApplications />}
    </div>
  )
}
