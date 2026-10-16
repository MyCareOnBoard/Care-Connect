import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"
import { ProfileCompletionCard } from "../ProfileCompletionCard"
import { profileStrength } from "@/components/home/profileStrength"

/** A profile with a photo and a headline, and nothing else yet. */
const strength = profileStrength({ photo: "https://example.com/me.jpg", headline: "Nurse" } as never)

describe("ProfileCompletionCard", () => {
  it("says how far along the profile is and how many steps are left", () => {
    render(<ProfileCompletionCard strength={strength} onStep={vi.fn()} />)
    expect(screen.getByRole("progressbar", { name: "Profile completion" })).toHaveAttribute(
      "aria-valuenow",
      String(strength.percent),
    )
    expect(screen.getByText(/5 steps left/)).toBeInTheDocument()
  })

  it("marks finished steps as done and leaves them alone", () => {
    render(<ProfileCompletionCard strength={strength} onStep={vi.fn()} />)
    const photo = screen.getByRole("button", { name: "Add a profile photo (done)" })
    expect(photo).toBeDisabled()
  })

  it("takes a step, or the next one, straight to where it is done", async () => {
    const onStep = vi.fn()
    render(<ProfileCompletionCard strength={strength} onStep={onStep} />)

    await userEvent.click(screen.getByRole("button", { name: "List a few skills" }))
    expect(onStep).toHaveBeenLastCalledWith("skills")

    // The big button is the first unfinished step: the About section.
    const next = screen.getAllByRole("button", { name: /Tell people about yourself/ }).at(-1)!
    await userEvent.click(next)
    expect(onStep).toHaveBeenLastCalledWith("about")
  })

  it("shows the Cowry reward when there is one", () => {
    const { rerender } = render(<ProfileCompletionCard strength={strength} reward={50} onStep={vi.fn()} />)
    expect(screen.getByText(/Finish to earn/)).toBeInTheDocument()

    rerender(<ProfileCompletionCard strength={strength} onStep={vi.fn()} />)
    expect(screen.queryByText(/Finish to earn/)).not.toBeInTheDocument()
  })
})
