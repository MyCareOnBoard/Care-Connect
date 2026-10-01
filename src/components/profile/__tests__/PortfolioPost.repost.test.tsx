import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter } from "react-router"
import { describe, it, expect, vi } from "vitest"
import { PortfolioPost, type PortfolioPostData } from "../PortfolioPost"
import { RemovedPost } from "../RemovedPost"
import { feedSource } from "../postMapping"
import type { FeedPost } from "@/utils/careconnect/services/postsService"

/**
 * Reposting, from the card's side.
 *
 * The button used to toggle its own state and show a success toast while calling nothing at
 * all. Two things here guard against that coming back: the action does not appear unless it
 * is wired to something, and a server refusal puts the button back. A repost button that
 * stays switched on after the server said no is a lie about what happened, and reposting
 * your own post is a refusal the server really does return.
 */

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))

function postData(overrides: Partial<PortfolioPostData> = {}): PortfolioPostData {
  return {
    id: "p1",
    statement: "A short post.",
    paragraphs: [],
    likes: 0,
    comments: [],
    ...overrides,
  }
}

function renderCard(props: Record<string, unknown> = {}, post = postData()) {
  render(
    <MemoryRouter>
      <PortfolioPost
        authorName="Kofi Mensah"
        authorRole="Care professional"
        avatarClassName="bg-blue-100"
        initials="KM"
        post={post}
        {...props}
      />
    </MemoryRouter>,
  )
}

const openShare = async () => {
  await userEvent.click(screen.getByRole("button", { name: /Share/ }))
}

/* ── the action only exists where it works ───────────────────────────────── */

/*
 * Parked, not deleted.
 *
 * The repost item in the share menu is commented out on main behind a "REPOST PAUSED"
 * marker — a deliberate decision taken in the gift-animations work, not an accident of the
 * merge. The backend and the card wiring are both live, so re-enabling it is uncommenting
 * one block; these assertions are the ones that should run the moment it is.
 *
 * Skipped rather than rewritten because there is nothing wrong with them: they describe the
 * behaviour the feature is meant to have, and making them pass against a disabled feature
 * would mean asserting that nothing happens, which protects nothing.
 */
describe.skip("the repost action (paused on main)", () => {
  it("is absent on a surface that has not wired it up", async () => {
    // It used to be here and to report success without reposting anything.
    renderCard()
    await openShare()
    expect(screen.queryByText("Repost")).not.toBeInTheDocument()
  })

  it("appears once there is something to call", async () => {
    renderCard({ onRepostChange: vi.fn() })
    await openShare()
    expect(await screen.findByText("Repost")).toBeInTheDocument()
  })

  it("is not offered on your own post", async () => {
    // The server refuses it, so offering it would only produce an error.
    renderCard({ onRepostChange: vi.fn(), canRepost: false })
    await openShare()
    expect(screen.queryByText("Repost")).not.toBeInTheDocument()
  })

  it("offers to undo one already made", async () => {
    renderCard({ onRepostChange: vi.fn(), initialReposted: true })
    await openShare()
    expect(await screen.findByText("Undo repost")).toBeInTheDocument()
  })
})

/* ── what it calls, and what happens when that fails ────────────────────── */

describe.skip("reposting (paused on main)", () => {
  it("asks for the state it is moving to", async () => {
    const onRepostChange = vi.fn().mockResolvedValue(undefined)
    renderCard({ onRepostChange })
    await openShare()
    await userEvent.click(await screen.findByText("Repost"))

    await waitFor(() => expect(onRepostChange).toHaveBeenCalledWith(true))
  })

  it("asks to undo when it was already reposted", async () => {
    const onRepostChange = vi.fn().mockResolvedValue(undefined)
    renderCard({ onRepostChange, initialReposted: true })
    await openShare()
    await userEvent.click(await screen.findByText("Undo repost"))

    await waitFor(() => expect(onRepostChange).toHaveBeenCalledWith(false))
  })

  it("counts the repost straight away", async () => {
    const onRepostChange = vi.fn().mockResolvedValue(undefined)
    renderCard({ onRepostChange }, postData({ reposts: 4 }))
    await openShare()
    await userEvent.click(await screen.findByText("Repost"))

    await waitFor(() => expect(screen.getByText("5 reposts")).toBeInTheDocument())
  })

  it("puts the button back when the server refuses", async () => {
    // The assertion this file exists for. A button left switched on after a refusal tells
    // the reader they reposted something they did not.
    const onRepostChange = vi.fn().mockRejectedValue(new Error("own post"))
    renderCard({ onRepostChange }, postData({ reposts: 2 }))
    await openShare()
    await userEvent.click(await screen.findByText("Repost"))

    await waitFor(() => expect(onRepostChange).toHaveBeenCalled())
    // The count went back too.
    await waitFor(() => expect(screen.getByText("2 reposts")).toBeInTheDocument())

    await openShare()
    expect(await screen.findByText("Repost")).toBeInTheDocument()
  })

  it("never shows a negative count, whatever the counters disagree about", async () => {
    const onRepostChange = vi.fn().mockResolvedValue(undefined)
    renderCard({ onRepostChange, initialReposted: true }, postData({ reposts: 0 }))
    await openShare()
    await userEvent.click(await screen.findByText("Undo repost"))

    await waitFor(() => expect(onRepostChange).toHaveBeenCalledWith(false))
    expect(screen.queryByText(/-1/)).not.toBeInTheDocument()
  })
})

