import { act, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter } from "react-router"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { FeatureTour } from "../FeatureTour"
import { acceptAllCookies } from "@/lib/consent"

vi.mock("@/utils/auth", () => ({ useAuthUser: () => ({ user: { uid: "u1" } }) }))

/** Controls on the "page" — only these steps can be shown. */
function Page({ ids }: { ids: string[] }) {
  return (
    <>
      {ids.map((id) => (
        <button key={id} data-tour={id}>
          {id}
        </button>
      ))}
    </>
  )
}

function setup(ids: string[], path = "/user/dashboard") {
  render(
    <MemoryRouter initialEntries={[path]}>
      <Page ids={ids} />
      <FeatureTour />
    </MemoryRouter>,
  )
  act(() => {
    vi.advanceTimersByTime(1500)
  })
}

describe("FeatureTour", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] })
    // jsdom lays nothing out; give the tour's anchors a size so they count as on screen.
    vi.spyOn(Element.prototype, "getBoundingClientRect").mockReturnValue({
      top: 100, left: 100, width: 80, height: 40, right: 180, bottom: 140, x: 100, y: 100, toJSON: () => ({}),
    } as DOMRect)
  })
  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
    window.localStorage.clear()
  })

  it("walks through the features that are on screen, in order, skipping the rest", async () => {
    setup(["compose", "nav-messages", "account"])
    expect(screen.getByRole("heading", { name: "Share something" })).toBeInTheDocument()
    expect(screen.getByText("Tour · 1 of 3")).toBeInTheDocument()

    vi.useRealTimers()
    await userEvent.click(screen.getByRole("button", { name: "Next" }))
    expect(screen.getByRole("heading", { name: "Message people" })).toBeInTheDocument()
    await userEvent.click(screen.getByRole("button", { name: "Next" }))
    expect(screen.getByRole("heading", { name: "Your account" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Got it" })).toBeInTheDocument()
  })

  it("shows the network step once, whichever navigation is on screen", () => {
    setup(["nav-mynetwork", "nav-network"])
    expect(screen.getByText("Tour · 1 of 1")).toBeInTheDocument()
  })

  it("does not show again once finished, unless asked for with ?tour=1", async () => {
    acceptAllCookies()
    window.localStorage.setItem("careconnect-tour-v2:u1", "done")
    setup(["compose"])
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
  })

  it("replays from the account menu's link", () => {
    window.localStorage.setItem("careconnect-tour-v2:u1", "done")
    setup(["compose"], "/user/dashboard?tour=1")
    expect(screen.getByRole("heading", { name: "Share something" })).toBeInTheDocument()
  })
})
