import { beforeEach, describe, expect, it, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter, useNavigate } from "react-router"
import { BottomTabBar } from "@/components/app/BottomTabBar"
import { Routes } from "@/routes/constants"

const navigate = vi.fn()

beforeEach(() => {
  vi.mocked(useNavigate).mockReturnValue(navigate)
})

describe("BottomTabBar", () => {
  it("reserves space at the bottom of the screen while it is showing", () => {
    const { unmount } = render(
      <MemoryRouter>
        <BottomTabBar flow="user" unreadMessages={0} />
      </MemoryRouter>,
    )
    expect(document.documentElement).toHaveClass("has-bottom-nav")
    unmount()
    expect(document.documentElement).not.toHaveClass("has-bottom-nav")
  })

  it("links the five places, and counts unread messages", () => {
    render(
      <MemoryRouter>
        <BottomTabBar flow="user" unreadMessages={12} />
      </MemoryRouter>,
    )
    expect(screen.getByRole("link", { name: /home/i })).toHaveAttribute("href", Routes.app.user.dashboard)
    expect(screen.getByRole("link", { name: /network/i })).toHaveAttribute("href", Routes.app.user.network)
    expect(screen.getByRole("link", { name: /jobs/i })).toHaveAttribute("href", Routes.app.user.jobs)
    expect(screen.getByRole("link", { name: /messages/i })).toHaveTextContent("9+")
  })

  it("sends + to the home page's composer from elsewhere", async () => {
    // The test router sits at "/", which is not the home page.
    render(
      <MemoryRouter>
        <BottomTabBar flow="agency" unreadMessages={0} />
      </MemoryRouter>,
    )
    await userEvent.click(screen.getByRole("button", { name: "Create a post" }))
    expect(navigate).toHaveBeenCalledWith(`${Routes.app.agency.dashboard}?compose=1`)
  })
})
