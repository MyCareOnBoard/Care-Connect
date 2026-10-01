import { describe, expect, it } from "vitest"
import { render, screen } from "@testing-library/react"
import { MemoryRouter } from "react-router"
import { PostText } from "@/components/profile/PostText"

function renderText(text: string) {
  return render(
    <MemoryRouter>
      <PostText
        text={text}
        tagHref={(tag) => `/feed?tag=${tag}`}
        profileHref={(uid) => `/people/${uid}`}
      />
    </MemoryRouter>,
  )
}

describe("PostText", () => {
  it("links hashtags to the filtered feed, passing the tag as written", () => {
    renderText("Proud of the team #NightShift")
    expect(screen.getByRole("link", { name: "#NightShift" })).toHaveAttribute("href", "/feed?tag=NightShift")
  })

  it("links a mention token to the person, showing only their name", () => {
    renderText("Thanks @[Ada Obi](u1)!")
    const link = screen.getByRole("link", { name: "@Ada Obi" })
    expect(link).toHaveAttribute("href", "/people/u1")
    expect(screen.queryByText(/\(u1\)/)).not.toBeInTheDocument()
  })

  it("opens web links in a new tab, safely", () => {
    renderText("Details at https://example.com/rota.")
    const link = screen.getByRole("link", { name: "example.com/rota" })
    expect(link).toHaveAttribute("href", "https://example.com/rota")
    expect(link).toHaveAttribute("target", "_blank")
    expect(link.getAttribute("rel")).toContain("noopener")
  })

  it("leaves plain text alone", () => {
    renderText("Just a normal update")
    expect(screen.getByText("Just a normal update")).toBeInTheDocument()
    expect(screen.queryByRole("link")).not.toBeInTheDocument()
  })
})
