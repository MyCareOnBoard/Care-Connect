import { useEffect, useState } from "react"
import { Link } from "react-router"
import { toast } from "sonner"
import { ChevronRight, Info } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { HealthProfileForm } from "@/components/health/HealthProfileForm"
import { ConsentPanel } from "@/components/records/ConsentPanel"
import { Routes } from "@/routes/constants"
import { getAuthErrorMessage } from "@/utils/auth"
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
    <div className="space-y-6 p-5 sm:p-8">
      <header>
        <h1 className="text-2xl font-bold text-[#151922]">My health</h1>
        <p className="mt-1 text-sm text-[#657080]">
          Everything here is optional. Share only what you want your professionals to know.
        </p>
      </header>

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

      <ConsentPanel />

      <section className="rounded-2xl border border-[#e5ecf5] bg-white p-5">
        <div className="mb-5 flex items-start gap-2 rounded-xl bg-[#f5f8fb] px-4 py-3 text-sm text-[#657080]">
          <Info className="mt-0.5 size-4 shrink-0" />
          <span>
            This is attached to a booking only when you choose to attach it, and only the
            professional you book can see it.
          </span>
        </div>

        <HealthProfileForm
          value={profile}
          onChange={(next) => {
            setProfile(next)
            setDirty(true)
          }}
        />

        <div className="mt-6 flex flex-wrap items-center justify-end gap-3 border-t border-[#eef1f3] pt-5">
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
      </section>
    </div>
  )
}
