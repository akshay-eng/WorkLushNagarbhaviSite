import { resourceById } from "@/data/floor";
import { checkSchedule } from "@/lib/booking/availability";
import { currentUser } from "@/lib/server/auth";
import { availabilityFor, publicBooking } from "@/lib/server/bookings";
import { razorpayEnabled, verifyPaymentSignature } from "@/lib/server/razorpay";
import { isLive, mutate } from "@/lib/server/store";

type Body =
  | { mode: "demo" }
  | { mode: "razorpay"; razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string };

export async function POST(request: Request, ctx: RouteContext<"/api/bookings/[id]/confirm">) {
  const { id } = await ctx.params;
  const user = await currentUser();
  if (!user) return Response.json({ error: "Sign in again to finish." }, { status: 401 });

  const body = (await request.json().catch(() => null)) as Body | null;
  if (!body || (body.mode !== "demo" && body.mode !== "razorpay")) {
    return Response.json({ error: "Payment details are missing." }, { status: 400 });
  }

  if (body.mode === "demo" && razorpayEnabled) {
    return Response.json({ error: "Demo payments are off while live payments are configured." }, { status: 400 });
  }
  if (body.mode === "razorpay") {
    const valid = verifyPaymentSignature(body.razorpay_order_id, body.razorpay_payment_id, body.razorpay_signature);
    if (!valid) return Response.json({ error: "We couldn't verify that payment." }, { status: 400 });
  }

  const result = await mutate((data) => {
    const booking = data.bookings.find((b) => b.id === id && b.userId === user.id);
    if (!booking) return { status: 404, error: "Booking not found." } as const;
    if (booking.status === "confirmed") return { booking } as const;
    if (booking.status === "cancelled") return { status: 409, error: "This booking was cancelled." } as const;
    if (body.mode === "razorpay" && booking.payment.orderId !== body.razorpay_order_id) {
      return { status: 400, error: "That payment belongs to a different order." } as const;
    }

    // If the hold lapsed while paying, make sure nobody took the slot since.
    if (!isLive(booking)) {
      const resource = resourceById.get(booking.resourceId)!;
      const others = data.bookings.filter((b) => b.id !== booking.id);
      const check = checkSchedule(resource, booking.schedule, availabilityFor(booking.schedule.date, others));
      if (!check.ok) {
        booking.status = "cancelled";
        return { status: 409, error: `${check.reason} Your payment will be refunded.` } as const;
      }
    }

    booking.status = "confirmed";
    booking.confirmedAt = new Date().toISOString();
    if (body.mode === "razorpay") booking.payment.paymentId = body.razorpay_payment_id;
    return { booking } as const;
  });

  if ("error" in result) return Response.json({ error: result.error }, { status: result.status });
  return Response.json({ booking: publicBooking(result.booking) });
}
