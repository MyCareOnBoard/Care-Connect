import { describe, expect, it } from "vitest"
import { resolveGiftIcon } from "@/components/cowry/giftIcons"
import { giftArrivalFor } from "@/components/cowry/giftAnimations"
import { LEGENDARY_SELECTION, missingFromCatalogue, traySelection } from "@/components/cowry/giftTraySelection"
import type { CowryGiftCatalogItem, CowryGiftSet } from "@/utils/careconnect/services/cowryService"

const keyOf = (label: string) => {
  const resolved = resolveGiftIcon({ label })
  return resolved.kind === "rule" ? resolved.rule.key : "emoji"
}

/** Every catalogue gift, and the icon it should wear. */
const EXPECTED: Record<string, string> = {
  // Everyday
  Clap: "clap",
  "Thumbs Up": "thumbs-up",
  Smile: "smile",
  "Kola Nut": "kola-nut",
  Sunrise: "sunrise",
  Handshake: "handshake",
  // Warm
  Bouquet: "bouquet",
  "Jollof Plate": "jollof",
  "Aso Oke": "aso-oke",
  "Talking Drum": "talking-drum",
  Gele: "gele",
  "Palm Tree": "palm-tree",
  Lantern: "lantern",
  "Drum Beat": "drum-beat",
  Hibiscus: "hibiscus",
  // Bold
  "Fire Works": "fireworks",
  Fireworks: "fireworks",
  "Bronze Head": "bronze-head",
  "Harmattan Wind": "harmattan",
  "Market Day": "market-day",
  "Golden Staff": "golden-staff",
  "Victory Dance": "victory-dance",
  // Rare
  "Zuma Rock": "zuma-rock",
  "River Niger": "river-niger",
  "Coral Beads": "coral-beads",
  "Benin Bronze": "benin-bronze",
  "Great Hornbill": "hornbill",
  "Silver Cowry": "silver-cowry",
  "Diamond Cowry": "diamond-cowry",
  "Sapphire Tide": "sapphire-tide",
  "Emerald Grove": "emerald-grove",
  // Legendary
  "Blooming Rose": "blooming-rose",
  "Eternal Flame": "eternal-flame",
  "Rising Sun": "rising-sun",
  "Ancestral Mark": "ancestral-mark",
  "Thunder Staff": "thunder-staff",
  "City of Lights": "city-of-lights",
  "Phoenix Rise": "phoenix-rise",
  "Ocean Pearl": "ocean-pearl",
  "Cowry Throne": "cowry-throne",
  "Golden Eagle": "eagle",
  "Golden Lion": "king-lion",
  "Golden Lion King": "king-lion",
  "Earth Harvest": "earth-harvest",
  "Harvest Rain": "earth-harvest",
}

/** The Legendary tier, cheapest to dearest. */
const LEGENDARY_TIER = [
  "Blooming Rose",
  "Thunder Staff",
  "Eternal Flame",
  "Rising Sun",
  "City of Lights",
  "Golden Eagle",
  "Golden Lion",
  "Earth Harvest",
]

describe("catalogue gift icons", () => {
  it.each(Object.entries(EXPECTED))("%s wears the %s icon", (label, key) => {
    expect(keyOf(label)).toBe(key)
  })

  it("never falls back to the plain gift box for a catalogue gift", () => {
    for (const label of Object.keys(EXPECTED)) expect(keyOf(label)).not.toBe("gift")
  })

  it("gives only the legendary tier the legendary finish", () => {
    const isLegendary = (label: string) => {
      const resolved = resolveGiftIcon({ label })
      return resolved.kind === "rule" && Boolean(resolved.rule.legendary)
    }
    for (const label of LEGENDARY_TIER) expect(isLegendary(label)).toBe(true)
    for (const label of ["Ancestral Mark", "Phoenix Rise", "Ocean Pearl", "Cowry Throne"]) expect(isLegendary(label)).toBe(false)
  })
})

