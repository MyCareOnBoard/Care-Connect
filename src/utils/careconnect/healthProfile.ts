import {
  ALLERGY_SEVERITY_LABELS,
  ALCOHOL_LABELS,
  MOBILITY_LABELS,
  SEX_AT_BIRTH_LABELS,
  SMOKING_LABELS,
  type Allergy,
  type ClientHealthProfile,
  type HealthProfileSnapshot,
  type Medication,
} from "@/utils/careconnect/types"

/**
 * Pure helpers for the client health profile.
 *
 * Kept out of the components so the read-only summary view stays dumb JSX over
 * `summarizeHealthProfile`, and so the fiddly parts (unit conversion, deciding
 * whether a section is actually populated) are unit-testable without rendering.
 */

const CM_PER_INCH = 2.54
const INCHES_PER_FOOT = 12
const LB_PER_KG = 2.2046226218

export function cmToFeetInches(cm: number | null | undefined): { feet: number; inches: number } | null {
  if (cm === null || cm === undefined || !Number.isFinite(cm) || cm <= 0) return null
  const totalInches = cm / CM_PER_INCH
  let feet = Math.floor(totalInches / INCHES_PER_FOOT)
  let inches = Math.round(totalInches - feet * INCHES_PER_FOOT)
  // Rounding 11.6" up must roll over into the next foot, not read as 5' 12".
  if (inches === INCHES_PER_FOOT) {
    feet += 1
    inches = 0
  }
  return { feet, inches }
}

export function feetInchesToCm(feet: number, inches: number): number {
  return Math.round((feet * INCHES_PER_FOOT + inches) * CM_PER_INCH * 10) / 10
}

export function kgToLb(kg: number | null | undefined): number | null {
  if (kg === null || kg === undefined || !Number.isFinite(kg)) return null
  return Math.round(kg * LB_PER_KG * 10) / 10
}

export function lbToKg(lb: number): number {
  return Math.round((lb / LB_PER_KG) * 10) / 10
}

/** Whether a value counts as "the client actually told us something". */
function hasValue(value: unknown): boolean {
  if (value === null || value === undefined) return false
  if (typeof value === "string") return value.trim().length > 0
  if (Array.isArray(value)) return value.length > 0
  if (typeof value === "object") return Object.values(value as object).some(hasValue)
  return true
}

/**
 * The clinical sections, in display order. Shared by the emptiness check, the
 * completeness meter, and the summary, so none of them can drift from the others.
 */
const SECTIONS = [
  "about",
  "baselines",
  "history",
  "lifestyle",
  "access",
  "emergencyContact",
  "careCircle",
  "notes",
] as const

/**
 * True when a profile carries no clinical information at all.
 *
 * Note that `{ history: { conditions: [] } }` is empty: an empty array is the
 * absence of an answer, not an answer. The booking flow relies on this to decide
 * whether to say "share health details" or "using your saved profile".
 */
export function isHealthProfileEmpty(
  profile: ClientHealthProfile | HealthProfileSnapshot | null | undefined,
): boolean {
  if (!profile) return true
  return !SECTIONS.some((section) =>
    hasValue((profile as Record<string, unknown>)[section]),
  )
}

/**
 * Rough completeness, 0-100, for a gentle progress hint.
 *
 * Deliberately section-level rather than field-level: this is an optional form,
 * and counting every unanswered field would make a perfectly useful profile look
 * like a failure.
 */
export function healthProfileCompleteness(
  profile: ClientHealthProfile | null | undefined,
): number {
  if (!profile) return 0
  const filled = SECTIONS.filter((section) =>
    hasValue((profile as Record<string, unknown>)[section]),
  ).length
  return Math.round((filled / SECTIONS.length) * 100)
}

/** e.g. "Penicillin — anaphylaxis (severe)", degrading as fields are missing. */
export function describeAllergy(allergy: Allergy | null | undefined): string {
  if (!allergy || !allergy.substance) return ""
  const parts = [allergy.substance.trim()]
  if (allergy.reaction && allergy.reaction.trim()) parts.push(`— ${allergy.reaction.trim()}`)
  const base = parts.join(" ")
  return allergy.severity ? `${base} (${ALLERGY_SEVERITY_LABELS[allergy.severity]})` : base
}

/** e.g. "Metformin 500mg, twice daily". */
export function describeMedication(medication: Medication | null | undefined): string {
  if (!medication || !medication.name) return ""
  const head = [medication.name.trim(), (medication.dose || "").trim()].filter(Boolean).join(" ")
  const frequency = (medication.frequency || "").trim()
  return frequency ? `${head}, ${frequency}` : head
}

/** "120/80" — null unless both halves are present, since one alone is not a reading. */
export function formatBloodPressure(
  systolic: number | null | undefined,
  diastolic: number | null | undefined,
): string | null {
  if (systolic === null || systolic === undefined) return null
  if (diastolic === null || diastolic === undefined) return null
  return `${systolic}/${diastolic}`
}

/**
 * Whether a blood pressure pair is plausible. Returns a message rather than a
 * boolean so the form can say what is wrong.
 */
