import { useEffect, useRef, useState } from "react"
import { ChevronLeft, ChevronRight, Expand, X } from "lucide-react"
import { cn } from "@/lib/utils"

/**
 * A product's photos: one large, arrows and dots to move between them, thumbnails below,
 * and a tap to see the photo full screen. Swipes on touch screens. With a single photo it
 * is just that photo, still tappable to enlarge.
 */
export function ProductGallery({ images, alt, fallback }: { images: string[]; alt: string; fallback: React.ReactNode }) {
  const [index, setIndex] = useState(0)
  const [zoomed, setZoomed] = useState(false)
  const touchX = useRef<number | null>(null)
  const count = images.length
  const go = (next: number) => setIndex((next + count) % count)

  if (count === 0) return <>{fallback}</>

  return (
    <div>
      <div
        className="group relative overflow-hidden rounded-xl bg-[#eef1f3]"
        onTouchStart={(event) => (touchX.current = event.touches[0].clientX)}
        onTouchEnd={(event) => {
          if (touchX.current === null || count < 2) return
          const dx = event.changedTouches[0].clientX - touchX.current
          touchX.current = null
          if (Math.abs(dx) > 40) go(index + (dx < 0 ? 1 : -1))
        }}
      >
        <button type="button" onClick={() => setZoomed(true)} className="block w-full" aria-label="View photo full screen">
          <img
            key={images[index]}
            src={images[index]}
            alt={count > 1 ? `${alt}, photo ${index + 1} of ${count}` : alt}
            className="animate-fadeIn aspect-[4/3] w-full object-cover"
          />
        </button>
        <span className="pointer-events-none absolute right-2 top-2 flex size-8 items-center justify-center rounded-full bg-black/40 text-white opacity-0 backdrop-blur transition group-hover:opacity-100">
          <Expand className="size-4" aria-hidden="true" />
        </span>
        {count > 1 && (
          <>
            <button
              type="button"
              onClick={() => go(index - 1)}
              aria-label="Previous photo"
              className="absolute left-2 top-1/2 flex size-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-[#151922] shadow-md transition hover:bg-white active:scale-90"
            >
              <ChevronLeft className="size-5" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => go(index + 1)}
              aria-label="Next photo"
              className="absolute right-2 top-1/2 flex size-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-[#151922] shadow-md transition hover:bg-white active:scale-90"
            >
              <ChevronRight className="size-5" aria-hidden="true" />
            </button>
            <span className="absolute bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-black/45 px-2 py-0.5 text-[11px] font-semibold text-white tabular-nums backdrop-blur">
              {index + 1} / {count}
            </span>
          </>
        )}
      </div>

      {count > 1 && (
        <div className="scrollbar-hide mt-2 flex gap-2 overflow-x-auto">
          {images.map((src, i) => (
            <button
              key={src}
              type="button"
              onClick={() => setIndex(i)}
              aria-label={`Photo ${i + 1}`}
              aria-current={i === index || undefined}
              className={cn(
                "size-14 shrink-0 overflow-hidden rounded-lg ring-2 transition",
                i === index ? "ring-[#00b4b8]" : "ring-transparent opacity-70 hover:opacity-100",
              )}
            >
              <img src={src} alt="" loading="lazy" className="size-full object-cover" />
            </button>
          ))}
        </div>
      )}

      {zoomed && <Lightbox images={images} index={index} onIndex={setIndex} onClose={() => setZoomed(false)} />}
    </div>
  )
}

function Lightbox({
  images,
  index,
  onIndex,
  onClose,
}: {
  images: string[]
  index: number
  onIndex: (index: number) => void
  onClose: () => void
}) {
  const count = images.length
  // Rendered inside the panel rather than portalled out of it: the panel is a modal dialog,
  // and a click outside it would close it. Escape is caught first (window, capture phase) so
  // it closes the photo and leaves the panel open.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation()
        onClose()
      }
      if (event.key === "ArrowRight" && count > 1) onIndex((index + 1) % count)
      if (event.key === "ArrowLeft" && count > 1) onIndex((index - 1 + count) % count)
    }
    window.addEventListener("keydown", onKey, true)
    return () => window.removeEventListener("keydown", onKey, true)
  }, [index, count, onIndex, onClose])

  return (
    <div
      className="animate-fadeIn fixed inset-0 z-[60] flex items-center justify-center bg-[#0b0e12]/95 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Photo"
    >
      <button type="button" className="absolute inset-0" aria-label="Close photo" onClick={onClose} />
      <img src={images[index]} alt="" className="relative max-h-full max-w-full rounded-lg object-contain shadow-2xl" />
      <button
        type="button"
        onClick={onClose}
        aria-label="Close"
        className="absolute right-4 top-4 flex size-10 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur transition hover:bg-white/20"
      >
        <X className="size-5" aria-hidden="true" />
      </button>
    </div>
  )
}
