import { describe, it, expect } from "vitest"
import {
  cmToFeetInches,
  describeAllergy,
  describeMedication,
  feetInchesToCm,
  formatBloodPressure,
  healthProfileCompleteness,
  isHealthProfileEmpty,
  kgToLb,
  lbToKg,
  summarizeHealthProfile,
  validateBloodPressure,
} from "@/utils/careconnect/healthProfile"
import type { ClientHealthProfile } from "@/utils/careconnect/types"

describe("unit conversions", () => {
  it("round-trips height within half a centimetre", () => {
    for (const cm of [150, 165.5, 170, 183, 200]) {
      const imperial = cmToFeetInches(cm)!
      expect(Math.abs(feetInchesToCm(imperial.feet, imperial.inches) - cm)).toBeLessThan(1.5)
    }
  })

  it("rolls 12 inches over into the next foot", () => {
    // 182.7cm is ~5'11.9" — rounding must not produce 5'12".
    const result = cmToFeetInches(182.7)!
    expect(result.inches).toBeLessThan(12)
    expect(result).toEqual({ feet: 6, inches: 0 })
  })

  it("returns null for absent or nonsensical heights", () => {
    expect(cmToFeetInches(null)).toBeNull()
    expect(cmToFeetInches(undefined)).toBeNull()
    expect(cmToFeetInches(0)).toBeNull()
    expect(cmToFeetInches(Number.NaN)).toBeNull()
  })

  it("round-trips weight", () => {
    for (const kg of [50, 72.5, 100]) {
      expect(Math.abs(lbToKg(kgToLb(kg)!) - kg)).toBeLessThan(0.2)
    }
    expect(kgToLb(null)).toBeNull()
    expect(kgToLb(undefined)).toBeNull()
  })
})

describe("isHealthProfileEmpty", () => {
  it("treats nothing, and nothing-shaped, as empty", () => {
    expect(isHealthProfileEmpty(null)).toBe(true)
    expect(isHealthProfileEmpty(undefined)).toBe(true)
    expect(isHealthProfileEmpty({})).toBe(true)
    // An empty array is the absence of an answer, not an answer.
    expect(isHealthProfileEmpty({ history: { conditions: [] } })).toBe(true)
    expect(isHealthProfileEmpty({ history: {} })).toBe(true)
    expect(isHealthProfileEmpty({ notes: "" })).toBe(true)
    expect(isHealthProfileEmpty({ notes: "   " })).toBe(true)
    // Version/bookkeeping alone is not clinical content.
    expect(isHealthProfileEmpty({ version: 4, clientId: "c1" })).toBe(true)
  })

  it("is not empty once anything real is present", () => {
    expect(isHealthProfileEmpty({ history: { conditions: ["Asthma"] } })).toBe(false)
    expect(isHealthProfileEmpty({ notes: "Please text" })).toBe(false)
    expect(isHealthProfileEmpty({ about: { bloodType: "O+" } })).toBe(false)
    expect(isHealthProfileEmpty({ emergencyContact: { phone: "555" } })).toBe(false)
  })
})

describe("healthProfileCompleteness", () => {
  it("stays within bounds", () => {
    expect(healthProfileCompleteness(null)).toBe(0)
    expect(healthProfileCompleteness({})).toBe(0)
    const some = healthProfileCompleteness({ notes: "x", history: { conditions: ["Asthma"] } })
    expect(some).toBeGreaterThan(0)
    expect(some).toBeLessThan(100)
  })
})

describe("describeAllergy", () => {
  it("builds the fullest description available", () => {
    expect(
      describeAllergy({ substance: "Penicillin", reaction: "anaphylaxis", severity: "severe" }),
    ).toBe("Penicillin — anaphylaxis (Severe)")
  })

  it("degrades gracefully as fields go missing", () => {
    expect(describeAllergy({ substance: "Penicillin" })).toBe("Penicillin")
    expect(describeAllergy({ substance: "Penicillin", severity: "mild" })).toBe("Penicillin (Mild)")
    expect(describeAllergy({ substance: "Latex", reaction: "rash" })).toBe("Latex — rash")
  })

  it("returns nothing without a substance", () => {
    expect(describeAllergy(null)).toBe("")
    expect(describeAllergy({ substance: "" })).toBe("")
  })
})

