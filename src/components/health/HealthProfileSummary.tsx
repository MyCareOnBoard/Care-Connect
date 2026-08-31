import { Lock, ShieldOff } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { summarizeHealthProfile } from "@/utils/careconnect/healthProfile"
import { formatDate, formatRelative, type ClientHealthProfile, type HealthProfileSnapshot } from "@/utils/careconnect/types"

/**
 * Read-only view of a health profile or a frozen booking snapshot.
 *
 * All the shaping lives in `summarizeHealthProfile`, so this stays dumb JSX.
 * Sections and rows with nothing in them are omitted entirely rather than
 * rendered as em-dashes: the length of the page is itself the signal for how
 * much the client chose to share.
 */
export function HealthProfileSummary({
  profile,
  loading = false,
  /**
   * When this is a frozen snapshot, the visit date it was captured for. Shown
   * with a staleness note, because a professional reading months-old
   * self-reported allergies as current is a real harm.
   */
  capturedFor,
  emptyMessage = "Nothing shared yet.",
}: {
  profile: ClientHealthProfile | HealthProfileSnapshot | null
  loading?: boolean
  capturedFor?: string | null
  emptyMessage?: string
}) {
  if (loading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="space-y-2">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-16 rounded-xl" />
          </div>
        ))}
      </div>
    )
  }

  const sections = summarizeHealthProfile(profile)

  if (sections.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-[#e5ecf5] p-6 text-center text-sm text-[#657080]">
        {emptyMessage}
      </p>
    )
  }

  return (
    <div className="space-y-5">
      {capturedFor && (
        <p className="rounded-xl bg-[#f5f8fb] px-4 py-3 text-sm text-[#657080]">
          As provided on {formatDate(capturedFor)}
          {" · "}
          {formatRelative(capturedFor)}. The client may have updated their profile since.
        </p>
      )}
      {sections.map((section) => (
        <section key={section.title}>
          <h4 className="text-sm font-semibold text-[#151922]">{section.title}</h4>
          <dl className="mt-2 divide-y divide-[#eef1f3] rounded-xl border border-[#eef1f3]">
            {section.rows.map((row) => (
              <div key={row.label} className="grid gap-1 px-4 py-3 sm:grid-cols-3">
                <dt className="text-sm text-[#657080]">{row.label}</dt>
                <dd className="text-sm text-[#151922] sm:col-span-2">{row.value}</dd>
              </div>
            ))}
          </dl>
        </section>
      ))}
    </div>
  )
}

/**
 * What a professional sees when the client did not consent to share health
 * information for this visit. Deliberately not an error state: the client made a
 * choice, and the copy should read that way.
 */
export function IntakeConsentBlocked() {
  return (
    <div className="rounded-xl border border-dashed border-[#e5ecf5] p-6 text-center">
      <ShieldOff className="mx-auto size-6 text-[#657080]" />
      <p className="mt-3 text-sm font-semibold text-[#151922]">
        No health information shared for this visit
      </p>
      <p className="mt-1 text-sm text-[#657080]">
        The client chose not to attach their health profile. You can still write a visit record if
        they consented to one.
      </p>
    </div>
  )
}

/** Shown in place of a record list when the client has record sharing turned off. */
export function SharingDisabledPanel({ clientName }: { clientName?: string }) {
  return (
    <div className="rounded-xl border border-dashed border-[#e5ecf5] p-6 text-center">
      <Lock className="mx-auto size-6 text-[#657080]" />
      <p className="mt-3 text-sm font-semibold text-[#151922]">
        {clientName ? `${clientName} has` : "This client has"} not turned on record sharing
      </p>
      <p className="mx-auto mt-1 max-w-md text-sm text-[#657080]">
        You can still write and read records for your own visits with them. Records from other
        professionals stay private unless the client chooses to share them.
      </p>
    </div>
  )
}
