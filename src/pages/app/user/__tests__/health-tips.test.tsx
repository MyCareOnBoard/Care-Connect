import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"
import HealthTipsPage from "../health-tips"
import type { HealthTipsResult } from "@/utils/careconnect/services/healthTipsService"

// The real axios client initialises Firebase on import; these tests are about the page.
vi.mock("@/lib/axios", () => ({ default: { post: vi.fn() } }))

const searchHealthTips = vi.hoisted(() => vi.fn())
const sendHealthTipFeedback = vi.hoisted(() => vi.fn())
vi.mock("@/utils/careconnect/services/healthTipsService", async () => ({
  ...(await vi.importActual<object>("@/utils/careconnect/services/healthTipsService")),
  searchHealthTips,
  sendHealthTipFeedback,
}))

const TIP = {
  id: "tip-1",
  title: "Keep a regular bedtime",
  summary: "Going to bed at similar times helps your body settle into a rhythm.",
}

const AGE_QUESTION = {
  field: "ageRange" as const,
  question: "Which age group are you in?",
  options: [
    { value: "30_44", label: "30–44" },
    { value: "60_74", label: "60–74" },
  ],
}

function result(overrides: Partial<HealthTipsResult> = {}): HealthTipsResult {
  return {
    query: "sleeping better",
    tip: null,
    urgent: false,
    notice: null,
    personalized: false,
    needs: [],
    ...overrides,
  }
}

async function search(user: ReturnType<typeof userEvent.setup>, text = "sleeping better") {
  await user.type(screen.getByLabelText("What would you like tips on?"), text)
  await user.click(screen.getByRole("button", { name: "Search" }))
}

const personalizeBox = () => screen.getByRole("checkbox", { name: /Personalize using my health profile/ })

