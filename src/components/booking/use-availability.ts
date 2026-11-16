"use client";

import { useSyncExternalStore } from "react";
import type { Availability } from "@/lib/booking/availability";
import { availabilityFor, subscribe } from "@/lib/local/store";

/** Availability for one day, computed in the browser (null on the server).
 *  Re-reads whenever a booking is saved, in this tab or another. */
export function useAvailability(date: string) {
  const availability = useSyncExternalStore<Availability | null>(subscribe, () => availabilityFor(date), () => null);
  return { availability, loading: false, error: null as string | null };
}
