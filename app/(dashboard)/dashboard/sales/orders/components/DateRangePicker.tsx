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
  const [tempFrom, setTempFrom] = useState<Date | undefined>(from);
  const [tempTo, setTempTo] = useState<Date | undefined>(to);

  const handleFromSelect = (date: Date | undefined) => {
    setTempFrom(date);
    if (date && tempTo && date > tempTo) {
      setTempTo(undefined);
    }
    onRangeChange(date, tempTo);
  };

  const handleToSelect = (date: Date | undefined) => {
    setTempTo(date);
    onRangeChange(tempFrom, date);
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