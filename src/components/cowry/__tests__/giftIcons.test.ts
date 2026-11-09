import { describe, expect, it } from "vitest"
import { resolveGiftIcon } from "@/components/cowry/giftIcons"
import { giftArrivalFor } from "@/components/cowry/giftAnimations"

/** The rule key a gift resolves to, or the emoji it was given. */
function keyOf(gift: Parameters<typeof resolveGiftIcon>[0]) {
  const resolved = resolveGiftIcon(gift)
  return resolved.kind === "rule" ? resolved.rule.key : `emoji:${resolved.emoji}`
}

describe("treasure icons", () => {
  it("matches a treasure by the words in its name", () => {
    expect(keyOf({ label: "Cowry Shell" })).toBe("cowry")
    expect(keyOf({ label: "Water Drop" })).toBe("drop")
    // The catalogue's own Bouquet rule wins over the general flower words.
    expect(keyOf({ label: "Rose Bouquet" })).toBe("bouquet")
    expect(keyOf({ label: "Red Rose" })).toBe("flower")
    expect(keyOf({ label: "Golden Crown" })).toBe("crown")
  })

  it("gives the Mbira, the Oldowan chopper, the Healing Horizon and the Breath of Morning their own drawings", () => {
    expect(keyOf({ label: "Mbira Instrument" })).toBe("mbira")
    expect(keyOf({ label: "The Mbira" })).toBe("mbira")
    expect(keyOf({ label: "Thumb Piano" })).toBe("mbira") // not the thumbs-up
    expect(keyOf({ label: "Oldowan Stone Chopper" })).toBe("oldowan-chopper")
    expect(keyOf({ id: "Oldowan-Stone-Chopper", label: "" })).toBe("oldowan-chopper")
    expect(keyOf({ label: "The Healing Horizon" })).toBe("healing-horizon")
    expect(keyOf({ label: "The Breath of Morning" })).toBe("breath-of-morning")
  })

  it("gives each filmed Treasure the drawing that matches its film", () => {
    expect(keyOf({ label: "Nubian Royal Jewellery" })).toBe("nubian-jewellery") // not the crown
    expect(keyOf({ label: "The Mossi Horsemen" })).toBe("mossi-horseman")
    expect(keyOf({ label: "Swahili Brass Incense Burner" })).toBe("swahili-incense-burner")
    expect(keyOf({ label: "Kissi Stone Figure" })).toBe("kissi-figure")
    expect(keyOf({ label: "The Fontomfrom Royal Drum" })).toBe("fontomfrom-drum") // not the crown or drum
    expect(keyOf({ label: "Timbuktu Manuscripts From Mali" })).toBe("timbuktu-manuscripts")
    expect(keyOf({ label: "Kissing Hearts" })).not.toBe("kissi-figure")
    expect(keyOf({ label: "Masquerade Dance" })).toBe("masquerade") // not the Victory Dance
    expect(keyOf({ label: "The Masquerade" })).toBe("masquerade")
    expect(keyOf({ label: "Victory Dance" })).toBe("victory-dance")
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

  it("falls back to the treasure box for a name it does not know", () => {
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

  it("keeps a legendary treasure's arrival whatever icon it was given", () => {
    // An override changes the picture only. Earth Harvest given a sprout or an emoji is
    // still Earth Harvest, and still arrives with its video.
    for (const icon of ["sprout", "leaf", "flower", "🌱"]) {
      expect(giftArrivalFor({ id: "earth_harvest", label: "Earth Harvest", icon }, "received")).toBe("earth-harvest")
    }
    expect(resolveGiftIcon({ label: "Earth Harvest", icon: "flower" })).toMatchObject({ kind: "rule", rule: { key: "flower" } })
  })

  it("goes by the name over an old id — a renamed treasure keeps the id it was saved with", () => {
    // In the catalogue, Earth Harvest was once Cowry Throne, and an id cannot change.
    expect(giftArrivalFor({ id: "cowry_throne", label: "Earth Harvest" }, "received")).toBe("earth-harvest")
    expect(resolveGiftIcon({ id: "cowry_throne", label: "Earth Harvest" })).toMatchObject({ rule: { key: "earth-harvest" } })
    // The id still counts when the name says nothing recognisable.
    expect(resolveGiftIcon({ id: "golden_eagle", label: "Gift 7" })).toMatchObject({ rule: { key: "eagle" } })
  })

  it("lets a treasure with no moment of its own borrow one through its icon", () => {
    expect(giftArrivalFor({ label: "Garden Rain", icon: "earth-harvest" }, "received")).toBe("earth-harvest")
    // An ordinary icon on an ordinary gift is still just an icon.
    expect(giftArrivalFor({ label: "Clap", icon: "flower" }, "received")).toBe("rain")
  })
})
