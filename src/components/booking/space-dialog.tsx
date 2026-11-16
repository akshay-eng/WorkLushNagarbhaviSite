"use client";

import { AnimatePresence, motion } from "motion/react";
import { Armchair, Box, Check, Crown, MessageCircle, Mic, Presentation, Users } from "lucide-react";
import { useMemo } from "react";
import { CtaButton } from "@/components/site/cta";
import { kindLabel, modesFor, monthPrice, type Mode, type Resource, type ResourceKind } from "@/data/floor";
import { site } from "@/data/site";
import { freeStarts, letOn, statusFor, type Availability, type Status } from "@/lib/booking/availability";
import { CLOSE_HOUR, DAY_END, DAY_START, OPEN_HOUR, formatDay, formatHour, formatRange } from "@/lib/booking/dates";
import { HOUR_PACKAGES, MONTH_TERMS, inr, priceDetail, quote } from "@/lib/booking/pricing";
import { spring } from "@/lib/springs";
import { cn } from "@/lib/utils";
import { ChipGroup } from "./chips";
import { DialogShell } from "./dialog-shell";
import { StatusDot } from "./floor-plan-2d";
import { PhotoGallery } from "./photo-gallery";
import { modeFor, scheduleFor, type Draft } from "./selection";

export const KIND_ICON: Record<ResourceKind, typeof Armchair> = {
  desk: Armchair,
  boss: Crown,
  cabin: Users,
  conference: Presentation,
  podcast: Mic,
};

const MODE_LABEL: Record<Mode, string> = { day: "Day pass", hour: "By the hour", month: "By the month" };

export function SpaceDialog({
  resource,
  open,
  onClose,
  availability,
  draft,
  onDraft,
  onContinue,
  onStepInside,
}: {
  resource: Resource | null;
  open: boolean;
  onClose: () => void;
  availability: Availability | null;
  draft: Draft;
  onDraft: (patch: Partial<Draft>) => void;
  onContinue: () => void;
  onStepInside: () => void;
}) {
  return (
    <DialogShell open={open && !!resource} onClose={onClose} label={resource ? resource.name : "Space"} className="sm:max-w-[1040px]">
      {resource && (
        <SpaceDetails
          resource={resource}
          availability={availability}
          draft={draft}
          onDraft={onDraft}
          onContinue={onContinue}
          onStepInside={onStepInside}
        />
      )}
    </DialogShell>
  );
}

