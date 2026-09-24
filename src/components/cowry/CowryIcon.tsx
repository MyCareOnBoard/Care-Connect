import { useId } from "react"
import { cn } from "@/lib/utils"
import { formatCowries } from "@/utils/careconnect/cowry"

/**
 * A cowry shell, drawn rather than borrowed.
 *
 * Shown from underneath — the glossy dome, the long toothed slit — because that is the side
 * people recognise from the shells that were once money across West Africa. A generic coin
 * would say "points"; this says what the currency is named after.
 *
 * Gradient ids come from useId, so any number of shells can share a page without one
 * borrowing another's fill.
 */

interface CowryIconProps {
  /** Rendered width in pixels. Height follows the shell's proportions. */
  size?: number
  className?: string
  /** Decorative by default. Pass a title when the shell carries meaning on its own. */
  title?: string
}

/** The slit wanders slightly, as a real one does. Teeth sit either side of it. */
function slitX(y: number) {
  return 32 + 2.6 * Math.sin((Math.PI * (y - 12)) / 42)
}

const TEETH_Y = [17, 21.5, 26, 30.5, 35, 39.5, 44, 48.5]

export function CowryIcon({ size = 20, className, title }: CowryIconProps) {
  const id = useId().replace(/:/g, "")
  const body = `cowry-body-${id}`
  const lip = `cowry-lip-${id}`
  const decorative = !title

  return (
    <svg
      viewBox="0 0 64 64"
      width={size}
      height={size}
      className={cn("inline-block shrink-0", className)}
      role={decorative ? undefined : "img"}
      aria-hidden={decorative ? true : undefined}
      focusable="false"
    >
      {title && <title>{title}</title>}
      <defs>
        <radialGradient id={body} cx="38%" cy="30%" r="75%">
          <stop offset="0%" stopColor="#fffdf6" />
          <stop offset="45%" stopColor="#f6e7c4" />
          <stop offset="80%" stopColor="#dcb87a" />
          <stop offset="100%" stopColor="#b98a4a" />
        </radialGradient>
        <linearGradient id={lip} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#f3dfb3" stopOpacity="0" />
          <stop offset="50%" stopColor="#fff8e8" stopOpacity="0.95" />
          <stop offset="100%" stopColor="#f3dfb3" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Soft ground shadow, so the shell sits on the page rather than floating on it. */}
      <ellipse cx="33" cy="60" rx="17" ry="2.6" fill="#10141a" opacity="0.12" />

      {/* The dome. */}
      <path
        d="M32 4C46.5 4 55.5 17.5 55.5 33.5C55.5 49.5 45.5 58.5 32 58.5C18.5 58.5 8.5 49.5 8.5 33.5C8.5 17.5 17.5 4 32 4Z"
        fill={`url(#${body})`}
        stroke="#a87a3e"
        strokeWidth="1.4"
      />

      {/* The flattened base the aperture runs through. */}
      <ellipse cx="32" cy="32" rx="12.5" ry="23" fill={`url(#${lip})`} />

      {/* Teeth, left then right of the slit. */}
      <g stroke="#8a5a26" strokeWidth="1.6" strokeLinecap="round">
        {TEETH_Y.map((y) => {
          const x = slitX(y)
          return (
            <g key={y}>
              <line x1={x - 1.6} y1={y} x2={x - 6} y2={y - 0.8} />
              <line x1={x + 1.6} y1={y} x2={x + 6} y2={y - 0.8} />
            </g>
          )
        })}
      </g>

      {/* The slit itself. */}
      <path
        d={`M${slitX(11)} 11 C ${slitX(22) + 1.5} 22, ${slitX(42) + 1.5} 42, ${slitX(53)} 53`}
        fill="none"
        stroke="#4a2e12"
        strokeWidth="2.8"
        strokeLinecap="round"
      />

      {/* Gloss. Cowries are shiny; without this they read as stones. */}
      <ellipse
        cx="21"
        cy="19"
        rx="4.2"
        ry="8.5"
        transform="rotate(-24 21 19)"
        fill="#ffffff"
        opacity="0.7"
      />
      <ellipse cx="45" cy="44" rx="1.8" ry="3.4" transform="rotate(-24 45 44)" fill="#ffffff" opacity="0.35" />
    </svg>
  )
}

interface CowryAmountProps {
  amount: number | null | undefined
  /** Icon size in pixels. */
  size?: number
  className?: string
  /** Prefix such as "+" or "−". */
  sign?: string
}

/** A figure with its shell beside it — the way Cowries are shown everywhere a number is. */
export function CowryAmount({ amount, size = 16, className, sign = "" }: CowryAmountProps) {
  return (
    <span className={cn("inline-flex items-center gap-1 tabular-nums", className)}>
      <CowryIcon size={size} />
      {sign}
      {formatCowries(amount)}
    </span>
  )
}
