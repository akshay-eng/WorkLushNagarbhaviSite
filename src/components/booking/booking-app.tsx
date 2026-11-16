"use client";

import dynamic from "next/dynamic";
import { AnimatePresence, motion } from "motion/react";
import { Box, Map as MapIcon } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { desks, kindLabel, resourceById, rooms, zoneById, type ResourceKind, type Zone } from "@/data/floor";
import { statusFor } from "@/lib/booking/availability";
import { DAY_END, addDays, currentHourIST, todayIST } from "@/lib/booking/dates";
import { inr, priceLabel, quote } from "@/lib/booking/pricing";
import { spring } from "@/lib/springs";
import { cn } from "@/lib/utils";
import { CtaButton } from "@/components/site/cta";
import { ChipGroup } from "./chips";
import { CheckoutView } from "./checkout-view";
import type { ConfirmedBooking } from "./checkout-step";
import { DateStrip } from "./date-strip";
import { DoneStep } from "./done-step";
import { FloorPlan2D, StatusDot } from "./floor-plan-2d";
import { Floor3DLoading } from "./floor-3d/loading";
import { Legend } from "./legend";
import { clearDraft, loadDraft, modeFor, saveDraft, scheduleFor, type Draft } from "./selection";
import { KIND_ICON, SpaceDialog } from "./space-dialog";
import { useAvailability } from "./use-availability";
import { ZoneDialog } from "./zone-dialog";

const Floor3D = dynamic(() => import("./floor-3d/scene"), { ssr: false, loading: () => <Floor3DLoading /> });
const preload3D = () => void import("./floor-3d/scene");

type Step = "choose" | "checkout" | "done";
type View = "2d" | "3d";
type Filter = ResourceKind | "all";

const FILTERS: { value: Filter; label: string }[] = [
  { value: "all", label: "Everything" },
  { value: "desk", label: "Open desks" },
  { value: "boss", label: "Boss cabins" },
  { value: "cabin", label: "Team cabins" },
  { value: "conference", label: "Conference" },
  { value: "podcast", label: "Podcast" },
];

function firstDay() {
  const today = todayIST();
  return currentHourIST() >= DAY_END ? addDays(today, 1) : today;
}

