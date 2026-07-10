import { BadgeCheck } from "lucide-react"

type CareConnectLogoProps = {
  compact?: boolean
}

export function CareConnectLogo({ compact = false }: CareConnectLogoProps) {
  return (
    <div className="flex items-center gap-2">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-xl border-2 border-[#087fff] bg-white text-[#087fff] sm:size-10 lg:size-11">
        <BadgeCheck className="size-5 sm:size-6" />
      </span>
      {!compact && (
        <span className="text-[22px] font-semibold leading-none text-[#161a22] sm:text-[26px] lg:text-[32px]">
          Care<span className="text-[#087fff]">Connect</span>
        </span>
      )}
    </div>
  )
}
