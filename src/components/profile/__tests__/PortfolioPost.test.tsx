import { describe, expect, it, vi } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter } from "react-router"
import { PortfolioPost, type PortfolioPostData } from "@/components/profile/PortfolioPost"

vi.mock("sonner", () => ({ toast: Object.assign(vi.fn(), { error: vi.fn(), success: vi.fn() }) }))

const post: PortfolioPostData = {
  id: "p1",
  statement: "First day on the new ward",
  paragraphs: [],
  likes: 3,
  comments: [],
}

function renderPost(props: Partial<Parameters<typeof PortfolioPost>[0]> = {}) {
  return render(
    <MemoryRouter>
      <PortfolioPost authorName="Ada Obi" authorRole="Nurse" avatarClassName="" initials="AO" post={post} {...props} />
    </MemoryRouter>,
  )
}

describe("PortfolioPost", () => {
  it("likes at once, and keeps the like when saving works", async () => {
    const onLikeChange = vi.fn().mockResolvedValue(undefined)
    renderPost({ onLikeChange })
    await userEvent.click(screen.getByRole("button", { name: /^like$/i }))
    expect(onLikeChange).toHaveBeenCalledWith(true)
    expect(screen.getByRole("button", { name: /liked/i })).toHaveAttribute("aria-pressed", "true")
    expect(screen.getByText("4")).toBeInTheDocument()
  })

  it("undoes a like that fails to save", async () => {
    const onLikeChange = vi.fn().mockRejectedValue(new Error("offline"))
    renderPost({ onLikeChange })
    await userEvent.click(screen.getByRole("button", { name: /^like$/i }))
    await waitFor(() => expect(screen.getByRole("button", { name: /^like$/i })).toHaveAttribute("aria-pressed", "false"))
    expect(screen.getByText("3")).toBeInTheDocument()
  })

  it("takes a comment back off, and returns it to the box, when saving fails", async () => {
    const onSubmitComment = vi.fn().mockRejectedValue(new Error("offline"))
    renderPost({ onSubmitComment })
    await userEvent.click(screen.getByRole("button", { name: /comment/i }))
    const box = screen.getByPlaceholderText(/add a comment/i)
    await userEvent.type(box, "Congratulations!")
    await userEvent.click(screen.getByRole("button", { name: "Post" }))
    await waitFor(() => expect(screen.queryByText("Congratulations!", { selector: "p" })).not.toBeInTheDocument())
    expect(box).toHaveValue("Congratulations!")
  })

  it("offers the gift button only where gifting applies", () => {
    const { unmount } = renderPost()
    expect(screen.queryByRole("button", { name: /gift/i })).not.toBeInTheDocument()
    unmount()
    renderPost({ onGift: vi.fn() })
    expect(screen.getByRole("button", { name: /gift/i })).toBeInTheDocument()
  })
})
