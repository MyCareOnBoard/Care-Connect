import { useState } from "react"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, it, expect, vi } from "vitest"
import {
  ALL_SECTIONS,
  BOOKING_FLOW_SECTIONS,
  HealthProfileForm,
} from "../HealthProfileForm"
import type { ClientHealthProfile } from "@/utils/careconnect/types"

/**
 * A controlled harness, so edits behave as they do in the real pages (the form is
 * fully controlled and holds no internal draft).
 */
function Harness({
  sections,
  initial = {},
  includeHomeAccess,
  onValue,
}: {
  sections?: typeof ALL_SECTIONS
  initial?: ClientHealthProfile
  includeHomeAccess?: boolean
  onValue?: (value: ClientHealthProfile) => void
}) {
  const [value, setValue] = useState<ClientHealthProfile>(initial)
  return (
    <HealthProfileForm
      value={value}
      sections={sections}
      includeHomeAccess={includeHomeAccess}
      onChange={(next) => {
        setValue(next)
        onValue?.(next)
      }}
    />
  )
}

describe("HealthProfileForm section scoping", () => {
  it("renders only the requested sections", () => {
    render(<Harness sections={BOOKING_FLOW_SECTIONS} />)
    // In scope for the booking flow.
    expect(screen.getByText("Conditions, allergies and medications")).toBeInTheDocument()
    expect(screen.getByText("Emergency contact")).toBeInTheDocument()
    // Out of scope: the booking flow is the worst place to ask for a blood type.
    expect(screen.queryByText("About you")).not.toBeInTheDocument()
    expect(screen.queryByText("Your usual readings")).not.toBeInTheDocument()
    expect(screen.queryByText("Your care circle")).not.toBeInTheDocument()
  })

  it("renders everything in the full editor", () => {
    render(<Harness />)
    for (const title of [
      "About you",
      "Conditions, allergies and medications",
      "Your usual readings",
      "Getting around, and getting in",
      "Lifestyle",
      "Emergency contact",
      "Your care circle",
      "Anything else",
    ]) {
      expect(screen.getByText(title)).toBeInTheDocument()
    }
  })

  it("adds the home-access question only when asked", () => {
    const { unmount } = render(<Harness sections={BOOKING_FLOW_SECTIONS} />)
    expect(screen.queryByText("Getting into your home")).not.toBeInTheDocument()
    unmount()

    render(<Harness sections={BOOKING_FLOW_SECTIONS} includeHomeAccess />)
    expect(screen.getByText("Getting into your home")).toBeInTheDocument()
  })

  it("does not fire onChange on mount", () => {
    const onValue = vi.fn()
    render(<Harness onValue={onValue} />)
    expect(onValue).not.toHaveBeenCalled()
  })
})

describe("condition chips", () => {
  it("leaves an empty array, not an array with an empty string, after add-then-remove", () => {
    let latest: ClientHealthProfile = {}
    render(
      <Harness
        sections={["conditions"] as typeof ALL_SECTIONS}
        onValue={(value) => {
          latest = value
        }}
      />,
    )

    const chip = screen.getByRole("button", { name: "Asthma" })
    return userEvent
      .click(chip)
      .then(() => {
        expect(latest.history?.conditions).toEqual(["Asthma"])
        return userEvent.click(screen.getByRole("button", { name: "Asthma" }))
      })
      .then(() => {
        expect(latest.history?.conditions).toEqual([])
        expect(latest.history?.conditions).not.toContain("")
      })
  })

  it("adds a free-text condition and does not duplicate a listed one", async () => {
    let latest: ClientHealthProfile = {}
    render(
      <Harness
        sections={["conditions"] as typeof ALL_SECTIONS}
        onValue={(value) => {
          latest = value
        }}
      />,
    )

    const input = screen.getByPlaceholderText("Add a condition not listed")
    await userEvent.type(input, "Long covid")
    await userEvent.click(screen.getByRole("button", { name: "Add" }))
    expect(latest.history?.conditions).toEqual(["Long covid"])

    // Typing a listed value by hand must not create a second entry.
    await userEvent.type(input, "asthma")
    await userEvent.click(screen.getByRole("button", { name: "Add" }))
    expect(latest.history?.conditions).toEqual(["Long covid", "asthma"])
    await userEvent.type(input, "ASTHMA")
    await userEvent.click(screen.getByRole("button", { name: "Add" }))
    expect(latest.history?.conditions).toEqual(["Long covid", "asthma"])
  })
})