export function validateBloodPressure(
  systolic: number | null | undefined,
  diastolic: number | null | undefined,
): string | null {
  const hasSystolic = systolic !== null && systolic !== undefined
  const hasDiastolic = diastolic !== null && diastolic !== undefined
  if (!hasSystolic && !hasDiastolic) return null
  if (hasSystolic !== hasDiastolic) return "Enter both the top and bottom numbers"
  if (systolic! < 40 || systolic! > 300) return "That top number looks out of range"
  if (diastolic! < 20 || diastolic! > 200) return "That bottom number looks out of range"
  if (systolic! <= diastolic!) return "The top number should be higher than the bottom one"
  return null
}

export interface SummaryRow {
  label: string
  value: string
}

export interface SummarySection {
  title: string
  rows: SummaryRow[]
}

/**
 * Flatten a profile (or a frozen snapshot) into display sections.
 *
 * Sections and rows with nothing in them are omitted entirely rather than
 * rendered as em-dashes: a professional skimming this before a visit should see
 * only what the client actually said, so the page length itself signals how much
 * is known.
 */
export function summarizeHealthProfile(
  profile: ClientHealthProfile | HealthProfileSnapshot | null | undefined,
): SummarySection[] {
  if (!profile) return []
  const sections: SummarySection[] = []

  const push = (title: string, rows: (SummaryRow | null)[]) => {
    const kept = rows.filter((row): row is SummaryRow => row !== null && row.value.trim().length > 0)
    if (kept.length > 0) sections.push({ title, rows: kept })
  }

  const about = profile.about
  if (about) {
    const height = cmToFeetInches(about.heightCm)
    push("About", [
      about.dateOfBirth ? { label: "Date of birth", value: about.dateOfBirth } : null,
      about.sexAtBirth ? { label: "Sex at birth", value: SEX_AT_BIRTH_LABELS[about.sexAtBirth] } : null,
      height ? { label: "Height", value: `${about.heightCm} cm (${height.feet}ft ${height.inches}in)` } : null,
      about.weightKg ? { label: "Weight", value: `${about.weightKg} kg (${kgToLb(about.weightKg)} lb)` } : null,
      about.bloodType && about.bloodType !== "unknown"
        ? { label: "Blood type", value: about.bloodType }
        : null,
      about.preferredLanguage ? { label: "Preferred language", value: about.preferredLanguage } : null,
    ])
  }

  const history = profile.history
  if (history) {
    push("Conditions, allergies and medications", [
      history.conditions && history.conditions.length
        ? { label: "Conditions", value: history.conditions.join(", ") }
        : null,
      history.allergies && history.allergies.length
        ? { label: "Allergies", value: history.allergies.map(describeAllergy).filter(Boolean).join("; ") }
        : null,
      history.medications && history.medications.length
        ? { label: "Medications", value: history.medications.map(describeMedication).filter(Boolean).join("; ") }
        : null,
    ])
  }

  const baselines = profile.baselines
  if (baselines) {
    const bp = formatBloodPressure(baselines.systolic, baselines.diastolic)
    push("Self-reported baselines", [
      bp
        ? {
            label: "Blood pressure",
            value: baselines.measuredOn ? `${bp} (measured ${baselines.measuredOn})` : bp,
          }
        : null,
      baselines.restingHeartRate
        ? { label: "Resting heart rate", value: `${baselines.restingHeartRate} bpm` }
        : null,
      baselines.bloodGlucose
        ? {
            label: "Blood glucose",
            value: `${baselines.bloodGlucose} ${baselines.bloodGlucoseUnit || ""}`.trim(),
          }
        : null,
    ])
  }

  const access = profile.access
  if (access) {
    push("Access and mobility", [
      access.mobility ? { label: "Mobility", value: MOBILITY_LABELS[access.mobility] } : null,
      access.mobilityAids && access.mobilityAids.length
        ? { label: "Equipment at home", value: access.mobilityAids.join(", ") }
        : null,
      access.communicationNeeds && access.communicationNeeds.length
        ? { label: "Communication needs", value: access.communicationNeeds.join(", ") }
        : null,
      access.homeAccessNotes ? { label: "Getting into the home", value: access.homeAccessNotes } : null,
    ])
  }

  const lifestyle = profile.lifestyle
  if (lifestyle) {
    push("Lifestyle", [
      lifestyle.smoking ? { label: "Smoking", value: SMOKING_LABELS[lifestyle.smoking] } : null,
      lifestyle.alcohol ? { label: "Alcohol", value: ALCOHOL_LABELS[lifestyle.alcohol] } : null,
    ])
  }

  const emergency = profile.emergencyContact
  if (emergency) {
    push("Emergency contact", [
      emergency.name
        ? {
            label: "Contact",
            value: emergency.relationship
              ? `${emergency.name} (${emergency.relationship})`
              : emergency.name,
          }
        : null,
      emergency.phone ? { label: "Phone", value: emergency.phone } : null,
    ])
  }

  const careCircle = profile.careCircle
  if (careCircle) {
    push("Care circle", [
      careCircle.gpName ? { label: "GP", value: careCircle.gpName } : null,
      careCircle.gpPhone ? { label: "GP phone", value: careCircle.gpPhone } : null,
      careCircle.preferredHospital
        ? { label: "Preferred hospital", value: careCircle.preferredHospital }
        : null,
    ])
  }

  if (profile.notes) {
    push("Anything else", [{ label: "Notes", value: profile.notes }])
  }

  return sections
}
