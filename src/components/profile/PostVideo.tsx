import { useState } from "react"
import { cn } from "@/lib/utils"

/**
 * A post video that keeps its own shape.
 *
 * Every video used to play in the same wide, 384px-tall black box: fine for landscape, but a
 * phone-shot portrait video came out as a thin strip between two black slabs. The player now
 * reads the real dimensions once they load and sizes itself to match:
 *
 *   landscape — full width, at its own ratio;
 *   portrait  — centred, tall (up to 70% of the screen), on a soft backdrop so the empty
 *               space either side reads as a frame rather than as missing video;
 *   square    — treated like landscape, capped so it never towers over the post.
 *
 * Until the size is known it holds a 16:9 space, so the post does not jump when it arrives.
 */

type Shape = "landscape" | "portrait" | "square"

export function PostVideo({ src, compact = false }: { src: string; compact?: boolean }) {
  const [ratio, setRatio] = useState<number | null>(null)

  const shape: Shape | null =
    ratio === null ? null : ratio < 0.9 ? "portrait" : ratio > 1.1 ? "landscape" : "square"

  return (
    <div
      className={cn(
        "relative flex w-full justify-center overflow-hidden rounded-xl bg-black",
        // Portrait sits on a blurred-looking gradient backdrop rather than flat black bars.
        shape === "portrait" && "bg-[radial-gradient(circle_at_50%_40%,#2a3442,#0d1117_70%)]",
      )}
    >
      <video
        src={src}
        controls
        playsInline
        preload="metadata"
        onLoadedMetadata={(event) => {
          const { videoWidth, videoHeight } = event.currentTarget
          if (videoWidth > 0 && videoHeight > 0) setRatio(videoWidth / videoHeight)
        }}
        style={ratio ? { aspectRatio: String(ratio) } : { aspectRatio: "16 / 9" }}
        className={cn(
          "block bg-black object-contain transition-[max-height] duration-300",
          shape === "portrait"
            ? // Height leads for portrait: tall, and only as wide as that height allows.
              cn("h-auto w-auto", compact ? "max-h-[420px]" : "max-h-[min(70vh,640px)]", "max-w-full")
            : cn("h-auto w-full", compact ? "max-h-72" : "max-h-[min(70vh,560px)]"),
        )}
      />
    </div>
  )
}
