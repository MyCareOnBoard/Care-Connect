import { Button } from "@/components/ui/button"
import { useCareFlow } from "@/components/app/useCareFlow"

const settings = ["Account information", "Notification preferences", "Privacy and security"]

export default function SettingsPage() {
  const { flow } = useCareFlow()
  const isAgency = flow === "agency"

  return (
    <div className="px-[30px] pb-10 pt-4">
      <section className="rounded-[28px] border border-[#d6d6d6] bg-white p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold">Settings</h1>
            <p className="mt-2 text-sm text-[#565656]">
              {isAgency ? "Manage your agency workspace preferences." : "Manage your CareConnect preferences."}
            </p>
          </div>
          <Button className="h-11 bg-[#087fff] px-6">Save changes</Button>
        </div>

        <div className="mt-7 space-y-3">
          {settings.map((item) => (
            <button
              key={item}
              type="button"
              className="flex w-full items-center justify-between rounded-xl border border-[#d6d6d6] bg-white px-4 py-4 text-left text-sm font-semibold"
            >
              {item}
              <span className="text-[#087fff]">Open</span>
            </button>
          ))}
        </div>
      </section>
    </div>
  )
}
