"use client";

import { useEffect, useState } from "react";
import type { Availability } from "@/lib/booking/availability";

type Result = { date: string; data: Availability | null; error: string | null };

async function fetchDay(date: string): Promise<Availability> {
  const res = await fetch(`/api/availability?date=${date}`, { cache: "no-store" });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Couldn't load availability");
  return data as Availability;
}

export function useAvailability(date: string) {
  const [result, setResult] = useState<Result>({ date: "", data: null, error: null });
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let alive = true;
    fetchDay(date).then(
      (data) => alive && setResult({ date, data, error: null }),
      (err: unknown) =>
        alive && setResult((r) => ({ date, data: r.date === date ? r.data : null, error: err instanceof Error ? err.message : "Couldn't load availability" }))
    );
    return () => {
      alive = false;
    };
  }, [date, tick]);

  // Keep the floor honest while someone is deciding.
  useEffect(() => {
    const timer = window.setInterval(() => setTick((t) => t + 1), 45_000);
    return () => window.clearInterval(timer);
  }, []);

  const current = result.date === date;
  return {
    // Keep showing the previous day's colours while the new day loads.
    availability: current ? result.data : result.data && { ...result.data, date },
    loading: !current,
    error: current ? result.error : null,
    refresh: () => setTick((t) => t + 1),
  };
}
