import { useEffect, type ReactNode } from "react"
import { createPortal } from "react-dom"
import { ChevronLeft, ChevronRight, X } from "lucide-react"
import type { PostMedia } from "@/components/profile/PortfolioPost"
import { cn } from "@/lib/utils"

/**
 * A post opened full-screen: its photos and videos large, the conversation beside them.
 *
 * The side panel is handed in by the post itself, so liking or commenting here is the same
 * like and the same comment as in the feed — there is one post, not a copy that drifts.
 *
 * Keyboard: ← → move between photos, Esc closes. Swiping works on phones through the
 * arrow buttons and the thumbnail strip.
 */
export function PostViewer({
  media,
  index,
  onIndexChange,
  onClose,
  side,
}: {
  media: PostMedia[]
  index: number
  onIndexChange: (index: number) => void
  onClose: () => void
  /** The author, text, counts and comments — rendered by the post. */
  side: ReactNode
}) {
  const count = media.length
  const item = media[index]

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      if (target && ["INPUT", "TEXTAREA"].includes(target.tagName)) {
        if (event.key === "Escape") target.blur()
        return
      }
      if (event.key === "Escape") onClose()
      else if (event.key === "ArrowRight" && count > 1) onIndexChange((index + 1) % count)
      else if (event.key === "ArrowLeft" && count > 1) onIndexChange((index - 1 + count) % count)
    }
    window.addEventListener("keydown", onKey)
    // The page behind should not scroll while the viewer is open.
    const previous = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      window.removeEventListener("keydown", onKey)
      document.body.style.overflow = previous
    }
  }, [index, count, onClose, onIndexChange])

  if (!item) return null

  return createPortal(
    <div className="animate-fadeIn fixed inset-0 z-50 flex flex-col bg-[#0b0e12] lg:flex-row" role="dialog" aria-modal="true" aria-label="Post">
      {/* Media */}
      <div className="relative flex min-h-[45vh] flex-1 items-center justify-center overflow-hidden lg:min-h-0">
        {item.type === "image" && (
          <div
            className="absolute inset-0 scale-110 bg-center bg-cover opacity-25 blur-3xl"
            style={{ backgroundImage: `url("${item.url}")` }}
            aria-hidden="true"
          />
        )}
        <div key={index} className="relative flex items-center justify-center p-4 animate-fadeIn size-full lg:p-10">
          {item.type === "video" ? (
            <video src={item.url} controls autoPlay playsInline className="max-w-full max-h-full rounded-lg" />
          ) : (
            <img src={item.url} alt="" className="object-contain max-w-full max-h-full rounded-lg shadow-2xl" />
          )}
        </div>

        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute flex items-center justify-center text-white transition rounded-full left-4 top-4 size-10 bg-white/10 backdrop-blur hover:bg-white/20"
        >
          <X className="size-5" aria-hidden="true" />
        </button>

        {count > 1 && (
          <>
            <button
              type="button"
              onClick={() => onIndexChange((index - 1 + count) % count)}
              aria-label="Previous"
              className="absolute flex items-center justify-center text-white transition -translate-y-1/2 rounded-full left-3 top-1/2 size-11 bg-white/10 backdrop-blur hover:bg-white/25 active:scale-90"
            >
              <ChevronLeft className="size-6" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => onIndexChange((index + 1) % count)}
              aria-label="Next"
              className="absolute flex items-center justify-center text-white transition -translate-y-1/2 rounded-full right-3 top-1/2 size-11 bg-white/10 backdrop-blur hover:bg-white/25 active:scale-90"
            >
              <ChevronRight className="size-6" aria-hidden="true" />
            </button>
            <div className="absolute flex gap-2 -translate-x-1/2 bottom-4 left-1/2">
              {media.map((thumb, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => onIndexChange(i)}
                  aria-label={`Show ${i + 1} of ${count}`}
                  aria-current={i === index}
                  className={cn(
                    "size-11 overflow-hidden rounded-lg ring-2 transition",
                    i === index ? "ring-white" : "opacity-60 ring-transparent hover:opacity-100",
                  )}
                >
                  {thumb.type === "video" ? (
                    <span className="flex size-full items-center justify-center bg-white/15 text-[10px] font-bold text-white">▶</span>
                  ) : (
                    <img src={thumb.url} alt="" className="object-cover size-full" />
                  )}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {/* The conversation */}
      <aside className="max-h-[55vh] overflow-y-auto bg-white lg:max-h-none lg:w-[400px] lg:shrink-0">{side}</aside>
    </div>,
    document.body,
  )
}
