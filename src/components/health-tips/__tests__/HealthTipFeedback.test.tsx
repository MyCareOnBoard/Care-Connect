import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"
import { HealthTipFeedback } from "../HealthTipFeedback"
import type { HealthTip } from "@/utils/careconnect/services/healthTipsService"

const KEY = "0123456789abcdef0123456789abcdef"
const TIP: HealthTip = { id: "tip-1", title: "Release a tight neck", summary: "Gentle movement helps." }
const TIP_WITH_IMAGE: HealthTip = {
  ...TIP,
  image: { status: "ready", url: "https://cdn.example.com/a.png", alt: "A stretch", key: KEY },
}

function setup(tip: HealthTip = TIP, personalized = false, onSubmit = vi.fn().mockResolvedValue(undefined)) {
  const user = userEvent.setup()
  render(<HealthTipFeedback tip={tip} personalized={personalized} onSubmit={onSubmit} />)
  return { user, onSubmit }
}

describe("HealthTipFeedback", () => {
  it("sends a thumbs-up in one tap and says thanks", async () => {
    const { user, onSubmit } = setup()
    await user.click(screen.getByRole("button", { name: "Yes" }))
    expect(onSubmit).toHaveBeenCalledWith({ rating: "up", personalized: false })
    expect(await screen.findByText("Thanks for letting us know.")).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Yes" })).not.toBeInTheDocument()
  })

  it("tells the server when the tip was personalised", async () => {
    const { user, onSubmit } = setup(TIP, true)
    await user.click(screen.getByRole("button", { name: "Yes" }))
    expect(onSubmit).toHaveBeenCalledWith({ rating: "up", personalized: true })
  })

  it("offers reasons for a thumbs-down and sends the one picked", async () => {
    const { user, onSubmit } = setup()
    await user.click(screen.getByRole("button", { name: "No" }))
    expect(onSubmit).not.toHaveBeenCalled()
    await user.click(screen.getByRole("button", { name: "Hard to understand" }))
    expect(onSubmit).toHaveBeenCalledWith({ rating: "down", reason: "unclear", personalized: false })
    expect(await screen.findByText("Thanks for letting us know.")).toBeInTheDocument()
  })

  it("lets the person send a thumbs-down without explaining", async () => {
    const { user, onSubmit } = setup()
    await user.click(screen.getByRole("button", { name: "No" }))
    await user.click(screen.getByRole("button", { name: "Send without a reason" }))
    expect(onSubmit).toHaveBeenCalledWith({ rating: "down", personalized: false })
  })

  it("has no free-text field, so nothing typed about health can be sent", async () => {
    const { user } = setup()
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: "No" }))
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument()
  })

  it("carries 'this worried me' with the reason, and points to a professional in the thanks", async () => {
    const { user, onSubmit } = setup()
    await user.click(screen.getByRole("button", { name: "No" }))
    const worried = screen.getByRole("button", { name: "This worried me" })
    expect(worried).toHaveAttribute("aria-pressed", "false")
    await user.click(worried)
    expect(worried).toHaveAttribute("aria-pressed", "true")
    await user.click(screen.getByRole("button", { name: "Not relevant to me" }))

    expect(onSubmit).toHaveBeenCalledWith({ rating: "down", reason: "not_relevant", concerning: true, personalized: false })
    expect(await screen.findByText(/a doctor, nurse or pharmacist can help/)).toBeInTheDocument()
  })

  it("points to a professional when the reason is that the tip seemed unsafe", async () => {
    const { user } = setup()
    await user.click(screen.getByRole("button", { name: "No" }))
    await user.click(screen.getByRole("button", { name: "Seemed unsafe" }))
    expect(await screen.findByText(/a doctor, nurse or pharmacist can help/)).toBeInTheDocument()
  })

  it("does not add that line for an ordinary thumbs-down or thumbs-up", async () => {
    const { user } = setup()
    await user.click(screen.getByRole("button", { name: "Yes" }))
    expect(await screen.findByText("Thanks for letting us know.")).toBeInTheDocument()
    expect(screen.queryByText(/a doctor, nurse or pharmacist can help/)).not.toBeInTheDocument()
  })

  it("offers 'The picture is wrong' only for a tip with a picture, and names the picture when picked", async () => {
    const plain = setup()
    await plain.user.click(screen.getByRole("button", { name: "No" }))
    expect(screen.queryByRole("button", { name: "The picture is wrong" })).not.toBeInTheDocument()
  })

  it("reports the picture by key", async () => {
    const { user, onSubmit } = setup(TIP_WITH_IMAGE)
    await user.click(screen.getByRole("button", { name: "No" }))
    await user.click(screen.getByRole("button", { name: "The picture is wrong" }))
    expect(onSubmit).toHaveBeenCalledWith({ rating: "down", reason: "bad_image", imageKey: KEY, personalized: false })
  })

  it("does not name the picture for other reasons", async () => {
    const { user, onSubmit } = setup(TIP_WITH_IMAGE)
    await user.click(screen.getByRole("button", { name: "No" }))
    await user.click(screen.getByRole("button", { name: "Seemed unsafe" }))
    expect(onSubmit.mock.calls[0][0]).not.toHaveProperty("imageKey")
  })

  it("says it could not send, and lets the person try again", async () => {
    const onSubmit = vi.fn().mockRejectedValueOnce(new Error("offline")).mockResolvedValueOnce(undefined)
    const { user } = setup(TIP, false, onSubmit)
    await user.click(screen.getByRole("button", { name: "Yes" }))

    expect(await screen.findByRole("alert")).toHaveTextContent("We couldn't send that")
    expect(screen.getByRole("button", { name: "Yes" })).toBeEnabled()

    await user.click(screen.getByRole("button", { name: "Yes" }))
    await waitFor(() => expect(screen.getByText("Thanks for letting us know.")).toBeInTheDocument())
    expect(screen.queryByRole("alert")).not.toBeInTheDocument()
  })

  it("says what is and is not sent", () => {
    setup()
    expect(screen.getByText(/Only your rating is sent/)).toBeInTheDocument()
  })
})