export default function BookingApp() {
  // Client-only component: deep links (/book?space=podcast, ?kind=cabin,
  // ?view=3d) are read straight from the URL on first render.
  const [params] = useState(() => new URLSearchParams(window.location.search));
  const [draft, setDraftState] = useState<Draft>(() => {
    const space = params.get("space");
    const base: Draft = { resourceId: null, date: firstDay(), mode: "day", hours: 1, start: null, months: 1, ...loadDraft() };
    if (space && resourceById.has(space)) {
      const r = resourceById.get(space)!;
      return { ...base, resourceId: space, start: null, mode: modeFor(r, base.mode) };
    }
    return base;
  });
  const [filter, setFilter] = useState<Filter>(() => {
    const kind = params.get("kind");
    return kind && kind in kindLabel ? (kind as ResourceKind) : "all";
  });
  const [dialogOpen, setDialogOpen] = useState(() => !!params.get("space") && resourceById.has(params.get("space")!));
  const [zone, setZone] = useState<Zone | null>(null);
  const [step, setStep] = useState<Step>("choose");
  const [view, setView] = useState<View>(() => (params.get("view") === "3d" ? "3d" : "2d"));
  const [exiting3D, setExiting3D] = useState(false);
  const [ready3D, setReady3D] = useState(false);
  const [booking, setBooking] = useState<ConfirmedBooking | null>(null);

  const { availability, loading, error } = useAvailability(draft.date);
  const resource = draft.resourceId ? resourceById.get(draft.resourceId) ?? null : null;
  const schedule = resource ? scheduleFor(resource, draft) : null;
  const q = useMemo(() => {
    if (!resource || !schedule) return null;
    try {
      return quote(resource, schedule);
    } catch {
      return null;
    }
  }, [resource, schedule]);

  const setDraft = useCallback((patch: Partial<Draft>) => {
    setDraftState((d) => {
      const next = { ...d, ...patch };
      saveDraft(next);
      return next;
    });
  }, []);

  const select = useCallback(
    (id: string, openDetails = true) => {
      const r = resourceById.get(id);
      if (!r) return;
      setDraftState((d) => {
        const next = { ...d, resourceId: id, start: d.resourceId === id ? d.start : null, mode: modeFor(r, d.mode) };
        saveDraft(next);
        return next;
      });
      if (openDetails) setDialogOpen(true);
    },
    []
  );

  const enter3D = () => {
    preload3D();
    setReady3D(false);
    setExiting3D(false);
    setDialogOpen(false);
    setView("3d");
  };
  const exit3D = () => setExiting3D(true);

  const reserve = () => {
    if (!resource) return;
    if (!q) {
      setDialogOpen(true);
      return;
    }
    setDialogOpen(false);
    setStep("checkout");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const counts = useMemo(() => {
    const freeDesks = desks.filter((d) => statusFor(d, availability) === "available").length;
    const freeRooms = rooms.filter((r) => statusFor(r, availability) !== "booked").length;
    return { freeDesks, freeRooms };
  }, [availability]);

  if (step === "done" && booking) {
    return (
      <DoneStep
        booking={booking}
        onAnother={() => {
          setBooking(null);
          setDraftState({ resourceId: null, date: firstDay(), mode: "day", hours: 1, start: null, months: 1 });
          setStep("choose");
        }}
      />
    );
  }

  if (step === "checkout" && resource && schedule) {
    return (
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={spring.slow}>
        <CheckoutView
          resource={resource}
          schedule={schedule}
          onBack={() => {
            setStep("choose");
            setDialogOpen(true);
          }}
          onBooked={(b) => {
            setBooking(b);
            setStep("done");
            clearDraft();
            window.scrollTo({ top: 0 });
          }}
        />
      </motion.div>
    );
  }

  const highlight: ResourceKind[] = filter === "all" ? [] : [filter];

  return (
    <div className="flex flex-col lg:h-[calc(100dvh-64px)]">
      {/* Toolbar */}
      <div className="border-b border-border bg-card/85 backdrop-blur">
        <div className="mx-auto flex max-w-[1400px] flex-col gap-3 px-3 py-3 sm:px-5 xl:flex-row xl:items-center">
          <div className="min-w-0 flex-1">
            <DateStrip value={draft.date} onChange={(date) => setDraft({ date, start: null })} />
          </div>
          <div className="flex min-w-0 items-center gap-3">
            <div className="no-scrollbar min-w-0 flex-1 overflow-x-auto">
              <ChipGroup label="Show" layoutId="filter-pill" value={filter} onChange={setFilter} items={FILTERS} itemClassName="shrink-0 whitespace-nowrap px-3.5" />
            </div>
            <div className="hidden sm:block">
              <ViewToggle view={view} onChange={(v) => (v === "3d" ? enter3D() : exit3D())} onHover3D={preload3D} busy={exiting3D} />
            </div>
          </div>
        </div>
      </div>

      {/* Stage */}
      <div className="relative h-[74svh] min-h-[520px] overflow-hidden lg:h-auto lg:min-h-0 lg:flex-1">
        <motion.div
          className="plan-grid absolute inset-0 px-2 pb-24 pt-16 sm:px-6 sm:pb-6 sm:pt-5"
          initial={false}
          animate={view === "3d" && ready3D ? { opacity: 0, scale: 1.04, filter: "blur(2px)" } : { opacity: 1, scale: 1, filter: "blur(0px)" }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          style={{ pointerEvents: view === "3d" ? "none" : "auto" }}
          aria-hidden={view === "3d"}
        >
          <FloorPlan2D
            availability={availability}
            selectedId={draft.resourceId}
            onSelect={(id) => select(id)}
            onZone={(id) => setZone(zoneById.get(id) ?? null)}
            highlightKinds={highlight}
            controlsClassName="right-3 bottom-24 sm:bottom-5 sm:right-5"
          />
        </motion.div>

        {/* Phones: the view switch floats on the map */}
        {view === "2d" && (
          <div className="absolute right-3 top-3 z-20 sm:hidden">
            <ViewToggle view={view} onChange={(v) => (v === "3d" ? enter3D() : exit3D())} onHover3D={preload3D} busy={exiting3D} />
          </div>
        )}

        {/* At a glance, on wide screens */}
        {view === "2d" && (
          <div className="pointer-events-none absolute left-5 top-5 hidden w-[260px] flex-col gap-3 xl:flex">
            <div className="pointer-events-auto rounded-2xl border border-border bg-card/95 p-4 shadow-sm backdrop-blur">
              <div className="type-caption text-muted-foreground">On this day</div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="type-h2 nums text-ink">{availability ? counts.freeDesks : "—"}</span>
                <span className="type-small text-muted-foreground">of {desks.length} desks free</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="type-h2 nums text-ink">{availability ? counts.freeRooms : "—"}</span>
                <span className="type-small text-muted-foreground">of {rooms.length} rooms open</span>
              </div>
              <p className="type-small mt-3 text-muted-foreground">Tap any desk, cabin or room to see real photos and book it. Tap the lounge, café or window bar to look around.</p>
            </div>
            <div className="pointer-events-auto rounded-2xl border border-border bg-card/95 p-4 shadow-sm backdrop-blur">
              <Legend className="flex-col items-start gap-y-2" />
            </div>
          </div>
        )}

        <AnimatePresence>
          {view === "3d" && (
            <motion.div key="3d" className="absolute inset-0" initial={{ opacity: 0 }} animate={{ opacity: ready3D ? 1 : 0.001 }} exit={{ opacity: 0, transition: { duration: 0.35 } }} transition={{ duration: 0.4 }}>
              <Floor3D
                availability={availability}
                selectedId={draft.resourceId}
                onSelect={(id) => select(id, false)}
                exiting={exiting3D}
                onReady={() => setReady3D(true)}
                onExited={() => {
                  setView("2d");
                  setExiting3D(false);
                }}
                onRequestExit={exit3D}
              />
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {(loading && !availability) || error ? (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, transition: spring.fast.exit }}
              className={cn("type-small absolute left-1/2 top-3 z-10 -translate-x-1/2 rounded-full px-3 py-1.5 shadow", error ? "bg-[#fdeee6] text-[#8a3a12]" : "bg-card text-muted-foreground")}
            >
              {error ? `${error}. Retrying…` : "Checking who's in…"}
            </motion.div>
          ) : null}
        </AnimatePresence>

        {/* Selection bar */}
        <AnimatePresence>
          {resource && !dialogOpen && (
            <motion.div
              key="bar"
              initial={{ y: 24, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 24, opacity: 0, transition: spring.moderate.exit }}
              transition={spring.slow}
              className={cn("absolute inset-x-3 z-20 mx-auto max-w-xl", view === "3d" ? "bottom-20 sm:bottom-5 sm:left-auto sm:right-5 sm:mx-0 sm:w-[540px]" : "bottom-3 sm:bottom-5")}
            >
              <SelectionBar
                name={resource.name}
                code={resource.code}
                kind={resource.kind}
                detail={statusFor(resource, availability) === "booked" && resource.kind === "desk" ? "Booked that day" : q ? `${inr(q.total)} incl. GST` : priceLabel(resource)}
                status={statusFor(resource, availability)}
                onDetails={() => setDialogOpen(true)}
                onReserve={reserve}
                ready={!!q}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <SpaceDialog
        resource={resource}
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        availability={availability}
        draft={draft}
        onDraft={setDraft}
        onContinue={reserve}
        onStepInside={enter3D}
      />
      <ZoneDialog zone={zone} onClose={() => setZone(null)} />
    </div>
  );
}

function SelectionBar({
  name,
  code,
  kind,
  detail,
  status,
  onDetails,
  onReserve,
  ready,
}: {
  name: string;
  code: string;
  kind: ResourceKind;
  detail: string;
  status: ReturnType<typeof statusFor>;
  onDetails: () => void;
  onReserve: () => void;
  ready: boolean;
}) {
  const Icon = KIND_ICON[kind];
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-ink p-2.5 pl-3 text-white shadow-2xl">
      <button type="button" onClick={onDetails} className="flex min-w-0 flex-1 items-center gap-3 text-left">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white/10 text-lime">
          <Icon className="h-5 w-5" />
        </span>
        <span className="min-w-0">
          <span className="type-title flex items-center gap-2">
            <span className="nums text-lime">{code}</span>
            <span className="truncate">{name}</span>
          </span>
          <span className="type-caption flex items-center gap-1.5 whitespace-nowrap font-normal text-white/70">
            <StatusDot status={status} /> {detail}
          </span>
        </span>
      </button>
      <button type="button" onClick={onDetails} className="type-small hidden h-10 rounded-full px-3 font-semibold text-white/85 hover:bg-white/10 sm:inline-flex sm:items-center">
        Photos & details
      </button>
      <CtaButton onClick={ready ? onReserve : onDetails} className="type-small h-10 px-4" arrow={ready}>
        {ready ? "Reserve" : "Pick a time"}
      </CtaButton>
    </div>
  );
}

function ViewToggle({ view, onChange, onHover3D, busy }: { view: View; onChange: (v: View) => void; onHover3D: () => void; busy: boolean }) {
  const items: { v: View; label: string; icon: typeof MapIcon }[] = [
    { v: "2d", label: "Plan", icon: MapIcon },
    { v: "3d", label: "3D walk", icon: Box },
  ];
  return (
    <div role="tablist" aria-label="View" className="relative grid shrink-0 grid-cols-2 rounded-2xl bg-mint p-1">
      {items.map((it) => {
        const active = view === it.v;
        return (
          <button
            key={it.v}
            role="tab"
            aria-selected={active}
            disabled={busy}
            onClick={() => !active && onChange(it.v)}
            onPointerEnter={it.v === "3d" ? onHover3D : undefined}
            onFocus={it.v === "3d" ? onHover3D : undefined}
            className={cn("type-small relative z-[1] inline-flex h-10 items-center justify-center gap-2 rounded-xl px-4 font-semibold transition-colors duration-150", active ? "text-white" : "text-ink/70 hover:text-ink")}
          >
            {active && <motion.span layoutId="view-pill" transition={spring.moderate} className="absolute inset-0 -z-[1] rounded-xl bg-ink shadow-md" />}
            <it.icon className={cn("h-4 w-4", active && "text-lime")} />
            {it.label}
          </button>
        );
      })}
    </div>
  );
}
