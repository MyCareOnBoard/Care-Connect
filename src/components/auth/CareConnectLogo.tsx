import { BadgeCheck } from "lucide-react"

type CareConnectLogoProps = {
  compact?: boolean
}

export function CareConnectLogo({ compact = false }: CareConnectLogoProps) {
  return (
    <div className="flex items-center gap-2">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-xl border-2 border-[#087fff] bg-white text-[#087fff] sm:size-8 lg:size-10">
        <BadgeCheck className="size-5 sm:size-6" />
      </span>
      {!compact && (
        <span className="text-[20px] font-semibold leading-none text-[#161a22] sm:text-[24px] lg:text-[28px]">
          CareOnboard<span className="text-[#087fff]">Connect</span>
        </span>
      )}
    </div>
  )
}