describe("allergy rows", () => {
  it("keeps the second row's values when the first is deleted", async () => {
    // The classic index-key bug: rows are keyed by index, so the editor must
    // rebuild every row from the array rather than hold per-row state.
    let latest: ClientHealthProfile = {}
    render(
      <Harness
        sections={["conditions"] as typeof ALL_SECTIONS}
        initial={{
          history: {
            allergies: [{ substance: "Penicillin" }, { substance: "Latex" }],
          },
        }}
        onValue={(value) => {
          latest = value
        }}
      />,
    )

    expect(screen.getByDisplayValue("Penicillin")).toBeInTheDocument()
    expect(screen.getByDisplayValue("Latex")).toBeInTheDocument()

    await userEvent.click(screen.getByRole("button", { name: "Remove allergy 1" }))

    expect(latest.history?.allergies).toEqual([{ substance: "Latex" }])
    expect(screen.queryByDisplayValue("Penicillin")).not.toBeInTheDocument()
    expect(screen.getByDisplayValue("Latex")).toBeInTheDocument()
  })

  it("adds a blank row without inventing content", async () => {
    let latest: ClientHealthProfile = {}
    render(
      <Harness
        sections={["conditions"] as typeof ALL_SECTIONS}
        onValue={(value) => {
          latest = value
        }}
      />,
    )
    await userEvent.click(screen.getByRole("button", { name: "Add an allergy" }))
    expect(latest.history?.allergies).toEqual([{ substance: "" }])
  })
})

describe("blood pressure validation", () => {
  it("explains a half-entered reading instead of silently accepting it", async () => {
    render(<Harness sections={["baselines"] as typeof ALL_SECTIONS} />)
    await userEvent.type(screen.getByLabelText("Systolic, the top number"), "120")
    expect(screen.getByText(/both the top and bottom numbers/i)).toBeInTheDocument()
  })
})

describe("height and weight units", () => {
  it("stores centimetres when entered in cm, and shows the imperial equivalent", async () => {
    let latest: ClientHealthProfile = {}
    render(
      <Harness
        sections={["basics"] as typeof ALL_SECTIONS}
        onValue={(value) => {
          latest = value
        }}
      />,
    )

    await userEvent.type(screen.getByLabelText("Height in centimetres"), "175")
    expect(latest.about?.heightCm).toBe(175)
    expect(screen.getByText("5ft 9in")).toBeInTheDocument()
  })

  it("lets someone enter height in feet and inches, storing cm", async () => {
    // Typing "5" into a centimetres box used to produce a server 400 naming
    // `about.heightCm`. Feet/inches is now a supported path.
    let latest: ClientHealthProfile = {}
    render(
      <Harness
        sections={["basics"] as typeof ALL_SECTIONS}
        onValue={(value) => {
          latest = value
        }}
      />,
    )

    await userEvent.click(screen.getByRole("button", { name: "ft/in" }))
    await userEvent.type(screen.getByLabelText("Height, feet"), "5")
    await userEvent.type(screen.getByLabelText("Height, inches"), "9")

    expect(latest.about?.heightCm).toBeGreaterThan(174)
    expect(latest.about?.heightCm).toBeLessThan(176)
    // And no complaint, because the value is plausible.
    expect(screen.queryByText(/feet or metres/i)).not.toBeInTheDocument()
  })

  it("explains an implausible centimetre value at the field", async () => {
    render(<Harness sections={["basics"] as typeof ALL_SECTIONS} />)
    await userEvent.type(screen.getByLabelText("Height in centimetres"), "5")
    expect(screen.getByText(/feet or metres/i)).toBeInTheDocument()
  })

  it("does not fight the typist when entering pounds", async () => {
    // Round-tripping lb -> kg -> lb loses precision, so a derived input would
    // rewrite "159" as "158.9" mid-typing.
    let latest: ClientHealthProfile = {}
    render(
      <Harness
        sections={["basics"] as typeof ALL_SECTIONS}
        onValue={(value) => {
          latest = value
        }}
      />,
    )

    await userEvent.click(screen.getByRole("button", { name: "lb" }))
    const input = screen.getByLabelText("Weight in pounds")
    await userEvent.type(input, "159")

    expect(input).toHaveValue(159)
    expect(latest.about?.weightKg).toBeGreaterThan(71)
    expect(latest.about?.weightKg).toBeLessThan(73)
  })

  it("clears the stored value when the field is emptied", async () => {
    let latest: ClientHealthProfile = {}
    render(
      <Harness
        sections={["basics"] as typeof ALL_SECTIONS}
        initial={{ about: { heightCm: 170 } }}
        onValue={(value) => {
          latest = value
        }}
      />,
    )

    await userEvent.clear(screen.getByLabelText("Height in centimetres"))
    expect(latest.about?.heightCm).toBeNull()
  })
})
