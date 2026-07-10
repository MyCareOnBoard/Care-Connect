import * as React from 'react'

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<'input'>) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "flex h-11 w-full min-w-0 rounded-xl border border-(--input-border) bg-(--input-bg) px-4 py-0 text-sm font-normal leading-[1.4] text-(--input-text) placeholder:text-(--input-placeholder) shadow-none transition-colors duration-200 outline-none",
        "focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring/25 focus-visible:ring-offset-0",
        "aria-invalid:border-(--input-error-border) aria-invalid:text-(--input-error-text) aria-invalid:placeholder:text-(--input-error-text) aria-invalid:focus-visible:ring-(--input-error-border)/25",
        "disabled:cursor-not-allowed disabled:opacity-60",
        className
      )}
      {...props}
    />
  )
}

export { Input }
