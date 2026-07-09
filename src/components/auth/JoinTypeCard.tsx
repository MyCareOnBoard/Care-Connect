import { cn } from "@/lib/utils"

type JoinTypeCardProps = {
  title: string
  description: string
  selected: boolean
  onClick: () => void
}

export function JoinTypeCard({ title, description, selected, onClick }: JoinTypeCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
         "relative w-full overflow-hidden rounded-2xl cursor-pointer border border-[#D9D9D9] bg-white px-6 py-5 text-left transition-all duration-200",
  "before:content-[''] before:absolute before:inset-y-0 before:left-0 before:w-2 before:rounded-l-2xl before:bg-[#e8e8e8] before:transition-colors",
  "hover:border-[#087FFF] hover:before:bg-[#087FFF]",
  selected && "border-[#087FFF] before:bg-[#087FFF]"
      )}
    >
      <h3 className="text-lg font-semibold leading-none">{title}</h3>
      <p className="mt-4 text-sm leading-tight text-[#20242c]">{description}</p>
    </button>
  )
}
