import { act, render, screen } from "@testing-library/react"
import { MemoryRouter } from "react-router"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { GiftSplash, type GiftSplashData } from "../GiftSplash"
import { themeFor, treasureTier } from "../treasureTiers"

/**
 * Treasures arrive bigger the more they cost.
 *
 * The bands are the contract (under 200, 200, 400, 700, 2,000), so the edges are tested
 * exactly. And each band must reach the screen as the arrival it promises — a shower, a
 * sparkle burst, a spotlight, a themed scene — on the receiver's side only.
 */

vi.mock("canvas-confetti", () => ({ default: Object.assign(vi.fn(), { shapeFromPath: vi.fn() }) }))

describe("price bands", () => {
  it.each([
    [0, 1], [199, 1], [200, 2], [399, 2], [400, 3], [699, 3], [700, 4], [1999, 4], [2000, 5], [10000, 5],
  ])("%i Cowries is level %i", (cost, tier) => {
    expect(treasureTier(cost)).toBe(tier)
  })

  it("treats a missing price as the lowest band", () => {
    expect(treasureTier(null)).toBe(1)
    expect(treasureTier(undefined)).toBe(1)
  })
})

describe("category themes", () => {
  it.each([
    ["wellness_emotion", "wellness"],
    ["Heritage", "heritage"],
    ["food_table", "food"],
    ["Food & Table", "food"],
    ["achievement", "achievement"],
    ["nature", "nature"],
    ["music_expression", "music"],
    ["human_connection", "human"],
    ["premium", "premium"],
  ])("%s is themed %s", (set, theme) => {
    expect(themeFor(set, 4)).toBe(theme)
  })

  it("falls back to gold for a dear treasure and to wellness otherwise", () => {
    expect(themeFor("cat_9", 5)).toBe("premium")
    expect(themeFor("cat_9", 4)).toBe("wellness")
  })
})

describe("how each band arrives", () => {
  beforeEach(() => {
    window.matchMedia = vi.fn().mockReturnValue({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() })
  })

  function show(label: string, cost: number, set: string, direction: "received" | "sent" = "received") {
    const data: GiftSplashData = { key: `t-${label}-${cost}`, gift: { label }, set, cost, senderName: "Ada", direction }
    render(
      <MemoryRouter>
        <GiftSplash data={data} onDone={vi.fn()} />
      </MemoryRouter>,
    )
  }

  it("level 1 goes straight to the card", () => {
    show("The New Dawn", 100, "wellness_emotion")
    expect(screen.getByText(/sent you The New Dawn/)).toBeInTheDocument()
    expect(document.querySelector(".treasure-spark")).toBeNull()
  })

  it("level 2 adds sparkles to the shower", () => {
    show("The Strong Root", 250, "wellness_emotion")
    expect(screen.getByText(/sent you The Strong Root/)).toBeInTheDocument()
    expect(document.querySelectorAll(".treasure-spark").length).toBeGreaterThan(0)
  })

  it("level 3 is a spotlight, then the card", async () => {
    show("The Talking Drum", 500, "heritage")
    expect(screen.getByRole("status", { name: "The Talking Drum arrives" })).toBeInTheDocument()
    expect(screen.getByText("Congratulations on the 500 Treasure")).toBeInTheDocument()
    await act(async () => {
      screen.getByRole("status", { name: "The Talking Drum arrives" }).click()
    })
    expect(screen.getByText(/sent you The Talking Drum/)).toBeInTheDocument()
  })

  it("level 4 is a scene in its category's colours", () => {
    show("The Golden Stool", 1000, "heritage")
    expect(screen.getByRole("status", { name: "The Golden Stool arrives" })).toBeInTheDocument()
    expect(document.querySelector(".treasure-band")).not.toBeNull()
  })

  it("is the sender's shower whatever it cost", () => {
    show("The Golden Stool", 1000, "heritage", "sent")
    expect(screen.queryByRole("status", { name: "The Golden Stool arrives" })).not.toBeInTheDocument()
    expect(screen.getByText(/The Golden Stool is on its way/)).toBeInTheDocument()
  })

  it("plays the Timeless Treasure's own film, with its amount and name over it", () => {
    HTMLMediaElement.prototype.play = vi.fn().mockResolvedValue(undefined)
    show("The Timeless Treasure", 10000, "premium")
    expect(document.querySelector("video")?.getAttribute("src")).toMatch(/Timeless-Treasure\.mp4$/)
    expect(screen.getByText("Congratulations on the 10,000 Treasure")).toBeInTheDocument()
    expect(screen.getByText("The Timeless Treasure")).toBeInTheDocument()
  })

  it("plays the film even if the treasure is repriced into a lower band", () => {
    HTMLMediaElement.prototype.play = vi.fn().mockResolvedValue(undefined)
    show("The Timeless Treasure", 150, "premium")
    expect(document.querySelector("video")).not.toBeNull()
  })

  it("keeps the gold scene for a Premium treasure with no film yet, and the shower for the sender", () => {
    show("The Golden Journey", 2500, "premium")
    expect(document.querySelector("video")).toBeNull()
    expect(document.querySelector(".treasure-band")).not.toBeNull()
  })

  it("never shows the film to the sender", () => {
    show("The Timeless Treasure", 10000, "premium", "sent")
    expect(document.querySelector("video")).toBeNull()
  })

  it.each([
    ["The Thank You", ".human-word"],
    ["The Friendship Thread", ".human-draw"],
    ["The Warm Embrace", ".human-arm-left"],
    ["The Helping Hand", ".human-reach-up"],
    ["The Welcome", ".human-door"],
  ])("plays %s full screen as its own scene", (label, part) => {
    show(label, 900, "human_connection")
    expect(screen.getByRole("status", { name: `${label} arrives` })).toBeInTheDocument()
    expect(document.querySelector(part)).not.toBeNull()
    expect(screen.getByText("Congratulations on the 900 Treasure")).toBeInTheDocument()
  })

  it("finds the Human Connection scene by the treasure's name when its category says otherwise", () => {
    show("The Welcome", 900, "cat_7")
    expect(document.querySelector(".human-door")).not.toBeNull()
  })

  it("keeps the shower for a Human Connection treasure priced under 400, and for its sender", () => {
    show("The Thank You", 150, "human_connection")
    expect(document.querySelector(".human-word")).toBeNull()
    expect(screen.getByText(/sent you The Thank You/)).toBeInTheDocument()
  })

  it("plays the Jollof Table's film with its meaning under its name", () => {
    HTMLMediaElement.prototype.play = vi.fn().mockResolvedValue(undefined)
    show("The Jollof Table", 450, "food_table")
    expect(document.querySelector("video")?.getAttribute("src")).toMatch(/Jollof-Table[.]mp4$/)
    expect(screen.getByText("Congratulations on the 450 Treasure")).toBeInTheDocument()
    expect(screen.getByText("The Jollof Table")).toBeInTheDocument()
    expect(screen.getByText("Meaning:")).toBeInTheDocument()
    expect(screen.getByText(/Celebration/)).toBeInTheDocument()
  })

  it("flies the First Flight with the eagle's film", () => {
    HTMLMediaElement.prototype.play = vi.fn().mockResolvedValue(undefined)
    show("The First Flight", 600, "achievement")
    expect(document.querySelector("video")?.getAttribute("src")).toMatch(/Golden-Eagle-Flying-in-Jungle[.]mp4$/)
  })

  it("shows no meaning line for a treasure without one", () => {
    show("The Talking Drum", 500, "heritage")
    expect(screen.queryByText("Meaning:")).not.toBeInTheDocument()
  })
})
