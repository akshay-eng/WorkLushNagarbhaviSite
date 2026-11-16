"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { CalendarClock, LogOut, Plus } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/components/auth/auth-context";
import { AccountStep, type AccountMode } from "@/components/booking/account-step";
import type { ConfirmedBooking } from "@/components/booking/checkout-step";
import { CtaLink } from "@/components/site/cta";
import { DAY_END, DAY_START, formatDay, formatRange, todayIST } from "@/lib/booking/dates";
import { inr } from "@/lib/booking/pricing";
import { spring } from "@/lib/springs";
import { cn } from "@/lib/utils";

type Booking = ConfirmedBooking & { createdAt: string };

function when(b: Booking) {
  const s = b.schedule;
  if (s.unit === "day") return `${formatDay(s.date, { year: "numeric" })} · ${formatRange(DAY_START, DAY_END)}`;
  if (s.unit === "hour") return `${formatDay(s.date, { year: "numeric" })} · ${formatRange(s.start, s.start + s.hours)}`;
  return `From ${formatDay(s.date, { year: "numeric" })} · ${s.months} month${s.months > 1 ? "s" : ""}`;
}

export function AccountView() {
  const { user, loading, logout } = useAuth();
  const [mode, setMode] = useState<AccountMode>("login");
  const [loaded, setLoaded] = useState<{ userId: string; list: Booking[] } | null>(null);
  const [tick, setTick] = useState(0);
  const load = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    if (!user) return;
    let alive = true;
    fetch("/api/bookings", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : { bookings: [] }))
      .then((data) => alive && setLoaded({ userId: user.id, list: data.bookings ?? [] }))
      .catch(() => alive && setLoaded({ userId: user.id, list: [] }));
    return () => {
      alive = false;
    };
  }, [user, tick]);

  const bookings = user && loaded?.userId === user.id ? loaded.list : null;

  if (loading) {
    return <div className="mx-auto mt-16 h-40 max-w-md animate-pulse rounded-3xl bg-mint" aria-busy="true" />;
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-md px-4 py-12">
        <AccountStep mode={mode} onMode={setMode} onSignedIn={load} />
      </div>
    );
  }

  const today = todayIST();
  const upcoming = (bookings ?? []).filter((b) => b.schedule.date >= today || b.schedule.unit === "month");
  const past = (bookings ?? []).filter((b) => !upcoming.includes(b));

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="type-eyebrow">Your account</p>
          <h1 className="type-h1 mt-1 text-ink">Hi, {user.name.split(" ")[0]}</h1>
          <p className="type-small mt-2 text-muted-foreground">
            {user.email} · +91 {user.phone}
          </p>
        </div>
        <div className="flex gap-2">
          <CtaLink href="/book" className="h-11">
            <Plus className="mr-1 inline h-4 w-4" /> New booking
          </CtaLink>
          <button
            type="button"
            onClick={() => void logout()}
            className="type-small inline-flex h-11 items-center gap-2 rounded-full border border-ink/15 px-4 font-semibold text-ink hover:bg-mint"
          >
            <LogOut className="h-4 w-4" /> Sign out
          </button>
        </div>
      </div>

      <List title="Upcoming" items={bookings === null ? null : upcoming} empty="Nothing booked yet. Pick a desk and it'll show up here." />
      {past.length > 0 && <List title="Past" items={past} muted />}
    </div>
  );
}

function List({ title, items, empty, muted }: { title: string; items: Booking[] | null; empty?: string; muted?: boolean }) {
  return (
    <section className="mt-10">
      <h2 className="type-h3 text-ink">{title}</h2>
      {items === null ? (
        <div className="mt-3 h-24 animate-pulse rounded-2xl bg-mint" />
      ) : items.length === 0 ? (
        <div className="type-body mt-3 rounded-2xl border border-dashed border-border p-8 text-center text-muted-foreground">
          {empty}
          <div className="mt-4">
            <Link href="/book" className="font-semibold text-teal hover:underline">
              Open the floor plan →
            </Link>
          </div>
        </div>
      ) : (
        <ul className="mt-3 flex flex-col gap-3">
          <AnimatePresence initial={false}>
            {items.map((b, i) => (
              <motion.li
                key={b.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ ...spring.slow, delay: i * 0.04 }}
                className={cn("flex items-center gap-4 rounded-2xl border border-border bg-card p-4", muted && "opacity-70")}
              >
                <span className="type-small nums grid h-12 w-14 shrink-0 place-items-center rounded-xl bg-ink font-semibold text-lime">
                  {b.resource.code}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="type-title text-ink">{b.resource.name}</span>
                    <span
                      className={cn(
                        "type-caption rounded-full px-2 py-0.5",
                        b.status === "confirmed" ? "bg-lime/50 text-ink" : "bg-ember/15 text-[#9a3f12]"
                      )}
                    >
                      {b.status === "confirmed" ? "Confirmed" : "Awaiting payment"}
                    </span>
                  </div>
                  <div className="type-small mt-0.5 flex items-center gap-1.5 text-muted-foreground">
                    <CalendarClock className="h-3.5 w-3.5" /> {when(b)}
                  </div>
                </div>
                <div className="text-right">
                  <div className="type-small nums text-muted-foreground">{b.code}</div>
                  <div className="type-title nums text-ink">{inr(b.amount.total)}</div>
                </div>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      )}
    </section>
  );
}