describe("describeMedication", () => {
  it("joins name, dose and frequency", () => {
    expect(
      describeMedication({ name: "Metformin", dose: "500mg", frequency: "twice daily" }),
    ).toBe("Metformin 500mg, twice daily")
    expect(describeMedication({ name: "Metformin" })).toBe("Metformin")
    expect(describeMedication({ name: "" })).toBe("")
  })
})

describe("blood pressure", () => {
  it("formats only a complete reading", () => {
    expect(formatBloodPressure(120, 80)).toBe("120/80")
    // One half alone is not a reading.
    expect(formatBloodPressure(120, null)).toBeNull()
    expect(formatBloodPressure(null, 80)).toBeNull()
    expect(formatBloodPressure(null, null)).toBeNull()
  })

  it("accepts a blank pair and a plausible pair", () => {
    expect(validateBloodPressure(null, null)).toBeNull()
    expect(validateBloodPressure(120, 80)).toBeNull()
  })

  it("explains what is wrong rather than just failing", () => {
    expect(validateBloodPressure(120, null)).toMatch(/both/i)
    expect(validateBloodPressure(500, 80)).toMatch(/top number/i)
    expect(validateBloodPressure(120, 400)).toMatch(/bottom number/i)
    // Inverted is a genuine data-entry error worth catching.
    expect(validateBloodPressure(80, 120)).toMatch(/higher/i)
  })
})

describe("summarizeHealthProfile", () => {
  it("returns nothing for an absent or empty profile", () => {
    expect(summarizeHealthProfile(null)).toEqual([])
    expect(summarizeHealthProfile({})).toEqual([])
  })

  it("omits empty sections entirely rather than rendering placeholders", () => {
    const profile: ClientHealthProfile = {
      history: { conditions: ["Asthma"] },
      // Present but with nothing in it — must not produce a section.
      lifestyle: {},
      baselines: { systolic: null, diastolic: null },
    }
    const sections = summarizeHealthProfile(profile)
    expect(sections).toHaveLength(1)
    expect(sections[0].title).toMatch(/Conditions/)
    // No row anywhere may be an em-dash placeholder.
    for (const section of sections) {
      for (const row of section.rows) {
        expect(row.value.trim()).not.toBe("")
        expect(row.value).not.toBe("—")
      }
    }
  })

  it("renders the sections a professional needs, in order", () => {
    const profile: ClientHealthProfile = {
      about: { dateOfBirth: "1950-04-02", bloodType: "O+" },
      history: {
        conditions: ["Type 2 diabetes"],
        allergies: [{ substance: "Penicillin", severity: "severe" }],
        medications: [{ name: "Metformin", dose: "500mg" }],
      },
      baselines: { systolic: 130, diastolic: 85, measuredOn: "2026-08-01" },
      access: { mobility: "walking_aid", homeAccessNotes: "Second floor, no lift" },
      emergencyContact: { name: "Ada", relationship: "Daughter", phone: "555" },
      notes: "Please text before arriving",
    }
    const titles = summarizeHealthProfile(profile).map((section) => section.title)
    expect(titles[0]).toBe("About")
    expect(titles).toContain("Conditions, allergies and medications")
    expect(titles).toContain("Self-reported baselines")
    expect(titles).toContain("Access and mobility")
    expect(titles).toContain("Emergency contact")
    expect(titles).toContain("Anything else")

    const flat = summarizeHealthProfile(profile).flatMap((section) => section.rows)
    const bp = flat.find((row) => row.label === "Blood pressure")
    expect(bp?.value).toBe("130/85 (measured 2026-08-01)")
    const allergies = flat.find((row) => row.label === "Allergies")
    expect(allergies?.value).toBe("Penicillin (Severe)")
  })

  it("hides an unknown blood type instead of showing the sentinel", () => {
    const rows = summarizeHealthProfile({ about: { bloodType: "unknown" }, notes: "x" }).flatMap(
      (section) => section.rows,
    )
    expect(rows.find((row) => row.label === "Blood type")).toBeUndefined()
  })

  it("reads a frozen snapshot the same way as a live profile", () => {
    const sections = summarizeHealthProfile({
      sourceProfileVersion: 3,
      history: { conditions: ["COPD"] },
    })
    expect(sections).toHaveLength(1)
    expect(sections[0].rows[0].value).toBe("COPD")
  })
})
