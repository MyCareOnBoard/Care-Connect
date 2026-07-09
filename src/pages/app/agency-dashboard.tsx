import { BriefcaseBusiness, CalendarCheck, MessageSquareText, UsersRound } from "lucide-react"
import { Button } from "@/components/ui/button"

const metrics = [
  { label: "Open jobs", value: "18", icon: BriefcaseBusiness },
  { label: "New applicants", value: "42", icon: UsersRound },
  { label: "Interviews", value: "9", icon: CalendarCheck },
  { label: "Unread messages", value: "12", icon: MessageSquareText },
]

const roles = [
  ["Registered Nurse - ICU", "24 applicants", "Credential review in progress"],
  ["Home Health Aide", "11 applicants", "Three candidates shortlisted"],
  ["Telehealth Triage Nurse", "7 applicants", "Evening coverage role"],
]

const teams = [
  ["Credentialing", "3 certificates need review"],
  ["Interview panel", "5 interviews scheduled today"],
  ["Care operations", "2 telehealth sessions need backup"],
]

export default function AgencyDashboardPage() {
  return (
    <div className="px-[30px] pb-10 pt-4">
      <section className="rounded-[28px] border border-[#d6d6d6] bg-white p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-3xl font-bold">Agency dashboard</h1>
            <p className="mt-2 text-sm text-[#565656]">
              Manage hiring, applicants, interviews, marketplace listings, and care coverage.
            </p>
          </div>
          <Button className="h-11 bg-[#087fff] px-6">Post a job</Button>
        </div>

        <div className="mt-7 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {metrics.map((metric) => {
            const Icon = metric.icon

            return (
              <article key={metric.label} className="rounded-xl border border-[#d6d6d6] p-4">
                <div className="flex items-center justify-between">
                  <span className="flex size-11 items-center justify-center rounded-full bg-[#eaf4ff] text-[#087fff]">
                    <Icon className="size-5" />
                  </span>
                  <span className="text-sm font-semibold text-[#087fff]">Live</span>
                </div>
                <p className="mt-5 text-3xl font-bold">{metric.value}</p>
                <p className="mt-1 text-sm text-[#565656]">{metric.label}</p>
              </article>
            )
          })}
        </div>
      </section>

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <section>
          <h2 className="mb-4 text-base font-bold">Priority roles</h2>
          <div className="space-y-3">
            {roles.map(([title, count, detail]) => (
              <article key={title} className="rounded-xl border border-[#d6d6d6] bg-white p-5">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h3 className="font-bold">{title}</h3>
                    <p className="mt-1 text-sm text-[#565656]">{detail}</p>
                  </div>
                  <span className="rounded-full bg-[#eaf4ff] px-3 py-1 text-sm font-semibold text-[#087fff]">{count}</span>
                </div>
              </article>
            ))}
          </div>
        </section>

        <aside>
          <h2 className="mb-4 text-base font-bold">Agency tasks</h2>
          <div className="space-y-3">
            {teams.map(([title, detail]) => (
              <article key={title} className="rounded-xl border border-[#d6d6d6] bg-white p-4">
                <h3 className="font-bold">{title}</h3>
                <p className="mt-2 text-sm text-[#565656]">{detail}</p>
              </article>
            ))}
          </div>
        </aside>
      </div>
    </div>
  )
}
