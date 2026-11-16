// Every date in the booking system is an IST calendar day, "YYYY-MM-DD".
// Strings, not Date objects, so the server (UTC) and the browser agree.

export const TIME_ZONE = "Asia/Kolkata";
export const BOOKING_WINDOW_DAYS = 60;

/** Rooms book on the hour between these times (24h clock). */
export const OPEN_HOUR = 8;
export const CLOSE_HOUR = 21;
/** A day pass and a full-day room both run 9 am – 6 pm. */
export const DAY_START = 9;
export const DAY_END = 18;

const ymd = new Intl.DateTimeFormat("en-CA", {
  timeZone: TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const hourFmt = new Intl.DateTimeFormat("en-GB", {
  timeZone: TIME_ZONE,
  hour: "2-digit",
  hour12: false,
});

export function todayIST(now = new Date()): string {
  return ymd.format(now);
}

export function currentHourIST(now = new Date()): number {
  return Number(hourFmt.format(now)) % 24;
}

export function isValidDay(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = value.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

export function addDays(day: string, n: number): string {
  const [y, m, d] = day.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + n));
  return dt.toISOString().slice(0, 10);
}

export function addMonths(day: string, n: number): string {
  const [y, m, d] = day.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1 + n, d));
  return dt.toISOString().slice(0, 10);
}

/** Whole days from a to b (b - a). */
export function daysBetween(a: string, b: string): number {
  const [ay, am, ad] = a.split("-").map(Number);
  const [by, bm, bd] = b.split("-").map(Number);
  return Math.round((Date.UTC(by, bm - 1, bd) - Date.UTC(ay, am - 1, ad)) / 86_400_000);
}

export function isBookableDay(day: string, now = new Date()): boolean {
  if (!isValidDay(day)) return false;
  const diff = daysBetween(todayIST(now), day);
  return diff >= 0 && diff <= BOOKING_WINDOW_DAYS;
}

/** Local calendar Date (midnight in the browser's zone) for a day string,
 *  for handing to the calendar component. */
export function dayToLocalDate(day: string): Date {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function localDateToDay(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function weekday(day: string): number {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

export function formatDay(day: string, opts: Intl.DateTimeFormatOptions = {}): string {
  const [y, m, d] = day.split("-").map(Number);
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "UTC",
    weekday: "short",
    day: "numeric",
    month: "short",
    ...opts,
  }).format(new Date(Date.UTC(y, m - 1, d)));
}

export function formatHour(hour: number): string {
  const h = hour % 24;
  const suffix = h >= 12 ? "pm" : "am";
  const twelve = h % 12 === 0 ? 12 : h % 12;
  return `${twelve} ${suffix}`;
}

export function formatRange(start: number, end: number): string {
  return `${formatHour(start)} – ${formatHour(end)}`;
}
