import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

// Razorpay is the gateway the current WordPress site already uses (WPBookit's
// Razorpay add-on), so the new checkout keeps it. Set RAZORPAY_KEY_ID and
// RAZORPAY_KEY_SECRET to take real payments; without them the checkout runs
// in demo mode and says so on screen.

const KEY_ID = process.env.RAZORPAY_KEY_ID;
const KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;

export const razorpayEnabled = Boolean(KEY_ID && KEY_SECRET);
export const razorpayKeyId = KEY_ID ?? "";

export async function createOrder(input: {
  amountPaise: number;
  receipt: string;
  notes: Record<string, string>;
}): Promise<{ id: string; amount: number; currency: string }> {
  if (!razorpayEnabled) throw new Error("Razorpay keys are not configured");
  const res = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${Buffer.from(`${KEY_ID}:${KEY_SECRET}`).toString("base64")}`,
    },
    body: JSON.stringify({
      amount: input.amountPaise,
      currency: "INR",
      receipt: input.receipt,
      notes: input.notes,
    }),
  });
  if (!res.ok) {
    throw new Error(`Razorpay order failed (${res.status})`);
  }
  return res.json();
}

export function verifyPaymentSignature(orderId: string, paymentId: string, signature: string): boolean {
  if (!KEY_SECRET) return false;
  const expected = createHmac("sha256", KEY_SECRET).update(`${orderId}|${paymentId}`).digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  return a.length === b.length && timingSafeEqual(a, b);
}
