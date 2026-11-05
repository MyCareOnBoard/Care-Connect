import { render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter } from "react-router"
import { beforeEach, describe, expect, it, vi } from "vitest"
import HealthTipsPage from "../health-tips"
import { RECENT_SEARCHES_KEY } from "@/components/health-tips/useRecentSearches"
import type { HealthTipsResult } from "@/utils/careconnect/services/healthTipsService"

// The real axios client initialises Firebase on import; these tests are about the page.
vi.mock("@/lib/axios", () => ({ default: { post: vi.fn() } }))

const getHealthTipReminderTip = vi.hoisted(() => vi.fn())
vi.mock("@/utils/careconnect/services/healthTipRemindersService", async () => ({
  ...(await vi.importActual<object>("@/utils/careconnect/services/healthTipRemindersService")),
  getHealthTipReminderTip,
  // "Your reminders" is not what these tests are about; it renders nothing without any.
  listHealthTipReminders: vi.fn().mockResolvedValue({ reminders: [], max: 5 }),
}))

const listSavedHealthTips = vi.hoisted(() => vi.fn())
vi.mock("@/utils/careconnect/services/savedHealthTipsService", async () => ({
  ...(await vi.importActual<object>("@/utils/careconnect/services/savedHealthTipsService")),
  listSavedHealthTips,
}))

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
    followUpToken: null,
    ...overrides,
  }
}

async function search(user: ReturnType<typeof userEvent.setup>, text = "sleeping better") {
  await user.type(screen.getByLabelText("What would you like tips on?"), text)
  await user.click(screen.getByRole("button", { name: "Search" }))
}

/** The page needs a router (it reads `?reminder=`); a reminder notification opens it with one. */
function renderPage(url = "/user/health-tips") {
  return render(
    <MemoryRouter initialEntries={[url]}>
      <HealthTipsPage />
    </MemoryRouter>,
  )
}

const personalizeBox = () => screen.getByRole("checkbox", { name: /Personalize using my health profile/ })

