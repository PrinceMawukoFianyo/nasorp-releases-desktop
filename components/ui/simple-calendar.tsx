"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface SimpleCalendarProps {
  selected: Date | undefined;
  onSelect: (date: Date | undefined) => void;
  className?: string;
}

export function SimpleCalendar({ selected, onSelect, className }: SimpleCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    return new Date(year, month, 1).getDay();
  };

  const navigateMonth = (direction: "prev" | "next") => {
    const newMonth = new Date(currentMonth);
    if (direction === "prev") newMonth.setMonth(newMonth.getMonth() - 1);
    else newMonth.setMonth(newMonth.getMonth() + 1);
    setCurrentMonth(newMonth);
  };

  const isSameDay = (date1: Date, date2: Date) =>
    date1.getDate() === date2.getDate() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getFullYear() === date2.getFullYear();

  const isToday = (date: Date) => isSameDay(date, new Date());

  const renderCalendar = () => {
    const daysInMonth = getDaysInMonth(currentMonth);
    const firstDay = getFirstDayOfMonth(currentMonth);
    const days = [];

    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="w-8 h-8" />);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
      const isSelected = selected && isSameDay(date, selected);
      const isCurrentDay = isToday(date);

      days.push(
        <button
          key={day}
          type="button"
          onClick={() => onSelect(date)}
          className={cn(
            "w-8 h-8 rounded-md text-sm transition-colors",
            isSelected
              ? "bg-primary text-primary-foreground"
              : isCurrentDay
              ? "bg-accent text-accent-foreground"
              : "hover:bg-accent hover:text-accent-foreground"
          )}
        >
          {day}
        </button>
      );
    }
    return days;
  };

  return (
    <div className={cn("p-3", className)}>
      <div className="flex items-center justify-between mb-4">
        <Button variant="outline" size="sm" onClick={() => navigateMonth("prev")}>
          ‹
        </Button>
        <span className="text-sm font-medium">
          {currentMonth.toLocaleDateString("en-GH", { month: "long", year: "numeric" })}
        </span>
        <Button variant="outline" size="sm" onClick={() => navigateMonth("next")}>
          ›
        </Button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-xs text-center text-muted-foreground mb-2">
        {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((day) => (
          <div key={day} className="w-8 h-4">
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">{renderCalendar()}</div>
    </div>
  );
}