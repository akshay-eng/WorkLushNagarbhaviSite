"use client";

import { AnimatePresence, motion } from "motion/react";
import { CalendarDays } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Calendar } from "@/components/ui/calendar";
import {
  BOOKING_WINDOW_DAYS,
  addDays,
  dayToLocalDate,
  formatDay,
  localDateToDay,
  todayIST,
} from "@/lib/booking/dates";
import { spring } from "@/lib/springs";
import { cn } from "@/lib/utils";
import { ChipGroup } from "./chips";

export function DateStrip({ value, onChange }: { value: string; onChange: (day: string) => void }) {
  const [open, setOpen] = useState(false);
  const pop = useRef<HTMLDivElement>(null);
  const today = todayIST();

  const days = useMemo(() => Array.from({ length: 14 }, (_, i) => addDays(today, i)), [today]);
  const inStrip = days.includes(value);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (pop.current && !pop.current.contains(e.target as Node)) setOpen(false);
    };
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("mousedown", close);
    window.addEventListener("keydown", esc);
    return () => {
      window.removeEventListener("mousedown", close);
      window.removeEventListener("keydown", esc);
    };
  }, [open]);

  return (
    <div className="flex min-w-0 items-center gap-2">
      <div className="no-scrollbar min-w-0 flex-1 overflow-x-auto">
        <ChipGroup
          label="Date"
          layoutId="date-pill"
          value={inStrip ? value : null}
          onChange={onChange}
          itemClassName="w-[58px] shrink-0"
          items={days.map((d, i) => ({
            value: d,
            label: i === 0 ? "Today" : formatDay(d, { weekday: "short", day: undefined, month: undefined }),
            sub: formatDay(d, { weekday: undefined, day: "numeric", month: "short" }),
            ariaLabel: formatDay(d, { weekday: "long", day: "numeric", month: "long" }),
          }))}
        />
      </div>
      <div ref={pop} className="relative shrink-0">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-haspopup="dialog"
          className={cn(
            "type-small inline-flex h-12 items-center gap-2 rounded-xl border px-3 font-semibold transition-colors duration-100",
            !inStrip ? "border-ink bg-ink text-white" : "border-border bg-card text-foreground hover:bg-hover"
          )}
        >
          <CalendarDays className="h-4 w-4" />
          <span className="hidden sm:inline">{inStrip ? "More dates" : formatDay(value)}</span>
        </button>
        <AnimatePresence>
          {open && (
            <motion.div
              role="dialog"
              aria-label="Pick a date"
              initial={{ opacity: 0, y: -6, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98, transition: spring.moderate.exit }}
              transition={spring.moderate}
              className="absolute right-0 top-[calc(100%+8px)] z-30 origin-top-right rounded-2xl border border-border bg-card p-3 shadow-2xl"
            >
              <Calendar
                mode="single"
                selected={dayToLocalDate(value)}
                onSelect={(d) => {
                  if (!d) return;
                  onChange(localDateToDay(d));
                  setOpen(false);
                }}
                disabled={[{ before: dayToLocalDate(today) }, { after: dayToLocalDate(addDays(today, BOOKING_WINDOW_DAYS)) }]}
                cellSize={40}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
