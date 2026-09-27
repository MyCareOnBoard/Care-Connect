import { useSyncExternalStore } from "react"

/**
 * Light or dark.
 *
 * The choice lives as a `dark` class on <html>, which is what the generated dark stylesheet
 * and Tailwind's `dark:` variant both key off. It is remembered per browser. Until someone
 * picks, the OS setting decides — and index.html applies it before the first paint, so a
 * dark-mode user never sees a white flash on load.
 */

export type Theme = "light" | "dark"

/** Must match the key read by the inline script in index.html. */
export const THEME_STORAGE_KEY = "careconnect-theme"

/** How long the colour cross-fade runs. Matches .theme-switching in index.css. */
const SWITCH_MS = 400

const listeners = new Set<() => void>()

function read(): Theme {
  if (typeof document === "undefined") return "light"
  return document.documentElement.classList.contains("dark") ? "dark" : "light"
}

export function setTheme(theme: Theme): void {
  const root = document.documentElement
  if (read() === theme) return

  // Fade colours across rather than snapping — only for this switch, not every hover.
  const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
  if (!reduced) {
    root.classList.add("theme-switching")
    window.setTimeout(() => root.classList.remove("theme-switching"), SWITCH_MS)
  }

  root.classList.toggle("dark", theme === "dark")
  root.style.colorScheme = theme
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme)
  } catch {
    // Private mode or blocked storage: the switch still works for this visit.
  }
  listeners.forEach((listener) => listener())
}

export function toggleTheme(): void {
  setTheme(read() === "dark" ? "light" : "dark")
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  // Another tab changed it: follow along.
  const onStorage = (event: StorageEvent) => {
    if (event.key === THEME_STORAGE_KEY && (event.newValue === "dark" || event.newValue === "light")) {
      document.documentElement.classList.toggle("dark", event.newValue === "dark")
      document.documentElement.style.colorScheme = event.newValue
      listener()
    }
  }
  window.addEventListener("storage", onStorage)
  return () => {
    listeners.delete(listener)
    window.removeEventListener("storage", onStorage)
  }
}

/** The current theme, re-rendering whenever any toggle changes it. */
export function useTheme(): Theme {
  return useSyncExternalStore(subscribe, read, () => "light")
}
