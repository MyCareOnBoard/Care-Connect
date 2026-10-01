import { useRef, useState } from "react"
import { PostVideo } from "@/components/profile/PostVideo"
import type { PostMedia } from "@/components/profile/PortfolioPost"
import { cn } from "@/lib/utils"

/**
 * Several photos or videos, swiped one at a time — how a multi-photo post works on a phone.
 *
 * Plain CSS scroll-snap does the swiping, so it feels native and needs no gesture code.
 * Each slide shows the whole photo (no cropping) on a soft backdrop, and the dots below say
 * where you are. Wider screens keep the tiled grid instead; see PortfolioPost.
 */
export function MediaCarousel({
  media,
  onTap,
}: {
  media: PostMedia[]
  /** A tap on a photo, with its position — for double-tap likes and opening the viewer. */
  onTap: (index: number) => void
}) {
  const [current, setCurrent] = useState(0)
  const track = useRef<HTMLDivElement>(null)

  const goTo = (index: number) => {
    const el = track.current
    if (!el) return
    el.scrollTo({ left: index * el.clientWidth, behavior: "smooth" })
  }

  return (
    <div className="relative">
      <div
        ref={track}
        onScroll={(event) => {
          const el = event.currentTarget
          setCurrent(Math.round(el.scrollLeft / Math.max(1, el.clientWidth)))
        }}
        className="scrollbar-hide flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain rounded-xl"
        aria-roledescription="carousel"
      >
        {media.map((item, index) => (
          <div
            key={index}
            className="flex aspect-[4/5] w-full shrink-0 snap-center items-center justify-center bg-[#eef1f3]"
            aria-roledescription="slide"
            aria-label={`${index + 1} of ${media.length}`}
          >
            {item.type === "video" ? (
              <PostVideo src={item.url} compact />
            ) : (
              <img
                src={item.url}
                alt=""
                loading="lazy"
                decoding="async"
                draggable={false}
                onClick={() => onTap(index)}
                className="size-full select-none object-contain"
              />
            )}
          </div>
        ))}
      </div>

      <span className="pointer-events-none absolute right-2.5 top-2.5 rounded-full bg-black/55 px-2 py-0.5 text-[11px] font-semibold text-white">
        {current + 1}/{media.length}
      </span>

      <div className="mt-2 flex justify-center gap-1.5" role="tablist" aria-label="Choose a photo">
        {media.map((_, index) => (
          <button
            key={index}
            type="button"
            role="tab"
            aria-selected={index === current}
            aria-label={`Show ${index + 1} of ${media.length}`}
            onClick={() => goTo(index)}
            className={cn(
              "h-1.5 rounded-full transition-all duration-300",
              index === current ? "w-5 bg-[#00b4b8]" : "w-1.5 bg-[#c8cdd4]",
            )}
          />
        ))}
      </div>
    </div>
  )
}
