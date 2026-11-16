import { isBookableDay, todayIST } from "@/lib/booking/dates";
import { availabilityFor } from "@/lib/server/bookings";
import { read } from "@/lib/server/store";

export async function GET(request: Request) {
  const date = new URL(request.url).searchParams.get("date") ?? todayIST();
  if (!isBookableDay(date)) {
    return Response.json({ error: "Pick a date between today and the next 60 days." }, { status: 400 });
  }
  const bookings = await read((d) => d.bookings);
  return Response.json(availabilityFor(date, bookings), {
    headers: { "Cache-Control": "no-store" },
  });
}
