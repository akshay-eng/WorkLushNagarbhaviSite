import { modesFor, resourceById, type Mode, type Resource } from "@/data/floor";
import { DAY_START, isBookableDay } from "@/lib/booking/dates";
import type { HourPackage, MonthTerm, Schedule } from "@/lib/booking/pricing";

export type Draft = {
  resourceId: string | null;
  date: string;
  mode: Mode;
  hours: HourPackage;
  start: number | null;
  months: MonthTerm;
};

/** The mode to show for a space: keep the current one if it offers it. */
export function modeFor(resource: Resource, current: Mode): Mode {
  const modes = modesFor(resource);
  return modes.includes(current) ? current : modes[0];
}

export function scheduleFor(resource: Resource, draft: Draft): Schedule | null {
  const mode = modeFor(resource, draft.mode);
  if (mode === "day") return { unit: "day", date: draft.date };
  if (mode === "month") return { unit: "month", date: draft.date, months: draft.months };
  const start = draft.hours === 9 ? DAY_START : draft.start;
  if (start === null) return null;
  return { unit: "hour", date: draft.date, start, hours: draft.hours };
}

const KEY = "wl:draft:v2";

export function saveDraft(draft: Draft) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(draft));
  } catch {
    /* private mode: the draft just won't survive a reload */
  }
}

export function loadDraft(): Partial<Draft> | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    const d = JSON.parse(raw) as Partial<Draft>;
    if (d.date && !isBookableDay(d.date)) delete d.date;
    if (d.resourceId && !resourceById.has(d.resourceId)) d.resourceId = null;
    return d;
  } catch {
    return null;
  }
}

export function clearDraft() {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
