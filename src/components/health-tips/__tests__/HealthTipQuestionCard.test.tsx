import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"
import { HealthTipQuestionCard } from "../HealthTipQuestionCard"
import type { HealthTipQuestion } from "@/utils/careconnect/services/healthTipsService"

const AGE: HealthTipQuestion = {
  field: "ageRange",
  question: "Which age group are you in?",
  options: [
    { value: "18_29", label: "18–29" },
    { value: "30_44", label: "30–44" },
  ],
}

const MOBILITY: HealthTipQuestion = {
  field: "mobility",
  question: "How do you usually get around?",
  options: [
    { value: "independent", label: "On my own" },
    { value: "walking_aid", label: "With a walking aid" },
  ],
}

describe("HealthTipQuestionCard", () => {
  it("shows the first question with its options and where the person is", () => {
    render(<HealthTipQuestionCard questions={[AGE, MOBILITY]} onSubmit={vi.fn()} />)
    expect(screen.getByText("Question 1 of 2")).toBeInTheDocument()
    expect(screen.getByText(AGE.question)).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "18–29" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "30–44" })).toBeInTheDocument()
    expect(screen.queryByText(MOBILITY.question)).not.toBeInTheDocument()
  })

  it("moves the focus to the question, so a keyboard user lands on what to answer", () => {
    render(<HealthTipQuestionCard questions={[AGE]} onSubmit={vi.fn()} />)
    expect(screen.getByText(AGE.question)).toHaveFocus()
  })

  it("answers and moves on, without submitting until the last question", async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    render(<HealthTipQuestionCard questions={[AGE, MOBILITY]} onSubmit={onSubmit} />)

    await user.click(screen.getByRole("button", { name: "30–44" }))

    expect(onSubmit).not.toHaveBeenCalled()
    expect(screen.getByText("Question 2 of 2")).toBeInTheDocument()
    expect(screen.getByText(MOBILITY.question)).toBeInTheDocument()
    expect(screen.getByText(MOBILITY.question)).toHaveFocus()
  })

  it("submits every answer once, on the last question", async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    render(<HealthTipQuestionCard questions={[AGE, MOBILITY]} onSubmit={onSubmit} />)

    await user.click(screen.getByRole("button", { name: "30–44" }))
    await user.click(screen.getByRole("button", { name: "With a walking aid" }))

    expect(onSubmit).toHaveBeenCalledTimes(1)
    expect(onSubmit).toHaveBeenCalledWith({ ageRange: "30_44", mobility: "walking_aid" })
  })

  it("submits a single question straight away", async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    render(<HealthTipQuestionCard questions={[AGE]} onSubmit={onSubmit} />)
    await user.click(screen.getByRole("button", { name: "18–29" }))
    expect(onSubmit).toHaveBeenCalledWith({ ageRange: "18_29" })
  })

  it("skips with nothing answered as an empty object, so the person is never stuck", async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    render(<HealthTipQuestionCard questions={[AGE, MOBILITY]} onSubmit={onSubmit} />)
    await user.click(screen.getByRole("button", { name: "Skip" }))
    expect(onSubmit).toHaveBeenCalledTimes(1)
    expect(onSubmit).toHaveBeenCalledWith({})
  })

  it("skips with only the answers given so far", async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    render(<HealthTipQuestionCard questions={[AGE, MOBILITY]} onSubmit={onSubmit} />)
    await user.click(screen.getByRole("button", { name: "30–44" }))
    await user.click(screen.getByRole("button", { name: "Skip" }))
    expect(onSubmit).toHaveBeenCalledWith({ ageRange: "30_44" })
  })

  it("says the answers are not saved", () => {
    render(<HealthTipQuestionCard questions={[AGE]} onSubmit={vi.fn()} />)
    expect(screen.getByText(/Your answers are not saved/)).toBeInTheDocument()
  })

  it("cannot be used while the tip is loading", () => {
    render(<HealthTipQuestionCard questions={[AGE]} onSubmit={vi.fn()} disabled />)
    expect(screen.getByRole("button", { name: "18–29" })).toBeDisabled()
    expect(screen.getByRole("button", { name: "Skip" })).toBeDisabled()
  })

  it("renders nothing when there are no questions", () => {
    const { container } = render(<HealthTipQuestionCard questions={[]} onSubmit={vi.fn()} />)
    expect(container).toBeEmptyDOMElement()
  })
})
