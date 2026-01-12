"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker } from "react-day-picker";

import { cn } from "@/lib/utils";
import { buttonVariants } from "./button";

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: React.ComponentProps<typeof DayPicker>) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-4 bg-white rounded-xl", className)}
      classNames={{
        // Months container: always horizontal (side-by-side) for two-month display
        // Explicitly set flex-row to ensure months render horizontally
        months: "flex flex-row gap-4",
        month: "flex flex-col gap-4",
        caption: "flex justify-center pt-1 relative items-center w-full mb-2",
        caption_label: "text-sm font-semibold text-gray-900",
        nav: "flex items-center gap-1",
        nav_button: cn(
          buttonVariants({ variant: "outline" }),
          "size-8 bg-white border border-gray-200 p-0 opacity-70 hover:opacity-100 hover:bg-gray-50 hover:border-gray-300",
        ),
        nav_button_previous: "absolute left-1",
        nav_button_next: "absolute right-1",
        table: "w-full border-collapse",
        head_row: "flex w-full",
        head_cell:
          "text-gray-600 rounded-md w-10 h-10 font-medium text-xs flex items-center justify-center",
        row: "flex w-full mt-1",
        // Cell styling: no padding/margins to prevent gaps, ensure tight packing
        cell: "relative p-0 m-0 text-center text-sm focus-within:relative focus-within:z-20 w-10 h-10 flex items-center justify-center",
        // Base day class: fill cell completely, no rounding by default
        day: cn(
          buttonVariants({ variant: "ghost" }),
          "h-full w-full p-0 m-0 font-normal text-gray-900 hover:bg-gray-100 hover:text-gray-900 aria-selected:opacity-100 rounded-none",
        ),
        // Range start: rounded left edge only, full background
        day_range_start:
          "aria-selected:bg-[#FE4C40] aria-selected:text-white rounded-l-full",
        // Range end: rounded right edge only, full background
        day_range_end:
          "aria-selected:bg-[#FE4C40] aria-selected:text-white rounded-r-full",
        // Single selected day: fully rounded
        day_selected:
          "bg-[#FE4C40] text-white hover:bg-[#E63C30] hover:text-white focus:bg-[#FE4C40] focus:text-white rounded-full",
        day_today: "bg-gray-100 text-gray-900 font-semibold",
        day_outside:
          "day-outside text-gray-400 aria-selected:text-gray-400",
        day_disabled: "text-gray-300 opacity-50 cursor-not-allowed",
        // Range middle: full background, no rounding, connects seamlessly with adjacent days
        day_range_middle:
          "aria-selected:bg-[#FE4C40] aria-selected:text-white rounded-none",
        day_hidden: "invisible",
        ...classNames,
      }}
      components={{
        IconLeft: ({ className, ...props }) => (
          <ChevronLeft className={cn("size-4", className)} {...props} />
        ),
        IconRight: ({ className, ...props }) => (
          <ChevronRight className={cn("size-4", className)} {...props} />
        ),
      }}
      {...props}
    />
  );
}

export { Calendar };
