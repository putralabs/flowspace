import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Task } from "@/types";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function monthGrid(year: number, month: number): Date[] {
  const first = new Date(year, month, 1);
  const startOffset = (first.getDay() + 6) % 7;
  const start = new Date(year, month, 1 - startOffset);
  return Array.from({ length: 42 }, (_, i) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + i));
}

export function CalendarView({ tasks, onOpen }: { tasks: Task[]; onOpen: (t: Task) => void }) {
  const today = new Date();
  const [cursor, setCursor] = useState({ y: today.getFullYear(), m: today.getMonth() });
  const days = useMemo(() => monthGrid(cursor.y, cursor.m), [cursor]);

  function shift(delta: number) {
    setCursor(({ y, m }) => {
      const d = new Date(y, m + delta, 1);
      return { y: d.getFullYear(), m: d.getMonth() };
    });
  }

  return (
    <div className="px-6 pb-6 max-md:px-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-text-primary">
          {MONTHS[cursor.m]} {cursor.y}
        </h2>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={() => shift(-1)} aria-label="Previous month">
            <ChevronLeft size={16} />
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setCursor({ y: today.getFullYear(), m: today.getMonth() })}
          >
            Today
          </Button>
          <Button variant="ghost" size="icon" onClick={() => shift(1)} aria-label="Next month">
            <ChevronRight size={16} />
          </Button>
        </div>
      </div>

      <div className="mt-3 overflow-hidden rounded-lg border border-border bg-surface">
        <div className="grid grid-cols-7 border-b border-border bg-surface-secondary/60">
          {WEEKDAYS.map((d) => (
            <div key={d} className="px-2 py-2 text-center text-[11px] font-semibold tracking-wide text-text-muted uppercase">
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {days.map((day, i) => {
            const inMonth = day.getMonth() === cursor.m;
            const isToday = day.toDateString() === today.toDateString();
            const key = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, "0")}-${String(day.getDate()).padStart(2, "0")}`;
            const dayTasks = tasks.filter((t) => t.due_date === key);
            return (
              <div
                key={i}
                className={cn(
                  "min-h-24 border-r border-b border-border p-1.5 last:border-r-0 max-md:min-h-16 [&:nth-child(7n)]:border-r-0",
                  !inMonth && "bg-surface-secondary/40",
                )}
              >
                <span
                  className={cn(
                    "inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[11px] font-medium",
                    isToday ? "bg-accent text-white" : inMonth ? "text-text-secondary" : "text-text-muted",
                  )}
                >
                  {day.getDate()}
                </span>
                <div className="mt-1 space-y-1">
                  {dayTasks.slice(0, 2).map((t) => {
                    const label = t.labels?.[0];
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => onOpen(t)}
                        title={t.title}
                        style={
                          label
                            ? {
                                backgroundColor: `color-mix(in srgb, ${label.color} 12%, transparent)`,
                                color: label.color,
                              }
                            : undefined
                        }
                        className="block w-full cursor-pointer truncate rounded-sm bg-surface-secondary px-1.5 py-0.5 text-left text-[11px] text-text-secondary transition-colors duration-100 hover:bg-accent-soft hover:text-accent"
                      >
                        {t.title}
                      </button>
                    );
                  })}
                  {dayTasks.length > 2 && (
                    <span className="block px-1 text-[10px] text-text-muted">+{dayTasks.length - 2} more</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
