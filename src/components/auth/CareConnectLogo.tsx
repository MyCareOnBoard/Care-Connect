import { BadgeCheck } from "lucide-react"

type CareConnectLogoProps = {
  compact?: boolean
}

export function CareConnectLogo({ compact = false }: CareConnectLogoProps) {
  return (
    <div className="flex items-center gap-2 sm:gap-1 lg:gap-2">
      <span className="flex size-5 shrink-0 items-center justify-center rounded-xl border-2 border-[#00b4b8] bg-white text-[#00b4b8] sm:size-4 lg:size-8">
        <BadgeCheck className="size-3 sm:size-3 lg:size-5" />
      </span>
      {!compact && (
        <span className="text-[15px] font-semibold leading-none text-[#161a22] sm:text-[12px] lg:text-[20px]">
          CareOnboard<span className="text-[#00b4b8]">Connect</span>
        </span>
      )}
    </div>
  )
}
