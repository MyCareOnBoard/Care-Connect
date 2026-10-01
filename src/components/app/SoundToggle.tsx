import { Volume2, VolumeX } from "lucide-react"
import { cn } from "@/lib/utils"
import { useSoundEnabled } from "@/lib/sound"

/** The Sounds on/off row for the account menu, drawn like the Dark mode row beside it. */
export function SoundMenuRow() {
  const on = useSoundEnabled()
  return (
    <span className="flex w-full items-center justify-between gap-2">
      <span className="flex items-center gap-2">
        {on ? (
          <Volume2 className="size-4 text-[#00b4b8]" aria-hidden="true" />
        ) : (
          <VolumeX className="size-4 text-[#8a94a3]" aria-hidden="true" />
        )}
        Sounds
      </span>
      <span
        className={cn("relative h-5 w-9 rounded-full transition-colors duration-300", on ? "bg-[#00b4b8]" : "bg-[#d7dde3]")}
        aria-hidden="true"
      >
        <span
          className={cn("absolute top-0.5 size-4 rounded-full shadow transition-transform duration-300", on ? "translate-x-[18px]" : "translate-x-0.5")}
          // Inline, so the dark theme's remapping of white surfaces leaves the knob white.
          style={{ backgroundColor: "#ffffff" }}
        />
      </span>
    </span>
  )
}
