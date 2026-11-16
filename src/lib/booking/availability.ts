import { desks, monthPrice, rooms, type Resource } from "@/data/floor";
import {
  CLOSE_HOUR,
  DAY_END,
  DAY_START,
  OPEN_HOUR,
  addMonths,
  currentHourIST,
  isBookableDay,
  todayIST,
  weekday,
} from "./dates";
import { supports, type Schedule } from "./pricing";

/** Who holds what on one day. Shared by the API and the map. */
export type Availability = {
  date: string;
  /** Desk ids taken for the whole day. */
  desks: Record<string, true>;
  /** Room id → booked [start, end) hour ranges on this day. */
  rooms: Record<string, [number, number][]>;
  /** Room id → monthly lets [from, to) still running on or after this day. */
  lets: Record<string, [string, string][]>;
};

/** A booking as the availability maths needs to see it. */
export type Hold = { resourceId: string; schedule: Schedule };

// ---------------------------------------------------------------------------
// Walk-in demand. Until the space runs on real data, each day carries a
// deterministic base load so the floor looks like a working floor and the
// server enforces the same seats the map shows as taken. Make `baseHolds`
// return [] once real bookings are flowing.
// ---------------------------------------------------------------------------

function hash(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function rng(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** The 7-seater is let to a member team in the demo data. */
const LET_CABINS = ["cabin-7"];

export function baseHolds(date: string): Hold[] {
  const holds: Hold[] = [];
  const dow = weekday(date);
  const deskLoad = dow === 0 ? 0.12 : dow === 6 ? 0.28 : 0.46;
  for (const desk of desks) {
    if (rng(hash(`${date}:${desk.id}`))() < deskLoad) holds.push({ resourceId: desk.id, schedule: { unit: "day", date } });
  }
  for (const room of rooms) {
    if (LET_CABINS.includes(room.id)) {
      holds.push({ resourceId: room.id, schedule: { unit: "month", date: `${date.slice(0, 7)}-01`, months: 6 } });
      continue;
    }
    if (!room.pricing.hour) continue;
    const rand = rng(hash(`${date}:${room.id}`));
    const count = dow === 0 ? 0 : Math.floor(rand() * 3);
    for (let i = 0; i < count; i++) {
      const hours = rand() < 0.6 ? 1 : 2;
      const start = OPEN_HOUR + 1 + Math.floor(rand() * (CLOSE_HOUR - OPEN_HOUR - 3));
      holds.push({ resourceId: room.id, schedule: { unit: "hour", date, start, hours: hours as 1 | 2 } });
    }
  }
  return holds;
}

// ---------------------------------------------------------------------------

function monthRange(schedule: Schedule): [string, string] | null {
  return schedule.unit === "month" ? [schedule.date, addMonths(schedule.date, schedule.months)] : null;
}

export function buildAvailability(date: string, holds: Hold[]): Availability {
  const out: Availability = { date, desks: {}, rooms: {}, lets: {} };
  for (const { resourceId, schedule } of holds) {
    if (schedule.unit === "month") {
      const range = monthRange(schedule)!;
      if (range[1] > date) (out.lets[resourceId] ??= []).push(range);
      continue;
    }
    if (schedule.date !== date) continue;
    if (schedule.unit === "day") out.desks[resourceId] = true;
    else (out.rooms[resourceId] ??= []).push([schedule.start, schedule.start + schedule.hours]);
  }
  return out;
}

const overlaps = (a: [number, number], b: [number, number]) => a[0] < b[1] && b[0] < a[1];
const overlapsDays = (a: [string, string], b: [string, string]) => a[0] < b[1] && b[0] < a[1];

/** Is the room let to someone on this day? */
export function letOn(resourceId: string, availability: Availability, day = availability.date) {
  return (availability.lets[resourceId] ?? []).some(([from, to]) => from <= day && day < to);
}

export type Check = { ok: true } | { ok: false; reason: string };

export function checkSchedule(resource: Resource, schedule: Schedule, availability: Availability, now = new Date()): Check {
  if (!isBookableDay(schedule.date, now)) return { ok: false, reason: "Pick a date between today and the next 60 days." };
  if (!supports(resource, schedule.unit)) {
    return {
      ok: false,
      reason: schedule.unit === "month" && resource.pricing.month ? "Monthly rates for this cabin are on request. Message us and we'll quote." : "That booking type doesn't apply to this space.",
    };
  }
  const isToday = schedule.date === todayIST(now);

  if (schedule.unit === "day") {
    if (availability.desks[resource.id]) return { ok: false, reason: `${resource.name} is already booked that day.` };
    if (isToday && currentHourIST(now) >= DAY_END) return { ok: false, reason: "Today's day passes have closed. Try tomorrow." };
    return { ok: true };
  }

  if (schedule.unit === "hour") {
    if (letOn(resource.id, availability, schedule.date)) return { ok: false, reason: `${resource.name} is let to a member team on that day.` };
    const range: [number, number] = [schedule.start, schedule.start + schedule.hours];
    if (schedule.hours === 9 && schedule.start !== DAY_START) return { ok: false, reason: "Full-day bookings run 9 am – 6 pm." };
    if (range[0] < OPEN_HOUR || range[1] > CLOSE_HOUR) return { ok: false, reason: "Rooms book between 8 am and 9 pm." };
    if (isToday && range[0] <= currentHourIST(now)) return { ok: false, reason: "That start time has already passed today." };
    if ((availability.rooms[resource.id] ?? []).some((t) => overlaps(t, range))) {
      return { ok: false, reason: `${resource.name} is booked for part of that time.` };
    }
    return { ok: true };
  }

  const range = monthRange(schedule)!;
  if ((availability.lets[resource.id] ?? []).some((t) => overlapsDays(t, range))) {
    return { ok: false, reason: `${resource.name} is let for part of that period.` };
  }
  if (!monthPrice(resource)) return { ok: false, reason: "Monthly rates for this cabin are on request." };
  return { ok: true };
}

/** Start hours that fit `hours` without clashing. */
export function freeStarts(resource: Resource, date: string, hours: number, availability: Availability, now = new Date()): number[] {
  if (hours === 9) {
    return checkSchedule(resource, { unit: "hour", date, start: DAY_START, hours: 9 }, availability, now).ok ? [DAY_START] : [];
  }
  const out: number[] = [];
  for (let start = OPEN_HOUR; start + hours <= CLOSE_HOUR; start++) {
    if (checkSchedule(resource, { unit: "hour", date, start, hours: hours as 1 | 2 | 4 }, availability, now).ok) out.push(start);
  }
  return out;
}

export type Status = "available" | "booked" | "partial";

/** One status per space for the map's colouring on the chosen day. */
export function statusFor(resource: Resource, availability: Availability | null, at?: Date): Status {
  if (!availability) return "available";
  const now = at ?? new Date();
  if (resource.kind === "desk") {
    if (availability.desks[resource.id]) return "booked";
    if (availability.date === todayIST(now) && currentHourIST(now) >= DAY_END) return "booked";
    return "available";
  }
  if (letOn(resource.id, availability)) return "booked";
  const starts = freeStarts(resource, availability.date, 1, availability, now);
  if (starts.length === 0) return "booked";
  return (availability.rooms[resource.id]?.length ?? 0) > 0 ? "partial" : "available";
}
