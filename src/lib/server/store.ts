import "server-only";
import { promises as fs } from "node:fs";
import path from "node:path";
import type { Schedule } from "@/lib/booking/pricing";
import type { IdType } from "@/lib/booking/id-proof";

// A small JSON-file store so the booking flow runs end to end with no
// database to provision. Writes are serialised through one in-process queue
// and land atomically (write temp file, then rename). For more than one
// server instance, swap this module for Postgres: the function signatures
// below are the whole contract the API routes rely on.

export type UserRecord = {
  id: string;
  name: string;
  email: string;
  phone: string;
  passwordHash: string;
  createdAt: string;
};

export type BookingStatus = "pending_payment" | "confirmed" | "cancelled";

export type BookingRecord = {
  id: string;
  code: string;
  userId: string;
  resourceId: string;
  schedule: Schedule;
  amount: { subtotal: number; gst: number; total: number; totalPaise: number };
  guest: { name: string; email: string; phone: string };
  idProof: {
    type: IdType;
    masked: string;
    /** Salted SHA-256 of the normalised number, for matching repeat visits. */
    hash: string;
    files: { front: string; back?: string };
    consentAt: string;
  };
  status: BookingStatus;
  payment: { mode: "razorpay" | "demo"; orderId?: string; paymentId?: string };
  createdAt: string;
  confirmedAt?: string;
};

type Data = { users: UserRecord[]; bookings: BookingRecord[] };

export const DATA_DIR = process.env.DATA_DIR ?? path.join(process.cwd(), ".data");
const DB_FILE = path.join(DATA_DIR, "db.json");
export const UPLOAD_DIR = path.join(DATA_DIR, "uploads");

let queue: Promise<unknown> = Promise.resolve();

async function readData(): Promise<Data> {
  try {
    const raw = await fs.readFile(DB_FILE, "utf8");
    return JSON.parse(raw) as Data;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return { users: [], bookings: [] };
    throw err;
  }
}

async function writeData(data: Data) {
  await fs.mkdir(DATA_DIR, { recursive: true });
  const tmp = `${DB_FILE}.${process.pid}.${Date.now()}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(data, null, 2), "utf8");
  await fs.rename(tmp, DB_FILE);
}

/** Read-only snapshot. */
export async function read<T>(fn: (data: Data) => T): Promise<T> {
  await queue.catch(() => {});
  return fn(await readData());
}

/** Read, change and persist under the write lock. */
export function mutate<T>(fn: (data: Data) => T | Promise<T>): Promise<T> {
  const run = queue.then(async () => {
    const data = await readData();
    const result = await fn(data);
    await writeData(data);
    return result;
  });
  queue = run.catch(() => {});
  return run;
}

/** Pending bookings hold their slot this long while payment completes. */
export const HOLD_MINUTES = 15;

export function isLive(booking: BookingRecord, now = Date.now()): boolean {
  if (booking.status === "confirmed") return true;
  if (booking.status === "pending_payment") {
    return now - Date.parse(booking.createdAt) < HOLD_MINUTES * 60_000;
  }
  return false;
}
