import { createHash, randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import { monthPrice, resourceById } from "@/data/floor";
import { checkSchedule } from "@/lib/booking/availability";
import { ID_FILE_MAX_BYTES, maskId, normaliseId, validateId } from "@/lib/booking/id-proof";
import { quote, type Schedule } from "@/lib/booking/pricing";
import { currentUser, secret } from "@/lib/server/auth";
import { availabilityFor, bookingCode, publicBooking } from "@/lib/server/bookings";
import { createOrder, razorpayEnabled, razorpayKeyId } from "@/lib/server/razorpay";
import { bookingFieldsSchema, fieldErrors } from "@/lib/server/schemas";
import { UPLOAD_DIR, isLive, mutate, read, type BookingRecord } from "@/lib/server/store";
import { addMonths } from "@/lib/booking/dates";

export async function GET() {
  const user = await currentUser();
  if (!user) return Response.json({ error: "Sign in to see your bookings." }, { status: 401 });
  const mine = await read((d) =>
    d.bookings
      .filter((b) => b.userId === user.id && b.status !== "cancelled")
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  );
  return Response.json(
    { bookings: mine.map(publicBooking) },
    { headers: { "Cache-Control": "private, no-store" } }
  );
}

/** Sniff the first bytes rather than trusting the browser's MIME type. */
function sniff(bytes: Uint8Array): { ext: string } | null {
  const b = bytes;
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return { ext: "jpg" };
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return { ext: "png" };
  if (b[0] === 0x25 && b[1] === 0x50 && b[2] === 0x44 && b[3] === 0x46) return { ext: "pdf" };
  if (
    b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 &&
    b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50
  ) {
    return { ext: "webp" };
  }
  return null;
}

async function readIdFile(entry: FormDataEntryValue | null, label: string) {
  if (!entry || typeof entry === "string" || entry.size === 0) return { file: null };
  if (entry.size > ID_FILE_MAX_BYTES) return { error: `${label} is larger than 5 MB.` };
  const bytes = new Uint8Array(await entry.arrayBuffer());
  const kind = sniff(bytes);
  if (!kind) return { error: `${label} must be a JPG, PNG, WebP or PDF.` };
  return { file: { bytes, ext: kind.ext } };
}

export async function POST(request: Request) {
  const user = await currentUser();
  if (!user) {
    return Response.json({ errors: { form: "Your session ended. Sign in again to finish booking." } }, { status: 401 });
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return Response.json({ errors: { form: "That upload didn't come through. Try again." } }, { status: 400 });
  }

  let payload: unknown;
  try {
    payload = JSON.parse(String(form.get("payload") ?? ""));
  } catch {
    return Response.json({ errors: { form: "Booking details are missing." } }, { status: 400 });
  }
  const parsed = bookingFieldsSchema.safeParse(payload);
  if (!parsed.success) {
    return Response.json({ errors: fieldErrors(parsed.error) }, { status: 422 });
  }
  const { resourceId, idType, idNumber } = parsed.data;
  const schedule = parsed.data.schedule as Schedule;

  const resource = resourceById.get(resourceId);
  if (!resource) return Response.json({ errors: { form: "That space no longer exists." } }, { status: 404 });

  const idError = validateId(idType, idNumber);
  if (idError) return Response.json({ errors: { idNumber: idError } }, { status: 422 });

  const front = await readIdFile(form.get("idFront"), "The front of your ID");
  if ("error" in front) return Response.json({ errors: { idFront: front.error } }, { status: 422 });
  if (!front.file) return Response.json({ errors: { idFront: "Upload a photo or scan of your ID." } }, { status: 422 });
  const back = await readIdFile(form.get("idBack"), "The back of your ID");
  if ("error" in back) return Response.json({ errors: { idBack: back.error } }, { status: 422 });

  if (schedule.unit === "month" && resource.pricing.month && !monthPrice(resource)) {
    return Response.json({ errors: { form: "Monthly rates for this cabin are on request. Message us and we'll quote." } }, { status: 422 });
  }

  let amount;
  try {
    amount = quote(resource, schedule);
  } catch {
    return Response.json({ errors: { form: "That booking type doesn't apply to this space." } }, { status: 422 });
  }

  const idHash = createHash("sha256")
    .update(`${await secret()}:${idType}:${normaliseId(idType, idNumber)}`)
    .digest("hex");

  const outcome = await mutate(async (data) => {
    const availability = availabilityFor(schedule.date, data.bookings);
    const check = checkSchedule(resource, schedule, availability);
    if (!check.ok) return { conflict: check.reason } as const;
    // A monthly let can't swallow hourly bookings others already hold.
    if (schedule.unit === "month") {
      const end = addMonths(schedule.date, schedule.months);
      const clash = data.bookings.some(
        (b) => b.resourceId === resource.id && isLive(b) && b.schedule.unit !== "month" && b.schedule.date >= schedule.date && b.schedule.date < end
      );
      if (clash) return { conflict: `${resource.name} has hourly bookings during that period. Pick a later start or message us.` } as const;
    }

    const id = randomUUID();
    const dir = path.join(UPLOAD_DIR, id);
    await fs.mkdir(dir, { recursive: true });
    const frontName = `front.${front.file.ext}`;
    await fs.writeFile(path.join(dir, frontName), front.file.bytes, { mode: 0o600 });
    let backName: string | undefined;
    if (back.file) {
      backName = `back.${back.file.ext}`;
      await fs.writeFile(path.join(dir, backName), back.file.bytes, { mode: 0o600 });
    }

    const booking: BookingRecord = {
      id,
      code: bookingCode(),
      userId: user.id,
      resourceId: resource.id,
      schedule,
      amount: { subtotal: amount.subtotal, gst: amount.gst, total: amount.total, totalPaise: amount.totalPaise },
      guest: { name: user.name, email: user.email, phone: user.phone },
      idProof: {
        type: idType,
        masked: maskId(idType, idNumber),
        hash: idHash,
        files: { front: frontName, back: backName },
        consentAt: new Date().toISOString(),
      },
      status: "pending_payment",
      payment: { mode: razorpayEnabled ? "razorpay" : "demo" },
      createdAt: new Date().toISOString(),
    };
    data.bookings.push(booking);
    return { booking } as const;
  });

  if ("conflict" in outcome) {
    return Response.json({ errors: { form: outcome.conflict } }, { status: 409 });
  }

  let booking = outcome.booking;

  if (!razorpayEnabled) {
    return Response.json({ booking: publicBooking(booking), payment: { mode: "demo" } }, { status: 201 });
  }

  try {
    const order = await createOrder({
      amountPaise: booking.amount.totalPaise,
      receipt: booking.code,
      notes: { booking: booking.code, space: resource.name },
    });
    booking = await mutate((data) => {
      const b = data.bookings.find((x) => x.id === booking.id)!;
      b.payment.orderId = order.id;
      return b;
    });
    return Response.json(
      {
        booking: publicBooking(booking),
        payment: {
          mode: "razorpay",
          keyId: razorpayKeyId,
          orderId: order.id,
          amount: order.amount,
          currency: order.currency,
          prefill: { name: user.name, email: user.email, contact: user.phone },
        },
      },
      { status: 201 }
    );
  } catch {
    await mutate((data) => {
      const b = data.bookings.find((x) => x.id === booking.id);
      if (b) b.status = "cancelled";
    });
    return Response.json(
      { errors: { form: "We couldn't reach the payment gateway. Nothing was charged. Try again in a minute." } },
      { status: 502 }
    );
  }
}
