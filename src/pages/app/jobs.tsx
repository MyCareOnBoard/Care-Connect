import { Button } from "@/components/ui/button"
import { ListCard } from "@/components/app/ListCard"
import { PageHeader } from "@/components/app/PageHeader"
import { useCareFlow } from "@/components/app/useCareFlow"

export default function JobsPage() {
  const { flow } = useCareFlow()
  const isAgency = flow === "agency"
  const jobs = isAgency
    ? [
        ["Registered Nurse - ICU", "24 applicants", "Full-time - Accra Medical Center"],
        ["Home Health Aide", "11 applicants", "Contract - Community care route"],
        ["Telehealth Triage Nurse", "7 applicants", "Remote - Evening coverage"],
      ]
    : [
        ["Registered Nurse - ICU", "92% match", "Full-time - Accra Medical Center"],
        ["Home Health Specialist", "88% match", "Contract - Community route"],
        ["Telehealth Triage Nurse", "84% match", "Remote - Evening coverage"],
      ]

  return (
    <div>
      <PageHeader
        title="Jobs"
        description={
          isAgency
            ? "Create openings, monitor applicant pipelines, and tune role requirements for better matches."
            : "Browse healthcare roles matched to your profile, certifications, availability, and preferred setting."
        }
        actions={<Button className="bg-[#087fff]">{isAgency ? "Create job" : "Save search"}</Button>}
      />

      <div className="grid gap-4 p-5 sm:p-8 xl:grid-cols-3">
        {jobs.map(([title, meta, detail]) => (
          <ListCard key={title} title={title} meta={meta} action={<Button variant="outline">{isAgency ? "Review" : "Apply"}</Button>}>
            {detail}
          </ListCard>
        ))}
      </div>
    </div>
  )
}
