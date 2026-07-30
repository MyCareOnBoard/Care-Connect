import { Link } from "react-router"
import { Button } from "@/components/ui/button"

/** "Sell an item" promo — shared by both dashboards and the network page sidebar. */
export function MarketplacePromoCard({ marketplaceHref }: { marketplaceHref: string }) {
  return (
    <section className="group relative overflow-hidden rounded-lg bg-[#e9e1ff] p-2 shadow-[0_8px_24px_rgba(90,78,224,0.15)]">
      <div className="relative overflow-hidden rounded-md border border-[#d5cafa] bg-[linear-gradient(55deg,rgba(92,72,215,0.08)_25%,transparent_25%,transparent_50%,rgba(92,72,215,0.08)_50%,rgba(92,72,215,0.08)_75%,transparent_75%)] bg-size-[36px_36px] px-2 py-3">
        <span className="absolute inset-y-0 w-1/2 pointer-events-none animate-shimmer -left-1/2 bg-linear-to-r from-transparent via-white/40 to-transparent" />
        <h2 className="text-2xl font-bold leading-tight text-[#2a0c4a]">Turn your equipment into opportunity</h2>
        <p className="mt-3 text-sm leading-5 text-[#321c47]">
          Have medical equipment or supplies to sell? List them and connect with the right people
        </p>
        <Button
          asChild
          className="mt-5 h-11 w-full bg-linear-to-r from-[#5a4ee0] to-[#7a6ff0] text-white shadow-[0_4px_14px_rgba(90,78,224,0.35)] transition-transform duration-200 hover:scale-[1.02] active:scale-95"
        >
          <Link to={`${marketplaceHref}?add=1`}>Sell an Item</Link>
        </Button>
      </div>
    </section>
  )
}