describe("Health tips page", () => {
  beforeEach(() => {
    localStorage.clear()
    searchHealthTips.mockReset()
    getHealthTipReminderTip.mockReset()
    listSavedHealthTips.mockReset()
    listSavedHealthTips.mockResolvedValue({ tips: [], max: 50 })
    sendHealthTipFeedback.mockReset()
    sendHealthTipFeedback.mockResolvedValue(undefined)
  })

  it("shows one tip, not a list", async () => {
    searchHealthTips.mockResolvedValue(result({ tip: TIP }))
    const user = userEvent.setup()
    renderPage()
    await search(user)

    expect(await screen.findByRole("heading", { name: TIP.title })).toBeInTheDocument()
    expect(screen.getByText(TIP.summary)).toBeInTheDocument()
    expect(screen.getAllByRole("article")).toHaveLength(1)
    expect(screen.queryByText("Personalized for you")).not.toBeInTheDocument()
  })

  it("is off by default, says what it uses, and asks nothing when it is off", async () => {
    searchHealthTips.mockResolvedValue(result({ tip: TIP }))
    const user = userEvent.setup()
    renderPage()

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
    renderPage()

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
    renderPage()

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
    renderPage()

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
    renderPage()

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
    renderPage()

    await user.click(personalizeBox())
    await search(user)
    expect(await screen.findByText(AGE_QUESTION.question)).toBeInTheDocument()

    await user.click(personalizeBox())
    expect(screen.queryByText(AGE_QUESTION.question)).not.toBeInTheDocument()
  })

  describe("getting around", () => {
    it("remembers searches that gave a tip, and clears them", async () => {
      searchHealthTips.mockResolvedValue(result({ tip: TIP }))
      const user = userEvent.setup()
      renderPage()
      expect(screen.queryByRole("group", { name: "Recent searches" })).not.toBeInTheDocument()

      await search(user)
      await screen.findByRole("heading", { name: TIP.title })
      const recent = screen.getByRole("group", { name: "Recent searches" })
      expect(within(recent).getByRole("button", { name: "sleeping better" })).toBeInTheDocument()

      await user.click(within(recent).getByRole("button", { name: "Clear" }))
      expect(screen.queryByRole("group", { name: "Recent searches" })).not.toBeInTheDocument()
      expect(localStorage.getItem(RECENT_SEARCHES_KEY)).toBeNull()
    })

    it("never remembers an emergency", async () => {
      searchHealthTips.mockResolvedValue(result({ urgent: true, notice: "Call now." }))
      const user = userEvent.setup()
      renderPage()
      await search(user, "chest pain")
      await screen.findByRole("alert")
      expect(screen.queryByRole("group", { name: "Recent searches" })).not.toBeInTheDocument()
    })

    it("jumps to the search box on /, but not while typing elsewhere", async () => {
      const user = userEvent.setup()
      renderPage()
      const input = screen.getByLabelText("What would you like tips on?")

      await user.keyboard("/")
      expect(input).toHaveFocus()
      await user.keyboard("/")
      expect(input).toHaveValue("/")
    })

    it("browses topics by category and searches the one picked", async () => {
      searchHealthTips.mockResolvedValue(result({ tip: TIP }))
      const user = userEvent.setup()
      renderPage()

      await user.click(screen.getByRole("button", { name: "Mind" }))
      expect(screen.getByRole("button", { name: "Mind" })).toHaveAttribute("aria-pressed", "true")
      await user.click(screen.getByRole("button", { name: "Taking screen breaks" }))
      expect(searchHealthTips).toHaveBeenCalledWith("Taking screen breaks", expect.anything())
    })
  })

  describe("feedback", () => {
    it("sends a rating for the tip on screen", async () => {
      searchHealthTips.mockResolvedValue(result({ tip: TIP, personalized: true }))
      const user = userEvent.setup()
      renderPage()
      await search(user)
      await screen.findByRole("heading", { name: TIP.title })

      await user.click(screen.getByRole("button", { name: "Yes" }))
      expect(sendHealthTipFeedback).toHaveBeenCalledWith({ rating: "up", personalized: true })
      expect(await screen.findByText("Thanks for letting us know.")).toBeInTheDocument()
    })

    it("is offered again for the next search", async () => {
      searchHealthTips
        .mockResolvedValueOnce(result({ tip: TIP }))
        .mockResolvedValueOnce(result({ tip: { id: "tip-1", title: "Limit late caffeine", summary: "S." } }))
      const user = userEvent.setup()
      renderPage()
      await search(user)
      await user.click(await screen.findByRole("button", { name: "Yes" }))
      await screen.findByText("Thanks for letting us know.")

      await user.click(screen.getByRole("button", { name: "Search" }))
      await screen.findByRole("heading", { name: "Limit late caffeine" })
      expect(await screen.findByText("Was this tip helpful?")).toBeInTheDocument()
    })
  })

  describe("questions written for the search", () => {
    const AIM = {
      field: "q1" as const,
      question: "What are you aiming for?",
      options: [
        { value: "0", label: "Stay active" },
        { value: "1", label: "Build strength" },
      ],
    }
    const TIME = {
      field: "q2" as const,
      question: "How much time do you have?",
      options: [
        { value: "0", label: "5 minutes" },
        { value: "1", label: "15 minutes" },
      ],
    }

    it("asks them, then sends the token with the picks, never the words", async () => {
      searchHealthTips
        .mockResolvedValueOnce(result({ needs: [AIM, TIME], followUpToken: "signed.token" }))
        .mockResolvedValueOnce(result({ tip: TIP, personalized: true }))
      const user = userEvent.setup()
      renderPage()
      await user.click(personalizeBox())
      await search(user)

      expect(await screen.findByText(AIM.question)).toBeInTheDocument()
      await user.click(screen.getByRole("button", { name: "Build strength" }))
      await user.click(screen.getByRole("button", { name: "5 minutes" }))

      expect(await screen.findByRole("heading", { name: TIP.title })).toBeInTheDocument()
      expect(searchHealthTips).toHaveBeenLastCalledWith("sleeping better", {
        personalize: true,
        answers: undefined,
        followUp: { token: "signed.token", picks: [1, 0] },
      })
      expect(screen.queryByText(AIM.question)).not.toBeInTheDocument()
    })

    it("sends null for a skipped question", async () => {
      searchHealthTips
        .mockResolvedValueOnce(result({ needs: [AIM, TIME], followUpToken: "signed.token" }))
        .mockResolvedValueOnce(result({ tip: TIP }))
      const user = userEvent.setup()
      renderPage()
      await user.click(personalizeBox())
      await search(user)
      await user.click(await screen.findByRole("button", { name: "Stay active" }))
      await user.click(screen.getByRole("button", { name: "Skip" }))

      await screen.findByRole("heading", { name: TIP.title })
      expect(searchHealthTips.mock.lastCall?.[1].followUp).toEqual({ token: "signed.token", picks: [0, null] })
    })

    it("does not ask again if the server still sends questions after they were answered", async () => {
      searchHealthTips
        .mockResolvedValueOnce(result({ needs: [AIM], followUpToken: "signed.token" }))
        .mockResolvedValueOnce(result({ needs: [AIM], followUpToken: "signed.token" }))
      const user = userEvent.setup()
      renderPage()
      await user.click(personalizeBox())
      await search(user)
      await user.click(await screen.findByRole("button", { name: "Stay active" }))

      expect(await screen.findByText(/No tip came back/)).toBeInTheDocument()
      expect(screen.queryByText(AIM.question)).not.toBeInTheDocument()
    })
  })
  describe("opened from a reminder notification", () => {
    it("shows the tip the reminder was set from, without searching", async () => {
      getHealthTipReminderTip.mockResolvedValue(TIP)
      renderPage("/user/health-tips?reminder=abc123")

      expect(await screen.findByRole("heading", { name: TIP.title })).toBeInTheDocument()
      expect(screen.getByText(TIP.summary)).toBeInTheDocument()
      expect(getHealthTipReminderTip).toHaveBeenCalledWith("abc123")
      expect(searchHealthTips).not.toHaveBeenCalled()
    })

    it("falls back to the normal page when the tip cannot be opened", async () => {
      getHealthTipReminderTip.mockResolvedValue(null)
      renderPage("/user/health-tips?reminder=gone")

      await waitFor(() => expect(getHealthTipReminderTip).toHaveBeenCalled())
      expect(await screen.findByLabelText("What would you like tips on?")).toBeInTheDocument()
      expect(screen.queryByRole("article")).not.toBeInTheDocument()
      expect(searchHealthTips).not.toHaveBeenCalled()
    })

    it("does nothing special without a reminder in the address", async () => {
      renderPage()
      expect(await screen.findByLabelText("What would you like tips on?")).toBeInTheDocument()
      expect(getHealthTipReminderTip).not.toHaveBeenCalled()
    })
  })
  describe("saved tips", () => {
    const SAVED_ID = "0123456789abcdef0123456789abcdef"

    it("opens a saved tip in full without searching", async () => {
      listSavedHealthTips.mockResolvedValue({ tips: [{ id: SAVED_ID, tip: TIP, savedAt: "2026-11-04T10:00:00.000Z" }], max: 50 })
      window.scrollTo = vi.fn() as unknown as typeof window.scrollTo
      const user = userEvent.setup()
      renderPage()

      await user.click(await screen.findByRole("button", { name: "Open" }))
      expect(await screen.findByRole("article")).toBeInTheDocument()
      expect(screen.getAllByText(TIP.summary).length).toBeGreaterThan(0)
      expect(searchHealthTips).not.toHaveBeenCalled()
    })
  })
})
