"use client";

import { useState } from "react";
import { Calendar as CalendarIcon, RefreshCw } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface DateRangeFilterProps {
  onDateRangeChange?: (from: Date | undefined, to: Date | undefined) => void;
  onPeriodChange?: (period: string) => void;
}

export function DateRangeFilter({ onDateRangeChange, onPeriodChange }: DateRangeFilterProps) {
  const [fromDate, setFromDate] = useState<Date | undefined>(() => {
    const date = new Date();
    date.setDate(date.getDate() - 30);
    return date;
  });
  const [toDate, setToDate] = useState<Date | undefined>(new Date());
  const [period, setPeriod] = useState<string>("monthly");

  const handlePeriodChange = (value: string) => {
    setPeriod(value);
    onPeriodChange?.(value);
  };

  const handleApply = () => {
    onDateRangeChange?.(fromDate, toDate);
  };

  const handleReset = () => {
    const newFromDate = new Date();
    newFromDate.setDate(newFromDate.getDate() - 30);
    setFromDate(newFromDate);
    setToDate(new Date());
    setPeriod("monthly");
    onDateRangeChange?.(newFromDate, new Date());
    onPeriodChange?.("monthly");
  };

  return (
    <div className="flex items-center gap-4 flex-wrap">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium">Period</span>
        <Select value={period} onValueChange={handlePeriodChange}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Select period" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="daily">Daily</SelectItem>
            <SelectItem value="weekly">Weekly</SelectItem>
            <SelectItem value="monthly">Monthly</SelectItem>
            <SelectItem value="yearly">Yearly</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-sm font-medium">From</span>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "w-[200px] justify-start text-left font-normal",
                !fromDate && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {fromDate ? format(fromDate, "PPP") : "Pick a date"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={fromDate}
              onSelect={setFromDate}
              initialFocus
            />
          </PopoverContent>
        </Popover>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-sm font-medium">To</span>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "w-[200px] justify-start text-left font-normal",
                !toDate && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {toDate ? format(toDate, "PPP") : "Pick a date"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={toDate}
              onSelect={setToDate}
              initialFocus
              disabled={(date) => date > new Date()}
            />
          </PopoverContent>
        </Popover>
      </div>

      <div className="flex gap-2">
        <Button onClick={handleApply} className="bg-pink-600 hover:bg-pink-700">
          Apply
        </Button>
        <Button 
          onClick={handleReset} 
          variant="outline" 
          className="flex items-center gap-2"
        >
          <RefreshCw className="h-4 w-4" />
          Reset
        </Button>
      </div>
    </div>
  );
}