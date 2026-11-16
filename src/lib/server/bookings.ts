import "server-only";
import { randomBytes } from "node:crypto";
import { baseHolds, buildAvailability, type Availability, type Hold } from "@/lib/booking/availability";
import { resourceById } from "@/data/floor";
import { isLive, type BookingRecord } from "./store";

export function holdsFromBookings(bookings: BookingRecord[], now = Date.now()): Hold[] {
  return bookings
    .filter((b) => isLive(b, now))
    .map((b) => ({ resourceId: b.resourceId, schedule: b.schedule }));
}

export function availabilityFor(date: string, bookings: BookingRecord[]): Availability {
  return buildAvailability(date, [...baseHolds(date), ...holdsFromBookings(bookings)]);
}

/** Short, readable reference: WL-7K3QX. No 0/O or 1/I to misread. */
export function bookingCode(): string {
  const alphabet = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
  const bytes = randomBytes(5);
  let out = "";
  for (const b of bytes) out += alphabet[b % alphabet.length];
  return `WL-${out}`;
}

/** What the browser is allowed to see of a booking. */
export function publicBooking(b: BookingRecord) {
  const resource = resourceById.get(b.resourceId);
  return {
    id: b.id,
    code: b.code,
    status: b.status,
    resource: resource
      ? { id: resource.id, code: resource.code, name: resource.name, kind: resource.kind }
      : { id: b.resourceId, code: b.resourceId, name: b.resourceId, kind: "desk" as const },
    schedule: b.schedule,
    amount: b.amount,
    guest: b.guest,
    idProof: { type: b.idProof.type, masked: b.idProof.masked },
    paymentMode: b.payment.mode,
    createdAt: b.createdAt,
    confirmedAt: b.confirmedAt,
  };
}

export type PublicBooking = ReturnType<typeof publicBooking>;
