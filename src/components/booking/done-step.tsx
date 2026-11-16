"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import { CalendarPlus, MapPin } from "lucide-react";
import { CtaButton } from "@/components/site/cta";
import { site } from "@/data/site";
import { DAY_END, DAY_START, addMonths, formatDay, formatRange } from "@/lib/booking/dates";
import { inr } from "@/lib/booking/pricing";
import { spring } from "@/lib/springs";
import type { ConfirmedBooking } from "./checkout-step";

function icsFor(b: ConfirmedBooking) {
  const s = b.schedule;
  const d = s.date.replace(/-/g, "");
  const pad = (n: number) => String(n).padStart(2, "0");
  let start = `${d}T${pad(DAY_START)}0000`;
  let end = `${d}T${pad(DAY_END)}0000`;
  if (s.unit === "hour") {
    start = `${d}T${pad(s.start)}0000`;
    end = `${d}T${pad(s.start + s.hours)}0000`;
  }
  const allDay = s.unit === "month";
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Worklush Spaces//Booking//EN",
    "BEGIN:VEVENT",
    `UID:${b.id}@worklushspaces.com`,
    `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, "").slice(0, 15)}Z`,
    allDay ? `DTSTART;VALUE=DATE:${d}` : `DTSTART;TZID=Asia/Kolkata:${start}`,
    allDay ? `DTEND;VALUE=DATE:${addMonths(s.date, s.months).replace(/-/g, "")}` : `DTEND;TZID=Asia/Kolkata:${end}`,
    `SUMMARY:${b.resource.name} at Worklush Spaces (${b.code})`,
    `LOCATION:${site.address.line1}\\, ${site.address.line2}\\, ${site.address.city}`,
    `DESCRIPTION:Booking ${b.code}. Bring the ID you uploaded (${b.idProof.masked}).`,
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return lines.join("\r\n");
}

function download(b: ConfirmedBooking) {
  const blob = new Blob([icsFor(b)], { type: "text/calendar" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `worklush-${b.code}.ics`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function when(b: ConfirmedBooking) {
  const s = b.schedule;
  if (s.unit === "day") return `${formatDay(s.date, { weekday: "long" })} · ${formatRange(DAY_START, DAY_END)}`;
  if (s.unit === "hour") return `${formatDay(s.date, { weekday: "long" })} · ${formatRange(s.start, s.start + s.hours)}`;
  return `From ${formatDay(s.date, { year: "numeric" })} · ${s.months} month${s.months > 1 ? "s" : ""}`;
}

export function DoneStep({ booking, onAnother }: { booking: ConfirmedBooking; onAnother: () => void }) {
  const reduce = useReducedMotion();
  const sparks = Array.from({ length: 12 });
  return (
    <div className="mx-auto flex max-w-xl flex-col items-center gap-5 px-4 py-12 text-center">
      <div className="relative mt-2 grid h-24 w-24 place-items-center">
        {!reduce &&
          sparks.map((_, i) => {
            const a = (i / sparks.length) * Math.PI * 2;
            return (
              <motion.span
                key={i}
                className="absolute h-2 w-2 rounded-full"
                style={{ background: i % 2 ? "#c8f169" : "#037e6e" }}
                initial={{ x: 0, y: 0, opacity: 0, scale: 0.4 }}
                animate={{ x: Math.cos(a) * 64, y: Math.sin(a) * 64, opacity: [0, 1, 0], scale: [0.4, 1, 0.6] }}
                transition={{ duration: 0.9, delay: 0.35, ease: [0.22, 1, 0.36, 1] }}
              />
            );
          })}
        <motion.div
          className="grid h-24 w-24 place-items-center rounded-full bg-lime"
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", duration: 0.5, bounce: 0.45 }}
        >
          <svg viewBox="0 0 48 48" className="h-12 w-12" aria-hidden>
            <motion.path
              d="M13 25.5 L21 33 L36 16"
              fill="none"
              stroke="#023c40"
              strokeWidth={4.5}
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.45, delay: 0.25, ease: [0.65, 0, 0.35, 1] }}
            />
          </svg>
        </motion.div>
      </div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ ...spring.slow, delay: 0.3 }}>
        <h2 className="type-h1 text-ink">You&apos;re booked</h2>
        <p className="type-lead mt-2 text-muted-foreground">
          A confirmation is on its way to {booking.guest.email}.
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...spring.slow, delay: 0.42 }}
        className="w-full overflow-hidden rounded-2xl border border-border bg-card text-left"
      >
        <div className="flex items-center justify-between bg-ink px-4 py-3 text-white">
          <span className="type-small text-white/70">Booking reference</span>
          <span className="type-h3 nums tracking-wider text-lime">{booking.code}</span>
        </div>
        <dl className="type-body divide-y divide-border">
          <Row k="Space" v={`${booking.resource.name} (${booking.resource.code})`} />
          <Row k="When" v={when(booking)} />
          <Row k="ID on file" v={booking.idProof.masked} mono />
          <Row k="Paid" v={`${inr(booking.amount.total)}${booking.paymentMode === "demo" ? " · demo" : ""}`} />
        </dl>
      </motion.div>

      <div className="type-body flex w-full items-start gap-3 rounded-2xl bg-mint/60 p-4 text-left">
        <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-teal" />
        <div>
          <div className="font-semibold text-ink">Show your reference and ID at reception</div>
          <div className="text-muted-foreground">
            {site.address.line1}, {site.address.line2}. Third floor, lift from the lobby.
          </div>
        </div>
      </div>

      <div className="grid w-full grid-cols-1 gap-2 sm:grid-cols-2">
        <CtaButton variant="outline" onClick={() => download(booking)}>
          <CalendarPlus className="mr-1 inline h-4 w-4" /> Add to calendar
        </CtaButton>
        <Link
          href="/account"
          className="type-body inline-flex h-12 items-center justify-center rounded-full bg-ink px-6 font-semibold text-white transition-transform duration-150 active:scale-[0.97]"
        >
          My bookings
        </Link>
      </div>
      <button type="button" onClick={onAnother} className="type-small font-semibold text-teal underline-offset-4 hover:underline">
        Book another space
      </button>
    </div>
  );
}

function Row({ k, v, mono }: { k: string; v: string; mono?: boolean }) {
  return (
    <div className="flex justify-between gap-4 px-4 py-3">
      <dt className="text-muted-foreground">{k}</dt>
      <dd className={mono ? "nums font-semibold text-ink" : "text-right font-semibold text-ink"}>{v}</dd>
    </div>
  );
}
