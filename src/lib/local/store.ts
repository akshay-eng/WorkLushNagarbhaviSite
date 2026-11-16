// Front-end-only data for the static preview (GitHub Pages has no server).
// Accounts, the signed-in user and bookings live in this browser's
// localStorage. Anything typed at sign-up, sign-in or ID entry is accepted.
//
// The full server version (hashed passwords, signed cookies, private ID
// uploads, Razorpay) is in this repo's history: see the README.

import { baseHolds, buildAvailability, type Availability, type Hold } from "@/lib/booking/availability";
import type { IdType } from "@/lib/booking/id-proof";
import type { Schedule } from "@/lib/booking/pricing";

export type LocalUser = { id: string; name: string; email: string; phone: string };

export type LocalBooking = {
  id: string;
  code: string;
  status: "confirmed" | "pending_payment";
  userId: string;
  resource: { id: string; code: string; name: string; kind: string };
  schedule: Schedule;
  amount: { subtotal: number; gst: number; total: number };
  guest: { name: string; email: string; phone: string };
  idProof: { type: IdType; masked: string; files: string[] };
  paymentMode: "demo";
  createdAt: string;
};

const KEYS = { users: "wl:users", session: "wl:session", bookings: "wl:bookings" } as const;
const EVENT = "wl:store";

let version = 0;

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* private mode: data lasts for this page only */
  }
  version++;
  window.dispatchEvent(new Event(EVENT));
}

export function subscribe(cb: () => void) {
  const onStorage = () => {
    version++;
    cb();
  };
  window.addEventListener(EVENT, cb);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(EVENT, cb);
    window.removeEventListener("storage", onStorage);
  };
}

export const getVersion = () => version;

function uid() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

// --- accounts -----------------------------------------------------------------

function nameFromEmail(email: string) {
  const local = email.split("@")[0]?.replace(/[._-]+/g, " ").trim();
  return local ? local.replace(/\b\w/g, (c) => c.toUpperCase()) : "Guest";
}

/** Saves whatever was typed. Returns the email to prefill sign-in with. */
export function registerUser(input: { name: string; email: string; phone: string }): string {
  const users = read<LocalUser[]>(KEYS.users, []);
  const email = input.email.trim();
  const user: LocalUser = {
    id: uid(),
    name: input.name.trim() || nameFromEmail(email),
    email,
    phone: input.phone.replace(/\s+/g, ""),
  };
  write(KEYS.users, [...users.filter((u) => u.email.toLowerCase() !== email.toLowerCase() || !email), user]);
  return email;
}

/** Any email and password signs in. A known email gets its saved details. */
export function loginUser(email: string): LocalUser {
  const users = read<LocalUser[]>(KEYS.users, []);
  const trimmed = email.trim();
  let user = trimmed ? users.find((u) => u.email.toLowerCase() === trimmed.toLowerCase()) : undefined;
  if (!user) {
    user = { id: uid(), name: nameFromEmail(trimmed), email: trimmed, phone: "" };
    write(KEYS.users, [...users, user]);
  }
  write(KEYS.session, user.id);
  return user;
}

export function logoutUser() {
  write(KEYS.session, null);
}

let userCache: { v: number; user: LocalUser | null } | null = null;
export function currentUser(): LocalUser | null {
  if (userCache && userCache.v === version) return userCache.user;
  const id = read<string | null>(KEYS.session, null);
  const user = id ? read<LocalUser[]>(KEYS.users, []).find((u) => u.id === id) ?? null : null;
  userCache = { v: version, user };
  return user;
}

// --- bookings -----------------------------------------------------------------

export function allBookings(): LocalBooking[] {
  return read<LocalBooking[]>(KEYS.bookings, []);
}

export function bookingsFor(userId: string): LocalBooking[] {
  return allBookings()
    .filter((b) => b.userId === userId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function saveBooking(b: LocalBooking) {
  write(KEYS.bookings, [...allBookings().filter((x) => x.id !== b.id), b]);
}

export function bookingCode() {
  const alphabet = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
  let out = "";
  for (let i = 0; i < 5; i++) out += alphabet[Math.floor(Math.random() * alphabet.length)];
  return `WL-${out}`;
}

export function newBookingId() {
  return uid();
}

function localHolds(): Hold[] {
  return allBookings()
    .filter((b) => b.status === "confirmed")
    .map((b) => ({ resourceId: b.resource.id, schedule: b.schedule }));
}

const availabilityCache = new Map<string, Availability>();

/** Demo walk-in load plus this browser's confirmed bookings. Cached so
 *  useSyncExternalStore gets a stable snapshot. */
export function availabilityFor(date: string): Availability {
  const key = `${date}:${version}`;
  let a = availabilityCache.get(key);
  if (!a) {
    if (availabilityCache.size > 50) availabilityCache.clear();
    a = buildAvailability(date, [...baseHolds(date), ...localHolds()]);
    availabilityCache.set(key, a);
  }
  return a;
}
