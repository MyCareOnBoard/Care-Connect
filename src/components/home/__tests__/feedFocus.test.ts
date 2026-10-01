import { afterEach, describe, expect, it } from "vitest"
import { act, renderHook } from "@testing-library/react"
import { setFeedFocus, useFeedFocus } from "@/components/home/feedFocus"

/** Pretend the screen is (or is not) wide enough to have side columns. */
function setWide(wide: boolean) {
  window.matchMedia = ((query: string) => ({
    matches: wide,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })) as typeof window.matchMedia
}

afterEach(() => {
  act(() => setFeedFocus(false))
  setWide(false)
})

describe("feed focus mode", () => {
  it("only exists where there are side columns to fold away", () => {
    setWide(false)
    const { result } = renderHook(() => useFeedFocus())
    act(() => setFeedFocus(true))
    expect(result.current.focused).toBe(true)
    // Saved, but not in effect on a narrow screen — and not offered.
    expect(result.current.available).toBe(false)
    expect(result.current.active).toBe(false)
    expect(result.current.aside("left").inert).toBeUndefined()
  })

  it("hides the side columns from everyone, keyboard and screen readers included", () => {
    setWide(true)
    const { result } = renderHook(() => useFeedFocus())
    act(() => setFeedFocus(true))
    expect(result.current.active).toBe(true)
    expect(result.current.aside("left").inert).toBe(true)
    expect(result.current.aside("right").className).toContain("lg:invisible")
  })

  it("remembers the choice", () => {
    setWide(true)
    act(() => setFeedFocus(true))
    expect(localStorage.getItem("careconnect-feed-focus")).toBe("1")
    act(() => setFeedFocus(false))
    expect(localStorage.getItem("careconnect-feed-focus")).toBe("0")
  })
})
