import { useEffect, useState } from "react"
import { fetchHealthTipImage, type HealthTip } from "@/utils/careconnect/services/healthTipsService"

/** Gaps between asks for a picture that is still being drawn. The last one repeats. */
export const POLL_DELAYS_MS = [1500, 2500, 4000, 5000]
/** After this many asks the tip is shown as text. About 25 seconds in all. */
export const MAX_POLLS = 8

export type TipImageState =
  | { phase: "none" }
  | { phase: "loading"; alt: string }
  | { phase: "ready"; url: string; alt: string }

/**
 * What picture, if any, to show for a tip.
 *
 * A ready image is shown as it is. A pending one is asked for by key, again after a short
 * wait, until it is ready, the server says it will not come, or the asks run out; the tip
 * reads fine without it throughout, so every way of not getting a picture ends in "none".
 *
 * Results are remembered with the key they belong to rather than reset in an effect, so a
 * different tip can never show the previous tip's picture.
 */
export function useTipImage(image: HealthTip["image"]): TipImageState {
  const pendingKey = image?.status === "pending" ? image.key : null
  const [fetched, setFetched] = useState<{ key: string; url: string; alt?: string } | null>(null)
  const [gaveUp, setGaveUp] = useState<string | null>(null)

  useEffect(() => {
    if (!pendingKey) return
    let cancelled = false
    let timer: ReturnType<typeof setTimeout> | undefined

    const ask = async (attempt: number) => {
      try {
        const result = await fetchHealthTipImage(pendingKey)
        if (cancelled) return
        if (result.status === "ready") {
          setFetched({ key: pendingKey, url: result.url, alt: result.alt })
          return
        }
        if (result.status === "failed") {
          setGaveUp(pendingKey)
          return
        }
      } catch {
        if (cancelled) return
        // A network blip counts as an ask and is tried again, like "still pending".
      }
      if (attempt + 1 >= MAX_POLLS) {
        setGaveUp(pendingKey)
        return
      }
      const delay = POLL_DELAYS_MS[Math.min(attempt, POLL_DELAYS_MS.length - 1)]
      timer = setTimeout(() => void ask(attempt + 1), delay)
    }

    void ask(0)
    return () => {
      cancelled = true
      if (timer) clearTimeout(timer)
    }
  }, [pendingKey])

  if (!image) return { phase: "none" }
  if (image.status === "ready") return { phase: "ready", url: image.url, alt: image.alt }
  if (fetched?.key === image.key) return { phase: "ready", url: fetched.url, alt: fetched.alt ?? image.alt }
  if (gaveUp === image.key) return { phase: "none" }
  return { phase: "loading", alt: image.alt }
}
