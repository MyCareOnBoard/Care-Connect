import { useState } from "react"
import { Smile } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"

/**
 * A small emoji picker for the composer and comments.
 *
 * Deliberately short: a hand-picked set that suits a care community — warmth, thanks,
 * celebration, health — rather than a 3,000-emoji library for a text box. Typing emoji on a
 * phone already works through the keyboard; this is mostly for desktop.
 */

const SETS: Array<{ name: string; emojis: string[] }> = [
  { name: "Smiles", emojis: ["😀", "😊", "🥰", "😍", "😂", "🤗", "😇", "🙂", "😉", "😌", "🥹", "😅", "🤔", "😮", "😢", "😴"] },
  { name: "Care", emojis: ["❤️", "💙", "💚", "🧡", "💜", "🤍", "🙏", "🤝", "👏", "💪", "🙌", "👍", "🫶", "💐", "🌸", "🌻"] },
  { name: "Health", emojis: ["🩺", "💊", "🩹", "🏥", "🧑‍⚕️", "👩‍⚕️", "👨‍⚕️", "🧠", "🫀", "🦷", "🍎", "🥗", "💧", "🏃", "🧘", "😷"] },
  { name: "Celebrate", emojis: ["🎉", "🎊", "🥳", "🏆", "🥇", "⭐", "✨", "🔥", "🎂", "🎁", "📜", "🎓", "💼", "🚀", "✅", "💯"] },
]

export function EmojiPicker({
  onPick,
  className,
  label = "Add an emoji",
}: {
  onPick: (emoji: string) => void
  className?: string
  label?: string
}) {
  const [open, setOpen] = useState(false)
  const [set, setSet] = useState(0)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={label}
          className={cn(
            "flex size-8 shrink-0 items-center justify-center rounded-lg text-[#8a6d1f] transition hover:bg-[#fff4df] active:scale-90",
            open && "bg-[#fff4df]",
            className,
          )}
        >
          <Smile className="size-5" aria-hidden="true" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        sideOffset={6}
        className="animate-fadeIn w-72 rounded-2xl border-[#e2e6ea] bg-white p-2 shadow-[0_18px_40px_-16px_rgba(16,20,26,0.4)]"
        // Keep the text box's caret where it was; the pick goes in at that spot.
        onOpenAutoFocus={(event) => event.preventDefault()}
      >
        <div className="mb-2 flex gap-1" role="tablist" aria-label="Emoji sets">
          {SETS.map((item, index) => (
            <button
              key={item.name}
              type="button"
              role="tab"
              aria-selected={set === index}
              onClick={() => setSet(index)}
              className={cn(
                "flex-1 rounded-lg px-2 py-1 text-xs font-semibold transition",
                set === index ? "bg-[#e3f8f8] text-[#00898c]" : "text-[#657080] hover:bg-[#f2f6f8]",
              )}
            >
              {item.name}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-8 gap-0.5" role="tabpanel">
          {SETS[set].emojis.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => onPick(emoji)}
              className="flex size-8 items-center justify-center rounded-lg text-xl transition hover:scale-125 hover:bg-[#f2f6f8] active:scale-95"
              aria-label={`Insert ${emoji}`}
            >
              {emoji}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  )
}
