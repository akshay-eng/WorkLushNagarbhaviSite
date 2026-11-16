"use client";

import { useSyncExternalStore } from "react";
import { desks } from "@/data/floor";
import { statusFor, type Availability } from "@/lib/booking/availability";
import { todayIST } from "@/lib/booking/dates";
import { availabilityFor, subscribe } from "@/lib/local/store";

/** Today's availability for the marketing page's live touches. The clock is
 *  read only in the browser, so the server render shows a neutral state. */
export function useToday() {
  const availability = useSyncExternalStore<Availability | null>(subscribe, () => availabilityFor(todayIST()), () => null);
  const free = availability ? desks.filter((d) => statusFor(d, availability) === "available").length : null;
  return { availability, freeDesks: free, totalDesks: desks.length };
}
