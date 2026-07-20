import { useEffect, useState } from "react"
import { Check } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { getAuthErrorMessage } from "@/utils/auth"
import { follow, unfollow, type ConnectionRelation } from "@/utils/careconnect/services/connectionsService"

/**
 * Follow/connect/subscribe toggle. When `targetId` is provided the toggle is
 * persisted via the connections service (optimistic, reverts on failure) and
 * seeds from `initialActive`. Without a `targetId` it falls back to a local-only
 * toggle (for surfaces not yet wired to a real target).
 */
export function FollowButton({
  label,
  activeLabel,
  targetId,
  relation = "connect",
  targetType,
  initialActive = false,
}: {
  label: string
  activeLabel: string
  targetId?: string
  relation?: ConnectionRelation
  targetType?: "individual" | "company"
  initialActive?: boolean
}) {
  const [active, setActive] = useState(initialActive)
  const [busy, setBusy] = useState(false)

  // Re-sync when the seed changes (e.g. data arrives after mount or a parent refetch).
  useEffect(() => {
    setActive(initialActive)
  }, [initialActive])

  const handleClick = async () => {
    if (!targetId) {
      setActive((current) => !current)
      return
    }
    const next = !active
    setActive(next)
    setBusy(true)
    try {
      if (next) await follow(targetId, relation, targetType)
      else await unfollow(targetId)
    } catch (error) {
      setActive(!next) // revert
      toast.error(getAuthErrorMessage(error))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      disabled={busy}
      onClick={handleClick}
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
