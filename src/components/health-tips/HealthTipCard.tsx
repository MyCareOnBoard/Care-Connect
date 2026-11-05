import { useState, type CSSProperties } from "react"
import { Lightbulb, PartyPopper, Stethoscope } from "lucide-react"
import type { HealthTip } from "@/utils/careconnect/services/healthTipsService"
import { TipActions } from "./TipActions"
import { useTipImage } from "./useTipImage"

/** Confetti for finishing every step: a ring of dots flung out from the popper. */
const BURST_COLORS = ["#00b4b8", "#7fd9db", "#f5a524", "#f17a6c", "#7c8cf5"]
function Burst() {
  return (
    <span className="pointer-events-none absolute left-2 top-1/2" aria-hidden="true">
      {Array.from({ length: 10 }, (_, i) => (
        <span
          key={i}
          className="ht-burst absolute size-1.5 rounded-full"
          style={
            {
              "--ht-angle": `${i * 36}deg`,
              "--ht-distance": `${22 + (i % 3) * 8}px`,
              backgroundColor: BURST_COLORS[i % BURST_COLORS.length],
            } as CSSProperties
          }
        />
      ))}
    </span>
  )
}

/**
 * The one tip shown for a search.
 *
 * Text first: the picture is a bonus, so a tip with no image, or whose image fails to load
 * or never arrives, reads exactly the same minus the picture. The image sits in a fixed 16:9
 * square frame (the pictures are square, and are shown whole, never cropped) so the page
 * does not jump while it loads, and it is loaded lazily. While a picture is
 * still being drawn the frame holds a quiet placeholder; the picture is always labelled as
 * AI-generated, because it is an illustration, not a photograph of anything real.
 *
 * Steps can be ticked off as the person tries them. That is on-screen only — nothing is
 * saved or sent — and a new tip starts fresh because the page keys the card by tip. Step
 * numbers (and the tick) come from a CSS counter rather than the markup, so each list
 * item's text is the step and nothing else.
 */
export function HealthTipCard({ tip }: { tip: HealthTip }) {
  const picture = useTipImage(tip.image)
  // Remembered with the URL it failed for, so a new picture is never hidden by an old failure.
  const [failedUrl, setFailedUrl] = useState<string | null>(null)
  const ready = picture.phase === "ready" && picture.url !== failedUrl ? picture : null

  const steps = tip.steps ?? []
  const [done, setDone] = useState<boolean[]>(() => steps.map(() => false))
  const doneCount = done.filter(Boolean).length
  const allDone = steps.length > 0 && doneCount === steps.length

  function toggleStep(index: number) {
    setDone((current) => current.map((value, i) => (i === index ? !value : value)))
  }

  return (
    <article className="ht-rise ht-sheen ht-lift overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-[#e2e6ea]">
      {picture.phase === "loading" && (
        <div className="bg-[#f6f8f9] p-4">
          <div
            role="status"
            aria-label="Drawing an illustration"
            className="skeleton-shimmer relative mx-auto aspect-square w-full max-w-lg overflow-hidden rounded-xl bg-[#eef1f3]"
          />
        </div>
      )}

      {ready && (
        <figure className="m-0 bg-[#f6f8f9] p-4 pb-3">
          <div className="ht-rise mx-auto aspect-square w-full max-w-lg overflow-hidden rounded-xl bg-[#eef1f3]">
            <img
              src={ready.url}
              alt={ready.alt}
              loading="lazy"
              decoding="async"
              onError={() => setFailedUrl(ready.url)}
              className="size-full object-contain"
            />
          </div>
          <figcaption className="mx-auto mt-2 max-w-lg text-[11px] text-[#8a94a3]">
            AI-generated illustration
          </figcaption>
        </figure>
      )}

      <div className="p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <span
            className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[#e3f8f8] text-[#00898c]"
            aria-hidden="true"
          >
            <Lightbulb className="size-4.5" />
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="text-lg font-bold leading-snug text-[#141922]">{tip.title}</h3>
            <p className="mt-1.5 text-sm leading-6 text-[#4a5260]">{tip.summary}</p>
          </div>
        </div>

        {steps.length > 0 && (
          <div className="mt-5 border-t border-[#eef1f3] pt-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-[#8a94a3]">
                How to do it
              </p>
              <p className="text-xs font-medium text-[#657080]" aria-live="polite">
                {/* Keyed so the number pops each time it changes. */}
                <span key={doneCount} className="ht-pop inline-block tabular-nums">
                  {doneCount}
                </span>{" "}
                of {steps.length} done
              </p>
            </div>
            <div
              className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#eef1f3]"
              aria-hidden="true"
            >
              <div
                className="ht-progress h-full rounded-full bg-[#00b4b8]"
                style={{ width: `${(doneCount / steps.length) * 100}%` }}
              />
            </div>
            <p className="mt-2 text-[11px] text-[#8a94a3]">Tap a step to tick it off as you try it.</p>

            <ol className="mt-3 space-y-1.5 [counter-reset:step]">
              {steps.map((step, index) => (
                <li
                  key={index}
                  className="ht-rise [counter-increment:step]"
                  style={{ "--ht-delay": `${120 + index * 70}ms` } as CSSProperties}
                >
                  <button
                    type="button"
                    aria-pressed={done[index] ?? false}
                    onClick={() => toggleStep(index)}
                    className={`relative w-full rounded-xl py-2 pl-11 pr-3 text-left text-sm leading-6 text-[#4a5260] transition hover:bg-[#f3fbfb] focus-visible:outline-2 focus-visible:outline-[#00b4b8] before:absolute before:left-2.5 before:top-2 before:flex before:size-6 before:items-center before:justify-center before:rounded-full before:bg-[#e3f8f8] before:text-xs before:font-semibold before:text-[#00898c] before:transition-colors before:content-[counter(step)] aria-pressed:text-[#8a94a3] aria-pressed:line-through aria-pressed:decoration-[#b8c0ca] aria-pressed:before:bg-[#00b4b8] aria-pressed:before:text-white aria-pressed:before:content-['✓'] ${done[index] ? "ht-pop-badge" : ""}`}
                  >
                    {step}
                  </button>
                </li>
              ))}
            </ol>

            {allDone && (
              <p className="ht-rise relative mt-3 flex items-center gap-2 rounded-xl bg-[#e3f8f8] px-3.5 py-2.5 text-sm font-semibold text-[#00898c]">
                <Burst />
                <PartyPopper className="ht-pop size-4 shrink-0" aria-hidden="true" />
                All done — nice work looking after yourself.
              </p>
            )}
          </div>
        )}

        {tip.whenToSeeAProfessional && (
          <div className="mt-5 flex gap-2.5 rounded-xl bg-[#fff6ec] px-3.5 py-3 text-[#8a5a2b] ring-1 ring-[#f0c9a4]">
            <Stethoscope className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <p className="text-xs font-medium leading-5">
              See a professional if: {tip.whenToSeeAProfessional}
            </p>
          </div>
        )}

        <div className="mt-5 border-t border-[#eef1f3] pt-4">
          <TipActions tip={tip} />
        </div>
      </div>
    </article>
  )
}
