"use client";

import Image from "next/image";
import { AnimatePresence, motion } from "motion/react";
import { Check, CreditCard, FileText, ImageUp, Lock, ShieldCheck, Smartphone, Trash2, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type DragEvent, type ReactNode } from "react";
import { CtaButton } from "@/components/site/cta";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { kindLabel, type Resource } from "@/data/floor";
import { ID_TYPES, maskId, type IdType } from "@/lib/booking/id-proof";
import { checkSchedule } from "@/lib/booking/availability";
import { useAuth } from "@/components/auth/auth-context";
import { availabilityFor, bookingCode, newBookingId, saveBooking, type LocalBooking } from "@/lib/local/store";
import { inr, quote, type Schedule } from "@/lib/booking/pricing";
import { spring } from "@/lib/springs";
import { cn } from "@/lib/utils";
import { ChipGroup } from "./chips";

export type ConfirmedBooking = LocalBooking;

/** A numbered checkout section that dims until it's your turn. */
export function Section({ n, title, done, disabled, summary, children }: { n: number; title: string; done?: boolean; disabled?: boolean; summary?: ReactNode; children?: ReactNode }) {
  return (
    <section className={cn("rounded-3xl border bg-card p-5 transition-[opacity,border-color] duration-300 sm:p-7", disabled ? "border-border opacity-55" : "border-border shadow-[0_18px_40px_-30px_rgb(2_60_64/0.45)]")}>
      <div className="flex items-center gap-3">
        <span className={cn("type-small grid h-8 w-8 shrink-0 place-items-center rounded-full font-semibold transition-colors duration-300", done ? "bg-teal text-white" : disabled ? "bg-mint text-muted-foreground" : "bg-ink text-lime")}>
          {done ? <Check className="h-4 w-4" /> : n}
        </span>
        <h2 className="type-h3 flex-1 text-ink">{title}</h2>
        {summary}
      </div>
      <AnimatePresence initial={false}>
        {children && !disabled && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0, transition: spring.slow.exit }} transition={spring.slow} className="overflow-hidden">
            <div className="pt-5">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

export function OrderSummary({ resource, schedule, onEdit, locked }: { resource: Resource; schedule: Schedule; onEdit: () => void; locked?: boolean }) {
  const q = quote(resource, schedule);
  return (
    <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-[0_24px_50px_-34px_rgb(2_60_64/0.5)]">
      <div className="relative aspect-[16/9]">
        <Image src={resource.photos[0]} alt={resource.name} fill sizes="400px" className="object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-ink/70 to-transparent" />
        <div className="absolute bottom-3 left-4 right-4 flex items-end justify-between text-white">
          <div>
            <span className="type-caption text-white/80">{kindLabel[resource.kind]}</span>
            <div className="type-h3">{resource.name}</div>
          </div>
          <span className="type-small nums rounded-md bg-lime px-1.5 font-semibold text-ink">{resource.code}</span>
        </div>
      </div>
      <div className="flex flex-col gap-4 p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="type-caption text-muted-foreground">When</div>
            <div className="type-body text-ink">{q.when}</div>
          </div>
          {!locked && (
            <button type="button" onClick={onEdit} className="type-small shrink-0 font-semibold text-teal underline-offset-4 hover:underline">
              Change
            </button>
          )}
        </div>
        <div className="flex flex-col gap-1.5 border-t border-border pt-4">
          {q.lines.map((l) => (
            <div key={l.label} className="type-small nums flex justify-between text-muted-foreground">
              <span>{l.label}</span>
              <span>{inr(l.amount)}</span>
            </div>
          ))}
          <div className="mt-1 flex items-baseline justify-between border-t border-border pt-3">
            <span className="type-title text-ink">Total</span>
            <span className="type-h3 nums text-ink">{inr(q.total)}</span>
          </div>
          {q.note && <p className="type-caption mt-1 font-normal text-muted-foreground">{q.note}</p>}
        </div>
        <p className="type-caption flex items-center gap-1.5 font-normal text-muted-foreground">
          <Lock className="h-3.5 w-3.5" /> Free cancellation up to 24 hours before, as per our policy.
        </p>
      </div>
    </div>
  );
}

export function CheckoutForm({ resource, schedule, disabled, onBooked }: { resource: Resource; schedule: Schedule; disabled: boolean; onBooked: (b: ConfirmedBooking) => void }) {
  const { user } = useAuth();
  const q = quote(resource, schedule);
  const [idType, setIdType] = useState<IdType>("aadhaar");
  const [idNumber, setIdNumber] = useState("");
  const [front, setFront] = useState<File | null>(null);
  const [back, setBack] = useState<File | null>(null);
  const [consent, setConsent] = useState(true);
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState<LocalBooking | null>(null);
  const [demoOpen, setDemoOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const idMeta = ID_TYPES.find((t) => t.value === idType)!;
  const masked = idNumber.trim() ? maskId(idType, idNumber) : "";
  const idDone = !!idNumber.trim() || !!front;

  // Preview build: any ID number and any file are accepted. The seat itself
  // is still checked, so a taken desk can't be booked twice.
  const submit = async () => {
    if (pending) {
      setDemoOpen(true);
      return;
    }
    setBusy(true);
    setNotice(null);
    await new Promise((r) => setTimeout(r, 300));
    const check = checkSchedule(resource, schedule, availabilityFor(schedule.date));
    if (!check.ok) {
      setNotice(check.reason);
      setBusy(false);
      return;
    }
    const booking: LocalBooking = {
      id: newBookingId(),
      code: bookingCode(),
      status: "pending_payment",
      userId: user?.id ?? "guest",
      resource: { id: resource.id, code: resource.code, name: resource.name, kind: resource.kind },
      schedule,
      amount: { subtotal: q.subtotal, gst: q.gst, total: q.total },
      guest: { name: user?.name ?? "Guest", email: user?.email ?? "", phone: user?.phone ?? "" },
      idProof: { type: idType, masked: masked || "Not provided", files: [front?.name, back?.name].filter((n): n is string => !!n) },
      paymentMode: "demo",
      createdAt: new Date().toISOString(),
    };
    setPending(booking);
    setBusy(false);
    setDemoOpen(true);
  };

  return (
    <>
      <Section n={2} title="Government ID" disabled={disabled} done={idDone} summary={!disabled && masked ? <span className="type-small nums hidden text-muted-foreground sm:inline">{masked}</span> : undefined}>
        <div className="flex flex-col gap-5">
          <p className="type-small flex items-start gap-2 text-muted-foreground">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-teal" />
            Reception checks this against you on arrival. It&apos;s how we keep the floor secure.
          </p>
          <ChipGroup
            label="ID type"
            layoutId="id-type"
            columns={5}
            value={idType}
            onChange={setIdType}
            items={ID_TYPES.map((t) => ({ value: t.value, label: t.label.replace(" card", "") }))}
            className="max-sm:!grid-cols-3"
          />
          <Field>
            <FieldLabel htmlFor="id-number">{idMeta.label} number</FieldLabel>
            <Input
              id="id-number"
              value={idNumber}
              onChange={(e) => setIdNumber(e.target.value)}
              placeholder={idMeta.placeholder}
              autoComplete="off"
              spellCheck={false}
              className="nums h-11 tracking-wider"
            />
            <FieldDescription>
              {masked ? (
                <span className="inline-flex items-center gap-1.5 text-teal">
                  <Lock className="h-3.5 w-3.5" /> Shown to reception as <span className="nums">{masked}</span>
                </span>
              ) : (
                idMeta.hint
              )}
            </FieldDescription>
          </Field>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <DropZone label="Front of ID" file={front} onFile={setFront} />
            <DropZone label="Back of ID" hint="Optional" file={back} onFile={setBack} />
          </div>
          <label className="type-small flex cursor-pointer items-start gap-3 text-foreground">
            <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5 h-5 w-5 shrink-0 accent-[#037e6e]" />
            <span>I&apos;m happy for Worklush Spaces to check this ID at the front desk.</span>
          </label>
        </div>
      </Section>

      <Section n={3} title="Pay" disabled={disabled}>
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-2">
            {["UPI", "Cards", "Netbanking", "Wallets"].map((m) => (
              <span key={m} className="type-caption rounded-full border border-border px-3 py-1.5 text-muted-foreground">
                {m}
              </span>
            ))}
          </div>
          <AnimatePresence>
            {notice && (
              <motion.p initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, transition: spring.fast.exit }} transition={spring.moderate} role="alert" className="type-small rounded-xl bg-[#fdeee6] px-4 py-3 text-[#8a3a12]">
                {notice}
              </motion.p>
            )}
          </AnimatePresence>
          <CtaButton arrow loading={busy} onClick={submit} className="w-full sm:w-fit sm:min-w-[260px]">
            Pay {inr(q.total)}
          </CtaButton>
          <p className="type-caption flex items-center gap-1.5 font-normal text-muted-foreground">
            <Lock className="h-3.5 w-3.5" /> Preview build: payment is simulated and your booking is saved in this browser.
          </p>
        </div>
      </Section>

      <DemoPayment
        open={demoOpen}
        amount={q.total}
        onClose={() => {
          setDemoOpen(false);
          setNotice("Payment window closed. Tap Pay whenever you're ready.");
        }}
        onPay={async () => {
          if (!pending) return;
          const check = checkSchedule(resource, schedule, availabilityFor(schedule.date));
          if (!check.ok) throw new Error(check.reason);
          await new Promise((r) => setTimeout(r, 500));
          const done: LocalBooking = { ...pending, status: "confirmed" };
          saveBooking(done);
          onBooked(done);
        }}
      />
    </>
  );
}

function DropZone({ label, hint, required, file, onFile, error }: { label: string; hint?: string; required?: boolean; file: File | null; onFile: (f: File | null) => void; error?: string }) {
  // Preview build: any file is accepted.
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const [local, setLocal] = useState<string | null>(null);
  const preview = useMemo(() => (file && file.type.startsWith("image/") ? URL.createObjectURL(file) : null), [file]);
  useEffect(() => () => {
    if (preview) URL.revokeObjectURL(preview);
  }, [preview]);

  const accept = (f: File | undefined) => {
    if (!f) return;
    setLocal(null);
    onFile(f);
  };
  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setOver(false);
    accept(e.dataTransfer.files?.[0]);
  };
  const shown = error || local;

  return (
    <div className="flex flex-col gap-1.5">
      <div className="type-small flex items-center justify-between">
        <span className="font-semibold text-foreground">
          {label}
          {required && <span className="text-destructive"> *</span>}
        </span>
        {hint && <span className="text-muted-foreground">{hint}</span>}
      </div>
      <AnimatePresence mode="wait" initial={false}>
        {file ? (
          <motion.div key="file" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.98, transition: spring.fast.exit }} transition={spring.moderate} className="relative flex h-28 items-center gap-3 overflow-hidden rounded-xl border border-teal/40 bg-mint/50 p-2">
            <div className="relative grid aspect-[4/3] h-full place-items-center overflow-hidden rounded-lg bg-white">
              {preview ? (
                // A blob preview; next/image can't optimise object URLs.
                // eslint-disable-next-line @next/next/no-img-element
                <img src={preview} alt={`${label} preview`} className="h-full w-full object-cover" />
              ) : (
                <FileText className="h-7 w-7 text-teal" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="type-small truncate font-semibold text-ink">{file.name}</div>
              <div className="type-caption nums font-normal text-muted-foreground">{(file.size / 1024 / 1024).toFixed(2)} MB</div>
            </div>
            <button type="button" onClick={() => onFile(null)} aria-label={`Remove ${label}`} className="grid h-9 w-9 place-items-center rounded-lg text-muted-foreground hover:bg-white hover:text-destructive">
              <Trash2 className="h-4 w-4" />
            </button>
          </motion.div>
        ) : (
          <motion.button
            key="empty"
            type="button"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: spring.fast.exit }}
            transition={spring.fast}
            onClick={() => input.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setOver(true);
            }}
            onDragLeave={() => setOver(false)}
            onDrop={onDrop}
            className={cn(
              "flex h-28 flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed text-center transition-[background-color,border-color,transform] duration-150",
              over ? "scale-[1.02] border-teal bg-mint" : shown ? "border-destructive/50 bg-[#fdf3ef]" : "border-border bg-muted/40 hover:border-teal/50 hover:bg-mint/40"
            )}
          >
            <ImageUp className={cn("h-6 w-6 transition-transform duration-200", over ? "-translate-y-1 text-teal" : "text-muted-foreground")} />
            <span className="type-small font-semibold text-foreground">Upload or drop here</span>
            <span className="type-caption font-normal text-muted-foreground">A photo or a scan</span>
          </motion.button>
        )}
      </AnimatePresence>
      <input
        ref={input}
        type="file"
        className="sr-only"
        tabIndex={-1}
        onChange={(e) => {
          accept(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      {shown && <p className="type-caption font-normal text-destructive">{shown}</p>}
    </div>
  );
}

function DemoPayment({ open, amount, onClose, onPay }: { open: boolean; amount: number; onClose: () => void; onPay: () => Promise<void> }) {
  const [method, setMethod] = useState<"upi" | "card">("upi");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const esc = (e: KeyboardEvent) => e.key === "Escape" && !busy && onClose();
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [open, busy, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-[70] grid place-items-end bg-ink/50 backdrop-blur-sm sm:place-items-center sm:p-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, transition: spring.slow.exit }} transition={spring.slow}>
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Demo payment"
            initial={{ y: 40, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 24, opacity: 0, transition: spring.slow.exit }}
            transition={spring.slow}
            className="w-full max-w-md rounded-t-3xl bg-white p-6 shadow-2xl sm:rounded-3xl"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className="type-caption rounded-full bg-ember/15 px-2.5 py-1 text-[#9a3f12]">Demo mode · no money moves</span>
                <h3 className="type-h3 nums mt-3 text-ink">Pay {inr(amount)}</h3>
                <p className="type-small mt-1 text-muted-foreground">This is a preview of the booking flow. Payment is simulated and nothing is charged; your booking is saved in this browser.</p>
              </div>
              <button type="button" onClick={onClose} disabled={busy} aria-label="Close" className="grid h-10 w-10 shrink-0 place-items-center rounded-full hover:bg-hover">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-2">
              {(
                [
                  { id: "upi", label: "UPI", icon: Smartphone },
                  { id: "card", label: "Card", icon: CreditCard },
                ] as const
              ).map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setMethod(m.id)}
                  aria-pressed={method === m.id}
                  className={cn("type-body flex h-14 items-center justify-center gap-2 rounded-2xl border font-semibold transition-colors duration-100", method === m.id ? "border-ink bg-ink text-white" : "border-border hover:bg-hover")}
                >
                  <m.icon className="h-4 w-4" /> {m.label}
                </button>
              ))}
            </div>
            {error && <p className="type-small mt-4 rounded-xl bg-[#fdeee6] px-3 py-2 text-[#8a3a12]">{error}</p>}
            <CtaButton
              className="mt-5 w-full"
              loading={busy}
              onClick={async () => {
                setBusy(true);
                setError(null);
                try {
                  await onPay();
                } catch (err) {
                  setError(err instanceof Error ? err.message : "That didn't go through.");
                  setBusy(false);
                }
              }}
            >
              Complete demo payment
            </CtaButton>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
