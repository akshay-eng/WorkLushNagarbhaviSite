import type { Metadata } from "next";
import { BookingEntry } from "@/components/booking/booking-entry";
import { SiteHeader } from "@/components/site/header";

export const metadata: Metadata = {
  title: "Book a seat",
  description:
    "Pick your exact desk or room on the Worklush Spaces floor plan, step inside in 3D, then register, sign in and check out in under a minute.",
};

export default function BookPage() {
  return (
    <>
      <SiteHeader variant="solid" />
      <main className="flex-1">
        <h1 className="sr-only">Book a desk or room at Worklush Spaces</h1>
        <BookingEntry />
      </main>
    </>
  );
}
