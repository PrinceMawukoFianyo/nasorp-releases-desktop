"use client";

import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { SimpleCalendar } from "@/components/ui/simple-calendar";

interface DateRangePickerProps {
  from: Date | undefined;
  to: Date | undefined;
  onRangeChange: (from: Date | undefined, to: Date | undefined) => void;
}

export function DateRangePicker({ from, to, onRangeChange }: DateRangePickerProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" className={cn("w-[130px] sm:w-[140px] justify-start text-xs sm:text-sm", !from && "text-muted-foreground")}>
            <CalendarIcon className="mr-2 h-4 w-4" />
            {from ? format(from, "MMM d, yyyy") : "From"}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <SimpleCalendar selected={from} onSelect={(date) => onRangeChange(date, to)} />
        </PopoverContent>
      </Popover>
      <span className="text-xs sm:text-sm">—</span>
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" className={cn("w-[130px] sm:w-[140px] justify-start text-xs sm:text-sm", !to && "text-muted-foreground")}>
            <CalendarIcon className="mr-2 h-4 w-4" />
            {to ? format(to, "MMM d, yyyy") : "To"}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <SimpleCalendar selected={to} onSelect={(date) => onRangeChange(from, date)} />
        </PopoverContent>
      </Popover>
    </div>
  );
}