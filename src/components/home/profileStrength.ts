import type { CareConnectProfile } from "@/utils/careconnect/types"

/**
 * How complete a profile is, and what to do next.
 *
 * Replaces "Profile views 0 · Application views 0" as the first thing a new member sees:
 * two zeroes say nobody is looking, where a percentage and one next step say what would
 * make them look. Worked out here from the profile the dashboard already loads — no new
 * endpoint, and the same weights everywhere it is shown.
 */

export interface ProfileStep {
  key: string
  label: string
  done: boolean
}

export interface ProfileStrength {
  percent: number
  steps: ProfileStep[]
  /** The first unfinished step, in the order below. Null when everything is done. */
  next: ProfileStep | null
}

export function profileStrength(profile: CareConnectProfile | null | undefined): ProfileStrength {
  const p = profile
  // Ordered by what makes the biggest difference to someone looking at the profile.
  const steps: ProfileStep[] = [
    { key: "photo", label: "Add a profile photo", done: Boolean(p?.photo) },
    { key: "headline", label: "Write a headline", done: Boolean(p?.headline?.trim()) },
    { key: "about", label: "Tell people about yourself", done: Boolean(p?.description?.trim()) },
    { key: "experience", label: "Add your experience", done: (p?.experience?.length ?? 0) > 0 },
    { key: "skills", label: "List a few skills", done: (p?.skills?.length ?? 0) > 0 },
    {
      key: "certifications",
      label: "Add a certification",
      done: (p?.certificationDetails?.length ?? 0) > 0,
    },
    { key: "location", label: "Add your location", done: Boolean(p?.location?.trim()) },
  ]
  const done = steps.filter((step) => step.done).length
  return {
    percent: Math.round((done / steps.length) * 100),
    steps,
    next: steps.find((step) => !step.done) ?? null,
  }
}
