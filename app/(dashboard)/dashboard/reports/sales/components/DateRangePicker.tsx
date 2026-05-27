"use client";

import { useState, useEffect } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { CalendarIcon } from "lucide-react";
import { format, startOfDay, endOfDay } from "date-fns";
import { cn } from "@/lib/utils";
import { SimpleCalendar } from "@/components/ui/simple-calendar";

interface DateRangePickerProps {
  from: Date | undefined;
  to: Date | undefined;
  onRangeChange: (from: Date | undefined, to: Date | undefined) => void;
}

export function DateRangePicker({ from, to, onRangeChange }: DateRangePickerProps) {
  // Local state for the pickers (allows cancelling without closing)
  const [tempFrom, setTempFrom] = useState<Date | undefined>(from);
  const [tempTo, setTempTo] = useState<Date | undefined>(to);

  // Sync internal state when props change (e.g. external Today button)
  useEffect(() => {
    setTempFrom(from);
    setTempTo(to);
  }, [from, to]);

  const handleFromSelect = (date: Date | undefined) => {
    setTempFrom(date);
    if (date) {
      const normalizedFrom = startOfDay(date);
      if (tempTo && normalizedFrom > startOfDay(tempTo)) {
        // If selected from date is after current to, clear to
        setTempTo(undefined);
        onRangeChange(normalizedFrom, undefined);
      } else if (!tempTo) {
        // No "to" date yet – set "to" to the same day (end of day)
        const sameDay = endOfDay(date);
        setTempTo(sameDay);
        onRangeChange(normalizedFrom, sameDay);
      } else {
        onRangeChange(normalizedFrom, tempTo);
      }
    } else {
      onRangeChange(undefined, tempTo);
    }
  };

  const handleToSelect = (date: Date | undefined) => {
    setTempTo(date);
    if (date) {
      const normalizedTo = endOfDay(date);
      if (tempFrom && normalizedTo < startOfDay(tempFrom)) {
        // If selected to date is before from, swap them
        setTempFrom(date);
        onRangeChange(startOfDay(date), normalizedTo);
      } else {
        onRangeChange(tempFrom, normalizedTo);
      }
    } else {
      onRangeChange(tempFrom, undefined);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "w-[240px] justify-start text-left font-normal",
              !from && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {from ? format(from, "PPP") : "From date"}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <SimpleCalendar selected={tempFrom} onSelect={handleFromSelect} />
        </PopoverContent>
      </Popover>

      <span className="text-muted-foreground">—</span>

      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "w-[240px] justify-start text-left font-normal",
              !to && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {to ? format(to, "PPP") : "To date"}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <SimpleCalendar selected={tempTo} onSelect={handleToSelect} />
        </PopoverContent>
      </Popover>
    </div>
  );
}