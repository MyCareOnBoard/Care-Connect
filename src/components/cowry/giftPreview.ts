import type { GiftSplashData } from "@/components/cowry/GiftSplash"
import { resolveGiftIcon } from "@/components/cowry/giftIcons"
import { giftArrivalFor } from "@/components/cowry/giftAnimations"
import { missingFromCatalogue } from "@/components/cowry/giftTraySelection"
import { getGiftCatalog } from "@/utils/careconnect/services/cowryService"

/**
 * Play a gift splash without anyone sending a gift.
 *
 * Two uses. The sender's own tray plays one when a gift goes through, so both sides see the
 * gift's icon. And while developing, `window.previewGift("Water Drop", 500)` in the browser
 * console shows exactly what a receiver would see — checking the look of a new icon should
 * not need a second account and real Cowries.
 */

export const GIFT_PREVIEW_EVENT = "careconnect:gift-preview"

export type GiftPreviewDetail = GiftSplashData

export function playGiftSplash(detail: Omit<GiftSplashData, "key"> & { key?: string }): void {
  if (typeof window === "undefined") return
  window.dispatchEvent(
    new CustomEvent<GiftPreviewDetail>(GIFT_PREVIEW_EVENT, {
      detail: { ...detail, key: detail.key ?? `preview-${Date.now()}` },
    }),
  )
}

// Development only: a console helper for trying gift names and amounts.
if (import.meta.env.DEV && typeof window !== "undefined") {
  ;(window as unknown as { previewGift: (label: string, cost?: number) => void }).previewGift = (
    label,
    cost = 250,
  ) =>
    playGiftSplash({
      gift: { label },
      cost,
      senderName: "Preview",
      message: "This is how it looks when it arrives.",
      creatorAmount: Math.round(cost * 0.7),
      direction: "received",
    })

  /*
   * `checkGiftIcons()` lists every gift in the live catalogue with the icon it resolves to
   * and how it arrives, and warns about any that fall back to the plain gift box — the quick
   * way to confirm every name has a matching icon after the catalogue changes.
   */
  ;(window as unknown as { checkGiftIcons: () => Promise<void> }).checkGiftIcons = async () => {
    const catalog = await getGiftCatalog()
    const rows = catalog.gifts.map((gift) => {
      const resolved = resolveGiftIcon(gift)
      return {
        gift: gift.label,
        id: gift.id,
        set: gift.set,
        cost: gift.cost,
        icon: resolved.kind === "rule" ? resolved.rule.key : `emoji ${resolved.emoji}`,
        arrival: giftArrivalFor(gift, "received"),
      }
    })
    console.table(rows)
    const missing = missingFromCatalogue(catalog.gifts)
    if (missing.length) {
      console.warn(
        `${missing.length} gift(s) chosen for the tray are not in the catalogue at all, so they cannot be shown:`,
        missing.map((item) => `${item.set}: ${item.name}`),
      )
    }
    const unmatched = rows.filter((row) => row.icon === "gift")
    if (unmatched.length) {
      console.warn(
        `${unmatched.length} gift(s) have no matching icon and show the plain gift box — add their words to GIFT_ICON_RULES:`,
        unmatched.map((row) => row.gift),
      )
    } else {
      console.info("Every gift has a matching icon.")
    }
  }
}
