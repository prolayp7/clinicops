"use client";

import { useEffect, useRef, useState } from "react";
import { CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export function parseDatePickerValue(value: string): Date | undefined {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return undefined;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day, 12);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return undefined;
  return date;
}

export function formatDatePickerValue(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function displayDate(date: Date): string {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(date);
}

export function DatePicker({
  id,
  name,
  value,
  defaultValue = "",
  onValueChange,
  placeholder = "Select date",
  ariaLabel,
  required = false,
  disabled = false,
  minDate,
  maxDate,
  className,
}: {
  id?: string;
  name?: string;
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  placeholder?: string;
  ariaLabel?: string;
  required?: boolean;
  disabled?: boolean;
  minDate?: string;
  maxDate?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [internalValue, setInternalValue] = useState(defaultValue);
  const hiddenInputRef = useRef<HTMLInputElement>(null);
  const selectedValue = value ?? internalValue;
  const selectedDate = parseDatePickerValue(selectedValue);
  const fromDate = minDate ? parseDatePickerValue(minDate) : undefined;
  const toDate = maxDate ? parseDatePickerValue(maxDate) : undefined;

  useEffect(() => {
    if (value === undefined) setInternalValue(defaultValue);
  }, [defaultValue, value]);

  useEffect(() => {
    const form = hiddenInputRef.current?.form;
    if (!form || value !== undefined) return;
    const resetValue = () => setInternalValue(defaultValue);
    form.addEventListener("reset", resetValue);
    return () => form.removeEventListener("reset", resetValue);
  }, [defaultValue, value]);

  function selectDate(date: Date | undefined) {
    const nextValue = date ? formatDatePickerValue(date) : "";
    if (value === undefined) setInternalValue(nextValue);
    onValueChange?.(nextValue);
    if (date) setOpen(false);
  }

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            id={id}
            type="button"
            variant="outline"
            disabled={disabled}
            aria-label={ariaLabel ?? (selectedDate ? displayDate(selectedDate) : placeholder)}
            aria-required={required}
            aria-haspopup="dialog"
            className={cn("w-full justify-start text-left font-normal", !selectedDate && "text-muted-foreground", className)}
          >
            <CalendarDays className="size-4" />
            {selectedDate ? displayDate(selectedDate) : placeholder}
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-auto">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={selectDate}
            disabled={(date) => Boolean((fromDate && date < fromDate) || (toDate && date > toDate))}
            defaultMonth={selectedDate ?? fromDate ?? new Date()}
            captionLayout="dropdown"
            navLayout="around"
            startMonth={new Date(1900, 0)}
            endMonth={new Date(2200, 11)}
            autoFocus
          />
          {selectedDate && (
            <div className="border-t p-2">
              <Button type="button" size="sm" variant="ghost" onClick={() => selectDate(undefined)}>
                Clear date
              </Button>
            </div>
          )}
        </PopoverContent>
      </Popover>
      {name && <input ref={hiddenInputRef} type="hidden" name={name} value={selectedValue} />}
    </>
  );
}