"use client";

import { useEffect, useRef, useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

function splitTime(value: string) {
  const match = /^(\d{2}):(\d{2})$/.exec(value);
  if (!match) return { hour: "", minute: "" };
  return { hour: match[1]!, minute: match[2]! };
}

export function TimePicker({
  id,
  name,
  defaultValue = "",
  required = false,
  disabled = false,
  className,
}: {
  id?: string;
  name: string;
  defaultValue?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
}) {
  const [parts, setParts] = useState(() => splitTime(defaultValue));
  const hiddenInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => setParts(splitTime(defaultValue)), [defaultValue]);

  useEffect(() => {
    const form = hiddenInputRef.current?.form;
    if (!form) return;
    const resetValue = () => setParts(splitTime(defaultValue));
    form.addEventListener("reset", resetValue);
    return () => form.removeEventListener("reset", resetValue);
  }, [defaultValue]);

  const value = parts.hour && parts.minute ? `${parts.hour}:${parts.minute}` : "";

  function updatePart(part: "hour" | "minute", nextValue: string) {
    setParts((current) => ({ ...current, [part]: nextValue }));
  }

  return (
    <div className={`flex items-center gap-1.5 ${className ?? ""}`} role="group" aria-required={required}>
      <Select value={parts.hour || "hour"} onValueChange={(hour) => updatePart("hour", hour)} disabled={disabled}>
        <SelectTrigger id={id} aria-label="Hour" className="w-[4.5rem]">
          <SelectValue placeholder="HH" />
        </SelectTrigger>
        <SelectContent className="max-h-60">
          <SelectItem value="hour" disabled>Hour</SelectItem>
          {Array.from({ length: 24 }, (_, hour) => String(hour).padStart(2, "0")).map((hour) => (
            <SelectItem key={hour} value={hour}>{hour}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <span aria-hidden="true" className="text-muted-foreground">:</span>
      <Select value={parts.minute || "minute"} onValueChange={(minute) => updatePart("minute", minute)} disabled={disabled}>
        <SelectTrigger aria-label="Minute" className="w-[4.5rem]">
          <SelectValue placeholder="MM" />
        </SelectTrigger>
        <SelectContent className="max-h-60">
          <SelectItem value="minute" disabled>Minute</SelectItem>
          {Array.from({ length: 60 }, (_, minute) => String(minute).padStart(2, "0")).map((minute) => (
            <SelectItem key={minute} value={minute}>{minute}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <input ref={hiddenInputRef} type="hidden" name={name} value={value} />
    </div>
  );
}