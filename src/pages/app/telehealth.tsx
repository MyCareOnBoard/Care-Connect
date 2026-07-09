import { Button } from "@/components/ui/button"
import { ListCard } from "@/components/app/ListCard"
import { PageHeader } from "@/components/app/PageHeader"
import { useCareFlow } from "@/components/app/useCareFlow"

export default function TelehealthPage() {
  const { flow } = useCareFlow()
  const isAgency = flow === "agency"
  const sessions = isAgency
    ? [
        ["Today, 9:00 AM", "Clinician assigned", "Chronic-care check-in with backup coverage ready."],
        ["Today, 1:30 PM", "Needs assignment", "Medication review requires RN coverage."],
        ["Tomorrow, 8:00 AM", "Confirmed", "Family consultation with care coordinator."],
      ]
    : [
        ["Friday, 10:30 AM", "Ready", "Virtual visit with Northside Clinic."],
        ["Monday, 2:00 PM", "Device check", "Pre-shift telehealth setup review."],
        ["Wednesday, 4:15 PM", "Available slot", "Open availability for triage coverage."],
      ]

  return (
    <div>
      <PageHeader
        title="Tele health"
        description={
          isAgency
            ? "Schedule virtual care sessions, assign clinicians, and keep every visit coverage-ready."
            : "Manage secure virtual visits, availability, and device readiness from your care workspace."
        }
        actions={<Button className="bg-[#087fff]">{isAgency ? "Schedule session" : "Join waiting room"}</Button>}
      />

      <div className="grid gap-4 p-5 sm:p-8 xl:grid-cols-3">
        {sessions.map(([title, meta, detail]) => (
          <ListCard key={title} title={title} meta={meta}>
            {detail}
          </ListCard>
        ))}
      </div>
    </div>
  )
}
