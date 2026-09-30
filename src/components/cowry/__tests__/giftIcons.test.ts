import { describe, expect, it } from "vitest"
import { resolveGiftIcon } from "@/components/cowry/giftIcons"

/** The rule key a gift resolves to, or the emoji it was given. */
function keyOf(gift: Parameters<typeof resolveGiftIcon>[0]) {
  const resolved = resolveGiftIcon(gift)
  return resolved.kind === "rule" ? resolved.rule.key : `emoji:${resolved.emoji}`
}

describe("gift icons", () => {
  it("matches a gift by the words in its name", () => {
    expect(keyOf({ label: "Cowry Shell" })).toBe("cowry")
    expect(keyOf({ label: "Water Drop" })).toBe("drop")
    expect(keyOf({ label: "Rose Bouquet" })).toBe("flower")
    expect(keyOf({ label: "Golden Crown" })).toBe("crown")
  })

  it("reads the id when the name says nothing", () => {
    expect(keyOf({ id: "water_drop", label: "Refresh" })).toBe("drop")
  })

  it("matches whole words and plurals, not fragments", () => {
    expect(keyOf({ label: "Stars" })).toBe("star")
    expect(keyOf({ label: "Team Spirit" })).toBe("gift") // not "tea"
    expect(keyOf({ label: "Rainbow" })).toBe("rainbow") // not the rain drop
    expect(keyOf({ label: "Cupcake" })).toBe("cake") // not the coffee cup
  })

  it("treats a trailing * as a word start", () => {
    expect(keyOf({ label: "Celebration" })).toBe("party")
  })

  it("falls back to the gift box for a name it does not know", () => {
    expect(keyOf({ label: "Mystery" })).toBe("gift")
    expect(keyOf(null)).toBe("gift")
  })

  it("lets the backend choose, by rule key or emoji", () => {
    expect(keyOf({ label: "Water Drop", icon: "flower" })).toBe("flower")
    expect(keyOf({ label: "Anything", icon: "🦋" })).toBe("emoji:🦋")
    // An unknown key is ignored rather than trusted.
    expect(keyOf({ label: "Water Drop", icon: "not-a-key" })).toBe("drop")
  })
})
