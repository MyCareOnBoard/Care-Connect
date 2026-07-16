import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Up to two uppercase initials from a full name, e.g. "Jane Doe" -> "JD". Falls back to "?". */
export function getInitials(fullName?: string | null): string {
  const parts = (fullName ?? "").trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return "?"
  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("")
}
