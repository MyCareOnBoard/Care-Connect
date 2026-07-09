import { Button } from "@/components/ui/button"
import { ListCard } from "@/components/app/ListCard"
import { PageHeader } from "@/components/app/PageHeader"
import { useCareFlow } from "@/components/app/useCareFlow"

export default function MessagesPage() {
  const { flow } = useCareFlow()
  const isAgency = flow === "agency"
  const conversations = isAgency
    ? [
        ["Amina Boateng", "Available for the pediatric home-care opening.", "2 min ago"],
        ["Credentialing Team", "Three certifications need review.", "18 min ago"],
        ["Northside Clinic", "Telehealth coverage request approved.", "1 hr ago"],
      ]
    : [
        ["Northside Clinic", "Your interview is confirmed for Thursday.", "5 min ago"],
        ["CareConnect Copilot", "New jobs match your wound-care certification.", "22 min ago"],
        ["BrightPath Agency", "Please upload your BLS certificate.", "Yesterday"],
      ]

  return (
    <div>
      <PageHeader
        title="Messages"
        description={
          isAgency
            ? "Coordinate with applicants, credentialing staff, partner clinics, and assigned care teams."
            : "Keep employer conversations, care-team updates, and AI career guidance in one focused inbox."
        }
        actions={<Button className="bg-[#087fff]">New message</Button>}
      />

      <div className="grid gap-4 p-5 sm:p-8 xl:grid-cols-3">
        {conversations.map(([title, message, time]) => (
          <ListCard key={title} title={title} meta={time}>
            {message}
          </ListCard>
        ))}
      </div>
    </div>
  )
}
