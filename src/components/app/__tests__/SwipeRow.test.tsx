import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { SwipeRow } from "../SwipeRow"

function setup() {
  const onDelete = vi.fn()
  const onMarkRead = vi.fn()
  const onOpen = vi.fn()
  render(
    <SwipeRow
      left={{ label: "Delete", icon: null, className: "", onAction: onDelete }}
      right={{ label: "Mark read", icon: null, className: "", onAction: onMarkRead }}
    >
      <button type="button" onClick={onOpen}>
        Ada
      </button>
    </SwipeRow>,
  )
  const row = screen.getByRole("button", { name: "Ada" }).parentElement!
  return { row, onDelete, onMarkRead, onOpen }
}

function swipe(row: HTMLElement, dx: number, pointerType = "touch") {
  fireEvent.pointerDown(row, { pointerType, clientX: 200, clientY: 20 })
  fireEvent.pointerMove(row, { pointerType, clientX: 200 + dx / 2, clientY: 20 })
  fireEvent.pointerMove(row, { pointerType, clientX: 200 + dx, clientY: 20 })
  fireEvent.pointerUp(row, { pointerType, clientX: 200 + dx, clientY: 20 })
}

describe("SwipeRow", () => {
  it("runs the right action on a long swipe right", () => {
    const { row, onMarkRead } = setup()
    swipe(row, 90)
    expect(onMarkRead).toHaveBeenCalledTimes(1)
  })

  it("uncovers the left action on a swipe left, and runs it when tapped", () => {
    const { row, onDelete } = setup()
    swipe(row, -90)
    fireEvent.click(screen.getByRole("button", { name: "Delete" }))
    expect(onDelete).toHaveBeenCalledTimes(1)
  })

  it("does nothing for a short swipe, or for a mouse", () => {
    const { row, onDelete, onMarkRead } = setup()
    swipe(row, 30)
    swipe(row, 120, "mouse")
    expect(onMarkRead).not.toHaveBeenCalled()
    expect(screen.queryByRole("button", { name: "Delete" })).not.toBeInTheDocument()
    expect(onDelete).not.toHaveBeenCalled()
  })

  it("does not open the row at the end of a swipe", () => {
    const { row, onOpen } = setup()
    swipe(row, 30)
    fireEvent.click(screen.getByRole("button", { name: "Ada" }))
    expect(onOpen).not.toHaveBeenCalled()
    // The next tap is an ordinary one.
    fireEvent.click(screen.getByRole("button", { name: "Ada" }))
    expect(onOpen).toHaveBeenCalledTimes(1)
  })

  it("runs the left action from the keyboard with Delete", () => {
    const { row, onDelete } = setup()
    fireEvent.keyDown(row, { key: "Delete" })
    expect(onDelete).toHaveBeenCalledTimes(1)
  })
})
