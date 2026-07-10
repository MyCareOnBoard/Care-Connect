import { ChevronLeft, ChevronRight } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { ListCard } from "@/components/app/ListCard"
import { PageHeader } from "@/components/app/PageHeader"
import { StatTile } from "@/components/app/StatTile"
import { StatusBadge } from "@/components/app/StatusBadge"
import { Skeleton } from "@/components/ui/skeleton"
import { useCareFlow } from "@/components/app/useCareFlow"
import { useDelayedLoading } from "@/hooks/useDelayedLoading"

const userStats = [
  { label: "Application submitted", value: "24" },
  { label: "Under Review", value: "8" },
  { label: "Closed/Not Selected", value: "6" },
  { label: "Shortlisted", value: "5" },
]

const userApplications = [
  {
    position: "Registered Nurse (RN)",
    employer: "St. Mary's Hospital",
    location: "Brooklyn, NY",
    appliedOn: "May 18, 2026",
    employmentType: "Full-time",
    status: "Under Review",
    lastUpdated: "2 hours ago",
  },
  {
    position: "Home Health Aide",
    employer: "Sunrise Home Care",
    location: "Queens, NY",
    appliedOn: "May 17, 2026",
    employmentType: "Part-time",
    status: "Application Received",
    lastUpdated: "Yesterday",
  },
  {
    position: "Licensed Practical Nurse",
    employer: "Green Valley Clinic",
    location: "Bronx, NY",
    appliedOn: "May 15, 2026",
    employmentType: "Contract",
    status: "Not Selected",
    lastUpdated: "3 days ago",
  },
  {
    position: "Certified Nursing Assistant",
    employer: "Riverside Care Center",
    location: "Manhattan, NY",
    appliedOn: "May 13, 2026",
    employmentType: "Part-time",
    status: "Closed",
    lastUpdated: "2 days ago",
  },
]

const agencyApplications = [
  ["New", "18 applicants", "Awaiting first review and credential checks."],
  ["Interviewing", "9 applicants", "Scheduled with hiring managers this week."],
  ["Offer stage", "3 applicants", "Compensation and start dates pending."],
]

function UserApplications() {
  return (
    <div className="space-y-6 p-5 sm:p-8">
      <section>
        <h1 className="mb-4 text-xl font-bold">Application overview</h1>
        <div className="grid gap-4 sm:grid-cols-4">
          {userStats.map((stat) => (
            <StatTile key={stat.label} value={stat.value} label={stat.label} />
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-xl font-bold">All applicants</h2>
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
              {userApplications.map((application) => (
                <tr key={application.position} className="border-b border-[#eef1f3] last:border-0">
                  <td className="px-4 py-3 font-medium">{application.position}</td>
                  <td className="px-4 py-3 text-[#565656]">{application.employer}</td>
                  <td className="px-4 py-3 text-[#565656]">{application.location}</td>
                  <td className="px-4 py-3 text-[#565656]">{application.appliedOn}</td>
                  <td className="px-4 py-3 text-[#565656]">{application.employmentType}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={application.status} />
                  </td>
                  <td className="px-4 py-3 text-[#565656]">{application.lastUpdated}</td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => toast(`Viewing application for ${application.position}`)}
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

        <div className="mt-4 flex items-center justify-between">
          <p className="text-sm text-[#657080]">Page 1 of 1</p>
          <div className="flex items-center gap-2">
            <button type="button" disabled className="flex size-8 items-center justify-center rounded-lg border border-[#e2e2e2] text-[#c4c9d0]">
              <ChevronLeft className="size-4" />
            </button>
            <button type="button" className="flex size-8 items-center justify-center rounded-lg border border-[#087fff] bg-[#087fff] text-sm font-semibold text-white">
              1
            </button>
            <button type="button" className="flex size-8 items-center justify-center rounded-lg text-sm font-semibold text-[#657080]">
              2
            </button>
            <button type="button" className="flex size-8 items-center justify-center rounded-lg text-sm font-semibold text-[#657080]">
              3
            </button>
            <button type="button" className="flex size-8 items-center justify-center rounded-lg border border-[#e2e2e2] text-[#565656] transition hover:bg-[#f2f6f8]">
              <ChevronRight className="size-4" />
            </button>
          </div>
        </div>
      </section>
    </div>
  )
}

function AgencyApplications() {
  return (
    <div>
      <PageHeader
        title="Applications"
        description="Track applicants from screening through offer, with credential status visible at every stage."
        actions={<Button className="bg-[#087fff]">Export pipeline</Button>}
      />

      <div className="grid gap-4 p-5 sm:p-8 xl:grid-cols-3">
        {agencyApplications.map(([title, meta, detail]) => (
          <ListCard key={title} title={title} meta={meta}>
            {detail}
          </ListCard>
        ))}
      </div>
    </div>
  )
}

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

export default function ApplicationsPage() {
  const { flow } = useCareFlow()
  const isLoading = useDelayedLoading()

  if (isLoading) return <ApplicationsSkeleton />

  return <div className="animate-fade-in-up">{flow === "agency" ? <AgencyApplications /> : <UserApplications />}</div>
}
