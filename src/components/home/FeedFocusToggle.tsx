import { useEffect } from "react"
import { Maximize2, Minimize2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { setFeedFocus, toggleFeedFocus, type FeedFocus } from "@/components/home/feedFocus"

/** True when the key press belongs to something the user is typing into. */
function typingInto(target: EventTarget | null) {
  const el = target as HTMLElement | null
  if (!el) return false
  return el.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName)
}

/**
 * The focus-mode switch.
 *
 * Floats at the top-right of the feed and stays pinned under the header while scrolling, so
 * it can be reached from anywhere in a long feed. Takes no layout space — it hangs from a
 * zero-height sticky rail — so turning it on and off never nudges the posts.
 *
 * Keyboard: F toggles, Esc leaves focus mode.
 */
export function FeedFocusToggle({ focus }: { focus: FeedFocus }) {
  const { active, available } = focus

  useEffect(() => {
    if (!available) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey) return
      if (typingInto(event.target)) return
      // A dialog or menu owns Esc while it is open.
      if (document.querySelector('[role="dialog"], [role="menu"]')) return
      if (event.key === "f" || event.key === "F") {
        event.preventDefault()
        toggleFeedFocus()
      } else if (event.key === "Escape" && active) {
        setFeedFocus(false)
      }
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [available, active])

  if (!available) return null

  const label = active ? "Exit focus mode" : "Focus on posts"

  return (
    <div className="sticky top-22 z-10 h-0">
      <button
        type="button"
        onClick={toggleFeedFocus}
        aria-pressed={active}
        title={`${label} (F)`}
        className={cn(
          "group absolute -top-1 right-0 flex h-9 items-center gap-1.5 rounded-full border px-3.5 text-xs font-semibold shadow-[0_6px_20px_-8px_rgba(16,20,26,0.35)] backdrop-blur-md transition-all duration-200 active:scale-95",
          active
            ? "border-[#00b4b8] bg-[#00b4b8] text-white hover:bg-[#00a3a7]"
            : "border-white/70 bg-white/85 text-[#151922] hover:border-[#00b4b8]/40 hover:text-[#00898c]",
        )}
      >
        <span className="relative size-4">
          <Maximize2
            className={cn(
              "absolute inset-0 size-4 transition-all duration-300",
              active ? "scale-50 opacity-0" : "scale-100 opacity-100 group-hover:scale-110",
            )}
            aria-hidden="true"
          />
          <Minimize2
            className={cn(
              "absolute inset-0 size-4 transition-all duration-300",
              active ? "scale-100 opacity-100 group-hover:scale-90" : "scale-50 opacity-0",
            )}
            aria-hidden="true"
          />
        </span>
        {active ? "Exit focus" : "Focus"}
        <kbd
          className={cn(
            "ml-0.5 rounded px-1 font-sans text-[10px] font-bold",
            active ? "bg-white/20 text-white" : "bg-[#eef1f3] text-[#657080]",
          )}
          aria-hidden="true"
        >
          F
        </kbd>
      </button>
    </div>
  )
}
