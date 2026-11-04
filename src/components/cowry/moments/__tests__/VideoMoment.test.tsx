import { act, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { VideoMoment } from "../VideoMoment"
import { MomentCaptionContext, congratulationsFor } from "../captionContext"
import { giftVideoFor, treasureVideoFor } from "@/components/cowry/giftVideos"

/**
 * A filmed legendary arrival.
 *
 * What matters: the gift's name and amount are over the video, the receiver can always skip,
 * and a video that cannot play hands over to the drawn scene rather than leaving the screen
 * black — a receiver who paid nothing and a sender who paid a lot both deserve the moment.
 */

let play: ReturnType<typeof vi.fn>

beforeEach(() => {
  vi.useFakeTimers()
  play = vi.fn().mockResolvedValue(undefined)
  Object.defineProperty(HTMLMediaElement.prototype, "play", { configurable: true, value: play })
  window.matchMedia = vi.fn().mockReturnValue({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() })
})

afterEach(() => {
  vi.useRealTimers()
})

function show(onDone = vi.fn()) {
  render(
    <MomentCaptionContext.Provider value={congratulationsFor(90000, "Golden Lion")}>
      <VideoMoment src="/videos/lion.mp4" label="Golden Lion arrives" onDone={onDone} fallback={<p>drawn scene</p>} />
    </MomentCaptionContext.Provider>,
  )
  return onDone
}

describe("a filmed arrival", () => {
  it("plays the video with the treasure's amount and name over it", async () => {
    show()
    await act(async () => {})
    expect(document.querySelector("video")?.getAttribute("src")).toBe("/videos/lion.mp4")
    expect(play).toHaveBeenCalled()
    expect(screen.getByText("Congratulations on the 90,000 Treasure")).toBeInTheDocument()
    expect(screen.getByText("Golden Lion")).toBeInTheDocument()
  })

  it("hands over to the drawn scene when the video fails", () => {
    show()
    fireEvent.error(document.querySelector("video")!)
    expect(screen.getByText("drawn scene")).toBeInTheDocument()
    expect(document.querySelector("video")).toBeNull()
  })

  it("hands over to the drawn scene when the video has not started in time", async () => {
    show()
    await act(async () => {
      vi.advanceTimersByTime(4100)
    })
    expect(screen.getByText("drawn scene")).toBeInTheDocument()
  })

  it("keeps the video once it is playing", async () => {
    show()
    fireEvent.playing(document.querySelector("video")!)
    await act(async () => {
      vi.advanceTimersByTime(4100)
    })
    expect(screen.queryByText("drawn scene")).not.toBeInTheDocument()
  })

  it("can be skipped with a tap", () => {
    const onDone = show()
    fireEvent.click(screen.getByRole("status", { name: "Golden Lion arrives" }))
    expect(onDone).toHaveBeenCalled()
  })

  it("moves on to the treasure card when the video ends", async () => {
    const onDone = show()
    fireEvent.ended(document.querySelector("video")!)
    await act(async () => {
      vi.advanceTimersByTime(500)
    })
    expect(onDone).toHaveBeenCalled()
  })
})

describe("which treasures are filmed", () => {
  it("has videos for the eagle and the harvest only", () => {
    expect(giftVideoFor("eagle-flight")).toMatch(/Golden-Eagle-Flying-in-Jungle\.mp4$/)
    // The lion's film was taken out; its drawn storm plays instead.
    expect(giftVideoFor("lion-storm")).toBeNull()
    expect(giftVideoFor("earth-harvest")).toMatch(/Dry-Earth-Transforms-into-Garden\.mp4$/)
    expect(giftVideoFor("rose-bloom")).toBeNull()
  })
})

describe("which Special and Premium treasures are filmed", () => {
  it.each([
    ["The Baobab Tree", "Baobab-Tree"],
    ["Masai Shield", "Masai-Shield"],
    ["The Maasai Shield", "Masai-Shield"],
    ["Dzimba Dzamabwe Stone House", "Dzimba-Dzamabwe-Stone-House"],
    ["Great Stone House", "Dzimba-Dzamabwe-Stone-House"],
    ["Lake Chad Basin", "Lake-Chad-Basin"],
    ["Benin Bronze Original", "Benin-Bronze-Original"],
    ["Nigerian Jollof", "Nigerian-Jollof-Rice"],
    ["Jollof Rice", "Nigerian-Jollof-Rice"],
    ["Masquerade Dance", "Masquerade-Dance"],
    ["The Masquerade", "Masquerade-Dance"],
    ["Sahara Moon", "Sahara-Moon"],
    ["Royal Beads", "Royal-Beads"],
    ["The Mbira", "Mbira-Instrument"],
    ["Mbira Instrument", "Mbira-Instrument"],
    ["The Timeless Treasure", "Timeless-Treasure"],
  ])("plays %s its own film", (label, file) => {
    expect(treasureVideoFor({ label })).toMatch(new RegExp(`/videos/${file}[.]mp4$`))
  })

  it("finds the film by id when the name says nothing", () => {
    expect(treasureVideoFor({ id: "lake_chad_basin" })).toMatch(/Lake-Chad-Basin\.mp4$/)
  })

  it("leaves the everyday treasures of the same subject on their drawn scenes", () => {
    expect(treasureVideoFor({ label: "The Baobab" })).toBeNull()
    expect(treasureVideoFor({ label: "Jollof Table" })).toBeNull()
    expect(treasureVideoFor({ label: "Bronze Head" })).toBeNull()
    expect(treasureVideoFor({ label: "Victory Dance" })).toBeNull()
    expect(treasureVideoFor({ label: "Coral Beads" })).toBeNull()
    expect(treasureVideoFor({ label: "The Rising Moon" })).toBeNull()
  })
})
