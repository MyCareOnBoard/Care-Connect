import { useState, type ChangeEvent, type ComponentProps } from "react"
import { Eye, EyeOff } from "lucide-react"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

type PasswordFieldProps = ComponentProps<typeof Input> & {
  value: string
  onChange: (event: ChangeEvent<HTMLInputElement>) => void
}

export function PasswordField({ className, value, onChange, ...props }: PasswordFieldProps) {
  const [showPassword, setShowPassword] = useState(false)

  return (
    <div className="relative">
      <Input
        {...props}
        type={showPassword ? "text" : "password"}
        value={value}
        onChange={onChange}
        className={cn("pr-12", className)}
      />
      <button
        type="button"
        onClick={() => setShowPassword((current) => !current)}
        className="absolute inset-y-0 right-3 flex items-center text-[#6b7280] transition hover:text-[#087fff]"
        aria-label={showPassword ? "Hide password" : "Show password"}
      >
        {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </button>
    </div>
  )
}
