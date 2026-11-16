import {
  allowAttempt,
  clearAttempts,
  publicUser,
  setSessionCookie,
  verifyPassword,
} from "@/lib/server/auth";
import { fieldErrors, loginSchema } from "@/lib/server/schemas";
import { read } from "@/lib/server/store";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ errors: fieldErrors(parsed.error) }, { status: 422 });
  }
  const { email, password } = parsed.data;
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  const key = `${ip}:${email}`;
  if (!allowAttempt(key)) {
    return Response.json(
      { errors: { form: "Too many attempts. Wait ten minutes and try again." } },
      { status: 429 }
    );
  }

  const user = await read((d) => d.users.find((u) => u.email === email) ?? null);
  const ok = user ? await verifyPassword(password, user.passwordHash) : false;
  if (!user || !ok) {
    return Response.json({ errors: { form: "That email and password don't match." } }, { status: 401 });
  }

  clearAttempts(key);
  await setSessionCookie(user.id);
  return Response.json({ user: publicUser(user) });
}
