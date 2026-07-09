import { BadgeCheck } from "lucide-react"

type CareConnectLogoProps = {
  compact?: boolean
}

export function CareConnectLogo({ compact = false }: CareConnectLogoProps) {
  return (
    <div className="flex items-center gap-2">
      <span className="flex size-11 items-center justify-center rounded-xl border-2 border-[#087fff] bg-white text-[#087fff]">
        <BadgeCheck className="size-6" />
      </span>
      {!compact && (
        <span className="text-[32px] font-semibold leading-none text-[#161a22]">
          Care<span className="text-[#087fff]">Connect</span>
        </span>
      )}
    </div>
  )
}
