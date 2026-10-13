import { render, screen, waitFor } from "@testing-library/react"
import { MemoryRouter } from "react-router"
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { PortfolioPost, type PortfolioPostData } from "../PortfolioPost"

/**
 * What a feed card shows without asking the backend for it.
 *
 * The assertion that earns this file is that `onLoadComments` is NOT called when the feed
 * already sent the opening comment. That is the whole point of sending it: a page of
 * commented posts used to fetch a thread each, all to show one line per card. A regression
 * there costs a request per card and nothing visibly breaks, so nothing would catch it.
 *
 * The fallback matters just as much in the other direction: a post whose comment the feed
 * did not send must still show one, or every post that predates the field looks like a
 * broken card rather than a missing migration.
 */

/** Fires the moment anything is observed, so the card's lazy prefetch runs. */
class ImmediateObserver {
  callback: IntersectionObserverCallback
  constructor(callback: IntersectionObserverCallback) {
    this.callback = callback
  }
  observe(element: Element) {
    this.callback(
      [{ isIntersecting: true, target: element } as IntersectionObserverEntry],
      this as unknown as IntersectionObserver,
    )
  }
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return []
  }
}

beforeEach(() => {
  vi.stubGlobal("IntersectionObserver", ImmediateObserver)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

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

function renderCard(post: PortfolioPostData, props: Record<string, unknown> = {}) {
  const onLoadComments = vi.fn().mockResolvedValue([])
  render(
    <MemoryRouter>
      <PortfolioPost
        authorName="Kofi Mensah"
        authorRole="Care professional"
        avatarClassName="bg-blue-100"
        initials="KM"
        post={post}
        onLoadComments={onLoadComments}
        {...props}
      />
    </MemoryRouter>,
  )
  return { onLoadComments }
}

/* ── the opening comment ─────────────────────────────────────────────────── */

describe("the opening comment on a card", () => {
  it("shows the one the feed sent without fetching the thread", async () => {
    const { onLoadComments } = renderCard(
      postData({
        topComment: { id: "c1", author: "Ama Owusu", text: "This helped me today." },
      }),
      { initialCommentCount: 4 },
    )

    expect(await screen.findByText("This helped me today.")).toBeInTheDocument()
    expect(screen.getByText("Ama Owusu")).toBeInTheDocument()
    // The saving. A request per commented card, avoided.
    expect(onLoadComments).not.toHaveBeenCalled()
  })

  it("fetches the thread when the feed sent no comment", async () => {
    // An older backend, or a surface that does not send it. The card must not go blank.
    const { onLoadComments } = renderCard(postData(), { initialCommentCount: 2 })
    await waitFor(() => expect(onLoadComments).toHaveBeenCalled())
  })

  it("fetches nothing at all for a post with no comments", async () => {
    const { onLoadComments } = renderCard(postData(), { initialCommentCount: 0 })
    await waitFor(() => expect(onLoadComments).not.toHaveBeenCalled())
  })

  it("offers to open the rest when there is more than the one", async () => {
    renderCard(
      postData({ topComment: { id: "c1", author: "Ama Owusu", text: "First." } }),
      { initialCommentCount: 6 },
    )
    expect(await screen.findByText("View all 6 comments")).toBeInTheDocument()
  })

  it("does not offer to open the rest when the one is all there is", async () => {
    renderCard(
      postData({ topComment: { id: "c1", author: "Ama Owusu", text: "Only one." } }),
      { initialCommentCount: 1 },
    )
    await screen.findByText("Only one.")
    expect(screen.queryByText(/View all/)).not.toBeInTheDocument()
  })

  it("gives the commenter a face when there is one", async () => {
    renderCard(
      postData({
        topComment: {
          id: "c1",
          author: "Ama Owusu",
          authorPhoto: "https://example.test/ama.jpg",
          text: "Hello.",
        },
      }),
      { initialCommentCount: 1 },
    )
    await screen.findByText("Hello.")
    const photo = document.querySelector('img[src="https://example.test/ama.jpg"]')
    expect(photo).not.toBeNull()
  })

  it("falls back to initials when the commenter has no photo", async () => {
    renderCard(
      postData({ topComment: { id: "c1", author: "Ama Owusu", text: "Hello." } }),
      { initialCommentCount: 1 },
    )
    expect(await screen.findByText("AM")).toBeInTheDocument()
  })
})

/* ── the gifts ───────────────────────────────────────────────────────────── */

describe("the treasures on a card", () => {
  it("shows the count and draws the treasures it attracted", async () => {
    renderCard(
      postData({
        giftsCount: 9,
        topGifts: [
          { giftId: "rose", count: 6 },
          { giftId: "clap", count: 2 },
          { giftId: "royal_crown", count: 1 },
        ],
      }),
    )
    expect(await screen.findByText("9")).toBeInTheDocument()
    // Named for a screen reader, since the icons themselves are decorative.
    expect(screen.getByText(/treasures, mostly rose/)).toBeInTheDocument()
  })

  it("draws at most three, however many kinds arrived", async () => {
    renderCard(
      postData({
        giftsCount: 30,
        topGifts: [
          { giftId: "rose", count: 10 },
          { giftId: "clap", count: 8 },
          { giftId: "smile", count: 7 },
          { giftId: "bouquet", count: 5 },
        ],
      }),
    )
    await screen.findByText("30")
    // Four kinds were sent; the row is capped so it cannot crowd out the counts beside it.
    expect(screen.getByText(/treasures, mostly rose/)).toBeInTheDocument()
  })

  it("says nothing about treasures on a post that has none", async () => {
    renderCard(postData({ giftsCount: 0, topGifts: [] }))
    await screen.findByText("A short post.")
    expect(screen.queryByText(/treasure/)).not.toBeInTheDocument()
  })

  it("speaks of one treasure in the singular", async () => {
    renderCard(postData({ giftsCount: 1, topGifts: [{ giftId: "rose", count: 1 }] }))
    expect(await screen.findByText(/treasure, mostly rose/)).toBeInTheDocument()
  })

  it("survives a count with no treasure breakdown behind it", async () => {
    // The tally is a separate field from the count; one can arrive without the other.
    renderCard(postData({ giftsCount: 3, topGifts: [] }))
    expect(await screen.findByText("3")).toBeInTheDocument()
  })
})
