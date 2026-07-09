import { Button } from "@/components/ui/button"
import { ListCard } from "@/components/app/ListCard"
import { PageHeader } from "@/components/app/PageHeader"
import { useCareFlow } from "@/components/app/useCareFlow"

export default function ApplicationsPage() {
  const { flow } = useCareFlow()
  const isAgency = flow === "agency"
  const applications = isAgency
    ? [
        ["New", "18 applicants", "Awaiting first review and credential checks."],
        ["Interviewing", "9 applicants", "Scheduled with hiring managers this week."],
        ["Offer stage", "3 applicants", "Compensation and start dates pending."],
      ]
    : [
        ["Submitted", "3 applications", "Profiles sent and waiting for employer review."],
        ["Interviewing", "2 applications", "Calls scheduled for this week."],
        ["Credential review", "1 application", "BLS certificate pending approval."],
      ]

  return (
    <div>
      <PageHeader
        title="Applications"
        description={
          isAgency
            ? "Track applicants from screening through offer, with credential status visible at every stage."
            : "Monitor where every application stands and what you need to complete next."
        }
        actions={<Button className="bg-[#087fff]">{isAgency ? "Export pipeline" : "Update profile"}</Button>}
      />

      <div className="grid gap-4 p-5 sm:p-8 xl:grid-cols-3">
        {applications.map(([title, meta, detail]) => (
          <ListCard key={title} title={title} meta={meta}>
            {detail}
          </ListCard>
        ))}
      </div>
    </div>
  )
}
