import * as React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { DayPicker, type DayPickerProps } from "react-day-picker"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: DayPickerProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-3", className)}
      classNames={{
        months: "flex flex-col sm:flex-row gap-2",
        month: "flex flex-col gap-4",
        month_caption: "flex justify-center pt-1 relative items-center w-full",
        caption_label: "text-sm font-semibold text-[#151922]",
        dropdowns: "flex items-center gap-1.5",
        dropdown_root: "relative",
        dropdown: "absolute inset-0 z-10 cursor-pointer opacity-0",
        nav: "flex items-center justify-between absolute inset-x-0 top-0",
        button_previous:
          "flex size-7 items-center justify-center rounded-full text-[#151922] transition hover:bg-[#f2f6f8] disabled:opacity-40",
        button_next:
          "flex size-7 items-center justify-center rounded-full text-[#151922] transition hover:bg-[#f2f6f8] disabled:opacity-40",
        month_grid: "w-full border-collapse space-x-1",
        weekdays: "flex",
        weekday: "text-muted-foreground rounded-md w-8 font-normal text-[0.8rem]",
        week: "flex w-full mt-2",
        day: "relative p-0 text-center text-sm focus-within:relative focus-within:z-20",
        day_button: cn(
          buttonVariants({ variant: "ghost" }),
          "size-8 p-0 font-normal aria-selected:opacity-100"
        ),
        range_start: "day-range-start",
        range_end: "day-range-end",
        selected:
          "rounded-full border-2 border-[#151922] font-semibold text-[#151922] hover:bg-transparent focus:bg-transparent",
        today: "font-semibold",
        outside:
          "day-outside text-muted-foreground opacity-50 aria-selected:opacity-30",
        disabled: "text-muted-foreground opacity-50",
        hidden: "invisible",
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation, ...rest }) =>
          orientation === "left" ? (
            <ChevronLeft className="size-4" {...rest} />
          ) : (
            <ChevronRight className="size-4" {...rest} />
          ),
      }}
      {...props}
    />
  )
}

export { Calendar }
