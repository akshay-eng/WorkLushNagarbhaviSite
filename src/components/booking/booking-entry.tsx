"use client";

import dynamic from "next/dynamic";

// The booking app reads the clock, session storage and the signed-in user,
// all of which only exist in the browser, so it renders client-side behind a
// skeleton that matches its layout.
const BookingApp = dynamic(() => import("./booking-app"), {
  ssr: false,
  loading: () => <BookingSkeleton />,
});

export function BookingEntry() {
  return <BookingApp />;
}

function BookingSkeleton() {
  return (
    <div className="flex flex-col lg:h-[calc(100dvh-64px)] lg:flex-row" aria-busy="true" aria-label="Loading the floor plan">
      <div className="plan-grid h-[64svh] min-h-[420px] animate-pulse border-b border-border bg-mint/40 lg:h-auto lg:flex-1 lg:border-b-0 lg:border-r" />
      <div className="flex flex-col gap-4 p-6 lg:w-[440px]">
        <div className="h-4 w-24 animate-pulse rounded bg-mint" />
        <div className="h-8 w-3/4 animate-pulse rounded bg-mint" />
        <div className="h-24 animate-pulse rounded-2xl bg-mint" />
        <div className="h-12 animate-pulse rounded-full bg-mint" />
      </div>
    </div>
  );
}
