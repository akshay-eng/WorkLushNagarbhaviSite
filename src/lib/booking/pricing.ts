import { monthPrice, type Mode, type Resource } from "@/data/floor";
import { DAY_END, DAY_START, addMonths, formatDay, formatRange } from "./dates";

export const GST_RATE = 0.18;

export type HourPackage = 1 | 2 | 4 | 9;
export const HOUR_PACKAGES: { hours: HourPackage; label: string }[] = [
  { hours: 1, label: "1 hour" },
  { hours: 2, label: "2 hours" },
  { hours: 4, label: "4 hours" },
  { hours: 9, label: "Full day" },
];

export const MONTH_TERMS = [1, 3, 6] as const;
export type MonthTerm = (typeof MONTH_TERMS)[number];

/** What the visitor chose for one space. */
export type Schedule =
  | { unit: "day"; date: string }
  | { unit: "hour"; date: string; start: number; hours: HourPackage }
  | { unit: "month"; date: string; months: MonthTerm };

export type Quote = {
  /** Charged now, before tax, in rupees. */
  subtotal: number;
  gst: number;
  total: number;
  /** Paise, for the payment gateway. */
  totalPaise: number;
  lines: { label: string; amount: number }[];
  /** Plain-language summary of when. */
  when: string;
  note?: string;
};

const round2 = (n: number) => Math.round(n * 100) / 100;

export function inr(amount: number, opts: { decimals?: boolean } = {}): string {
  const decimals = opts.decimals ?? amount % 1 !== 0;
  return `₹${amount.toLocaleString("en-IN", { minimumFractionDigits: decimals ? 2 : 0, maximumFractionDigits: 2 })}`;
}

export function supports(resource: Resource, mode: Mode): boolean {
  if (mode === "day") return !!resource.pricing.day;
  if (mode === "hour") return !!resource.pricing.hour;
  return !!monthPrice(resource);
}

export function quote(resource: Resource, schedule: Schedule): Quote {
  const p = resource.pricing;
  let subtotal: number;
  let label: string;
  let when: string;
  let note: string | undefined;

  if (schedule.unit === "day" && p.day) {
    subtotal = p.day.amount;
    label = `Day pass · ${resource.code}`;
    when = `${formatDay(schedule.date)} · ${formatRange(DAY_START, DAY_END)}`;
  } else if (schedule.unit === "hour" && p.hour) {
    subtotal = p.hour * schedule.hours;
    label = `${schedule.hours === 9 ? "Full day" : `${schedule.hours} hr`} × ${inr(p.hour)}`;
    when = `${formatDay(schedule.date)} · ${formatRange(schedule.start, schedule.start + schedule.hours)}`;
  } else if (schedule.unit === "month" && monthPrice(resource)) {
    const m = monthPrice(resource)!;
    subtotal = m.amount;
    label = "First month's rent";
    const end = addMonths(schedule.date, schedule.months);
    when = `From ${formatDay(schedule.date, { year: "numeric" })} · ${schedule.months} month${schedule.months > 1 ? "s" : ""}, to ${formatDay(end, { weekday: undefined })}`;
    note = `Billed monthly at ${inr(m.amount)} + GST. One month's security deposit is collected at move-in.`;
  } else {
    throw new Error("Schedule does not match this space's pricing");
  }

  const gst = round2(subtotal * GST_RATE);
  const total = round2(subtotal + gst);
  return {
    subtotal,
    gst,
    total,
    totalPaise: Math.round(total * 100),
    lines: [
      { label, amount: subtotal },
      { label: "GST 18%", amount: gst },
    ],
    when,
    note,
  };
}

/** The headline price for a space, e.g. "₹650 / hr". */
export function priceLabel(resource: Resource): string {
  const p = resource.pricing;
  if (p.day) return `${inr(p.day.amount)} / day`;
  if (p.hour) return `${inr(p.hour)} / hr`;
  const m = monthPrice(resource);
  return m ? `${inr(m.amount)} / month` : "On request";
}

/** Every way to book, e.g. "₹650 / hr · ₹34,999 / month". */
export function priceDetail(resource: Resource): string {
  const p = resource.pricing;
  const parts: string[] = [];
  if (p.day) parts.push(`${inr(p.day.amount)} / day`);
  if (p.hour) parts.push(`${inr(p.hour)} / hr`);
  if (p.month) {
    const m = monthPrice(resource);
    parts.push(m ? `${inr(m.amount)} / month` : "monthly on request");
  }
  return parts.join(" · ");
}
