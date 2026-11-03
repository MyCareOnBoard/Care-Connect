import { act, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { HealthTipCard } from "../HealthTipCard"
import { MAX_POLLS } from "../useTipImage"
import type { HealthTip } from "@/utils/careconnect/services/healthTipsService"

const fetchHealthTipImage = vi.hoisted(() => vi.fn())
vi.mock("@/utils/careconnect/services/healthTipsService", async () => ({
  ...(await vi.importActual<object>("@/utils/careconnect/services/healthTipsService")),
  fetchHealthTipImage,
}))

const KEY = "0123456789abcdef0123456789abcdef"

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
    expect(container.querySelector(".aspect-square")).toBeNull()
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

  it("lets each step be ticked off and back on, counting what is done", () => {
    render(<HealthTipCard tip={{ ...TEXT_TIP, steps: ["Pick a wake-up time", "Dim the lights"] }} />)
    const first = screen.getByRole("button", { name: "Pick a wake-up time" })
    expect(screen.getByText("0 of 2 done")).toBeInTheDocument()

    fireEvent.click(first)
    expect(first).toHaveAttribute("aria-pressed", "true")
    expect(screen.getByText("1 of 2 done")).toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: "Dim the lights" }))
    expect(screen.getByText(/All done/)).toBeInTheDocument()

    fireEvent.click(first)
    expect(first).toHaveAttribute("aria-pressed", "false")
    expect(screen.queryByText(/All done/)).not.toBeInTheDocument()
  })

  it("renders the image with its alt text, lazily", () => {
    render(
      <HealthTipCard
        tip={{ ...TEXT_TIP, image: { status: "ready", url: "https://cdn.example.com/sleep.png", alt: "A calm bedroom with dim lights" } }}
      />,
    )
    const image = screen.getByRole("img", { name: "A calm bedroom with dim lights" })
    expect(image).toHaveAttribute("src", "https://cdn.example.com/sleep.png")
    expect(image).toHaveAttribute("loading", "lazy")
  })

  it("falls back to text only, with no empty frame, when the image fails to load", () => {
    const { container } = render(
      <HealthTipCard
        tip={{ ...TEXT_TIP, image: { status: "ready", url: "https://cdn.example.com/missing.png", alt: "A calm bedroom" } }}
      />,
    )
    fireEvent.error(screen.getByRole("img"))
    expect(screen.queryByRole("img")).not.toBeInTheDocument()
    expect(container.querySelector(".aspect-square")).toBeNull()
    expect(screen.getByRole("heading", { name: TEXT_TIP.title })).toBeInTheDocument()
    expect(screen.getByText(TEXT_TIP.summary)).toBeInTheDocument()
  })

  it("labels a picture as AI-generated", () => {
    render(
      <HealthTipCard
        tip={{ ...TEXT_TIP, image: { status: "ready", url: "https://cdn.example.com/a.png", alt: "A stretch" } }}
      />,
    )
    expect(screen.getByText("AI-generated illustration")).toBeInTheDocument()
  })

  it("shows no label and no frame for a text-only tip", () => {
    render(<HealthTipCard tip={TEXT_TIP} />)
    expect(screen.queryByText("AI-generated illustration")).not.toBeInTheDocument()
    expect(fetchHealthTipImage).not.toHaveBeenCalled()
  })
})

describe("HealthTipCard — a picture still being drawn", () => {
  const pendingTip: HealthTip = { ...TEXT_TIP, image: { status: "pending", key: KEY, alt: "A seated neck stretch" } }
  const flush = () => act(async () => { await vi.advanceTimersByTimeAsync(0) })

  beforeEach(() => {
    vi.useFakeTimers()
    fetchHealthTipImage.mockReset()
  })
  afterEach(() => vi.useRealTimers())

  it("holds a placeholder, then shows the picture when it is ready; the text is there throughout", async () => {
    fetchHealthTipImage.mockResolvedValue({ status: "ready", url: "https://cdn.example.com/neck.png" })
    render(<HealthTipCard tip={pendingTip} />)

    expect(screen.getByRole("status", { name: "Drawing an illustration" })).toBeInTheDocument()
    expect(screen.getByText(TEXT_TIP.summary)).toBeInTheDocument()

    await flush()
    expect(fetchHealthTipImage).toHaveBeenCalledWith(KEY)
    const image = screen.getByRole("img", { name: "A seated neck stretch" })
    expect(image).toHaveAttribute("src", "https://cdn.example.com/neck.png")
    expect(screen.queryByRole("status")).not.toBeInTheDocument()
    expect(screen.getByText("AI-generated illustration")).toBeInTheDocument()
  })

  it("asks again after a wait while the server says pending", async () => {
    fetchHealthTipImage
      .mockResolvedValueOnce({ status: "pending" })
      .mockResolvedValueOnce({ status: "ready", url: "https://cdn.example.com/neck.png" })
    render(<HealthTipCard tip={pendingTip} />)

    await flush()
    expect(fetchHealthTipImage).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole("img")).not.toBeInTheDocument()

    await act(async () => { await vi.advanceTimersByTimeAsync(1500) })
    expect(fetchHealthTipImage).toHaveBeenCalledTimes(2)
    expect(screen.getByRole("img", { name: "A seated neck stretch" })).toBeInTheDocument()
  })

  it("drops the placeholder and keeps the text when the server says it will not come", async () => {
    fetchHealthTipImage.mockResolvedValue({ status: "failed" })
    const { container } = render(<HealthTipCard tip={pendingTip} />)
    await flush()

    expect(screen.queryByRole("status")).not.toBeInTheDocument()
    expect(screen.queryByRole("img")).not.toBeInTheDocument()
    expect(container.querySelector(".aspect-square")).toBeNull()
    expect(screen.getByText(TEXT_TIP.summary)).toBeInTheDocument()
    expect(fetchHealthTipImage).toHaveBeenCalledTimes(1)
  })

  it("keeps trying through network errors, then gives up and shows text only", async () => {
    fetchHealthTipImage.mockRejectedValue(new Error("Network Error"))
    render(<HealthTipCard tip={pendingTip} />)

    await act(async () => { await vi.advanceTimersByTimeAsync(120_000) })
    expect(fetchHealthTipImage).toHaveBeenCalledTimes(MAX_POLLS)
    expect(screen.queryByRole("status")).not.toBeInTheDocument()
    expect(screen.getByRole("heading", { name: TEXT_TIP.title })).toBeInTheDocument()
  })

  it("stops asking when the card goes away", async () => {
    fetchHealthTipImage.mockResolvedValue({ status: "pending" })
    const { unmount } = render(<HealthTipCard tip={pendingTip} />)
    await flush()
    unmount()
    await act(async () => { await vi.advanceTimersByTimeAsync(60_000) })
    expect(fetchHealthTipImage).toHaveBeenCalledTimes(1)
  })
})
