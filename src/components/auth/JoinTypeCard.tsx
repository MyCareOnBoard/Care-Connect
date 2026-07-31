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
  "hover:-translate-y-0.5 hover:border-[#00b4b8] hover:shadow-[0_8px_20px_rgba(0,180,184,0.12)] hover:before:bg-[#00b4b8]",
  selected && "border-[#00b4b8] shadow-[0_8px_20px_rgba(0,180,184,0.12)] before:bg-[#00b4b8]"
      )}
    >
      <h3 className="text-lg font-semibold leading-none">{title}</h3>
      <p className="mt-4 text-sm leading-tight text-[#20242c]">{description}</p>
    </button>
  )
}
