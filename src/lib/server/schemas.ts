import "server-only";
import { z } from "zod";
import { MONTH_TERMS } from "@/lib/booking/pricing";

export const registerSchema = z.object({
  name: z.string().trim().min(2, "Enter your full name.").max(80),
  email: z.string().trim().toLowerCase().email("Enter a valid email address."),
  phone: z
    .string()
    .trim()
    .transform((v) => v.replace(/[\s-]/g, "").replace(/^\+?91/, ""))
    .pipe(z.string().regex(/^[6-9]\d{9}$/, "Enter a 10-digit Indian mobile number.")),
  password: z
    .string()
    .min(8, "Use at least 8 characters.")
    .max(128)
    .regex(/[A-Za-z]/, "Include at least one letter.")
    .regex(/\d/, "Include at least one number."),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address."),
  password: z.string().min(1, "Enter your password."),
});

export const scheduleSchema = z.discriminatedUnion("unit", [
  z.object({ unit: z.literal("day"), date: z.string() }),
  z.object({
    unit: z.literal("hour"),
    date: z.string(),
    start: z.number().int().min(0).max(23),
    hours: z.union([z.literal(1), z.literal(2), z.literal(4), z.literal(9)]),
  }),
  z.object({
    unit: z.literal("month"),
    date: z.string(),
    months: z.union(MONTH_TERMS.map((m) => z.literal(m)) as [z.ZodLiteral<1>, z.ZodLiteral<3>, z.ZodLiteral<6>]),
  }),
]);

export const bookingFieldsSchema = z.object({
  resourceId: z.string().min(1),
  schedule: scheduleSchema,
  idType: z.enum(["aadhaar", "pan", "passport", "dl", "voter"]),
  idNumber: z.string().min(4).max(32),
  consent: z.literal(true, { message: "Please agree to ID verification." }),
});

/** First message per field, for showing next to each input. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "form";
    out[key] ??= issue.message;
  }
  return out;
}
