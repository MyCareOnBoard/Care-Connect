import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { HealthTipCard } from "../HealthTipCard"
import type { HealthTip } from "@/utils/careconnect/services/healthTipsService"

const TEXT_TIP: HealthTip = {
  id: "tip-1",
  title: "Keep a regular bedtime",
  summary: "Going to bed at similar times helps your body settle into a rhythm.",
}

describe("HealthTipCard", () => {
  it("renders a text-only tip with no image and no empty frame", () => {
    const { container } = render(<HealthTipCard tip={TEXT_TIP} />)
    expect(screen.getByRole("heading", { name: TEXT_TIP.title })).toBeInTheDocument()
    expect(screen.getByText(TEXT_TIP.summary)).toBeInTheDocument()
    expect(screen.queryByRole("img")).not.toBeInTheDocument()
    expect(container.querySelector(".aspect-video")).toBeNull()
    expect(screen.queryByRole("list")).not.toBeInTheDocument()
    expect(screen.queryByText(/See a professional if/)).not.toBeInTheDocument()
  })

  it("renders steps in order and the professional line when present", () => {
    render(
      <HealthTipCard
        tip={{
          ...TEXT_TIP,
          steps: ["Pick a wake-up time", "Dim the lights an hour before bed"],
          whenToSeeAProfessional: "poor sleep lasts more than a few weeks.",
        }}
      />,
    )
    const items = screen.getAllByRole("listitem").map((item) => item.textContent)
    expect(items).toEqual(["Pick a wake-up time", "Dim the lights an hour before bed"])
    expect(screen.getByText(/See a professional if: poor sleep lasts/)).toBeInTheDocument()
  })

  it("renders the image with its alt text, lazily", () => {
    render(
      <HealthTipCard
        tip={{ ...TEXT_TIP, image: { url: "https://cdn.example.com/sleep.png", alt: "A calm bedroom with dim lights" } }}
      />,
    )
    const image = screen.getByRole("img", { name: "A calm bedroom with dim lights" })
    expect(image).toHaveAttribute("src", "https://cdn.example.com/sleep.png")
    expect(image).toHaveAttribute("loading", "lazy")
  })

  it("falls back to text only, with no empty frame, when the image fails to load", () => {
    const { container } = render(
      <HealthTipCard
        tip={{ ...TEXT_TIP, image: { url: "https://cdn.example.com/missing.png", alt: "A calm bedroom" } }}
      />,
    )
    fireEvent.error(screen.getByRole("img"))
    expect(screen.queryByRole("img")).not.toBeInTheDocument()
    expect(container.querySelector(".aspect-video")).toBeNull()
    expect(screen.getByRole("heading", { name: TEXT_TIP.title })).toBeInTheDocument()
    expect(screen.getByText(TEXT_TIP.summary)).toBeInTheDocument()
  })
})
