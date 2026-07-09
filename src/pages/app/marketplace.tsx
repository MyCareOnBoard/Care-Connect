import { Button } from "@/components/ui/button"
import { ListCard } from "@/components/app/ListCard"
import { PageHeader } from "@/components/app/PageHeader"
import { useCareFlow } from "@/components/app/useCareFlow"

export default function MarketplacePage() {
  const { flow } = useCareFlow()
  const isAgency = flow === "agency"
  const items = isAgency
    ? [
        ["Featured provider listing", "Agency visibility", "Promote care services to families and referral partners."],
        ["Training bundle", "Team enablement", "Assign CPR, BLS, and dementia-care refreshers to staff."],
        ["Recruiting boost", "Hiring support", "Increase reach for urgent openings across the network."],
      ]
    : [
        ["Certification refreshers", "Career growth", "Find courses for BLS, ACLS, wound care, and home health."],
        ["Professional toolkit", "Profile support", "Resume review, credential storage, and interview preparation."],
        ["Community offers", "Care network", "Services and tools recommended by healthcare peers."],
      ]

  return (
    <div>
      <PageHeader
        title="Market place"
        description={
          isAgency
            ? "Promote services, purchase training support, and discover operational tools for care organizations."
            : "Discover training, career tools, and healthcare services that support your professional growth."
        }
        actions={<Button className="bg-[#087fff]">{isAgency ? "Add listing" : "Browse offers"}</Button>}
      />

      <div className="grid gap-4 p-5 sm:p-8 xl:grid-cols-3">
        {items.map(([title, meta, detail]) => (
          <ListCard key={title} title={title} meta={meta} action={<Button variant="outline">View</Button>}>
            {detail}
          </ListCard>
        ))}
      </div>
    </div>
  )
}
