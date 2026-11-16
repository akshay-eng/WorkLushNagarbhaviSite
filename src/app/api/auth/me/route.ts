import { currentUser, publicUser } from "@/lib/server/auth";

export async function GET() {
  const user = await currentUser();
  return Response.json(
    { user: user ? publicUser(user) : null },
    { headers: { "Cache-Control": "private, no-store" } }
  );
}
