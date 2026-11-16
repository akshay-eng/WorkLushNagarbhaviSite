import "server-only";
import { createHmac, randomBytes, scrypt as scryptCb, timingSafeEqual } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import { promisify } from "node:util";
import { cookies } from "next/headers";
import { DATA_DIR, read, type UserRecord } from "./store";

const scrypt = promisify(scryptCb) as (pw: string, salt: Buffer, len: number) => Promise<Buffer>;

export const SESSION_COOKIE = "wl_session";
const SESSION_DAYS = 14;

// --- passwords --------------------------------------------------------------

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const hash = await scrypt(password, salt, 64);
  return `scrypt$${salt.toString("base64url")}$${hash.toString("base64url")}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [scheme, saltB64, hashB64] = stored.split("$");
  if (scheme !== "scrypt" || !saltB64 || !hashB64) return false;
  const expected = Buffer.from(hashB64, "base64url");
  const actual = await scrypt(password, Buffer.from(saltB64, "base64url"), expected.length);
  return timingSafeEqual(actual, expected);
}

// --- secret -----------------------------------------------------------------

let cachedSecret: string | null = null;

/** SESSION_SECRET in production. In development a random secret is created
 *  once under .data/ so sessions survive restarts. */
export async function secret(): Promise<string> {
  if (cachedSecret) return cachedSecret;
  if (process.env.SESSION_SECRET && process.env.SESSION_SECRET.length >= 32) {
    cachedSecret = process.env.SESSION_SECRET;
    return cachedSecret;
  }
  if (process.env.NODE_ENV === "production") {
    throw new Error("Set SESSION_SECRET (32+ characters) before running in production.");
  }
  const file = path.join(DATA_DIR, "dev-secret.key");
  try {
    cachedSecret = (await fs.readFile(file, "utf8")).trim();
  } catch {
    cachedSecret = randomBytes(32).toString("base64url");
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.writeFile(file, cachedSecret, { mode: 0o600 });
  }
  return cachedSecret;
}

// --- sessions ---------------------------------------------------------------

type SessionPayload = { uid: string; exp: number };

async function sign(value: string) {
  return createHmac("sha256", await secret()).update(value).digest("base64url");
}

export async function createSessionToken(uid: string): Promise<string> {
  const payload: SessionPayload = { uid, exp: Date.now() + SESSION_DAYS * 86_400_000 };
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${body}.${await sign(body)}`;
}

export async function readSessionToken(token: string | undefined): Promise<SessionPayload | null> {
  if (!token) return null;
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  const expected = Buffer.from(await sign(body));
  const given = Buffer.from(sig);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString()) as SessionPayload;
    return payload.exp > Date.now() ? payload : null;
  } catch {
    return null;
  }
}

export async function setSessionCookie(uid: string) {
  const jar = await cookies();
  jar.set(SESSION_COOKIE, await createSessionToken(uid), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_DAYS * 86_400,
  });
}

export async function clearSessionCookie() {
  (await cookies()).delete(SESSION_COOKIE);
}

export type PublicUser = Pick<UserRecord, "id" | "name" | "email" | "phone">;

export function publicUser(u: UserRecord): PublicUser {
  return { id: u.id, name: u.name, email: u.email, phone: u.phone };
}

/** The signed-in user for this request, or null. */
export async function currentUser(): Promise<UserRecord | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const session = await readSessionToken(token);
  if (!session) return null;
  return read((d) => d.users.find((u) => u.id === session.uid) ?? null);
}

// --- throttling -------------------------------------------------------------

const attempts = new Map<string, { count: number; first: number }>();
const WINDOW_MS = 10 * 60_000;

/** Five tries per key per ten minutes. Returns false once over the limit. */
export function allowAttempt(key: string): boolean {
  const now = Date.now();
  const entry = attempts.get(key);
  if (!entry || now - entry.first > WINDOW_MS) {
    attempts.set(key, { count: 1, first: now });
    return true;
  }
  entry.count += 1;
  return entry.count <= 5;
}

export function clearAttempts(key: string) {
  attempts.delete(key);
}
