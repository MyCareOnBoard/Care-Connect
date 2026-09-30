import { useCallback, useEffect, useRef, useState } from "react"
import { useAuthUser } from "@/utils/auth"
import { useCareFlow } from "@/components/app/useCareFlow"
import { GiftSplash, type GiftSplashData } from "@/components/cowry/GiftSplash"
import { GIFT_PREVIEW_EVENT, type GiftPreviewDetail } from "@/components/cowry/giftPreview"
import { toDate } from "@/utils/careconnect/types"
import { isAnyCowryPageEnabled } from "@/utils/careconnect/cowryPages"
import { listGifts, type CowryGift } from "@/utils/careconnect/services/cowryService"

/**
 * Gifts arriving, on the receiver's side.
 *
 * Mounted once in AppLayout, beside the Outlet, so it works on every page and a route change
 * does not cut a splash off. It checks the member's received gifts every so often while the
 * tab is visible, and again as soon as they come back to it; each gift not seen before plays
 * its own splash — its icon raining down, sized to what it cost — one after another.
 *
 * Polled rather than pushed: gifts are written by the backend, and there is no client
 * subscription to them. Half a minute's delay on a delight moment is fine; a gift arriving
 * while the app is closed plays the next time it is opened.
 *
 * What has been seen is remembered per member in this browser, and the very first check only
 * takes note of what is there — nobody should open the app to a replay of every gift ever.
 */

const POLL_MS = 30_000
/** At most this many splashes in one go; a burst of gifts should not take a minute to watch. */
const MAX_QUEUED = 4
const REMEMBER = 60

function storageKey(uid: string) {
  return `careconnect-gifts-seen:${uid}`
}

function readSeen(uid: string): Set<string> | null {
  try {
    const raw = localStorage.getItem(storageKey(uid))
    return raw ? new Set(JSON.parse(raw) as string[]) : null
  } catch {
    return null
  }
}

function writeSeen(uid: string, ids: Set<string>) {
  try {
    localStorage.setItem(storageKey(uid), JSON.stringify([...ids].slice(-REMEMBER)))
  } catch {
    // Not remembered: at worst a gift plays again after a reload.
  }
}

function toSplash(gift: CowryGift): GiftSplashData {
  return {
    key: gift.id,
    gift: { id: gift.giftId, label: gift.giftLabel, icon: gift.giftIcon },
    set: gift.giftSet,
    cost: gift.cost,
    senderName: gift.senderName,
    message: gift.message,
    creatorAmount: gift.creatorAmount,
    direction: "received",
  }
}

export function GiftArrivalLayer() {
  const { user } = useAuthUser()
  const { flow } = useCareFlow()
  const uid = user?.uid
  // Gifts are a member feature; agencies neither send nor receive them here.
  const enabled = Boolean(uid) && flow !== "agency" && isAnyCowryPageEnabled()

  const [queue, setQueue] = useState<GiftSplashData[]>([])
  const checking = useRef(false)

  const check = useCallback(async () => {
    if (!uid || checking.current) return
    checking.current = true
    try {
      const gifts = await listGifts({ direction: "received", limit: 20 })
      const seen = readSeen(uid)

      if (!seen) {
        // First check in this browser: note what is already there, play nothing.
        writeSeen(uid, new Set(gifts.map((gift) => gift.id)))
        return
      }

      const fresh = gifts
        .filter((gift) => !seen.has(gift.id) && gift.senderId !== uid)
        .sort((a, b) => (toDate(a.createdAt ?? null)?.getTime() ?? 0) - (toDate(b.createdAt ?? null)?.getTime() ?? 0))
      if (fresh.length === 0) return

      for (const gift of fresh) seen.add(gift.id)
      writeSeen(uid, seen)
      // Oldest first, and only the latest few if a lot arrived at once.
      setQueue((current) => [...current, ...fresh.slice(-MAX_QUEUED).map(toSplash)].slice(-MAX_QUEUED))
    } catch {
      // A failed check is silent; the next one catches up.
    } finally {
      checking.current = false
    }
  }, [uid])

  useEffect(() => {
    if (!enabled) return
    void check()
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") void check()
    }, POLL_MS)
    const onVisible = () => {
      if (document.visibilityState === "visible") void check()
    }
    document.addEventListener("visibilitychange", onVisible)
    return () => {
      window.clearInterval(timer)
      document.removeEventListener("visibilitychange", onVisible)
    }
  }, [enabled, check])

  // Previews (see giftPreview.ts) go through the same queue as real arrivals.
  useEffect(() => {
    const onPreview = (event: Event) => {
      const detail = (event as CustomEvent<GiftPreviewDetail>).detail
      if (detail) setQueue((current) => [...current, detail])
    }
    window.addEventListener(GIFT_PREVIEW_EVENT, onPreview)
    return () => window.removeEventListener(GIFT_PREVIEW_EVENT, onPreview)
  }, [])

  const next = useCallback(() => setQueue((current) => current.slice(1)), [])

  const current = queue[0]
  if (!current) return null
  return <GiftSplash key={current.key} data={current} onDone={next} />
}
