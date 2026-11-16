"use client";

import { useEffect, useState } from "react";
import { desks } from "@/data/floor";
import { statusFor, type Availability } from "@/lib/booking/availability";

/** Today's availability for the marketing page's live touches. */
export function useToday() {
  const [availability, setAvailability] = useState<Availability | null>(null);
  useEffect(() => {
    let alive = true;
    fetch("/api/availability", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => alive && d && setAvailability(d))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);
  const free = availability ? desks.filter((d) => statusFor(d, availability) === "available").length : null;
  return { availability, freeDesks: free, totalDesks: desks.length };
}
