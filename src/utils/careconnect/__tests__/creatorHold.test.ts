import { describe, it, expect } from "vitest"
import {
  DEFAULT_CREATOR_HOLD_MINUTES,
  RELEASE_SWEEP_MINUTES,
  holdDescription,
} from "@/utils/careconnect/creatorHold"

/**
 * The wording under the creator-hold field.
 *
 * The case that earns this file is a hold below the sweep interval. The release sweep runs
 * every fifteen minutes, so a five-minute hold does not release in five — an operator who
 * sets 5, waits six minutes and sees nothing will report the setting as broken. Saying so
 * in the field's own description is cheaper than answering that question later.
 */

describe("holdDescription", () => {
  it("warns when a hold is shorter than the sweep that would release it", () => {
    // The whole reason this function exists.
    expect(holdDescription(5)).toContain(`effectively ${RELEASE_SWEEP_MINUTES}`)
    expect(holdDescription(1)).toContain(`effectively ${RELEASE_SWEEP_MINUTES}`)
    expect(holdDescription(14)).toContain(`effectively ${RELEASE_SWEEP_MINUTES}`)
  })

  it("stops warning once the hold reaches the sweep interval", () => {
    expect(holdDescription(RELEASE_SWEEP_MINUTES)).not.toContain("effectively")
    expect(holdDescription(RELEASE_SWEEP_MINUTES)).toBe("15 minutes.")
  })

  it("explains zero as the next sweep rather than as instant", () => {
    // "Immediately" would be a lie by up to fifteen minutes.
    expect(holdDescription(0)).toContain("next sweep")
  })

  it("names the production default so nobody changes it by accident", () => {
    expect(holdDescription(DEFAULT_CREATOR_HOLD_MINUTES)).toContain("30 days")
    expect(holdDescription(DEFAULT_CREATOR_HOLD_MINUTES)).toContain("production default")
  })

  it("speaks in the largest sensible unit", () => {
    expect(holdDescription(30)).toBe("30 minutes.")
    expect(holdDescription(120)).toBe("2 hours.")
    expect(holdDescription(90)).toBe("1.5 hours.")
    expect(holdDescription(1440)).toBe("1 days.")
    expect(holdDescription(2160)).toBe("1.5 days.")
  })

  it("asks for a number rather than rendering NaN", () => {
    for (const bad of ["", "  ", "soon", null, undefined, -5]) {
      expect(holdDescription(bad)).toBe("Enter a number of minutes.")
    }
  })

  it("accepts a string, which is what an input gives back", () => {
    expect(holdDescription("43200")).toContain("production default")
    expect(holdDescription("5")).toContain("effectively")
  })
})
