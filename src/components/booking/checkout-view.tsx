"use client";

import { ArrowLeft } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/components/auth/auth-context";
import type { Resource } from "@/data/floor";
import type { Schedule } from "@/lib/booking/pricing";
import { AccountForms, type AccountMode } from "./account-step";
import { CheckoutForm, OrderSummary, Section, type ConfirmedBooking } from "./checkout-step";

export function CheckoutView({
  resource,
  schedule,
  onBack,
  onBooked,
}: {
  resource: Resource;
  schedule: Schedule;
  onBack: () => void;
  onBooked: (b: ConfirmedBooking) => void;
}) {
  const { user, loading, logout } = useAuth();
  const [mode, setMode] = useState<AccountMode>("register");
  const signedIn = !!user;

  return (
    <div className="mx-auto grid max-w-6xl gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-10 lg:py-12">
      <div className="flex min-w-0 flex-col gap-5">
        <button type="button" onClick={onBack} className="type-small inline-flex w-fit items-center gap-2 font-semibold text-teal hover:underline">
          <ArrowLeft className="h-4 w-4" /> Back to the floor plan
        </button>
        <div>
          <h1 className="type-h1 text-ink">Confirm and pay</h1>
          <p className="type-lead mt-2 text-muted-foreground">Three quick steps and {resource.kind === "desk" ? "the desk" : "the room"} is yours.</p>
        </div>

        {/* Order summary first on phones */}
        <div className="lg:hidden">
          <OrderSummary resource={resource} schedule={schedule} onEdit={onBack} />
        </div>

        <Section
          n={1}
          title="Your account"
          done={signedIn}
          summary={
            signedIn ? (
              <span className="type-small flex items-center gap-3 text-muted-foreground">
                <span className="hidden sm:inline">{user.name}</span>
                <button type="button" onClick={() => void logout().then(() => setMode("login"))} className="font-semibold text-teal hover:underline">
                  Not you?
                </button>
              </span>
            ) : undefined
          }
        >
          {!loading && !signedIn ? <AccountForms mode={mode} onMode={setMode} onSignedIn={() => {}} /> : null}
        </Section>

        <CheckoutForm resource={resource} schedule={schedule} disabled={!signedIn} onBooked={onBooked} />
      </div>

      <aside className="hidden lg:block">
        <div className="sticky top-24">
          <OrderSummary resource={resource} schedule={schedule} onEdit={onBack} />
        </div>
      </aside>
    </div>
  );
}
