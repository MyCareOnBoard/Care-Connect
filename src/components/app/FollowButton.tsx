import { useState } from "react"
import { Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export function FollowButton({ label, activeLabel }: { label: string; activeLabel: string }) {
  const [active, setActive] = useState(false)

  return (
    <Button
      type="button"
      variant="outline"
      onClick={() => setActive((current) => !current)}
      className={cn(
        "h-10 rounded-full px-5 transition-all duration-200 hover:scale-105 active:scale-95",
        active
          ? "border-[#10ad58] bg-[#eafaf1] text-[#10ad58] hover:bg-[#eafaf1]"
          : "border-[#087fff] text-[#087fff]"
      )}
    >
      {active && <Check key={active ? "on" : "off"} className="size-4 animate-check-pop" />}
      {active ? activeLabel : label}
    </Button>
  )
}
