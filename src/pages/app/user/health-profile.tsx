import { useEffect, useState } from "react"
import { Link } from "react-router"
import { toast } from "sonner"
import { ChevronRight, Info } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { HealthProfileForm } from "@/components/health/HealthProfileForm"
import { ConsentPanel } from "@/components/records/ConsentPanel"
import { MedicalDocumentsSection } from "@/components/health/MedicalDocumentsSection"
import { SharedClientRecords } from "@/components/health/SharedClientRecords"
import { Routes } from "@/routes/constants"
import { getAuthErrorMessage } from "@/utils/auth"
import { useProfessionalMembership } from "@/utils/professional/useProfessionalMembership"
import {
  getMyHealthProfile,
  upsertMyHealthProfile,
} from "@/utils/careconnect/services/clinicalService"
import {
  healthProfileCompleteness,
  healthProfileErrors,
  isHealthProfileEmpty,
} from "@/utils/careconnect/healthProfile"
import { formatRelative, type ClientHealthProfile } from "@/utils/careconnect/types"

/**
 * "My health" — the client's own page for the clinical layer.
 *
 * A page of its own rather than a tab on `profile.tsx`, which is the PUBLIC
 * directory profile: private health information should not sit one keystroke
 * from a surface other users can read.
 */

function HealthProfileSkeleton() {
  return (
    <div className="space-y-6 p-5 sm:p-8">
      <Skeleton className="h-9 w-56" />
      <Skeleton className="h-28 rounded-2xl" />
      <Skeleton className="h-64 rounded-2xl" />
    </div>
  )
}

export default function HealthProfilePage() {
  // Professionals use this same /user/health-profile page (no separate
  // /professional/* prefix) — they get an extra tab for records clients have
  // shared with them, alongside their own personal health details.
  const { isProfessional } = useProfessionalMembership()
  const [tab, setTab] = useState<"mine" | "shared">("mine")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [profile, setProfile] = useState<ClientHealthProfile>({})
  const [savedProfile, setSavedProfile] = useState<ClientHealthProfile | null>(null)
  const [dirty, setDirty] = useState(false)

  useEffect(() => {
    let active = true
    getMyHealthProfile()
      .then((existing) => {
        if (!active) return
        setSavedProfile(existing)
        setProfile(existing ?? {})
      })
      .catch(() => {
        if (active) setProfile({})
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  const save = async () => {
    setSaving(true)
    try {
      const updated = await upsertMyHealthProfile(profile)
      setSavedProfile(updated)
      setProfile(updated)
      setDirty(false)
      toast.success("Health profile saved")
    } catch (error) {
      toast.error(getAuthErrorMessage(error))
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <HealthProfileSkeleton />

  const completeness = healthProfileCompleteness(profile)
  const empty = isHealthProfileEmpty(profile)
  // Catch implausible values here rather than letting the whole-document PUT come
  // back as a 400 naming a nested path like `about.heightCm`. Each field also
  // shows its own message; this only gates the save.
  const errors = healthProfileErrors(profile)

  return (
    <div className={`space-y-8 p-5 sm:p-8 ${tab === "mine" ? "pb-28 sm:pb-28" : ""}`}>
      <header>
        <h1 className="text-2xl font-bold text-[#151922]">My Health Records</h1>
        <p className="mt-1 text-sm text-[#657080]">
          Everything here is optional. Share only what you want your professionals to know.
        </p>
      </header>

      {isProfessional && (
        <div className="flex w-fit gap-1 rounded-xl border border-[#eef1f3] p-1">
          <button
            type="button"
            onClick={() => setTab("mine")}
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
              tab === "mine" ? "bg-[#e3f8f8] text-[#00898c]" : "text-[#657080] hover:text-[#151922]"
            }`}
          >
            My health details
          </button>
          <button
            type="button"
            onClick={() => setTab("shared")}
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
              tab === "shared" ? "bg-[#e3f8f8] text-[#00898c]" : "text-[#657080] hover:text-[#151922]"
            }`}
          >
            Shared with me
          </button>
        </div>
      )}

      {isProfessional && tab === "shared" ? (
        <section className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-[#151922]">Records clients have shared with you</h2>
            <p className="mt-1 text-sm text-[#657080]">
              Clients who attached their health profile to a booking with you. Open one for their
              full details.
            </p>
          </div>
          <SharedClientRecords />
        </section>
      ) : (
        <>
      <section className="rounded-2xl border border-[#e5ecf5] bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-[#151922]">
              {empty ? "You have not shared anything yet" : `${completeness}% filled in`}
            </p>
            <p className="mt-1 text-sm text-[#657080]">
              {savedProfile?.updatedAt
                ? `Last updated ${formatRelative(savedProfile.updatedAt)}`
                : "A short profile is more useful than none - add what you can."}
            </p>
          </div>
          <Link
            to={Routes.app.user.records}
            className="flex items-center gap-1 text-sm font-semibold text-[#00898c] hover:opacity-80"
          >
            My visit records
            <ChevronRight className="size-4" />
          </Link>
        </div>
        {!empty && (
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-[#eef1f3]">
            <div
              className="h-full rounded-full bg-[#00b4b8] transition-[width]"
              style={{ width: `${completeness}%` }}
            />
          </div>
        )}
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-[#151922]">Sharing & records</h2>
          <p className="mt-1 text-sm text-[#657080]">Who can see your past visits, and what you've uploaded.</p>
        </div>
        <div className="space-y-4">
          <ConsentPanel />
          <MedicalDocumentsSection />
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-[#151922]">Health details</h2>
          <div className="mt-2 flex items-start gap-2 rounded-xl bg-[#f5f8fb] px-4 py-3 text-sm text-[#657080]">
            <Info className="mt-0.5 size-4 shrink-0" />
            <span>
              This is attached to a booking only when you choose to attach it, and only the
              professional you book can see it. Click a section to expand or collapse it.
            </span>
          </div>
        </div>

        <HealthProfileForm
          value={profile}
          onChange={(next) => {
            setProfile(next)
            setDirty(true)
          }}
        />
      </section>

      {/* Sticky so the save action stays reachable while scrolling a long, section-by-section form. */}
      <div className="fixed inset-x-0 bottom-0 z-10 border-t border-[#e5ecf5] bg-white/95 px-5 py-4 backdrop-blur-sm sm:px-8">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-end gap-3">
          {errors.length > 0 ? (
            <span className="mr-auto text-sm text-[#ff3e66]">
              {errors.length === 1
                ? "One value needs a look before saving."
                : `${errors.length} values need a look before saving.`}
            </span>
          ) : (
            dirty && <span className="mr-auto text-sm text-[#657080]">Unsaved changes</span>
          )}
          <Button
            className="bg-[#00b4b8] text-white hover:opacity-90"
            disabled={saving || !dirty || errors.length > 0}
            onClick={save}
          >
            {saving ? "Saving..." : "Save profile"}
          </Button>
        </div>
      </div>
        </>
      )}
    </div>
  )
}
