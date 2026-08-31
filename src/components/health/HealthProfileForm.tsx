import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ChipMultiSelect } from "@/components/health/ChipMultiSelect"
import { AllergyRows, MedicationRows } from "@/components/health/RepeatableRows"
import {
  cmToFeetInches,
  feetInchesToCm,
  kgToLb,
  lbToKg,
  validateBloodPressure,
  validateHeightCm,
  validateWeightKg,
} from "@/utils/careconnect/healthProfile"
import {
  ALCOHOL_LABELS,
  BLOOD_TYPES,
  COMMON_CONDITIONS,
  COMMUNICATION_NEEDS,
  MOBILITY_AIDS,
  MOBILITY_LABELS,
  SEX_AT_BIRTH_LABELS,
  SMOKING_LABELS,
  type AlcoholUse,
  type BloodType,
  type ClientHealthProfile,
  type GlucoseUnit,
  type MobilityLevel,
  type SexAtBirth,
  type SmokingStatus,
} from "@/utils/careconnect/types"

/**
 * The client health profile editor.
 *
 * ONE component at two densities, selected by `sections`: the booking flow shows
 * the handful of things a professional needs before turning up, and the full
 * editor shows everything. A second component would drift from this one.
 *
 * Every field is optional. Nothing here validates as required, and nothing
 * blocks the caller from continuing — see the `intake` step in telehealth.tsx.
 */

export type HealthSection =
  | "basics"
  | "conditions"
  | "baselines"
  | "access"
  | "lifestyle"
  | "emergency"
  | "careCircle"
  | "notes"

export const BOOKING_FLOW_SECTIONS: HealthSection[] = ["conditions", "emergency", "notes"]

export const ALL_SECTIONS: HealthSection[] = [
  "basics",
  "conditions",
  "baselines",
  "access",
  "lifestyle",
  "emergency",
  "careCircle",
  "notes",
]

const GLUCOSE_UNITS: GlucoseUnit[] = ["mmol/L", "mg/dL"]

