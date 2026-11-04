import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { HealthTipRemindersList } from "../HealthTipRemindersList"
import type { HealthTipReminder } from "@/utils/careconnect/services/healthTipRemindersService"

const list = vi.fn()
const setStatus = vi.fn()
const remove = vi.fn()
vi.mock("@/utils/careconnect/services/healthTipRemindersService", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/utils/careconnect/services/healthTipRemindersService")>()),
  listHealthTipReminders: () => list(),
  setHealthTipReminderStatus: (...args: unknown[]) => setStatus(...args),
  deleteHealthTipReminder: (...args: unknown[]) => remove(...args),
}))

const ACTIVE: HealthTipReminder = {
  id: "r1", label: "Release a tight neck", time: "08:00", timezone: "America/New_York",
  recurrence: "daily", status: "active", nextAt: "2026-11-05T13:00:00.000Z", expiresAt: "2026-12-04T13:00:00.000Z",
}
const PAUSED: HealthTipReminder = { ...ACTIVE, id: "r2", label: "Evening walk", time: "18:00", status: "paused", nextAt: null }

beforeEach(() => {
  list.mockReset()
  setStatus.mockReset()
  remove.mockReset()
})

describe("HealthTipRemindersList", () => {
  it("renders nothing when there are no reminders", async () => {
    list.mockResolvedValue({ reminders: [], max: 5 })
    const { container } = render(<HealthTipRemindersList />)
    await waitFor(() => expect(list).toHaveBeenCalled())
    expect(container).toBeEmptyDOMElement()
  })

  it("renders nothing, and no error, when the list cannot be loaded", async () => {
    list.mockRejectedValue(new Error("offline"))
    const { container } = render(<HealthTipRemindersList />)
    await waitFor(() => expect(list).toHaveBeenCalled())
    expect(container).toBeEmptyDOMElement()
  })

  it("shows each reminder with its time, repeat, state and the count against the limit", async () => {
    list.mockResolvedValue({ reminders: [ACTIVE, PAUSED], max: 5 })
    render(<HealthTipRemindersList />)
    expect(await screen.findByText("Release a tight neck")).toBeInTheDocument()
    expect(screen.getByText(/8:00 AM, every day/)).toBeInTheDocument()
    expect(screen.getByText(/6:00 PM, every day · Paused/)).toBeInTheDocument()
    expect(screen.getByText("(2 of 5)")).toBeInTheDocument()
  })

  it("pauses an active reminder and reloads", async () => {
    list.mockResolvedValue({ reminders: [ACTIVE], max: 5 })
    setStatus.mockResolvedValue({ ...ACTIVE, status: "paused" })
    const user = userEvent.setup()
    render(<HealthTipRemindersList />)
    await user.click(await screen.findByRole("button", { name: "Pause" }))
    expect(setStatus).toHaveBeenCalledWith("r1", "paused")
    await waitFor(() => expect(list).toHaveBeenCalledTimes(2))
  })

  it("resumes a paused reminder", async () => {
    list.mockResolvedValue({ reminders: [PAUSED], max: 5 })
    setStatus.mockResolvedValue({ ...PAUSED, status: "active" })
    const user = userEvent.setup()
    render(<HealthTipRemindersList />)
    await user.click(await screen.findByRole("button", { name: "Resume" }))
    expect(setStatus).toHaveBeenCalledWith("r2", "active")
  })

  it("asks once before deleting, and keeping it deletes nothing", async () => {
    list.mockResolvedValue({ reminders: [ACTIVE], max: 5 })
    remove.mockResolvedValue(undefined)
    const user = userEvent.setup()
    render(<HealthTipRemindersList />)
    await user.click(await screen.findByRole("button", { name: "Delete" }))
    expect(remove).not.toHaveBeenCalled()
    await user.click(screen.getByRole("button", { name: "Keep" }))
    expect(remove).not.toHaveBeenCalled()
    await user.click(screen.getByRole("button", { name: "Delete" }))
    await user.click(screen.getByRole("button", { name: "Yes, delete" }))
    expect(remove).toHaveBeenCalledWith("r1")
  })

  it("shows a plain message when an action fails", async () => {
    list.mockResolvedValue({ reminders: [ACTIVE], max: 5 })
    setStatus.mockRejectedValue(new Error("Network Error /secret"))
    const user = userEvent.setup()
    render(<HealthTipRemindersList />)
    await user.click(await screen.findByRole("button", { name: "Pause" }))
    const alert = await screen.findByRole("alert")
    expect(alert).toHaveTextContent("didn't work")
    expect(alert).not.toHaveTextContent("secret")
  })

  it("reloads when told to", async () => {
    list.mockResolvedValue({ reminders: [ACTIVE], max: 5 })
    const { rerender } = render(<HealthTipRemindersList refreshKey={0} />)
    await screen.findByText("Release a tight neck")
    rerender(<HealthTipRemindersList refreshKey={1} />)
    await waitFor(() => expect(list).toHaveBeenCalledTimes(2))
  })
})
