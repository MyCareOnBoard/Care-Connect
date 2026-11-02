import { useState } from "react"
import type { HealthTip } from "@/utils/careconnect/services/healthTipsService"
import { useTipImage } from "./useTipImage"

/**
 * The one tip shown for a search.
 *
 * Text first: the picture is a bonus, so a tip with no image, or whose image fails to load
 * or never arrives, reads exactly the same minus the picture. The image sits in a fixed 16:9
 * square frame (the pictures are square, and are shown whole, never cropped) so the page
 * does not jump while it loads, and it is loaded lazily. While a picture is
 * still being drawn the frame holds a quiet placeholder; the picture is always labelled as
 * AI-generated, because it is an illustration, not a photograph of anything real.
 */
export function HealthTipCard({ tip }: { tip: HealthTip }) {
  const picture = useTipImage(tip.image)
  // Remembered with the URL it failed for, so a new picture is never hidden by an old failure.
  const [failedUrl, setFailedUrl] = useState<string | null>(null)
  const ready = picture.phase === "ready" && picture.url !== failedUrl ? picture : null

  return (
    <article className="overflow-hidden rounded-2xl bg-white ring-1 ring-[#e2e6ea]">
      {picture.phase === "loading" && (
        <div
          role="status"
          aria-label="Drawing an illustration"
          className="mx-auto aspect-square w-full max-w-sm animate-pulse bg-[#eef1f3]"
        />
      )}

      {ready && (
        <figure className="m-0">
          <div className="mx-auto aspect-square w-full max-w-sm bg-[#eef1f3]">
            <img
              src={ready.url}
              alt={ready.alt}
              loading="lazy"
              decoding="async"
              onError={() => setFailedUrl(ready.url)}
              className="size-full object-contain"
            />
          </div>
          <figcaption className="px-5 pt-2 text-xs text-[#657080]">AI-generated illustration</figcaption>
        </figure>
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