describe("Health tips page", () => {
  beforeEach(() => {
    searchHealthTips.mockReset()
    sendHealthTipFeedback.mockReset()
    sendHealthTipFeedback.mockResolvedValue(undefined)
  })

  it("shows one tip, not a list", async () => {
    searchHealthTips.mockResolvedValue(result({ tip: TIP }))
    const user = userEvent.setup()
    render(<HealthTipsPage />)
    await search(user)

    expect(await screen.findByRole("heading", { name: TIP.title })).toBeInTheDocument()
    expect(screen.getByText(TIP.summary)).toBeInTheDocument()
    expect(screen.getAllByRole("article")).toHaveLength(1)
    expect(screen.queryByText("Personalized for you")).not.toBeInTheDocument()
  })

  it("is off by default, says what it uses, and asks nothing when it is off", async () => {
    searchHealthTips.mockResolvedValue(result({ tip: TIP }))
    const user = userEvent.setup()
    render(<HealthTipsPage />)

    expect(personalizeBox()).not.toBeChecked()
    expect(personalizeBox()).toHaveAccessibleDescription(/never used/)
    await search(user)
    await screen.findByRole("heading", { name: TIP.title })
    expect(searchHealthTips).toHaveBeenCalledWith("sleeping better", expect.objectContaining({ personalize: false }))
    expect(screen.queryByRole("region", { name: "A few quick questions" })).not.toBeInTheDocument()
  })

  it("asks the questions instead of showing a tip, then shows the personalised tip", async () => {
    searchHealthTips
      .mockResolvedValueOnce(result({ needs: [AGE_QUESTION] }))
      .mockResolvedValueOnce(result({ tip: TIP, personalized: true }))
    const user = userEvent.setup()
    render(<HealthTipsPage />)

    await user.click(personalizeBox())
    await search(user)

    expect(await screen.findByText(AGE_QUESTION.question)).toBeInTheDocument()
    expect(screen.queryByRole("heading", { name: TIP.title })).not.toBeInTheDocument()
    expect(searchHealthTips).toHaveBeenLastCalledWith(
      "sleeping better",
      expect.objectContaining({ personalize: true }),
    )
    // The first request carries no answers: that is how the server knows to ask.
    expect(searchHealthTips.mock.lastCall?.[1].answers).toBeUndefined()

    await user.click(screen.getByRole("button", { name: "60–74" }))

    expect(await screen.findByRole("heading", { name: TIP.title })).toBeInTheDocument()
    expect(searchHealthTips).toHaveBeenLastCalledWith("sleeping better", {
      personalize: true,
      answers: { ageRange: "60_74" },
    })
    expect(screen.getByText("Personalized for you")).toBeInTheDocument()
    expect(screen.queryByText(AGE_QUESTION.question)).not.toBeInTheDocument()
  })

  it("lets the person skip the questions and still get a tip", async () => {
    searchHealthTips
      .mockResolvedValueOnce(result({ needs: [AGE_QUESTION] }))
      .mockResolvedValueOnce(result({ tip: TIP }))
    const user = userEvent.setup()
    render(<HealthTipsPage />)

    await user.click(personalizeBox())
    await search(user)
    await user.click(await screen.findByRole("button", { name: "Skip" }))

    expect(await screen.findByRole("heading", { name: TIP.title })).toBeInTheDocument()
    expect(searchHealthTips).toHaveBeenLastCalledWith("sleeping better", { personalize: true, answers: {} })
    expect(screen.queryByText("Personalized for you")).not.toBeInTheDocument()
  })

  it("never asks a question in answer to an emergency", async () => {
    searchHealthTips.mockResolvedValue(
      result({ urgent: true, notice: "Call your local emergency number.", needs: [AGE_QUESTION] }),
    )
    const user = userEvent.setup()
    render(<HealthTipsPage />)

    await user.click(personalizeBox())
    await search(user, "she has gone blue and floppy")

    expect(await screen.findByRole("alert")).toHaveTextContent("Call your local emergency number.")
    expect(screen.queryByText(AGE_QUESTION.question)).not.toBeInTheDocument()
  })

  it("does not keep asking if the server still sends questions after they were answered", async () => {
    searchHealthTips
      .mockResolvedValueOnce(result({ needs: [AGE_QUESTION] }))
      .mockResolvedValueOnce(result({ needs: [AGE_QUESTION] }))
    const user = userEvent.setup()
    render(<HealthTipsPage />)

    await user.click(personalizeBox())
    await search(user)
    await user.click(await screen.findByRole("button", { name: "Skip" }))

    await waitFor(() => expect(searchHealthTips).toHaveBeenCalledTimes(2))
    expect(await screen.findByText(/No tip came back/)).toBeInTheDocument()
    expect(screen.queryByText(AGE_QUESTION.question)).not.toBeInTheDocument()
  })

  it("drops the questions when personalising is turned off", async () => {
    searchHealthTips.mockResolvedValue(result({ needs: [AGE_QUESTION] }))
    const user = userEvent.setup()
    render(<HealthTipsPage />)

    await user.click(personalizeBox())
    await search(user)
    expect(await screen.findByText(AGE_QUESTION.question)).toBeInTheDocument()

    await user.click(personalizeBox())
    expect(screen.queryByText(AGE_QUESTION.question)).not.toBeInTheDocument()
  })

  describe("show me another", () => {
    const SECOND = { id: "tip-1", title: "Limit late caffeine", summary: "Caffeine late in the day can keep you awake." }
    const THIRD = { id: "tip-1", title: "Get morning light", summary: "Daylight early in the day helps set your body clock." }
    const another = () => screen.getByRole("button", { name: "Show me another" })

    it("asks for a different tip, telling the server which titles were shown", async () => {
      searchHealthTips
        .mockResolvedValueOnce(result({ tip: TIP }))
        .mockResolvedValueOnce(result({ tip: SECOND }))
      const user = userEvent.setup()
      render(<HealthTipsPage />)
      await search(user)
      await screen.findByRole("heading", { name: TIP.title })

      await user.click(another())

      expect(await screen.findByRole("heading", { name: SECOND.title })).toBeInTheDocument()
      expect(screen.queryByRole("heading", { name: TIP.title })).not.toBeInTheDocument()
      expect(searchHealthTips).toHaveBeenLastCalledWith(
        "sleeping better",
        expect.objectContaining({ personalize: false, exclude: [TIP.title] }),
      )
      expect(screen.getAllByRole("article")).toHaveLength(1)
    })

    it("keeps adding to the list of titles already shown", async () => {
      searchHealthTips
        .mockResolvedValueOnce(result({ tip: TIP }))
        .mockResolvedValueOnce(result({ tip: SECOND }))
        .mockResolvedValueOnce(result({ tip: THIRD }))
      const user = userEvent.setup()
      render(<HealthTipsPage />)
      await search(user)
      await user.click(await screen.findByRole("button", { name: "Show me another" }))
      await screen.findByRole("heading", { name: SECOND.title })
      await user.click(another())
      await screen.findByRole("heading", { name: THIRD.title })

      expect(searchHealthTips).toHaveBeenLastCalledWith(
        "sleeping better",
        expect.objectContaining({ exclude: [TIP.title, SECOND.title] }),
      )
    })

    it("stays personalised the same way, without asking the questions again", async () => {
      searchHealthTips
        .mockResolvedValueOnce(result({ needs: [AGE_QUESTION] }))
        .mockResolvedValueOnce(result({ tip: TIP, personalized: true }))
        .mockResolvedValueOnce(result({ tip: SECOND, personalized: true }))
      const user = userEvent.setup()
      render(<HealthTipsPage />)
      await user.click(personalizeBox())
      await search(user)
      await user.click(await screen.findByRole("button", { name: "60–74" }))
      await user.click(await screen.findByRole("button", { name: "Show me another" }))

      expect(await screen.findByRole("heading", { name: SECOND.title })).toBeInTheDocument()
      expect(searchHealthTips).toHaveBeenLastCalledWith("sleeping better", {
        personalize: true,
        answers: { ageRange: "60_74" },
        exclude: [TIP.title],
      })
      expect(screen.queryByText(AGE_QUESTION.question)).not.toBeInTheDocument()
    })

    it("keeps the tip on screen and says so when there is nothing new", async () => {
      searchHealthTips
        .mockResolvedValueOnce(result({ tip: TIP }))
        .mockResolvedValueOnce(result({ tip: null, notice: "That's all the tips we have for this topic right now." }))
      const user = userEvent.setup()
      render(<HealthTipsPage />)
      await search(user)
      await user.click(await screen.findByRole("button", { name: "Show me another" }))

      expect(await screen.findByText(/That's all the tips we have/)).toBeInTheDocument()
      expect(screen.getByRole("heading", { name: TIP.title })).toBeInTheDocument()
      expect(screen.queryByRole("button", { name: "Show me another" })).not.toBeInTheDocument()
    })

    it("lets an emergency replace the tip", async () => {
      searchHealthTips
        .mockResolvedValueOnce(result({ tip: TIP }))
        .mockResolvedValueOnce(result({ urgent: true, notice: "Call your local emergency number." }))
      const user = userEvent.setup()
      render(<HealthTipsPage />)
      await search(user)
      await user.click(await screen.findByRole("button", { name: "Show me another" }))

      expect(await screen.findByRole("alert")).toHaveTextContent("Call your local emergency number.")
      expect(screen.queryByRole("heading", { name: TIP.title })).not.toBeInTheDocument()
      expect(screen.queryByRole("button", { name: "Show me another" })).not.toBeInTheDocument()
    })

    it("keeps the tip it had when the request fails", async () => {
      searchHealthTips.mockResolvedValueOnce(result({ tip: TIP })).mockRejectedValueOnce(new Error("Network Error"))
      const user = userEvent.setup()
      render(<HealthTipsPage />)
      await search(user)
      await user.click(await screen.findByRole("button", { name: "Show me another" }))

      expect(await screen.findByRole("heading", { name: TIP.title })).toBeInTheDocument()
      expect(screen.getByRole("button", { name: "Show me another" })).toBeInTheDocument()
    })

    it("forgets what was shown when the person searches again", async () => {
      searchHealthTips
        .mockResolvedValueOnce(result({ tip: TIP }))
        .mockResolvedValueOnce(result({ tip: SECOND }))
        .mockResolvedValueOnce(result({ tip: THIRD, query: "sleeping better" }))
      const user = userEvent.setup()
      render(<HealthTipsPage />)
      await search(user)
      await user.click(await screen.findByRole("button", { name: "Show me another" }))
      await screen.findByRole("heading", { name: SECOND.title })

      await user.click(screen.getByRole("button", { name: "Search" }))
      await screen.findByRole("heading", { name: THIRD.title })
      expect(searchHealthTips.mock.lastCall?.[1].exclude).toBeUndefined()
    })

    it("offers it only next to a tip", async () => {
      searchHealthTips.mockResolvedValue(result({ tip: null, notice: "We can't give general tips for that." }))
      const user = userEvent.setup()
      render(<HealthTipsPage />)
      await search(user)
      await screen.findByText(/We can't give general tips/)
      expect(screen.queryByRole("button", { name: "Show me another" })).not.toBeInTheDocument()
      expect(screen.queryByText("Was this tip helpful?")).not.toBeInTheDocument()
    })
  })

  describe("feedback", () => {
    it("sends a rating for the tip on screen", async () => {
      searchHealthTips.mockResolvedValue(result({ tip: TIP, personalized: true }))
      const user = userEvent.setup()
      render(<HealthTipsPage />)
      await search(user)
      await screen.findByRole("heading", { name: TIP.title })

      await user.click(screen.getByRole("button", { name: "Yes" }))
      expect(sendHealthTipFeedback).toHaveBeenCalledWith({ rating: "up", personalized: true })
      expect(await screen.findByText("Thanks for letting us know.")).toBeInTheDocument()
    })

    it("asks again for the next tip", async () => {
      searchHealthTips
        .mockResolvedValueOnce(result({ tip: TIP }))
        .mockResolvedValueOnce(result({ tip: { id: "tip-1", title: "Limit late caffeine", summary: "S." } }))
      const user = userEvent.setup()
      render(<HealthTipsPage />)
      await search(user)
      await user.click(await screen.findByRole("button", { name: "Yes" }))
      await screen.findByText("Thanks for letting us know.")

      await user.click(screen.getByRole("button", { name: "Show me another" }))
      await screen.findByRole("heading", { name: "Limit late caffeine" })
      expect(await screen.findByText("Was this tip helpful?")).toBeInTheDocument()
    })
  })
})
