import { Moon, Sun } from "lucide-react"
import { cn } from "@/lib/utils"
import { toggleTheme, useTheme } from "@/lib/theme"

/**
 * The light/dark switch in the header.
 *
 * The sun and moon share one spot: the outgoing one spins away and shrinks while the
 * incoming one spins in, so the button itself shows the change happening.
 */
export function ThemeToggle({ className }: { className?: string }) {
  const theme = useTheme()
  const dark = theme === "dark"
  const label = dark ? "Switch to light mode" : "Switch to dark mode"

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={label}
      aria-pressed={dark}
      title={label}
      className={cn(
        "group relative flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full border-[3px] border-[#e8edef] bg-white text-[#151922] transition hover:border-[#00b4b8]/40 active:scale-90",
        className,
      )}
    >
      <Sun
        className={cn(
          "absolute size-[18px] text-[#e0a93a] transition-all duration-500 ease-out",
          dark ? "rotate-90 scale-0 opacity-0" : "rotate-0 scale-100 opacity-100 group-hover:rotate-45",
        )}
        aria-hidden="true"
      />
      <Moon
        className={cn(
          "absolute size-[18px] fill-current text-[#a782d8] transition-all duration-500 ease-out",
          dark ? "rotate-0 scale-100 opacity-100 group-hover:-rotate-12" : "-rotate-90 scale-0 opacity-0",
        )}
        aria-hidden="true"
      />
    </button>
  )
}

/** The same switch as a row in a menu, for places the header has no room for the button. */
export function ThemeMenuRow() {
  const theme = useTheme()
  const dark = theme === "dark"
  return (
    <span className="flex w-full items-center justify-between gap-2">
      <span className="flex items-center gap-2">
        {dark ? (
          <Moon className="size-4 fill-current text-[#a782d8]" aria-hidden="true" />
        ) : (
          <Sun className="size-4 text-[#e0a93a]" aria-hidden="true" />
        )}
        Dark mode
      </span>
      {/* A small switch, so the row reads as a setting rather than a link. */}
      <span
        className={cn(
          "relative h-5 w-9 rounded-full transition-colors duration-300",
          dark ? "bg-[#00b4b8]" : "bg-[#d7dde3]",
        )}
        aria-hidden="true"
      >
        <span
          className={cn(
            "absolute top-0.5 size-4 rounded-full shadow transition-transform duration-300",
            dark ? "translate-x-[18px]" : "translate-x-0.5",
          )}
          // Inline, so the dark theme's remapping of white surfaces leaves the knob white.
          style={{ backgroundColor: "#ffffff" }}
        />
      </span>
    </span>
  )
}
