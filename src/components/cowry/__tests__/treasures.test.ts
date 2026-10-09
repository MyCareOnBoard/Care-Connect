import { describe, expect, it } from "vitest"
import { resolveGiftIcon } from "@/components/cowry/giftIcons"
import { giftArrivalFor } from "@/components/cowry/giftAnimations"
import { isGoldTab, trayTabs } from "@/components/cowry/giftTraySelection"
import { isIllustration } from "@/components/cowry/treasureIllustrationKinds"
import type { CowryGiftCatalogItem } from "@/utils/careconnect/services/cowryService"

/**
 * The Treasures catalogue, from the member's side.
 *
 * Two things are guarded. Every Treasure on the list wears its own icon, never the plain
 * chest — and none of them borrows a legendary's full-screen arrival by sharing a word with
 * it ("The Harvest Basket" is not Earth Harvest). And the tray's tabs are the catalogue's
 * categories, so a Treasure filed under a new category is never left out of the tray.
 */

const TREASURES: Record<string, string[]> = {
  "Wellness & Emotion": [
    "The New Dawn", "The Strong Root", "The Calm Water", "The Open Hand", "The Family Basket",
    "The Light Within", "The Safe Harbour",
  ],
  Heritage: [
    "The Talking Drum", "The Calabash", "The Heritage Basket", "The Village Lantern", "The Story Fire",
    "The Ancestral Pattern", "The Golden Stool",
  ],
  "Food & Table": [
    "The Shared Bowl", "The Jollof Table", "The Morning Akara", "The Family Pot", "The Harvest Basket",
    "The Spice Trail", "The Tea Circle",
  ],
  Achievement: ["The Barefoot Victory", "The First Flight", "The Breakthrough", "The Golden Mile", "The Open Door", "The Legacy"],
  Nature: ["The Baobab", "The Golden Sunset", "The First Rain", "The Rising Moon", "The Golden Savannah", "The Ocean Breeze"],
  "Music & Expression": ["The Rhythm", "The Dancing Shadow", "The Voice", "The Painter's Sun", "The Storyteller"],
  "Human Connection": ["The Thank You", "The Friendship Thread", "The Warm Embrace", "The Helping Hand", "The Welcome"],
  Premium: [
    "The Golden Journey", "The 54 Horizons", "The Legacy Tree", "The Time Capsule", "The Golden Memory",
    "The Timeless Treasure",
  ],
}

const keyOf = (label: string) => {
  const resolved = resolveGiftIcon({ label })
  return resolved.kind === "rule" ? resolved.rule.key : "emoji"
}

describe("treasure icons", () => {
  const all = Object.values(TREASURES).flat()

  it.each(all)("%s has an icon of its own", (label) => {
    expect(keyOf(label)).not.toBe("gift")
  })

  it("gives each treasure a different icon rule", () => {
    const keys = all.map(keyOf)
    expect(new Set(keys).size).toBe(keys.length)
  })

  it.each(all)("%s has no full-screen arrival yet", (label) => {
    expect(giftArrivalFor({ label }, "received")).toBe("rain")
  })

  it("draws the Premium treasures in gold, and only those", () => {
    for (const [category, labels] of Object.entries(TREASURES)) {
      for (const label of labels) {
        const resolved = resolveGiftIcon({ label })
        const gold = resolved.kind === "rule" && Boolean(resolved.rule.legendary)
        expect([label, gold]).toEqual([label, category === "Premium"])
        if (category === "Premium") expect(resolved.kind === "rule" && resolved.rule.icon).toBe("art")
        else {
          // Every everyday Treasure is drawn as what it is named, not a generic symbol.
          expect([label, resolved.kind === "rule" && resolved.rule.icon]).toEqual([label, "art"])
          expect(resolved.kind === "rule" && isIllustration(resolved.rule.art ?? "")).toBe(true)
        }
      }
    }
  })

  it("does not mistake the Harvest Basket for Earth Harvest, or the Legacy Tree for the Legacy", () => {
    expect(keyOf("The Harvest Basket")).toBe("harvest-basket")
    expect(keyOf("Earth Harvest")).toBe("earth-harvest")
    expect(keyOf("The Legacy Tree")).toBe("legacy-tree")
    expect(keyOf("The Legacy")).toBe("legacy")
  })
})

describe("the tray's tabs", () => {
  it("gilds the Premium tab, by its key or its label", () => {
    expect(isGoldTab({ id: "premium", label: "Premium" })).toBe(true)
    expect(isGoldTab({ id: "cat_8", label: "Premium" })).toBe(true)
    expect(isGoldTab({ id: "legendary" })).toBe(true)
    expect(isGoldTab({ id: "heritage", label: "Heritage" })).toBe(false)
  })

  const gift = (label: string, set: string, cost = 100): CowryGiftCatalogItem => ({
    id: label.toLowerCase().replace(/[^a-z0-9]+/g, "_"),
    label,
    set,
    cost,
  })

  it("are the catalogue's categories, in its order and with its labels", () => {
    const tabs = trayTabs({
      gifts: [gift("The Talking Drum", "heritage", 500), gift("The New Dawn", "wellness_emotion", 100)],
      sets: [
        { id: "wellness_emotion", label: "Wellness & Emotion" },
        { id: "heritage", label: "Heritage" },
        { id: "food_table", label: "Food & Table" },
      ],
    })
    // Food & Table has nothing sendable yet, so it has no tab.
    expect(tabs.map((tab) => tab.label)).toEqual(["Wellness & Emotion", "Heritage"])
    expect(tabs[1].gifts.map((g) => g.label)).toEqual(["The Talking Drum"])
  })

  it("still shows a treasure filed under a category the catalogue did not list", () => {
    const tabs = trayTabs({
      gifts: [gift("The New Dawn", "wellness_emotion"), gift("The Rhythm", "music_expression")],
      sets: [{ id: "wellness_emotion", label: "Wellness & Emotion" }],
    })
    expect(tabs.map((tab) => tab.label)).toEqual(["Wellness & Emotion", "Music Expression"])
  })

  it("keeps working for a catalogue from before Treasures", () => {
    const tabs = trayTabs({ gifts: [gift("Bouquet", "warm"), gift("Clap", "everyday")] })
    expect(tabs.map((tab) => tab.label)).toEqual(["Everyday", "Warm"])
  })
})
