import { describe, expect, it } from "vitest"
import { resolveGiftIcon } from "@/components/cowry/giftIcons"
import { giftArrivalFor } from "@/components/cowry/giftAnimations"

/** The rule key a gift resolves to, or the emoji it was given. */
function keyOf(gift: Parameters<typeof resolveGiftIcon>[0]) {
  const resolved = resolveGiftIcon(gift)
  return resolved.kind === "rule" ? resolved.rule.key : `emoji:${resolved.emoji}`
}

describe("gift icons", () => {
  it("matches a gift by the words in its name", () => {
    expect(keyOf({ label: "Cowry Shell" })).toBe("cowry")
    expect(keyOf({ label: "Water Drop" })).toBe("drop")
    // The catalogue's own Bouquet rule wins over the general flower words.
    expect(keyOf({ label: "Rose Bouquet" })).toBe("bouquet")
    expect(keyOf({ label: "Red Rose" })).toBe("flower")
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

  it("draws eagles, shells and big cats with their own icons", () => {
    expect(keyOf({ label: "Golden Eagle" })).toBe("eagle")
    expect(keyOf({ label: "Golden Lion" })).toBe("king-lion")
    expect(keyOf({ label: "Seashell" })).toBe("shell")
    expect(keyOf({ label: "Cowry Shell" })).toBe("cowry")
    expect(keyOf({ label: "Lion Heart" })).toBe("heart")
    expect(keyOf({ label: "Proud Lion" })).toBe("big-cat")
  })

  it("gives the Golden Eagle its flight and the Golden Lion its storm — on the receiver's screen only", () => {
    expect(giftArrivalFor({ label: "Golden Eagle" }, "received")).toBe("eagle-flight")
    expect(giftArrivalFor({ label: "Golden Lion" }, "received")).toBe("lion-storm")
    expect(giftArrivalFor({ label: "Golden Lion" }, "sent")).toBe("rain")
    expect(giftArrivalFor({ label: "Water Drop" }, "received")).toBe("rain")
  })

  it("keeps a legendary gift's arrival whatever icon it was given", () => {
    // An override changes the picture only. Earth Harvest given a sprout or an emoji is
    // still Earth Harvest, and still arrives with its video.
    for (const icon of ["sprout", "leaf", "flower", "🌱"]) {
      expect(giftArrivalFor({ id: "earth_harvest", label: "Earth Harvest", icon }, "received")).toBe("earth-harvest")
    }
    expect(resolveGiftIcon({ label: "Earth Harvest", icon: "flower" })).toMatchObject({ kind: "rule", rule: { key: "flower" } })
  })

  it("goes by the name over an old id — a renamed gift keeps the id it was saved with", () => {
    // In the catalogue, Earth Harvest was once Cowry Throne, and an id cannot change.
    expect(giftArrivalFor({ id: "cowry_throne", label: "Earth Harvest" }, "received")).toBe("earth-harvest")
    expect(resolveGiftIcon({ id: "cowry_throne", label: "Earth Harvest" })).toMatchObject({ rule: { key: "earth-harvest" } })
    // The id still counts when the name says nothing recognisable.
    expect(resolveGiftIcon({ id: "golden_eagle", label: "Gift 7" })).toMatchObject({ rule: { key: "eagle" } })
  })

  it("lets a gift with no moment of its own borrow one through its icon", () => {
    expect(giftArrivalFor({ label: "Garden Rain", icon: "earth-harvest" }, "received")).toBe("earth-harvest")
    // An ordinary icon on an ordinary gift is still just an icon.
    expect(giftArrivalFor({ label: "Clap", icon: "flower" }, "received")).toBe("rain")
  })
})
