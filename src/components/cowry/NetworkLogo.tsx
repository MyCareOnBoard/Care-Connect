import type { CSSProperties } from "react"
import airteltigoLogo from "@/assets/imgs/networks/airteltigo.webp"
import etisalatLogo from "@/assets/imgs/networks/etisalat.webp"
import gloLogo from "@/assets/imgs/networks/glo.webp"
import { cn } from "@/lib/utils"

/**
 * A mobile network's logo, in a small rounded tile, for anywhere a network is picked —
 * data top-ups and mobile money payouts.
 *
 * Networks are matched by key or name, so "glo", "Glo" and "glo_ng" all find the Glo logo
 * and a payout network the backend names "AirtelTigo" finds its logo too. A network
 * without a logo here falls back to a badge in its colour with its initials.
 */
type Logo = { src: string; alt: string; background: string; style?: CSSProperties }

const LOGOS: { match: RegExp; logo: Logo }[] = [
  // Each artwork is framed differently — Glo's ball sits above its slogan, Etisalat's mark
  // fills a dark tile — so each gets its own crop to fill the badge the same way.
  {
    match: /tigo|airtel/i,
    logo: { src: airteltigoLogo, alt: "AirtelTigo", background: "#ffffff", style: { objectFit: "contain", padding: "2px" } },
  },
  {
    match: /glo/i,
    logo: {
      src: gloLogo,
      alt: "Glo",
      background: "#ffffff",
      style: { objectFit: "cover", objectPosition: "50% 30%", transform: "scale(1.9)" },
    },
  },
  {
    match: /etisalat|9mobile/i,
    logo: { src: etisalatLogo, alt: "Etisalat", background: "#3a3a3a", style: { objectFit: "cover", objectPosition: "50% 35%" } },
  },
]

/** Colour and initials for networks without a logo here. */
const FALLBACK: { match: RegExp; text: string; background: string; ink: string }[] = [
  { match: /mtn/i, text: "MTN", background: "#ffcc00", ink: "#1a1a1a" },
  { match: /telecel|vodafone/i, text: "T", background: "#e60000", ink: "#ffffff" },
]

export function NetworkLogo({
  network,
  label,
  size = 28,
  className,
}: {
  /** The network's key or name. */
  network: string
  /** Its display name, for the initials fallback. */
  label?: string
  size?: number
  className?: string
}) {
  const box: CSSProperties = { width: size, height: size }
  const logo = LOGOS.find((item) => item.match.test(network) || (label ? item.match.test(label) : false))?.logo

  if (logo) {
    return (
      <span
        className={cn("inline-flex shrink-0 overflow-hidden rounded-full shadow-sm ring-1 ring-black/5", className)}
        style={{ ...box, background: logo.background }}
      >
        <img src={logo.src} alt="" aria-hidden="true" className="size-full" style={logo.style} draggable={false} />
      </span>
    )
  }

  const fallback = FALLBACK.find((item) => item.match.test(network) || (label ? item.match.test(label) : false))
  const text = fallback?.text ?? (label || network).slice(0, 1).toUpperCase()
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full text-[10px] font-extrabold tracking-tight shadow-sm",
        className,
      )}
      style={{ ...box, background: fallback?.background ?? "#9aa4b2", color: fallback?.ink ?? "#ffffff" }}
      aria-hidden="true"
    >
      {text}
    </span>
  )
}
