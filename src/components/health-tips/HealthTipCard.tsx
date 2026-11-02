import { useState } from "react"
import type { HealthTip } from "@/utils/careconnect/services/healthTipsService"

/**
 * The one tip shown for a search.
 *
 * Text first: the picture is a bonus, so a tip with no image, or whose image fails to load,
 * reads exactly the same minus the picture. The image sits in a fixed 16:9 frame so the
 * page does not jump while it loads, and it is loaded lazily.
 */
export function HealthTipCard({ tip }: { tip: HealthTip }) {
  const [imageFailed, setImageFailed] = useState(false)
  const showImage = Boolean(tip.image) && !imageFailed

  return (
    <article className="overflow-hidden rounded-2xl bg-white ring-1 ring-[#e2e6ea]">
      {showImage && tip.image && (
        <div className="aspect-video w-full bg-[#eef1f3]">
          <img
            src={tip.image.url}
            alt={tip.image.alt}
            loading="lazy"
            decoding="async"
            onError={() => setImageFailed(true)}
            className="size-full object-cover"
          />
        </div>
      )}

      <div className="p-5">
        <h3 className="text-base font-semibold text-[#141922]">{tip.title}</h3>
        <p className="mt-1.5 text-sm leading-6 text-[#4a5260]">{tip.summary}</p>

        {tip.steps && tip.steps.length > 0 && (
          <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm text-[#4a5260]">
            {tip.steps.map((step, index) => (
              <li key={index}>{step}</li>
            ))}
          </ol>
        )}

        {tip.whenToSeeAProfessional && (
          <p className="mt-3 text-xs font-medium text-[#8a5a2b]">
            See a professional if: {tip.whenToSeeAProfessional}
          </p>
        )}
      </div>
    </article>
  )
}
