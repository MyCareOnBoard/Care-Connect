import { useContext } from "react"
import { CowryIcon } from "@/components/cowry/CowryIcon"
import { MomentCaptionContext } from "@/components/cowry/moments/captionContext"

/**
 * "Congratulations on the 100,000 Gift", in gold across the top of a legendary arrival.
 * Renders nothing when no caption was provided (see captionContext.ts).
 */
export function MomentCaption() {
  const caption = useContext(MomentCaptionContext)
  if (!caption) return null
  return (
    <div className="pointer-events-none absolute inset-x-0 top-[9vh] z-10 flex justify-center px-4" aria-live="polite">
      <div className="moment-caption flex flex-col items-center gap-1.5 text-center">
        <span className="flex items-center gap-2">
          <CowryIcon size={30} className="shrink-0 drop-shadow-[0_2px_6px_rgba(0,0,0,0.5)]" />
          <span className="bg-[linear-gradient(180deg,#fff7dc_0%,#f3c969_45%,#c8963e_100%)] bg-clip-text text-2xl font-extrabold leading-tight tracking-tight text-transparent drop-shadow-[0_3px_10px_rgba(0,0,0,0.6)] sm:text-4xl">
            {caption.title}
          </span>
          <CowryIcon size={30} className="shrink-0 drop-shadow-[0_2px_6px_rgba(0,0,0,0.5)]" />
        </span>
        {caption.subtitle && (
          <span className="rounded-full bg-black/35 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#fbe3a0] ring-1 ring-[#f3c969]/40 backdrop-blur-sm sm:text-sm">
            {caption.subtitle}
          </span>
        )}
      </div>
    </div>
  )
}
