import { randomUUID } from "node:crypto";
import { hashPassword } from "@/lib/server/auth";
import { fieldErrors, registerSchema } from "@/lib/server/schemas";
import { mutate } from "@/lib/server/store";

// Creates the account but does not sign in: the checkout asks people to
// register, then sign in with what they just chose, then pay.
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ errors: fieldErrors(parsed.error) }, { status: 422 });
  }
  const { name, email, phone, password } = parsed.data;
  const passwordHash = await hashPassword(password);

  const result = await mutate((data) => {
    if (data.users.some((u) => u.email === email)) return "exists" as const;
    data.users.push({
      id: randomUUID(),
      name,
      email,
      phone,
      passwordHash,
      createdAt: new Date().toISOString(),
    });
    return "created" as const;
  });

  if (result === "exists") {
    return Response.json(
      { errors: { email: "An account with this email already exists. Sign in instead." } },
      { status: 409 }
    );
  }
  return Response.json({ ok: true, email }, { status: 201 });
}
