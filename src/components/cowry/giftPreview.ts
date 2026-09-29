import type { GiftSplashData } from "@/components/cowry/GiftSplash"

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
}