function Field({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-[#151922]">{label}</label>
      {hint && <p className="mb-2 text-sm text-[#657080]">{hint}</p>}
      {children}
    </div>
  )
}

function SectionShell({
  title,
  description,
  children,
}: {
  title: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <section className="space-y-4">
      <div>
        <h3 className="text-base font-semibold text-[#151922]">{title}</h3>
        {description && <p className="mt-1 text-sm text-[#657080]">{description}</p>}
      </div>
      {children}
    </section>
  )
}

/** Empty string from an input means "not answered", which must be null, not 0. */
function toNumberOrNull(raw: string): number | null {
  const trimmed = raw.trim()
  if (!trimmed) return null
  const parsed = Number(trimmed)
  return Number.isFinite(parsed) ? parsed : null
}

/**
 * Height entry in either unit.
 *
 * The profile always stores centimetres, but plenty of people only know their
 * height in feet and inches — and typing "5" into a centimetres box produced a
 * server-side 400. The unit toggle makes that a supported path rather than a
 * mistake, converting on the way in.
 *
 * Both fields below hold what the user typed in local state rather than deriving
 * the input value from the stored canonical number. Round-tripping through cm/kg
 * loses precision, so a derived input fights the typist: entering "159" lb
 * becomes 72.1 kg and renders back as "158.9". The stored value stays canonical;
 * only the display is sticky.
 */
function UnitToggle<T extends string>({
  options,
  value,
  onChange,
  labels,
}: {
  options: readonly T[]
  value: T
  onChange: (next: T) => void
  labels?: Partial<Record<T, string>>
}) {
  return (
    <div className="flex items-center rounded-lg border border-[#eef1f3] p-0.5">
      {options.map((option) => (
        <button
          key={option}
          type="button"
          onClick={() => onChange(option)}
          className={`rounded-md px-2 py-0.5 text-xs font-semibold transition ${
            value === option ? "bg-[#e3f8f8] text-[#00898c]" : "text-[#657080]"
          }`}
        >
          {labels?.[option] ?? option}
        </button>
      ))}
    </div>
  )
}

function FieldHeader({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-1.5 flex items-center justify-between gap-2">
      <label className="text-sm font-medium text-[#151922]">{label}</label>
      {children}
    </div>
  )
}

function HeightField({
  valueCm,
  onChange,
}: {
  valueCm: number | null | undefined
  onChange: (cm: number | null) => void
}) {
  const [unit, setUnit] = useState<"cm" | "ftin">("cm")
  // Seeded from the stored value, then owned by the typist.
  const [raw, setRaw] = useState(() => {
    const imperial = cmToFeetInches(valueCm ?? null)
    return {
      cm: valueCm != null ? String(valueCm) : "",
      feet: imperial ? String(imperial.feet) : "",
      inches: imperial ? String(imperial.inches) : "",
    }
  })
  const error = validateHeightCm(valueCm)
  const asImperial = cmToFeetInches(valueCm ?? null)

  const switchUnit = (next: "cm" | "ftin") => {
    // Re-seed the incoming unit from the stored value, so a switch shows the
    // equivalent rather than a stale draft.
    const imperial = cmToFeetInches(valueCm ?? null)
    setRaw({
      cm: valueCm != null ? String(valueCm) : "",
      feet: imperial ? String(imperial.feet) : "",
      inches: imperial ? String(imperial.inches) : "",
    })
    setUnit(next)
  }

  const commitImperial = (feet: string, inches: string) => {
    setRaw((current) => ({ ...current, feet, inches }))
    if (!feet.trim() && !inches.trim()) return onChange(null)
    onChange(feetInchesToCm(Number(feet) || 0, Number(inches) || 0))
  }

  return (
    <div>
      <FieldHeader label="Height">
        <UnitToggle
          options={["cm", "ftin"] as const}
          value={unit}
          onChange={switchUnit}
          labels={{ ftin: "ft/in" }}
        />
      </FieldHeader>

      {unit === "cm" ? (
        <Input
          type="number"
          inputMode="decimal"
          value={raw.cm}
          onChange={(event) => {
            setRaw((current) => ({ ...current, cm: event.target.value }))
            onChange(toNumberOrNull(event.target.value))
          }}
          placeholder="e.g. 170"
          aria-label="Height in centimetres"
          className="h-11"
        />
      ) : (
        <div className="flex items-center gap-2">
          <Input
            type="number"
            inputMode="numeric"
            value={raw.feet}
            onChange={(event) => commitImperial(event.target.value, raw.inches)}
            placeholder="5"
            aria-label="Height, feet"
            className="h-11"
          />
          <span className="text-sm text-[#657080]">ft</span>
          <Input
            type="number"
            inputMode="numeric"
            value={raw.inches}
            onChange={(event) => commitImperial(raw.feet, event.target.value)}
            placeholder="9"
            aria-label="Height, inches"
            className="h-11"
          />
          <span className="text-sm text-[#657080]">in</span>
        </div>
      )}

      {error ? (
        <p className="mt-1.5 text-sm text-[#ff3e66]">{error}</p>
      ) : (
        unit === "cm" &&
        asImperial && (
          <p className="mt-1.5 text-sm text-[#657080]">
            {asImperial.feet}ft {asImperial.inches}in
          </p>
        )
      )}
    </div>
  )
}

/** Weight entry in kg or lb, stored as kg. Same rationale as HeightField. */
function WeightField({
  valueKg,
  onChange,
}: {
  valueKg: number | null | undefined
  onChange: (kg: number | null) => void
}) {
  const [unit, setUnit] = useState<"kg" | "lb">("kg")
  const [raw, setRaw] = useState(() => (valueKg != null ? String(valueKg) : ""))
  const error = validateWeightKg(valueKg)
  const asPounds = kgToLb(valueKg ?? null)

  const switchUnit = (next: "kg" | "lb") => {
    if (valueKg == null) setRaw("")
    else setRaw(String(next === "kg" ? valueKg : kgToLb(valueKg)))
    setUnit(next)
  }

  return (
    <div>
      <FieldHeader label="Weight">
        <UnitToggle options={["kg", "lb"] as const} value={unit} onChange={switchUnit} />
      </FieldHeader>

      <Input
        type="number"
        inputMode="decimal"
        value={raw}
        onChange={(event) => {
          setRaw(event.target.value)
          const entered = toNumberOrNull(event.target.value)
          if (entered === null) return onChange(null)
          onChange(unit === "kg" ? entered : lbToKg(entered))
        }}
        placeholder={unit === "kg" ? "e.g. 72" : "e.g. 159"}
        aria-label={`Weight in ${unit === "kg" ? "kilograms" : "pounds"}`}
        className="h-11"
      />

      {error ? (
        <p className="mt-1.5 text-sm text-[#ff3e66]">{error}</p>
      ) : (
        unit === "kg" && asPounds !== null && <p className="mt-1.5 text-sm text-[#657080]">{asPounds} lb</p>
      )}
    </div>
  )
}

export function HealthProfileForm({
  value,
  onChange,
  sections = ALL_SECTIONS,
  /** Adds the home-access question, which only matters for an in-person visit. */
  includeHomeAccess = false,
}: {
  value: ClientHealthProfile
  onChange: (next: ClientHealthProfile) => void
  sections?: HealthSection[]
  includeHomeAccess?: boolean
}) {
  const show = (section: HealthSection) => sections.includes(section)

  // Each setter replaces one section, so a narrow form never clears a section it
  // does not render.
  const setAbout = (patch: Partial<NonNullable<ClientHealthProfile["about"]>>) =>
    onChange({ ...value, about: { ...(value.about ?? {}), ...patch } })
  const setBaselines = (patch: Partial<NonNullable<ClientHealthProfile["baselines"]>>) =>
    onChange({ ...value, baselines: { ...(value.baselines ?? {}), ...patch } })
  const setHistory = (patch: Partial<NonNullable<ClientHealthProfile["history"]>>) =>
    onChange({ ...value, history: { ...(value.history ?? {}), ...patch } })
  const setLifestyle = (patch: Partial<NonNullable<ClientHealthProfile["lifestyle"]>>) =>
    onChange({ ...value, lifestyle: { ...(value.lifestyle ?? {}), ...patch } })
  const setAccess = (patch: Partial<NonNullable<ClientHealthProfile["access"]>>) =>
    onChange({ ...value, access: { ...(value.access ?? {}), ...patch } })
  const setEmergency = (patch: Partial<NonNullable<ClientHealthProfile["emergencyContact"]>>) =>
    onChange({ ...value, emergencyContact: { ...(value.emergencyContact ?? {}), ...patch } })
  const setCareCircle = (patch: Partial<NonNullable<ClientHealthProfile["careCircle"]>>) =>
    onChange({ ...value, careCircle: { ...(value.careCircle ?? {}), ...patch } })

  const bpError = validateBloodPressure(value.baselines?.systolic, value.baselines?.diastolic)

  return (
    <div className="space-y-8">
      {show("basics") && (
        <SectionShell
          title="About you"
          description="Age and build affect dosing and how safely a professional can support you alone."
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Date of birth">
              <Input
                type="date"
                value={value.about?.dateOfBirth ?? ""}
                onChange={(event) => setAbout({ dateOfBirth: event.target.value || null })}
                className="h-11"
              />
            </Field>
            <Field label="Sex at birth">
              <Select
                value={value.about?.sexAtBirth ?? ""}
                onValueChange={(next) => setAbout({ sexAtBirth: next as SexAtBirth })}
              >
                <SelectTrigger className="h-11 w-full">
                  <SelectValue placeholder="Prefer not to say" />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(SEX_AT_BIRTH_LABELS) as SexAtBirth[]).map((option) => (
                    <SelectItem key={option} value={option}>
                      {SEX_AT_BIRTH_LABELS[option]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <HeightField
              valueCm={value.about?.heightCm}
              onChange={(heightCm) => setAbout({ heightCm })}
            />
            <WeightField
              valueKg={value.about?.weightKg}
              onChange={(weightKg) => setAbout({ weightKg })}
            />
            <Field label="Blood type">
              <Select
                value={value.about?.bloodType ?? ""}
                onValueChange={(next) => setAbout({ bloodType: next as BloodType })}
              >
                <SelectTrigger className="h-11 w-full">
                  <SelectValue placeholder="Not sure" />
                </SelectTrigger>
                <SelectContent>
                  {BLOOD_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type === "unknown" ? "Not sure" : type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Preferred language">
              <Input
                value={value.about?.preferredLanguage ?? ""}
                onChange={(event) => setAbout({ preferredLanguage: event.target.value })}
                placeholder="e.g. English"
                className="h-11"
              />
            </Field>
          </div>
        </SectionShell>
      )}

      {show("conditions") && (
        <SectionShell
          title="Conditions, allergies and medications"
          description="The most useful thing you can share. Your professional reads this before your visit."
        >
          <Field label="Ongoing conditions">
            <ChipMultiSelect
              options={COMMON_CONDITIONS}
              selected={value.history?.conditions ?? []}
              onChange={(conditions) => setHistory({ conditions })}
              customPlaceholder="Add a condition not listed"
              emptyHint="Nothing selected. Leave blank if you would rather not say."
            />
          </Field>
          <Field label="Allergies">
            <AllergyRows
              value={value.history?.allergies ?? []}
              onChange={(allergies) => setHistory({ allergies })}
            />
          </Field>
          <Field label="Medications">
            <MedicationRows
              value={value.history?.medications ?? []}
              onChange={(medications) => setHistory({ medications })}
            />
          </Field>
        </SectionShell>
      )}

      {show("baselines") && (
        <SectionShell
          title="Your usual readings"
          description="Self-reported and optional. A baseline helps your professional notice a change."
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Blood pressure">
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  inputMode="numeric"
                  value={value.baselines?.systolic ?? ""}
                  onChange={(event) => setBaselines({ systolic: toNumberOrNull(event.target.value) })}
                  placeholder="120"
                  aria-label="Systolic, the top number"
                  className="h-11"
                />
                <span className="text-[#657080]">/</span>
                <Input
                  type="number"
                  inputMode="numeric"
                  value={value.baselines?.diastolic ?? ""}
                  onChange={(event) => setBaselines({ diastolic: toNumberOrNull(event.target.value) })}
                  placeholder="80"
                  aria-label="Diastolic, the bottom number"
                  className="h-11"
                />
              </div>
              {bpError && <p className="mt-1.5 text-sm text-[#ff3e66]">{bpError}</p>}
            </Field>
            <Field label="When was that measured?">
              <Input
                type="date"
                value={value.baselines?.measuredOn ?? ""}
                onChange={(event) => setBaselines({ measuredOn: event.target.value || null })}
                className="h-11"
              />
            </Field>
            <Field label="Resting heart rate (bpm)">
              <Input
                type="number"
                inputMode="numeric"
                value={value.baselines?.restingHeartRate ?? ""}
                onChange={(event) =>
                  setBaselines({ restingHeartRate: toNumberOrNull(event.target.value) })
                }
                placeholder="e.g. 70"
                className="h-11"
              />
            </Field>
            <Field label="Blood glucose">
              <div className="flex gap-2">
                <Input
                  type="number"
                  inputMode="decimal"
                  value={value.baselines?.bloodGlucose ?? ""}
                  onChange={(event) =>
                    setBaselines({ bloodGlucose: toNumberOrNull(event.target.value) })
                  }
                  placeholder="e.g. 5.5"
                  className="h-11"
                />
                {/* The unit is not optional alongside a number - the same figure
                    means very different things in mmol/L and mg/dL. */}
                <Select
                  value={value.baselines?.bloodGlucoseUnit ?? ""}
                  onValueChange={(next) => setBaselines({ bloodGlucoseUnit: next as GlucoseUnit })}
                >
                  <SelectTrigger className="h-11 w-32 shrink-0">
                    <SelectValue placeholder="Unit" />
                  </SelectTrigger>
                  <SelectContent>
                    {GLUCOSE_UNITS.map((unit) => (
                      <SelectItem key={unit} value={unit}>
                        {unit}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </Field>
          </div>
        </SectionShell>
      )}

      {show("access") && (
        <SectionShell
          title="Getting around, and getting in"
          description="This decides whether one professional can support you safely on their own."
        >
          <Field label="Mobility">
            <Select
              value={value.access?.mobility ?? ""}
              onValueChange={(next) => setAccess({ mobility: next as MobilityLevel })}
            >
              <SelectTrigger className="h-11 w-full">
                <SelectValue placeholder="Select if it applies" />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(MOBILITY_LABELS) as MobilityLevel[]).map((level) => (
                  <SelectItem key={level} value={level}>
                    {MOBILITY_LABELS[level]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Equipment already at home">
            <ChipMultiSelect
              options={MOBILITY_AIDS}
              selected={value.access?.mobilityAids ?? []}
              onChange={(mobilityAids) => setAccess({ mobilityAids })}
              customPlaceholder="Add other equipment"
            />
          </Field>
          <Field
            label="Communication needs"
            hint="So your professional can prepare before they arrive, not after."
          >
            <ChipMultiSelect
              options={COMMUNICATION_NEEDS}
              selected={value.access?.communicationNeeds ?? []}
              onChange={(communicationNeeds) => setAccess({ communicationNeeds })}
              customPlaceholder="Add another need"
            />
          </Field>
        </SectionShell>
      )}

      {(includeHomeAccess || show("access")) && (
        <Field
          label="Getting into your home"
          hint="Stairs, no lift, where the key safe is, parking, dogs - anything that would slow a visit down."
        >
          <Textarea
            value={value.access?.homeAccessNotes ?? ""}
            onChange={(event) => setAccess({ homeAccessNotes: event.target.value })}
            placeholder="e.g. Second floor, no lift. Key safe left of the door, code given on booking."
            className="min-h-24"
          />
        </Field>
      )}

      {show("lifestyle") && (
        <SectionShell title="Lifestyle">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Smoking">
              <Select
                value={value.lifestyle?.smoking ?? ""}
                onValueChange={(next) => setLifestyle({ smoking: next as SmokingStatus })}
              >
                <SelectTrigger className="h-11 w-full">
                  <SelectValue placeholder="Select if it applies" />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(SMOKING_LABELS) as SmokingStatus[]).map((option) => (
                    <SelectItem key={option} value={option}>
                      {SMOKING_LABELS[option]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Alcohol">
              <Select
                value={value.lifestyle?.alcohol ?? ""}
                onValueChange={(next) => setLifestyle({ alcohol: next as AlcoholUse })}
              >
                <SelectTrigger className="h-11 w-full">
                  <SelectValue placeholder="Select if it applies" />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(ALCOHOL_LABELS) as AlcoholUse[]).map((option) => (
                    <SelectItem key={option} value={option}>
                      {ALCOHOL_LABELS[option]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>
        </SectionShell>
      )}

      {show("emergency") && (
        <SectionShell
          title="Emergency contact"
          description="Who your professional should call if something goes wrong during a visit."
        >
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Name">
              <Input
                value={value.emergencyContact?.name ?? ""}
                onChange={(event) => setEmergency({ name: event.target.value })}
                placeholder="Full name"
                className="h-11"
              />
            </Field>
            <Field label="Relationship">
              <Input
                value={value.emergencyContact?.relationship ?? ""}
                onChange={(event) => setEmergency({ relationship: event.target.value })}
                placeholder="e.g. Daughter"
                className="h-11"
              />
            </Field>
            <Field label="Phone">
              <Input
                type="tel"
                value={value.emergencyContact?.phone ?? ""}
                onChange={(event) => setEmergency({ phone: event.target.value })}
                placeholder="Phone number"
                className="h-11"
              />
            </Field>
          </div>
        </SectionShell>
      )}

      {show("careCircle") && (
        <SectionShell
          title="Your care circle"
          description="Who your professional escalates to if they are concerned."
        >
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="GP name">
              <Input
                value={value.careCircle?.gpName ?? ""}
                onChange={(event) => setCareCircle({ gpName: event.target.value })}
                placeholder="Doctor or practice"
                className="h-11"
              />
            </Field>
            <Field label="GP phone">
              <Input
                type="tel"
                value={value.careCircle?.gpPhone ?? ""}
                onChange={(event) => setCareCircle({ gpPhone: event.target.value })}
                placeholder="Phone number"
                className="h-11"
              />
            </Field>
            <Field label="Preferred hospital">
              <Input
                value={value.careCircle?.preferredHospital ?? ""}
                onChange={(event) => setCareCircle({ preferredHospital: event.target.value })}
                placeholder="Hospital name"
                className="h-11"
              />
            </Field>
          </div>
        </SectionShell>
      )}

      {show("notes") && (
        <SectionShell title="Anything else">
          <Textarea
            value={value.notes ?? ""}
            onChange={(event) => onChange({ ...value, notes: event.target.value })}
            placeholder="Anything you would want a professional to know before they arrive."
            className="min-h-28"
          />
        </SectionShell>
      )}
    </div>
  )
}
