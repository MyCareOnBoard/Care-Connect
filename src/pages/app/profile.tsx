import { Button } from "@/components/ui/button"
import { useCareFlow } from "@/components/app/useCareFlow"

export default function ProfilePage() {
  const { flow } = useCareFlow()
  const isAgency = flow === "agency"

  return (
    <div className="px-[30px] pb-10 pt-4">
      <section className="rounded-[28px] border border-[#d6d6d6] bg-white p-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
          <span className="flex size-20 items-center justify-center rounded-full bg-[#d6e6f2]">
            <span className="size-12 rounded-full bg-[#6b9cca]" />
          </span>
          <div className="flex-1">
            <h1 className="text-3xl font-bold">{isAgency ? "CareConnect Agency" : "Joseph Eshun"}</h1>
            <p className="mt-2 text-sm text-[#565656]">
              {isAgency ? "Healthcare staffing and care operations" : "Registered Nurse | CareConnect professional"}
            </p>
          </div>
          <Button className="h-11 bg-[#087fff] px-6">Edit profile</Button>
        </div>
      </section>
    </div>
  )
}
