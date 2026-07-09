import { Heart, Image, PlaySquare, Send, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"

const jobs = [
  {
    title: "In Home Caregiver",
    company: "National senior home care",
    location: "4140 Parker Rd. Allentown, New Mexico 31134",
  },
  {
    title: "Synergy HomeCare has Caregiver Opportunities in Cherry Hill, Vorhees...",
    company: "SYNERGY HOMECARE",
    location: "4517 Washington Ave. Manchester, Kentucky 39495",
  },
  {
    title: "Direct Support Professional",
    company: "Assurance care & support Inc",
    location: "Carneys point, NJ 08069",
    tags: ["401(K)", "Flexible schedule"],
  },
]

const agencies = [
  ["HHC Bellevue Hospital...", "Austin , TX", "LA"],
  ["Harlem Hospital Center", "Pasadena, Oklahoma", "HG"],
  ["NYU Langone Medical...", "Great Falls, Maryland", "NY"],
  ["Gracie Square Hospital", "Kent, Utah", "GS"],
]

const professionals = [
  ["Jerome Bell", "Registered Nurse | Ment...", "bg-[#ffc95c]"],
  ["Esther Howard", "Doctor", "bg-[#d193ce]"],
  ["Theresa Webb", "Counsellor", "bg-[#ffc33d]"],
  ["Eleanor Pena", "Psychiatrist", "bg-[#cdbeb5]"],
]

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="font-semibold">{label}</span>
      <span className="rounded-full bg-[#e8eff2] px-1.5 py-0.5 text-xs text-[#20242c]">{value}</span>
    </div>
  )
}

function JobCard({ job }: { job: (typeof jobs)[number] }) {
  return (
    <article className="rounded-xl border border-[#d6d6d6] bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-base font-semibold leading-[1.35]">{job.title}</h3>
        <Heart className="size-5 shrink-0" />
      </div>
      <p className="mt-4 text-sm text-[#20242c]">{job.company}</p>
      <p className="mt-2 text-sm leading-6 text-[#20242c]">{job.location}</p>
      {job.tags && (
        <div className="flex flex-wrap gap-2 mt-2">
          {job.tags.map((tag) => (
            <span key={tag} className="rounded-full bg-[#dddddd] px-3 py-1 text-sm font-semibold text-[#20242c]">
              {tag}
            </span>
          ))}
        </div>
      )}
    </article>
  )
}

function ViewAllLink() {
  return (
    <button type="button" className="mt-4 flex w-full items-center justify-between px-1 text-sm font-semibold text-[#087fff]">
      <span>View all</span>
      <ChevronRight className="size-5" />
    </button>
  )
}

function Avatar({ className = "", initials = "" }: { className?: string; initials?: string }) {
  return (
    <span className={`flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-full ${className || "bg-[#e8f1f7]"}`}>
      <span className="text-xs font-bold text-white">{initials}</span>
    </span>
  )
}

