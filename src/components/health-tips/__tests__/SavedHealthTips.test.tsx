import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { SavedHealthTips } from "../SavedHealthTips"
import type { SavedHealthTip } from "@/utils/careconnect/services/savedHealthTipsService"

const list = vi.fn()
const remove = vi.fn()
vi.mock("@/utils/careconnect/services/savedHealthTipsService", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/utils/careconnect/services/savedHealthTipsService")>()),
  listSavedHealthTips: () => list(),
  deleteSavedHealthTip: (...args: unknown[]) => remove(...args),
}))

const A: SavedHealthTip = {
  id: "0123456789abcdef0123456789abcdef",
  tip: { id: "tip-1", title: "Release a tight neck", summary: "Gentle movement helps." },
  savedAt: "2026-11-04T10:00:00.000Z",
}
const B: SavedHealthTip = {
  id: "fedcba9876543210fedcba9876543210",
  tip: { id: "tip-1", title: "Sleep on a schedule", summary: "Similar times help." },
  savedAt: "2026-11-03T10:00:00.000Z",
}

beforeEach(() => {
  list.mockReset()
  remove.mockReset()
})

describe("SavedHealthTips", () => {
  it("renders nothing when there are none, or when the list cannot be loaded", async () => {
    list.mockResolvedValueOnce({ tips: [], max: 50 })
    const first = render(<SavedHealthTips onOpen={vi.fn()} />)
    await waitFor(() => expect(list).toHaveBeenCalledTimes(1))
    expect(first.container).toBeEmptyDOMElement()
    first.unmount()

    list.mockRejectedValueOnce(new Error("offline"))
    const second = render(<SavedHealthTips onOpen={vi.fn()} />)
    await waitFor(() => expect(list).toHaveBeenCalledTimes(2))
    expect(second.container).toBeEmptyDOMElement()
  })

  it("lists each tip with the count against the limit, and opens one", async () => {
    list.mockResolvedValue({ tips: [A, B], max: 50 })
    const onOpen = vi.fn()
    const user = userEvent.setup()
    render(<SavedHealthTips onOpen={onOpen} />)
    expect(await screen.findByText("Release a tight neck")).toBeInTheDocument()
    expect(screen.getByText("(2 of 50)")).toBeInTheDocument()
    await user.click(screen.getAllByRole("button", { name: "Open" })[1])
    expect(onOpen).toHaveBeenCalledWith(B.tip)
  })

  it("asks once before removing, and keeping it removes nothing", async () => {
    list.mockResolvedValue({ tips: [A], max: 50 })
    remove.mockResolvedValue(undefined)
    const user = userEvent.setup()
    render(<SavedHealthTips onOpen={vi.fn()} />)
    await user.click(await screen.findByRole("button", { name: "Remove" }))
    expect(remove).not.toHaveBeenCalled()
    await user.click(screen.getByRole("button", { name: "Keep" }))
    expect(remove).not.toHaveBeenCalled()
    await user.click(screen.getByRole("button", { name: "Remove" }))
    await user.click(screen.getByRole("button", { name: "Yes, remove" }))
    expect(remove).toHaveBeenCalledWith(A.id)
    await waitFor(() => expect(list).toHaveBeenCalledTimes(2))
  })

  it("shows a plain message, not the raw error, when removing fails", async () => {
    list.mockResolvedValue({ tips: [A], max: 50 })
    remove.mockRejectedValue(new Error("Network Error /secret"))
    const user = userEvent.setup()
    render(<SavedHealthTips onOpen={vi.fn()} />)
    await user.click(await screen.findByRole("button", { name: "Remove" }))
    await user.click(screen.getByRole("button", { name: "Yes, remove" }))
    const alert = await screen.findByRole("alert")
    expect(alert).toHaveTextContent("didn't work")
    expect(alert).not.toHaveTextContent("secret")
  })

  it("says what is and is not kept", async () => {
    list.mockResolvedValue({ tips: [A], max: 50 })
    render(<SavedHealthTips onOpen={vi.fn()} />)
    expect(await screen.findByText(/never what you searched for/)).toBeInTheDocument()
  })

  it("reloads when told to", async () => {
    list.mockResolvedValue({ tips: [A], max: 50 })
    const { rerender } = render(<SavedHealthTips onOpen={vi.fn()} refreshKey={0} />)
    await screen.findByText("Release a tight neck")
    rerender(<SavedHealthTips onOpen={vi.fn()} refreshKey={1} />)
    await waitFor(() => expect(list).toHaveBeenCalledTimes(2))
  })
})
