import { useState } from "react"
import { cn } from "@/lib/utils"

/**
 * A post photo shown at its own shape, never squeezed or zoomed to fill a box.
 *
 * The feed used to force every photo into full width and a fixed maximum height with
 * `object-cover`, so anything taller or wider than that box was cropped and blown up — which
 * reads as stretched. Now:
 *
 *   one photo, landscape — full width at its natural proportions, whole image visible;
 *   one photo, portrait  — centred and tall (up to 70% of the screen), on a softly blurred
 *                          copy of itself, so the sides read as a frame, not as dead space;
 *   several photos       — even square tiles, the one place cropping is expected, centred on
 *                          the middle of each photo.
 */

export function PostImage({
  src,
  tiled = false,
  onTap,
}: {
  src: string
  /** Part of a multi-photo grid: square tile rather than natural shape. */
  tiled?: boolean
  onTap?: () => void
}) {
  const [ratio, setRatio] = useState<number | null>(null)
  const portrait = ratio !== null && ratio < 0.9

  const image = (
    <img
      src={src}
      alt=""
      loading="lazy"
      decoding="async"
      draggable={false}
      onClick={onTap}
      onLoad={(event) => {
        const { naturalWidth, naturalHeight } = event.currentTarget
        if (naturalWidth > 0 && naturalHeight > 0) setRatio(naturalWidth / naturalHeight)
      }}
      className={cn(
        "relative block cursor-pointer select-none",
        tiled
          ? "aspect-square size-full object-cover object-center"
          : portrait
            ? "h-auto max-h-[min(70vh,640px)] w-auto max-w-full object-contain"
            : "h-auto max-h-[min(75vh,640px)] w-full object-contain",
      )}
    />
  )

  if (tiled) {
    return <div className="overflow-hidden rounded-xl bg-[#eef1f3]">{image}</div>
  }

  return (
    <div className="relative flex w-full justify-center overflow-hidden rounded-xl bg-[#eef1f3]">
      {/* The blurred backdrop behind a portrait photo: the same image, soft and dimmed. */}
      {portrait && (
        <div
          className="absolute inset-0 scale-110 bg-cover bg-center opacity-60 blur-2xl"
          style={{ backgroundImage: `url("${src}")` }}
          aria-hidden="true"
        />
      )}
      {image}
    </div>
  )
}
