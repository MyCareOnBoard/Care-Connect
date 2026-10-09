import { createLucideIcon } from "lucide-react"

/**
 * A treasure chest, drawn in the icon set's own line style so it sits beside the rest:
 * a rounded lid, the chest below it, two straps and a lock.
 *
 * Treasures are what the app calls gifts (the code and the API still say "gift"), and this
 * stands wherever the gift box used to.
 */
export const TreasureChest = createLucideIcon("treasure-chest", [
  ["path", { d: "M3 10a5 5 0 0 1 5-5h8a5 5 0 0 1 5 5v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z", key: "chest" }],
  ["path", { d: "M3 10h18", key: "rim" }],
  ["path", { d: "M8 5v15", key: "strap-left" }],
  ["path", { d: "M16 5v15", key: "strap-right" }],
  ["rect", { x: "10", y: "8.5", width: "4", height: "4.5", rx: "1", key: "lock" }],
])