describe("gift tray selection", () => {
  const gift = (label: string, set: CowryGiftSet, cost: number): CowryGiftCatalogItem => ({
    id: label.toLowerCase().replace(/\s+/g, "_"),
    label,
    set,
    cost,
  })

  it("curates the eight legendary gifts", () => {
    expect(LEGENDARY_SELECTION.map((names) => (Array.isArray(names) ? names[0] : names))).toEqual(LEGENDARY_TIER)
  })

  it("orders the legendary tab by price, and leaves out gifts no longer in the tier", () => {
    const prices = [10000, 20000, 30000, 40000, 50000, 80000, 90000, 100000]
    const catalogue = [
      ...LEGENDARY_TIER.map((label, i) => gift(label, "legendary", prices[i])).reverse(),
      gift("Cowry Throne", "legendary", 75000),
      gift("Ocean Pearl", "legendary", 25000),
    ]
    expect(traySelection("legendary", catalogue).map((g) => g.label)).toEqual(LEGENDARY_TIER)
  })

  it("still finds the lion and the harvest by their earlier names", () => {
    const catalogue = [gift("Golden Lion King", "legendary", 90000), gift("Harvest Rain", "legendary", 100000)]
    expect(traySelection("legendary", catalogue).map((g) => g.label)).toEqual(["Golden Lion King", "Harvest Rain"])
  })

  it("shows every gift in the other sets, in catalogue order, with no limit", () => {
    const warm = ["Hibiscus", "Palm Tree", "Gele", "Talking Drum", "Aso Oke", "Jollof Plate", "Bouquet", "Lantern"].map(
      (label, i) => gift(label, "warm", 100 + i),
    )
    const catalogue = [...warm, gift("Fireworks", "bold", 500)]
    expect(traySelection("warm", catalogue).map((g) => g.label)).toEqual([
      "Hibiscus",
      "Palm Tree",
      "Gele",
      "Talking Drum",
      "Aso Oke",
      "Jollof Plate",
      "Bouquet",
      "Lantern",
    ])
  })

  it("finds a chosen gift even when the backend filed it under another set", () => {
    const catalogue = [
      gift("Thunder Staff", "legendary", 20000),
      gift("Golden Eagle", "legendary", 100000),
      gift("Blooming Rose", "warm", 10000), // filed elsewhere by the backend
      gift("Rising Sun", "rare", 50000), // filed elsewhere by the backend
    ]
    expect(traySelection("legendary", catalogue).map((g) => g.label)).toEqual([
      "Blooming Rose",
      "Thunder Staff",
      "Rising Sun",
      "Golden Eagle",
    ])
    // ...and not on the tab it was filed under as well.
    expect(traySelection("warm", catalogue)).toEqual([])
    expect(traySelection("rare", catalogue)).toEqual([])
  })

  it("reports chosen gifts the catalogue does not have at all", () => {
    const catalogue = [gift("Thunder Staff", "legendary", 20000), gift("Golden Eagle", "legendary", 100000)]
    const missing = missingFromCatalogue(catalogue).map((item) => item.name)
    expect(missing).toEqual(["Blooming Rose", "Eternal Flame", "Rising Sun", "City of Lights", "Golden Lion", "Earth Harvest"])
  })

  it("falls back to the backend's legendary set when none of the names match, so it is never empty", () => {
    const renamed = [gift("Mystery B", "legendary", 90000), gift("Mystery A", "legendary", 40000), gift("Clap", "everyday", 10)]
    expect(traySelection("legendary", renamed).map((g) => g.label)).toEqual(["Mystery A", "Mystery B"])
  })
})

describe("legendary arrivals", () => {
  it.each([
    ["Blooming Rose", "rose-bloom"],
    ["Thunder Staff", "thunder-strike"],
    ["Eternal Flame", "eternal-flame"],
    ["Rising Sun", "rising-sun"],
    ["Golden Eagle", "eagle-flight"],
    ["City of Lights", "city-of-lights"],
    ["Golden Lion", "lion-storm"],
    ["Earth Harvest", "earth-harvest"],
  ])("%s arrives full screen as %s", (label, arrival) => {
    expect(giftArrivalFor({ label }, "received")).toBe(arrival)
    const resolved = resolveGiftIcon({ label })
    expect(resolved.kind === "rule" && resolved.rule.legendary).toBe(true)
  })

  it("keeps full-screen arrivals to the legendary set", () => {
    for (const label of ["Clap", "Bouquet", "Fire Works", "Silver Cowry", "Sunrise", "Ancestral Mark", "Phoenix Rise", "Ocean Pearl", "Cowry Throne"]) {
      expect(giftArrivalFor({ label }, "received")).toBe("rain")
    }
  })
})
