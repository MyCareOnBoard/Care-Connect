import type { CowryGiftCatalogItem, CowryGiftSet } from "@/utils/careconnect/services/cowryService"

/**
 * Which gifts each tab of the gift tray offers.
 *
 * Everyday, Warm, Bold and Rare show every gift the catalogue files under them, in the
 * catalogue's order — no limit.
 *
 * Legendary is curated: the names below, found anywhere in the catalogue, shown cheapest to
 * dearest. THIS IS THE LIST TO EDIT to change it. Names are matched by their letters only,
 * so spacing, capitals and punctuation do not matter. A gift listed here appears on the
 * Legendary tab only, even if the catalogue files it under another set.
 */

/** At most this many on the Legendary tab. */
export const LEGENDARY_GIFTS = 8

// Each arrives with its own full-screen moment on the receiver's screen — see giftAnimations.ts.
// A slot can list more than one name: the first the catalogue has is used.
// Prices here are notes only: the catalogue's own prices are what show and how the tab sorts.
export const LEGENDARY_SELECTION: Array<string | string[]> = [
  "Blooming Rose", //                       10,000
  "Thunder Staff", //                       20,000
  "Eternal Flame", //                       30,000
  "Rising Sun", //                          40,000
  "City of Lights", //                      50,000
  "Golden Eagle", //                        80,000
  ["Golden Lion", "Golden Lion King"], //   90,000
  ["Earth Harvest", "Harvest Rain"], //    100,000
  // Out of the Legendary tier for now — their full-screen scenes are kept in moments/:
  // "Ancestral Mark",
  // "Phoenix Rise",
  // "Ocean Pearl",
  // "Cowry Throne",
]

const normalise = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, "")

function lookup(gifts: CowryGiftCatalogItem[]) {
  const byName = new Map(gifts.map((gift) => [normalise(gift.label), gift]))
  const byId = new Map(gifts.map((gift) => [normalise(gift.id), gift]))
  return (name: string) => byName.get(normalise(name)) ?? byId.get(normalise(name))
}

function findAny(find: ReturnType<typeof lookup>, names: string | string[]) {
  for (const name of Array.isArray(names) ? names : [names]) {
    const gift = find(name)
    if (gift) return gift
  }
  return undefined
}

function legendaryGifts(gifts: CowryGiftCatalogItem[]): CowryGiftCatalogItem[] {
  const find = lookup(gifts)
  const chosen = LEGENDARY_SELECTION.map((names) => findAny(find, names)).filter((gift): gift is CowryGiftCatalogItem => Boolean(gift))
  // If none of the names match, fall back to what the backend files as legendary, so the
  // tab is never empty.
  const list = chosen.length > 0 ? chosen : gifts.filter((gift) => gift.set === "legendary")
  return [...list].sort((a, b) => a.cost - b.cost).slice(0, LEGENDARY_GIFTS)
}

/** The gifts to show on one tab. */
export function traySelection(set: CowryGiftSet, gifts: CowryGiftCatalogItem[]): CowryGiftCatalogItem[] {
  const legendary = legendaryGifts(gifts)
  if (set === "legendary") return legendary
  const onLegendaryTab = new Set(legendary.map((gift) => gift.id))
  return gifts.filter((gift) => gift.set === set && !onLegendaryTab.has(gift.id))
}

/**
 * The top tier, drawn in gold in the tray: Premium now, Legendary before it. Matched on the
 * key or the label, since the key is whatever the admin gave the category.
 */
export function isGoldTab(tab: { id: string; label?: string | null }): boolean {
  const words = `${tab.id} ${tab.label ?? ""}`.toLowerCase()
  return /\b(premium|legendary)\b/.test(words)
}

/** The order of the tabs from before Treasures, for a catalogue that does not send its own. */
const LEGACY_ORDER = ["everyday", "warm", "bold", "rare", "legendary"]

/** "food_table" reads as "Food Table" when the catalogue gives no label of its own. */
const titleCase = (key: string) =>
  key.replace(/[_-]+/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase())

/**
 * The tray's tabs, in order, each with what it holds.
 *
 * Driven by the catalogue, not a list kept here: Treasures are filed by category, and the
 * categories are rows an admin adds and renames (TaxonomyManager). So the tabs are the
 * catalogue's own `sets`, in its order and with its labels — Wellness & Emotion, Heritage,
 * Food & Table, … — and a category added tomorrow appears without a release. Anything a gift
 * is filed under that the list does not mention still gets a tab, after the rest, so no gift
 * can go missing from the tray. A tab with nothing sendable in it is left out.
 */
export function trayTabs(catalog: {
  gifts: CowryGiftCatalogItem[]
  sets?: Array<{ id: CowryGiftSet; label?: string | null }> | null
}): Array<{ id: CowryGiftSet; label: string; gifts: CowryGiftCatalogItem[] }> {
  const listed = (catalog.sets ?? []).filter((set) => set?.id)
  const labels = new Map(listed.map((set) => [set.id, set.label?.trim() || ""]))
  const order: CowryGiftSet[] = listed.length
    ? listed.map((set) => set.id)
    : [...new Set([...LEGACY_ORDER.filter((id) => catalog.gifts.some((gift) => gift.set === id)), ...catalog.gifts.map((gift) => gift.set)])]
  for (const gift of catalog.gifts) if (gift.set && !order.includes(gift.set)) order.push(gift.set)
  // The curated Legendary tab gathers its gifts by name from anywhere, so it can have gifts
  // even when no gift is filed under "legendary" and the catalogue does not list it.
  if (!order.includes("legendary") && legendaryGifts(catalog.gifts).length) order.push("legendary")

  return order
    .map((id) => ({
      id,
      label: labels.get(id) || LEGACY_LABELS[id] || titleCase(id),
      gifts: traySelection(id, catalog.gifts),
    }))
    .filter((tab) => tab.gifts.length > 0)
}

const LEGACY_LABELS: Record<string, string> = {
  everyday: "Everyday",
  warm: "Warm",
  bold: "Bold",
  rare: "Rare",
  legendary: "Legendary",
}

/**
 * Legendary names the catalogue does not have — under any set, by name or id. These cannot
 * be shown (there is nothing to buy); the backend needs to add them, or the name here needs
 * to match the catalogue's spelling.
 */
export function missingFromCatalogue(gifts: CowryGiftCatalogItem[]): Array<{ set: CowryGiftSet; name: string }> {
  const find = lookup(gifts)
  return LEGENDARY_SELECTION.filter((names) => !findAny(find, names)).map((names) => ({
    set: "legendary" as const,
    name: Array.isArray(names) ? names[0] : names,
  }))
}
