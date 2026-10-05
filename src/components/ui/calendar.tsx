"use client";

import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp } from "lucide-react";
import { DayPicker, type DayPickerProps } from "react-day-picker";
import { cn } from "@/lib/utils";

const calendarClassNames = {
  months: "flex flex-col gap-4",
  month: "relative space-y-4",
  month_caption: "relative mx-8 flex h-8 items-center justify-center",
  caption_label: "inline-flex items-center gap-1 whitespace-nowrap text-sm font-medium",
  dropdowns: "relative inline-flex items-center gap-2",
  dropdown: "absolute inset-y-0 left-0 z-10 w-full cursor-pointer appearance-none opacity-0",
  dropdown_root: "relative inline-flex items-center rounded-sm has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring",
  nav: "flex items-center gap-1",
  button_previous: "absolute left-1 top-0 inline-flex size-8 items-center justify-center rounded-md border border-input bg-background text-muted-foreground hover:bg-accent hover:text-accent-foreground",
  button_next: "absolute right-1 top-0 inline-flex size-8 items-center justify-center rounded-md border border-input bg-background text-muted-foreground hover:bg-accent hover:text-accent-foreground",
  month_grid: "w-full border-collapse",
  weekdays: "flex",
  weekday: "w-9 rounded-md text-center text-xs font-normal text-muted-foreground",
  week: "mt-1 flex w-full",
  day: "relative size-9 p-0 text-center text-sm",
  day_button: "inline-flex size-9 items-center justify-center rounded-md p-0 font-normal hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring aria-selected:bg-primary aria-selected:text-primary-foreground",
  selected: "bg-primary text-primary-foreground",
  today: "bg-accent text-accent-foreground",
  outside: "text-muted-foreground opacity-50",
  disabled: "text-muted-foreground opacity-40",
  hidden: "invisible",
};

export function Calendar({ className, classNames, ...props }: DayPickerProps) {
  return (
    <DayPicker
      className={cn("p-3", className)}
      classNames={{ ...calendarClassNames, ...classNames }}
      components={{
        Chevron: ({ orientation, className: chevronClassName, ...props }) => {
          const Icon = orientation === "left"
            ? ChevronLeft
            : orientation === "up"
              ? ChevronUp
              : orientation === "down"
                ? ChevronDown
                : ChevronRight;
          return <Icon className={cn("size-4", chevronClassName)} {...props} />;
        },
        ...props.components,
      }}
      {...props}
    />
  );
}