export default function DashboardPage() {
  return (
    <div className="grid min-h-[calc(100vh-72px)] items-start gap-5 px-7.5 pb-10 pt-4 xl:grid-cols-[332px_minmax(560px,680px)_326px]">
      <aside className="space-y-10 xl:sticky xl:top-22 xl:max-h-[calc(100vh-104px)] xl:overflow-y-auto xl:overscroll-contain xl:pr-1 scrollbar-hide">
        <section className="rounded-lg border border-[#d6d6d6] bg-white px-4 py-3">
          <div className="space-y-5">
            <StatRow label="Profile views" value="17" />
            <StatRow label="Application views" value="12" />
          </div>
        </section>

        <section>
          <h2 className="mb-4 text-sm font-semibold">Jobs for you</h2>
          <div className="space-y-3">
            {jobs.map((job) => (
              <JobCard key={job.title} job={job} />
            ))}
          </div>
          <ViewAllLink />
        </section>

        <section className="overflow-hidden rounded-lg bg-[#e9e1ff] p-2">
          <div className="rounded-md border border-[#d5cafa] bg-[linear-gradient(55deg,rgba(92,72,215,0.08)_25%,transparent_25%,transparent_50%,rgba(92,72,215,0.08)_50%,rgba(92,72,215,0.08)_75%,transparent_75%)] bg-size-[36px_36px] px-2 py-3">
            <h2 className="text-2xl font-bold leading-tight text-[#2a0c4a]">Turn your equipment into opportunity</h2>
            <p className="mt-3 text-sm leading-5 text-[#321c47]">
              Have medical equipment or supplies to sell? List them and connect with the right people
            </p>
            <Button className="mt-5 h-11 w-full bg-[#5a4ee0] text-white">Sell an Item</Button>
          </div>
        </section>
      </aside>

      <main className="space-y-8">
        <section className="rounded-[30px] border border-[#d6d6d6] bg-white px-4 py-4">
          <div className="flex items-center gap-4">
            <Avatar className="border border-[#d8d8d8] bg-white" />
            <div className="flex h-13.5 min-w-0 flex-1 items-center rounded-2xl border border-[#d6d6d6] px-4 text-sm text-[#20242c]">
              Share some highlights
            </div>
          </div>
          <div className="flex items-center justify-between mt-4 pl-17">
            <div className="flex gap-2">
              <button type="button" className="flex h-8 items-center gap-1 rounded-lg bg-[#ffdfe8] px-2 text-sm text-[#ff3e66]">
                <Image className="size-5" />
                Image
              </button>
              <button type="button" className="flex h-8 items-center gap-1 rounded-lg bg-[#ddf3ff] px-2 text-sm text-[#149bdd]">
                <PlaySquare className="size-5" />
                Video
              </button>
            </div>
            <Button disabled className="h-10 rounded-lg bg-[#d8d8d8] px-3 text-white opacity-100">
              Post <Send className="size-4" />
            </Button>
          </div>
        </section>

        <article>
          <div className="flex items-start gap-3">
            <Avatar className="bg-[linear-gradient(135deg,#ffd08a,#67a6d9)]" initials="SM" />
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold">Dr. Sarah Mitchell</h2>
                  <p className="mt-1 text-sm text-[#565656]">Registered Nurse | Mental Health Advocate</p>
                </div>
                <Button variant="outline" className="h-10 rounded-full border-[#087fff] px-5 text-[#087fff]">
                  Connect
                </Button>
              </div>

              <div className="mt-5 max-w-162.5 text-sm leading-5">
                <p>Nobody talks about the weight nurses carry home.</p>
                <p>Not the medical charts. Not the missed lunch breaks.</p>
                <p>The weight of the patient who didn&apos;t make it through the night.</p>
                <p>Burnout in healthcare isn&apos;t a weakness.</p>
                <p>It&apos;s what happens when compassionate people give everything - without being given anything back.</p>
                <p>Check on your nurses. Ask your doctors how they&apos;re doing.</p>
                <p>Mental health care is healthcare.</p>
              </div>

              <p className="mt-6 text-sm font-bold">
                #NurseLife #HealthcareWorkers #MentalHealth #BurnoutAwareness
              </p>

              <div className="flex items-center py-12 mt-4 text-white bg-black min-h-114 rounded-t-xl px-11">
                <p className="max-w-145 text-[clamp(54px,6vw,96px)] font-black uppercase leading-[0.98] tracking-normal">
                  Burnout<br />is not a badge<br />of honor
                </p>
              </div>
            </div>
          </div>
        </article>
      </main>

      <aside className="space-y-10 xl:sticky xl:top-22 xl:max-h-[calc(100vh-104px)] xl:overflow-y-auto xl:overscroll-contain xl:pr-1 scrollbar-hide">
        <section>
          <h2 className="mb-5 text-sm font-semibold">Top agencies around you</h2>
          <div className="space-y-4">
            {agencies.map(([name, location, initials], index) => (
              <div key={name} className="flex items-center gap-3">
                <Avatar
                  className={
                    index === 0
                      ? "border border-[#dedede] bg-white"
                      : index === 1
                        ? "bg-[#efefef]"
                        : index === 2
                          ? "bg-[#ffa33d]"
                          : "bg-[#a782d8]"
                  }
                  initials={initials}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold truncate">{name}</p>
                  <p className="mt-1 text-sm text-[#383d45]">{location}</p>
                </div>
                <Button variant="outline" className="h-10 rounded-full border-[#087fff] px-5 text-[#087fff]">
                  Subscribe
                </Button>
              </div>
            ))}
          </div>
          <ViewAllLink />
        </section>

        <section>
          <h2 className="mb-5 text-sm font-semibold">Professionals you may be interested in</h2>
          <div className="space-y-4">
            {professionals.map(([name, role, color]) => (
              <div key={name} className="flex items-center gap-3">
                <Avatar className={color} initials={name.slice(0, 2).toUpperCase()} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold truncate">{name}</p>
                  <p className="mt-1 truncate text-sm text-[#383d45]">{role}</p>
                </div>
                <Button variant="outline" className="h-10 rounded-full border-[#087fff] px-5 text-[#087fff]">
                  Connect
                </Button>
              </div>
            ))}
          </div>
          <ViewAllLink />
        </section>
      </aside>
      </div>
  )
}
