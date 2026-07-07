import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center justify-center rounded-[60px] border px-[10px] py-[8px] text-[12px] font-semibold leading-[14px] tracking-tight whitespace-nowrap"
)

const badgeStyles: Record<string, string> = {
  success: "bg-success/10 border-success text-success",
  warning: "border-destructive bg-destructive/10 text-destructive",
  error: "border-destructive bg-destructive/10 text-destructive",
  info: "border-info bg-info/10 text-info",
  pending: "border-grey-200 bg-muted text-grey-800",
  outline: "border-grey-200 bg-white/60 text-foreground",
}

type BadgeProps = React.ComponentProps<"span"> & {
  variant?: keyof typeof badgeStyles
  asChild?: boolean
}

function Badge({ className, variant = "pending", asChild, ...props }: BadgeProps) {
  const Comp = asChild ? Slot : "span"

  return (
    <Comp
      data-slot="badge"
      className={cn(badgeVariants(), badgeStyles[variant], className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
