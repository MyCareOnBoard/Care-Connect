import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"
import { HealthTipReminder } from "../HealthTipReminder"
import type { HealthTip } from "@/utils/careconnect/services/healthTipsService"
import type { HealthTipReminder as Reminder } from "@/utils/careconnect/services/healthTipRemindersService"

const TIP: HealthTip = { id: "tip-1", title: "Release a tight neck", summary: "Gentle movement helps." }
const CREATED: Reminder = {
  id: "r1",
  label: TIP.title,
  time: "08:00",
  timezone: "America/New_York",
  recurrence: "daily",
  status: "active",
  nextAt: "2026-11-05T13:00:00.000Z",
  expiresAt: "2026-12-04T13:00:00.000Z",
}

function setup(onCreate = vi.fn().mockResolvedValue(CREATED)) {
  const user = userEvent.setup()
  render(<HealthTipReminder tip={TIP} onCreate={onCreate} />)
  return { user, onCreate }
}

describe("HealthTipReminder", () => {
  it("starts as one quiet button and sets nothing until asked", () => {
    const { onCreate } = setup()
    expect(screen.getByRole("button", { name: "Remind me" })).toBeInTheDocument()
    expect(onCreate).not.toHaveBeenCalled()
  })

  it("sets a daily morning reminder by default, named after the tip", async () => {
    const { user, onCreate } = setup()
    await user.click(screen.getByRole("button", { name: "Remind me" }))
    await user.click(screen.getByRole("button", { name: "Set reminder" }))
    expect(onCreate).toHaveBeenCalledWith({ label: TIP.title, time: "08:00", recurrence: "daily", tip: TIP, saveTip: true })
    expect(await screen.findByText(/Reminder set for 8:00 AM, every day/)).toBeInTheDocument()
  })

  it("sends the time and repeat that were picked", async () => {
    const { user, onCreate } = setup()
    await user.click(screen.getByRole("button", { name: "Remind me" }))
    await user.click(screen.getByRole("button", { name: /Evening/ }))
    await user.click(screen.getByRole("button", { name: "Once" }))
    await user.click(screen.getByRole("button", { name: "Set reminder" }))
    expect(onCreate).toHaveBeenCalledWith({ label: TIP.title, time: "18:00", recurrence: "once", tip: TIP, saveTip: true })
  })

  it("also saves the tip by default, says so, and lets the person untick it", async () => {
    const { user, onCreate } = setup()
    await user.click(screen.getByRole("button", { name: "Remind me" }))
    const box = screen.getByRole("checkbox", { name: /Also save this tip/ })
    expect(box).toBeChecked()
    await user.click(box)
    await user.click(screen.getByRole("button", { name: "Set reminder" }))
    expect(onCreate).toHaveBeenCalledWith({ label: TIP.title, time: "08:00", recurrence: "daily", tip: TIP, saveTip: false })
  })

  it("confirms the tip was saved only when the server says it was", async () => {
    const { user } = setup(vi.fn().mockResolvedValue({ ...CREATED, saved: true }))
    await user.click(screen.getByRole("button", { name: "Remind me" }))
    await user.click(screen.getByRole("button", { name: "Set reminder" }))
    expect(await screen.findByText(/saved under Saved tips/)).toBeInTheDocument()
  })

  it("does not claim it saved the tip when it did not", async () => {
    const { user } = setup(vi.fn().mockResolvedValue({ ...CREATED, saved: false }))
    await user.click(screen.getByRole("button", { name: "Remind me" }))
    await user.click(screen.getByRole("button", { name: "Set reminder" }))
    await screen.findByText(/Reminder set for/)
    expect(screen.queryByText(/saved under Saved tips/)).not.toBeInTheDocument()
  })

  it("says the reminder will not mention the topic, before and after", async () => {
    const { user } = setup()
    await user.click(screen.getByRole("button", { name: "Remind me" }))
    expect(screen.getByText(/doesn't mention the topic/)).toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: "Set reminder" }))
    expect(await screen.findByText(/doesn't mention the topic/)).toBeInTheDocument()
  })

  it("shows the server's limit message and lets the person try again", async () => {
    const limit = { response: { status: 409, data: { error: "You can have up to 5 reminders." } } }
    const onCreate = vi.fn().mockRejectedValueOnce(limit).mockResolvedValueOnce(CREATED)
    const { user } = setup(onCreate)
    await user.click(screen.getByRole("button", { name: "Remind me" }))
    await user.click(screen.getByRole("button", { name: "Set reminder" }))
    expect(await screen.findByRole("alert")).toHaveTextContent("You can have up to 5 reminders.")
    await user.click(screen.getByRole("button", { name: "Set reminder" }))
    expect(await screen.findByText(/Reminder set for/)).toBeInTheDocument()
  })

  it("shows a plain message, not the raw error, for anything else", async () => {
    const onCreate = vi.fn().mockRejectedValue(new Error("Network Error at /secret/path"))
    const { user } = setup(onCreate)
    await user.click(screen.getByRole("button", { name: "Remind me" }))
    await user.click(screen.getByRole("button", { name: "Set reminder" }))
    const alert = await screen.findByRole("alert")
    expect(alert).toHaveTextContent("couldn't set that reminder")
    expect(alert).not.toHaveTextContent("secret")
  })

  it("cancels back to the button", async () => {
    const { user, onCreate } = setup()
    await user.click(screen.getByRole("button", { name: "Remind me" }))
    await user.click(screen.getByRole("button", { name: "Cancel" }))
    expect(screen.getByRole("button", { name: "Remind me" })).toBeInTheDocument()
    expect(onCreate).not.toHaveBeenCalled()
  })
})