function SpaceDetails({
  resource,
  availability,
  draft,
  onDraft,
  onContinue,
  onStepInside,
}: {
  resource: Resource;
  availability: Availability | null;
  draft: Draft;
  onDraft: (patch: Partial<Draft>) => void;
  onContinue: () => void;
  onStepInside: () => void;
}) {
  const status: Status = statusFor(resource, availability);
  const Icon = KIND_ICON[resource.kind];
  const modes = modesFor(resource);
  const mode = modeFor(resource, draft.mode);
  const schedule = scheduleFor(resource, draft);
  const month = monthPrice(resource);
  const q = useMemo(() => {
    if (!schedule) return null;
    try {
      return quote(resource, schedule);
    } catch {
      return null;
    }
  }, [resource, schedule]);

  const starts = useMemo(
    () => (mode === "hour" && availability ? freeStarts(resource, draft.date, draft.hours, availability) : []),
    [resource, mode, draft.date, draft.hours, availability]
  );

  const deskBooked = mode === "day" && status === "booked";
  const isLet = availability ? letOn(resource.id, availability) : false;
  const startMissing = mode === "hour" && draft.hours !== 9 && (draft.start === null || !starts.includes(draft.start));
  const fullDayTaken = mode === "hour" && draft.hours === 9 && !starts.includes(DAY_START);
  const monthOnRequest = mode === "month" && !month;
  const canContinue = !!q && !!availability && !deskBooked && !isLet && !startMissing && !fullDayTaken && !monthOnRequest;

  return (
    <div className="grid gap-0 sm:grid-cols-[1.1fr_1fr]">
      {/* Photos */}
      <div className="p-4 pt-3 sm:p-6 sm:pr-3">
        <PhotoGallery photos={resource.photos} alt={resource.name} />
        <button
          type="button"
          onClick={onStepInside}
          className="group mt-4 flex w-full items-center gap-3 rounded-2xl border border-dashed border-teal/40 bg-mint/50 px-4 py-3 text-left transition-colors duration-150 hover:border-teal hover:bg-mint"
        >
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-ink text-lime transition-transform duration-300 ease-out-premium group-hover:rotate-[-8deg] group-hover:scale-105">
            <Box className="h-5 w-5" />
          </span>
          <span className="flex-1">
            <span className="type-title block text-ink">Step inside in 3D</span>
            <span className="type-small block text-muted-foreground">Look around from {resource.kind === "desk" ? "this seat" : "inside the room"} before you book.</span>
          </span>
        </button>
      </div>

      {/* Details and booking */}
      <div className="flex flex-col gap-5 p-5 pt-1 sm:p-6 sm:pl-3 sm:pt-6">
        <div className="pr-12">
          <span className="type-caption inline-flex items-center gap-1.5 rounded-full bg-mint px-2.5 py-1 text-teal">
            <Icon className="h-3.5 w-3.5" /> {kindLabel[resource.kind]}
          </span>
          <h2 className="type-h2 mt-2 flex items-center gap-2.5 text-ink">
            {resource.name}
            <span className="type-small nums rounded-md bg-lime px-1.5 font-semibold text-ink">{resource.code}</span>
          </h2>
          <div className="type-small mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">
            <span className="inline-flex items-center gap-1.5 font-semibold text-ink">
              <StatusDot status={status} />
              {isLet ? "Let to a member team" : status === "available" ? "Free" : status === "partial" ? "Some slots free" : "Booked"} on {formatDay(draft.date)}
            </span>
            <span className="inline-flex items-center gap-1.5 text-muted-foreground">
              <Users className="h-4 w-4" /> {resource.capacity} {resource.capacity === 1 ? "person" : "seats"}
            </span>
          </div>
          <p className="type-body mt-3 text-muted-foreground">{resource.blurb}</p>
          <p className="type-small nums mt-1 text-teal">{priceDetail(resource)} · plus GST</p>
        </div>

        <ul className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
          {resource.features.map((f) => (
            <li key={f} className="type-small flex items-start gap-2 text-foreground">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-teal" /> {f}
            </li>
          ))}
        </ul>

        <section aria-labelledby="when" className="flex flex-col gap-3 rounded-2xl border border-border p-4">
          <div className="flex items-center justify-between gap-3">
            <h3 id="when" className="type-title text-ink">
              When
            </h3>
            <span className="type-small text-muted-foreground">{formatDay(draft.date, { weekday: "long" })}</span>
          </div>

          {modes.length > 1 && (
            <ChipGroup
              label="Booking type"
              layoutId={`mode-${resource.id}`}
              columns={modes.length}
              value={mode}
              onChange={(m) => onDraft({ mode: m, start: null })}
              items={modes.map((m) => ({ value: m, label: MODE_LABEL[m] }))}
            />
          )}

          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={mode}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4, transition: spring.moderate.exit }}
              transition={spring.moderate}
              className="flex flex-col gap-3"
            >
              {mode === "day" && (
                <p className="type-small rounded-xl bg-mint/60 px-3 py-2.5 text-foreground">
                  <span className="font-semibold">Day pass</span> · {formatRange(DAY_START, DAY_END)}. Change the day with the dates above the plan.
                </p>
              )}

              {mode === "hour" && (
                <>
                  <ChipGroup
                    label="How long"
                    layoutId={`len-${resource.id}`}
                    columns={4}
                    value={draft.hours}
                    onChange={(hours) => onDraft({ hours, start: hours === 9 ? DAY_START : null })}
                    items={HOUR_PACKAGES.map((p) => ({ value: p.hours, label: p.label, sub: inr((resource.pricing.hour ?? 0) * p.hours) }))}
                  />
                  {isLet ? (
                    <Notice>This cabin is let to a member team that day. Try another date or another cabin.</Notice>
                  ) : draft.hours === 9 ? (
                    fullDayTaken ? <Notice>Part of the day is already booked. Try a shorter slot or another date.</Notice> : <p className="type-small rounded-xl bg-mint/60 px-3 py-2.5">Full day · {formatRange(DAY_START, DAY_END)}</p>
                  ) : starts.length === 0 && availability ? (
                    <Notice>No {draft.hours}-hour gap left on {formatDay(draft.date)}. Try a shorter booking or another day.</Notice>
                  ) : (
                    <>
                      <p className="type-caption text-muted-foreground">Start time · bookable {formatHour(OPEN_HOUR)} – {formatHour(CLOSE_HOUR)}</p>
                      <ChipGroup
                        label="Start time"
                        layoutId={`start-${resource.id}`}
                        columns={5}
                        value={draft.start}
                        onChange={(start) => onDraft({ start })}
                        items={Array.from({ length: CLOSE_HOUR - OPEN_HOUR - draft.hours + 1 }, (_, i) => OPEN_HOUR + i).map((h) => ({
                          value: h,
                          label: formatHour(h),
                          disabled: !starts.includes(h),
                          ariaLabel: `${formatRange(h, h + draft.hours)}${starts.includes(h) ? "" : ", unavailable"}`,
                        }))}
                      />
                    </>
                  )}
                </>
              )}

              {mode === "month" &&
                (month ? (
                  <>
                    <ChipGroup
                      label="Term"
                      layoutId={`term-${resource.id}`}
                      columns={3}
                      value={draft.months}
                      onChange={(months) => onDraft({ months })}
                      items={MONTH_TERMS.map((m) => ({ value: m, label: `${m} month${m > 1 ? "s" : ""}`, sub: m === 1 ? "No lock-in" : "Billed monthly" }))}
                    />
                    <p className="type-small text-muted-foreground">
                      Moving in on <span className="font-semibold text-foreground">{formatDay(draft.date, { year: "numeric" })}</span>.{" "}
                      {month.listAmount && <span className="line-through">{inr(month.listAmount)}</span>}{" "}
                      <span className="font-semibold text-teal">{inr(month.amount)}</span> a month.
                    </p>
                  </>
                ) : (
                  <div className="flex flex-col gap-3 rounded-xl bg-mint/60 p-3">
                    <p className="type-small text-foreground">Monthly rates for this cabin are on request. Tell us your team size and start date and we&apos;ll quote within the day.</p>
                    <a
                      href={`${site.whatsappHref}?text=${encodeURIComponent(`Hi, I'd like a monthly quote for ${resource.name} at Worklush.`)}`}
                      target="_blank"
                      rel="noreferrer"
                      className="type-small inline-flex h-11 w-fit items-center gap-2 rounded-full bg-[#25d366] px-4 font-semibold text-white"
                    >
                      <MessageCircle className="h-4 w-4" /> Ask on WhatsApp
                    </a>
                  </div>
                ))}
            </motion.div>
          </AnimatePresence>
        </section>

        {deskBooked && <Notice>{resource.name} is booked on {formatDay(draft.date)}. Pick another day, or another desk on the plan.</Notice>}

        <div className="sticky bottom-0 -mx-5 mt-auto border-t border-border bg-card/95 px-5 pb-5 pt-4 backdrop-blur sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:p-0">
          <div className="mb-3 flex items-baseline justify-between">
            <span className="type-small text-muted-foreground">{q ? `${q.lines[0].label} + GST` : mode === "hour" ? "Pick a start time" : "Total"}</span>
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.span
                key={q?.total ?? "none"}
                initial={{ opacity: 0, y: 8, filter: "blur(4px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                exit={{ opacity: 0, y: -8, filter: "blur(4px)", transition: spring.moderate.exit }}
                transition={spring.moderate}
                className="type-h3 nums text-ink"
              >
                {q ? inr(q.total) : "—"}
              </motion.span>
            </AnimatePresence>
          </div>
          <CtaButton arrow onClick={onContinue} disabled={!canContinue} className="w-full">
            {q ? `Reserve · ${inr(q.total)}` : "Reserve"}
          </CtaButton>
        </div>
      </div>
    </div>
  );
}

function Notice({ children, className }: { children: React.ReactNode; className?: string }) {
  return <p className={cn("type-small rounded-xl bg-[#fdeee6] px-3 py-2.5 text-[#8a3a12]", className)}>{children}</p>;
}