/* ── whose feed it is in, and whose post it is ──────────────────────────── */

describe("a reposted card", () => {
  it("names the reposter above the post, not instead of its author", async () => {
    // Everything below the line belongs to the post. Showing the reposter as the author is
    // the confusion that would send a gift to the wrong person.
    renderCard({
      repostedBy: { name: "Ama Owusu", href: "/user/profile/u2" },
      onRepostChange: vi.fn(),
    })

    expect(screen.getByText("Ama Owusu")).toBeInTheDocument()
    expect(screen.getByText("reposted")).toBeInTheDocument()
    expect(screen.getByText("Kofi Mensah")).toBeInTheDocument()
    expect(screen.getByText("A short post.")).toBeInTheDocument()
  })

  it("shows a quote when the reposter added one", async () => {
    renderCard({
      repostedBy: { name: "Ama Owusu", note: "every carer should read this" },
      onRepostChange: vi.fn(),
    })
    expect(screen.getByText("every carer should read this")).toBeInTheDocument()
  })

  it("shows no quote line when there is only whitespace", async () => {
    renderCard({ repostedBy: { name: "Ama Owusu", note: "   " }, onRepostChange: vi.fn() })
    expect(screen.getByText("reposted")).toBeInTheDocument()
    expect(screen.queryByText("   ")).not.toBeInTheDocument()
  })

  it("says nothing about reposting on an ordinary card", async () => {
    renderCard({ onRepostChange: vi.fn() })
    expect(screen.queryByText("reposted")).not.toBeInTheDocument()
  })
})

/* ── a repost of something that is gone ─────────────────────────────────── */

describe("a repost whose post was removed", () => {
  it("says so rather than rendering an empty card", () => {
    render(
      <MemoryRouter>
        <RemovedPost reposterName="Ama Owusu" reposterHref="/user/profile/u2" />
      </MemoryRouter>,
    )
    expect(screen.getByText("This post was removed")).toBeInTheDocument()
    expect(screen.getByText("Ama Owusu")).toBeInTheDocument()
  })

  it("offers nothing to do with it", () => {
    render(
      <MemoryRouter>
        <RemovedPost reposterName="Ama Owusu" />
      </MemoryRouter>,
    )
    // Nothing to like, nothing to comment on, nobody to gift.
    expect(screen.queryByRole("button")).not.toBeInTheDocument()
  })
})

/* ── which post a row is about ──────────────────────────────────────────── */

describe("feedSource", () => {
  const row = (over: Partial<FeedPost>): FeedPost =>
    ({
      id: "r1",
      authorId: "u2",
      authorName: "Ama",
      statement: "",
      paragraphs: [],
      mediaUrls: [],
      likesCount: 0,
      commentsCount: 0,
      ...over,
    }) as FeedPost

  it("gives back an ordinary post as itself", () => {
    const plain = row({ id: "p1", statement: "mine" })
    expect(feedSource(plain)).toBe(plain)
  })

  it("gives back the post a repost points at", () => {
    const original = row({ id: "p1", authorId: "u1", statement: "the real one" })
    const reposted = row({ repostOf: "p1", original })
    expect(feedSource(reposted)).toBe(original)
  })

  it("gives back nothing when that post is gone", () => {
    // Which is the signal to draw the removed card instead.
    expect(feedSource(row({ repostOf: "p1", original: null, originalRemoved: true }))).toBeNull()
  })

  it("gives back nothing when a repost arrived without its post", () => {
    // An older backend, or a partial response. Better a removed card than a blank one.
    expect(feedSource(row({ repostOf: "p1" }))).toBeNull()
  })
})
