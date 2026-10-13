import { act, fireEvent, render, screen } from "@testing-library/react"
import { MemoryRouter } from "react-router"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { GiftSplash, type GiftSplashData } from "../GiftSplash"

/**
 * The card that follows a gift's arrival.
 *
 * Its close button once could not be pressed: the content row beside it was positioned too
 * and sat on top of it, so a click on the × landed on the text. These walk the real flow —
 * the full-screen moment, skipped, then the card — and press the button.
 */

beforeEach(() => {
  vi.useFakeTimers()
  window.matchMedia = vi.fn().mockReturnValue({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() })
})

afterEach(() => {
  vi.useRealTimers()
})

function data(label: string, cost: number): GiftSplashData {
  return {
    key: `test-${label}`,
    gift: { label },
    cost,
    senderName: "Ada",
    direction: "received",
  }
}

function show(gift: GiftSplashData) {
  const onDone = vi.fn()
  render(
    <MemoryRouter>
      <GiftSplash data={gift} onDone={onDone} />
    </MemoryRouter>,
  )
  return onDone
}

describe("the treasure card", () => {
  it("closes from its × after a legendary arrival", async () => {
    const onDone = show(data("Blooming Rose", 10000))
    // The full-screen moment first; a tap skips it.
    await act(async () => {
      fireEvent.click(screen.getByRole("status", { name: /Blooming Rose/i }))
    })
    expect(screen.getByText(/sent you Blooming Rose/)).toBeInTheDocument()

    const close = screen.getByRole("button", { name: "Dismiss" })
    // Above the content row, which is positioned too and comes later in the card.
    expect(close.className).toMatch(/\bz-10\b/)
    fireEvent.click(close)
    await act(async () => {
      vi.advanceTimersByTime(400)
    })
    expect(onDone).toHaveBeenCalledTimes(1)
  })

  it("closes from its × for an ordinary treasure", async () => {
    const onDone = show(data("Clap", 15))
    fireEvent.click(screen.getByRole("button", { name: "Dismiss" }))
    await act(async () => {
      vi.advanceTimersByTime(400)
    })
    expect(onDone).toHaveBeenCalledTimes(1)
  })

  it("closes with Esc", async () => {
    const onDone = show(data("Clap", 15))
    fireEvent.keyDown(window, { key: "Escape" })
    await act(async () => {
      vi.advanceTimersByTime(400)
    })
    expect(onDone).toHaveBeenCalledTimes(1)
  })
})
