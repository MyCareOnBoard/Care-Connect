import { BadgeCheck } from "lucide-react"

type CareConnectLogoProps = {
  compact?: boolean
}

export function CareConnectLogo({ compact = false }: CareConnectLogoProps) {
  return (
    <div className="flex items-center gap-2 sm:gap-1 lg:gap-2">
      <span className="flex size-6 shrink-0 items-center justify-center rounded-xl border-2 border-[#087fff] bg-white text-[#087fff] sm:size-4 lg:size-10">
        <BadgeCheck className="size-4 sm:size-4 lg:size-6" />
      </span>
      {!compact && (
        <span className="text-[15px] font-semibold leading-none text-[#161a22] sm:text-[12px] lg:text-[20px]">
          CareOnboard<span className="text-[#087fff]">Connect</span>
        </span>
      )}
    </div>
  )
}
