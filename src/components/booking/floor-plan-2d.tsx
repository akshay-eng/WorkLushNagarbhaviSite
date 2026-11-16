"use client";

import { AnimatePresence, motion } from "motion/react";
import { Minus, Plus, Scan } from "lucide-react";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type KeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import {
  ENTRANCE,
  FLOOR,
  OUTLINE,
  clusterTable,
  clusters,
  desks,
  doors,
  fittings,
  kindLabel,
  rooms,
  walls,
  zones,
  type Chair,
  type DeskResource,
  type Door,
  type Resource,
  type ResourceKind,
  type RoomResource,
  type Table,
  type Zone,
} from "@/data/floor";
import { statusFor, type Availability, type Status } from "@/lib/booking/availability";
import { priceLabel } from "@/lib/booking/pricing";
import { spring } from "@/lib/springs";
import { cn } from "@/lib/utils";

type ViewBox = { x: number; y: number; w: number; h: number };
const PAD = 0.9;
const FULL: ViewBox = { x: -PAD, y: -PAD, w: FLOOR.width + PAD * 2, h: FLOOR.depth + PAD * 2 };
const MIN_W = 6;
const INK = "#023c40";
const TEAL = "#037e6e";

// A clock that ticks once a minute, read only in the browser: the plan also
// renders on the server, where "now" would mismatch on hydration.
const minuteListeners = new Set<() => void>();
let minuteTimer: number | null = null;
function subscribeMinute(cb: () => void) {
  minuteListeners.add(cb);
  if (minuteTimer === null) minuteTimer = window.setInterval(() => minuteListeners.forEach((l) => l()), 60_000);
  return () => {
    minuteListeners.delete(cb);
    if (minuteListeners.size === 0 && minuteTimer !== null) {
      window.clearInterval(minuteTimer);
      minuteTimer = null;
    }
  };
}
const minuteNow = () => Math.floor(Date.now() / 60_000);
const minuteServer = () => 0;

const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

export type FloorPlanProps = {
  availability: Availability | null;
  selectedId: string | null;
  onSelect?: (id: string) => void;
  /** Shared areas (lounge, café…) open their photos. */
  onZone?: (id: string) => void;
  /** Kinds that stay bright; the rest dim. Empty = all. */
  highlightKinds?: ResourceKind[];
  /** Static thumbnail: no pan/zoom, no tooltips. */
  preview?: boolean;
  className?: string;
  /** Where the zoom buttons sit. */
  controlsClassName?: string;
};

const STATUS_COPY: Record<Status, string> = { available: "Free", partial: "Some slots free", booked: "Booked" };

export function FloorPlan2D({
  availability,
  selectedId,
  onSelect,
  onZone,
  highlightKinds = [],
  preview = false,
  className,
  controlsClassName = "bottom-3 right-3",
}: FloorPlanProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [vb, setVb] = useState<ViewBox>(FULL);
  const vbRef = useRef(vb);
  useLayoutEffect(() => {
    vbRef.current = vb;
  }, [vb]);
  const anim = useRef<number | null>(null);
  const [hover, setHover] = useState<{ id: string; left: number; top: number } | null>(null);
  const minute = useSyncExternalStore(subscribeMinute, minuteNow, minuteServer);
  const now = useMemo(() => (minute ? new Date(minute * 60_000) : undefined), [minute]);

  const statuses = useMemo(() => {
    const map = new Map<string, Status>();
    for (const r of [...desks, ...rooms]) map.set(r.id, statusFor(r, availability, now));
    return map;
  }, [availability, now]);

  // --- view box ----------------------------------------------------------
  const animateTo = useCallback((target: ViewBox, ms = 520) => {
    if (anim.current) cancelAnimationFrame(anim.current);
    const from = vbRef.current;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      anim.current = requestAnimationFrame(() => setVb(target));
      return;
    }
    const t0 = performance.now();
    const step = (t: number) => {
      const k = ease(Math.min(1, (t - t0) / ms));
      setVb({
        x: from.x + (target.x - from.x) * k,
        y: from.y + (target.y - from.y) * k,
        w: from.w + (target.w - from.w) * k,
        h: from.h + (target.h - from.h) * k,
      });
      if (k < 1) anim.current = requestAnimationFrame(step);
    };
    anim.current = requestAnimationFrame(step);
  }, []);

  const clamp = useCallback((v: ViewBox): ViewBox => {
    const w = Math.min(FULL.w, Math.max(MIN_W, v.w));
    const h = w * (FULL.h / FULL.w);
    return {
      x: Math.min(FULL.x + FULL.w - w, Math.max(FULL.x, v.x)),
      y: Math.min(FULL.y + FULL.h - h, Math.max(FULL.y, v.y)),
      w,
      h,
    };
  }, []);

  const zoomBy = useCallback(
    (factor: number, cx?: number, cy?: number) => {
      const v = vbRef.current;
      const px = cx ?? v.x + v.w / 2;
      const py = cy ?? v.y + v.h / 2;
      const w = v.w * factor;
      const h = v.h * factor;
      return clamp({ x: px - ((px - v.x) / v.w) * w, y: py - ((py - v.y) / v.h) * h, w, h });
    },
    [clamp]
  );

  // On small screens the whole floor is tiny: glide in on the selection.
  useEffect(() => {
    if (preview || !selectedId) return;
    const el = wrapRef.current;
    if (!el || el.clientWidth > 560) return;
    const r = [...desks, ...rooms].find((x) => x.id === selectedId);
    if (!r) return;
    const c = r.kind === "desk" ? { x: r.seat.x, y: r.seat.y } : { x: r.rect.x + r.rect.w / 2, y: r.rect.y + r.rect.h / 2 };
    const w = 11;
    const h = (w * FULL.h) / FULL.w;
    animateTo(clamp({ x: c.x - w / 2, y: c.y - h / 2, w, h }));
  }, [selectedId, preview, animateTo, clamp]);

  // --- pointer pan / pinch / wheel ----------------------------------------
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const drag = useRef<{ moved: boolean; startVb: ViewBox; sx: number; sy: number; pinch?: number } | null>(null);
  const suppressClick = useRef(false);

  const toSvg = (clientX: number, clientY: number) => {
    const rect = svgRef.current!.getBoundingClientRect();
    const v = vbRef.current;
    const scale = Math.min(rect.width / v.w, rect.height / v.h);
    const ox = (rect.width - v.w * scale) / 2;
    const oy = (rect.height - v.h * scale) / 2;
    return { x: v.x + (clientX - rect.left - ox) / scale, y: v.y + (clientY - rect.top - oy) / scale, scale };
  };

  const onPointerDown = (e: ReactPointerEvent) => {
    if (preview) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 1) {
      drag.current = { moved: false, startVb: vbRef.current, sx: e.clientX, sy: e.clientY };
      suppressClick.current = false;
    } else if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      drag.current = { moved: true, startVb: vbRef.current, sx: (a.x + b.x) / 2, sy: (a.y + b.y) / 2, pinch: Math.hypot(a.x - b.x, a.y - b.y) };
    }
  };

  const onPointerMove = (e: ReactPointerEvent) => {
    if (preview || !drag.current || !pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const d = drag.current;
    if (pointers.current.size === 2 && d.pinch) {
      const [a, b] = [...pointers.current.values()];
      const factor = d.pinch / Math.hypot(a.x - b.x, a.y - b.y);
      const mid = toSvg((a.x + b.x) / 2, (a.y + b.y) / 2);
      const v = d.startVb;
      const w = v.w * factor;
      const h = v.h * factor;
      setVb(clamp({ x: mid.x - ((mid.x - v.x) / v.w) * w, y: mid.y - ((mid.y - v.y) / v.h) * h, w, h }));
      return;
    }
    const dx = e.clientX - d.sx;
    const dy = e.clientY - d.sy;
    if (!d.moved && Math.hypot(dx, dy) < 5) return;
    if (!d.moved) {
      d.moved = true;
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    }
    suppressClick.current = true;
    setHover(null);
    const { scale } = toSvg(e.clientX, e.clientY);
    setVb(clamp({ ...d.startVb, x: d.startVb.x - dx / scale, y: d.startVb.y - dy / scale }));
  };

  const endPointer = (e: ReactPointerEvent) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size === 0) drag.current = null;
  };

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg || preview) return;
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && Math.abs(e.deltaY) < 1) return;
      e.preventDefault();
      setHover(null);
      const p = toSvg(e.clientX, e.clientY);
      setVb(zoomBy(Math.exp(e.deltaY * 0.0022), p.x, p.y));
    };
    svg.addEventListener("wheel", onWheel, { passive: false });
    return () => svg.removeEventListener("wheel", onWheel);
  }, [preview, zoomBy]);

  // --- interaction ------------------------------------------------------
  const activate = (fn?: () => void) => {
    if (suppressClick.current) {
      suppressClick.current = false;
      return;
    }
    fn?.();
  };
  const onKey = (e: KeyboardEvent, fn?: () => void) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      fn?.();
    }
  };
  const showHover = (id: string, x: number, y: number) => {
    if (preview || drag.current?.moved || !svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const v = vbRef.current;
    const scale = Math.min(rect.width / v.w, rect.height / v.h);
    const ox = (rect.width - v.w * scale) / 2;
    const oy = (rect.height - v.h * scale) / 2;
    setHover({ id, left: ox + (x - v.x) * scale, top: oy + (y - v.y) * scale });
  };

  const dim = (kind: ResourceKind) => highlightKinds.length > 0 && !highlightKinds.includes(kind);
  const zoomed = vb.w < FULL.w - 0.5;
  const tooltip = useMemo(() => {
    if (!hover) return null;
    const r = [...desks, ...rooms].find((x) => x.id === hover.id);
    return r ? { r, left: hover.left, top: hover.top } : null;
  }, [hover]);

  const outline = OUTLINE.map(([x, y]) => `${x},${y}`).join(" ");
  const entranceY = (ENTRANCE.from + ENTRANCE.to) / 2;

  return (
    <div ref={wrapRef} className={cn("relative h-full w-full select-none", className)}>
      <svg
        ref={svgRef}
        viewBox={`${vb.x} ${vb.y} ${vb.w} ${vb.h}`}
        preserveAspectRatio="xMidYMid meet"
        className={cn("h-full w-full touch-none", !preview && "cursor-grab active:cursor-grabbing")}
        role={preview ? "img" : "application"}
        aria-label={preview ? "Floor plan of Worklush Spaces" : "Floor plan. Use Tab to move between spaces and Enter to choose one."}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endPointer}
        onPointerCancel={endPointer}
        onPointerLeave={() => setHover(null)}
        style={{ fontFamily: "var(--font-dm-sans), system-ui, sans-serif", fontVariantNumeric: "tabular-nums" }}
      >
        <defs>
          <pattern id="fp-hatch" width="0.4" height="0.4" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="0.4" stroke="#a9b8b6" strokeWidth="0.07" />
          </pattern>
          <pattern id="fp-moss" width="0.5" height="0.5" patternUnits="userSpaceOnUse">
            <rect width="0.5" height="0.5" fill="#4f7d34" />
            <circle cx="0.12" cy="0.16" r="0.12" fill="#6a9a3f" />
            <circle cx="0.36" cy="0.36" r="0.13" fill="#3f6a2a" />
          </pattern>
          <pattern id="fp-tile" width="0.5" height="0.5" patternUnits="userSpaceOnUse">
            <rect width="0.5" height="0.5" fill="#eef1f1" />
            <path d="M0 0H0.5V0.5" fill="none" stroke="#dbe2e2" strokeWidth="0.025" />
          </pattern>
          <filter id="fp-shadow" x="-10%" y="-10%" width="120%" height="120%">
            <feDropShadow dx="0" dy="0.15" stdDeviation="0.25" floodColor={INK} floodOpacity="0.14" />
          </filter>
        </defs>

        <polygon points={outline} fill="#ffffff" filter="url(#fp-shadow)" />

        {zones.map((z) => (
          <ZoneArea
            key={z.id}
            zone={z}
            interactive={!preview && !!onZone}
            onClick={() => activate(() => onZone?.(z.id))}
            onKeyDown={(e) => onKey(e, () => onZone?.(z.id))}
          />
        ))}
        <Fittings />

        {rooms.map((room) => (
          <RoomArea
            key={room.id}
            room={room}
            status={statuses.get(room.id) ?? "available"}
            selected={selectedId === room.id}
            dimmed={dim(room.kind)}
            interactive={!preview}
            onClick={() => activate(() => onSelect?.(room.id))}
            onKeyDown={(e) => onKey(e, () => onSelect?.(room.id))}
            onHover={() => showHover(room.id, room.rect.x + room.rect.w / 2, room.rect.y + 0.2)}
            onLeave={() => setHover(null)}
          />
        ))}

        {clusters.map((c) => {
          const t = clusterTable(c);
          return (
            <g key={c.id} opacity={dim("desk") ? 0.3 : 1} style={{ transition: "opacity 200ms" }} pointerEvents="none">
              <rect x={t.x} y={t.y} width={t.w} height={t.h} rx={0.08} fill="#efe3cf" stroke="#cdb48d" strokeWidth={0.04} />
              {c.xs.slice(1).map((x, i) => (
                <line key={i} x1={x - 0.575} y1={t.y} x2={x - 0.575} y2={t.y + t.h} stroke="#d9c6a6" strokeWidth={0.03} />
              ))}
              <line x1={t.x} y1={c.y} x2={t.x + t.w} y2={c.y} stroke="#d9c6a6" strokeWidth={0.03} />
              <text x={t.x - 0.32} y={c.y + 0.17} fontSize={0.5} fontWeight={600} fill={TEAL} textAnchor="middle">
                {c.id}
              </text>
            </g>
          );
        })}
        {desks.map((d) => (
          <Seat
            key={d.id}
            desk={d}
            status={statuses.get(d.id) ?? "available"}
            selected={selectedId === d.id}
            dimmed={dim("desk")}
            interactive={!preview}
            onClick={() => activate(() => onSelect?.(d.id))}
            onKeyDown={(e) => onKey(e, () => onSelect?.(d.id))}
            onHover={() => showHover(d.id, d.seat.x, d.seat.y - 0.45)}
            onLeave={() => setHover(null)}
          />
        ))}

        <g pointerEvents="none">
          {walls.map((w, i) => (
            <line
              key={i}
              x1={w.x1}
              y1={w.y1}
              x2={w.x2}
              y2={w.y2}
              stroke={w.kind === "window" ? "#9fd3cb" : w.kind === "glass" ? "#3a9c8f" : INK}
              strokeWidth={w.kind === "exterior" || w.kind === "window" ? 0.24 : w.kind === "glass" ? 0.06 : 0.12}
              strokeLinecap="square"
            />
          ))}
          {doors.map((d) => (
            <DoorArc key={d.id} door={d} />
          ))}
          <path
            d={`M${ENTRANCE.x - 1.5} ${entranceY} H${ENTRANCE.x - 0.3} M${ENTRANCE.x - 0.62} ${entranceY - 0.3} L${ENTRANCE.x - 0.3} ${entranceY} L${ENTRANCE.x - 0.62} ${entranceY + 0.3}`}
            stroke={TEAL}
            strokeWidth={0.1}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <text x={ENTRANCE.x - 1.45} y={ENTRANCE.from - 0.3} fontSize={0.4} fill={TEAL} fontWeight={600} textAnchor="middle">
            Main entrance
          </text>
        </g>
      </svg>

      <AnimatePresence>
        {tooltip && (
          <motion.div
            key={tooltip.r.id}
            initial={{ opacity: 0, y: 6, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, transition: spring.fast.exit }}
            transition={spring.moderate}
            className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full"
            style={{ left: tooltip.left, top: tooltip.top - 8 }}
          >
            <PlanTooltip resource={tooltip.r} status={statuses.get(tooltip.r.id) ?? "available"} />
          </motion.div>
        )}
      </AnimatePresence>

      {!preview && (
        <div className={cn("absolute z-10 flex flex-col overflow-hidden rounded-xl border border-border bg-card/95 shadow-sm backdrop-blur", controlsClassName)}>
          <button type="button" aria-label="Zoom in" className="grid h-11 w-11 place-items-center text-foreground hover:bg-hover" onClick={() => animateTo(zoomBy(0.7), 280)}>
            <Plus className="h-4 w-4" />
          </button>
          <button type="button" aria-label="Zoom out" className="grid h-11 w-11 place-items-center border-t border-border text-foreground hover:bg-hover" onClick={() => animateTo(zoomBy(1 / 0.7), 280)}>
            <Minus className="h-4 w-4" />
          </button>
          <AnimatePresence initial={false}>
            {zoomed && (
              <motion.button
                type="button"
                aria-label="Show the whole floor"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 44, opacity: 1 }}
                exit={{ height: 0, opacity: 0, transition: spring.moderate.exit }}
                transition={spring.moderate}
                className="grid w-11 place-items-center overflow-hidden border-t border-border text-foreground hover:bg-hover"
                onClick={() => animateTo(FULL)}
              >
                <Scan className="h-4 w-4" />
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------

function PlanTooltip({ resource, status }: { resource: Resource; status: Status }) {
  return (
    <div className="whitespace-nowrap rounded-xl bg-ink px-3 py-2 text-white shadow-lg">
      <div className="type-small flex items-center gap-2 font-semibold">
        <span className="nums text-lime">{resource.code}</span>
        <span>{resource.name}</span>
      </div>
      <div className="type-caption mt-0.5 flex items-center gap-1.5 font-normal text-white/75">
        <StatusDot status={status} />
        {STATUS_COPY[status]} · {kindLabel[resource.kind]} · {priceLabel(resource)}
      </div>
    </div>
  );
}

export function StatusDot({ status, className }: { status: Status; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "inline-block h-2 w-2 shrink-0 rounded-full",
        status === "available" && "bg-lime-strong",
        status === "partial" && "bg-ember",
        status === "booked" && "bg-booked",
        className
      )}
    />
  );
}

/** A chair from above: seat plus a back on the side it faces away from. */
function ChairGlyph({ chair, fill = "#2e3a3a", r = 0.22 }: { chair: Chair; fill?: string; r?: number }) {
  if (chair.kind === "stool") return <circle cx={chair.x} cy={chair.y} r={r * 0.8} fill="#ffffff" stroke="#7b8b89" strokeWidth={0.04} />;
  if (chair.kind === "lounge") {
    return <rect x={chair.x - r * 1.3} y={chair.y - r * 1.3} width={r * 2.6} height={r * 2.6} rx={r * 0.8} fill="#d08a5c" opacity={0.9} />;
  }
  // Back sits behind the person: opposite the facing direction.
  const bx = -Math.sin(chair.yaw) * r * 1.2;
  const by = Math.cos(chair.yaw) * r * 1.2;
  const px = Math.cos(chair.yaw) * r * 0.95;
  const py = Math.sin(chair.yaw) * r * 0.95;
  return (
    <g opacity={0.8}>
      <path d={`M${chair.x + bx - px} ${chair.y + by - py} L${chair.x + bx + px} ${chair.y + by + py}`} stroke={fill} strokeWidth={0.09} strokeLinecap="round" />
      <circle cx={chair.x} cy={chair.y} r={r} fill={fill} />
    </g>
  );
}

function TableGlyph({ table }: { table: Table }) {
  const fill = table.finish === "dark" ? "#3a4242" : table.finish === "white" ? "#ffffff" : "#efe3cf";
  const stroke = table.finish === "wood" || !table.finish ? "#cdb48d" : "#9aaeac";
  if (table.shape === "round" || table.shape === "oval") {
    return <ellipse cx={table.x + table.w / 2} cy={table.y + table.h / 2} rx={table.w / 2} ry={table.h / 2} fill={fill} stroke={stroke} strokeWidth={0.04} />;
  }
  return <rect x={table.x} y={table.y} width={table.w} height={table.h} rx={0.06} fill={fill} stroke={stroke} strokeWidth={0.04} />;
}

const ZONE_FILL: Record<Zone["tone"], string> = {
  lobby: "#eef1f1",
  lounge: "#f6f1ea",
  window: "#eef7f6",
  cafe: "#fbf1ea",
  reception: "#f2f7f1",
  service: "url(#fp-tile)",
};

function ZoneArea({ zone, interactive, onClick, onKeyDown }: { zone: Zone; interactive: boolean; onClick: () => void; onKeyDown: (e: KeyboardEvent) => void }) {
  const { x, y, w, h } = zone.rect;
  const label = zone.label ?? { x: x + w / 2, y: y + h / 2 };
  return (
    <g
      role={interactive ? "button" : undefined}
      tabIndex={interactive ? 0 : undefined}
      aria-label={interactive ? `${zone.name}, see photos` : undefined}
      onClick={interactive ? onClick : undefined}
      onKeyDown={interactive ? onKeyDown : undefined}
      className={cn("group outline-none", interactive && "cursor-pointer")}
    >
      <rect x={x} y={y} width={w} height={h} fill={ZONE_FILL[zone.tone]} />
      {interactive && <rect x={x} y={y} width={w} height={h} fill={TEAL} className="opacity-0 transition-opacity duration-150 group-hover:opacity-[0.06] group-focus-visible:opacity-[0.1]" />}
      <g pointerEvents="none">
        {zone.furniture.tables.map((t, i) => (
          <TableGlyph key={i} table={t} />
        ))}
        {zone.furniture.chairs.map((c, i) => (
          <ChairGlyph key={i} chair={c} fill="#5d6b6a" r={0.2} />
        ))}
        <text x={label.x} y={label.y} fontSize={0.44} textAnchor="middle" fill="#4a6362" fontWeight={600}>
          {zone.name}
        </text>
        {interactive && (
          <text x={label.x} y={label.y + 0.48} fontSize={0.3} textAnchor="middle" fill={TEAL} className="opacity-0 transition-opacity duration-150 group-hover:opacity-100">
            View photos
          </text>
        )}
      </g>
    </g>
  );
}

function Fittings() {
  const s = fittings.stairs;
  const treads = 12;
  const tread = (i: number) => s.y + 1 + (i * (s.h - 1.2)) / treads;
  return (
    <g pointerEvents="none">
      <rect x={s.x} y={s.y} width={s.w} height={s.h} fill="#e3e8e8" stroke="#9aaeac" strokeWidth={0.04} />
      {Array.from({ length: treads }).map((_, i) => (
        <g key={i}>
          <line x1={s.x} y1={tread(i)} x2={s.x + s.w * 0.48} y2={tread(i)} stroke="#b8c4c3" strokeWidth={0.04} />
          <line x1={s.x + s.w * 0.52} y1={tread(i)} x2={s.x + s.w} y2={tread(i)} stroke="#b8c4c3" strokeWidth={0.04} />
        </g>
      ))}
      <text x={s.x + s.w / 2} y={s.y + 0.6} fontSize={0.36} textAnchor="middle" fill="#6c7d7b">
        Stairs
      </text>
      <rect x={fittings.lift.x} y={fittings.lift.y} width={fittings.lift.w} height={fittings.lift.h} fill="#d5dddd" stroke="#8a9a98" strokeWidth={0.05} />
      <path
        d={`M${fittings.lift.x} ${fittings.lift.y} L${fittings.lift.x + fittings.lift.w} ${fittings.lift.y + fittings.lift.h} M${fittings.lift.x + fittings.lift.w} ${fittings.lift.y} L${fittings.lift.x} ${fittings.lift.y + fittings.lift.h}`}
        stroke="#a7b5b3"
        strokeWidth={0.04}
      />
      <text x={fittings.lift.x + fittings.lift.w / 2} y={fittings.lift.y - 0.25} fontSize={0.36} textAnchor="middle" fill="#6c7d7b">
        Lift
      </text>
      <rect x={fittings.sofa.x} y={fittings.sofa.y} width={fittings.sofa.w} height={fittings.sofa.h} rx={0.2} fill="#c9d1d4" />
      <circle cx={fittings.chess.x} cy={fittings.chess.y} r={fittings.chess.r} fill="#ffffff" stroke="#9aaeac" strokeWidth={0.04} />
      <rect x={fittings.chess.x - 0.18} y={fittings.chess.y - 0.18} width={0.36} height={0.36} fill="#3b2a1e" opacity={0.6} />
      <rect x={fittings.moss.x - 0.06} y={fittings.moss.y} width={0.16} height={fittings.moss.h} fill="url(#fp-moss)" />
      {fittings.wcs.map((w, i) => (
        <ellipse key={i} cx={w.x} cy={w.y} rx={0.32} ry={0.22} fill="#ffffff" stroke="#9aaeac" strokeWidth={0.04} />
      ))}
      {fittings.sinks.map((w, i) => (
        <circle key={i} cx={w.x} cy={w.y} r={0.18} fill="#ffffff" stroke="#9aaeac" strokeWidth={0.04} />
      ))}
      <line x1={3.0} y1={24.95} x2={4.9} y2={24.95} stroke="#9aaeac" strokeWidth={0.05} />
      {fittings.plants.map((p, i) => (
        <g key={i}>
          <circle cx={p.x} cy={p.y} r={p.r} fill="#6a9a3f" />
          <circle cx={p.x - p.r * 0.3} cy={p.y - p.r * 0.25} r={p.r * 0.55} fill="#86b452" />
        </g>
      ))}
    </g>
  );
}

function DoorArc({ door }: { door: Door }) {
  const r = door.to - door.from;
  const common = { fill: "none", stroke: "#9aaeac", strokeWidth: 0.03, strokeDasharray: "0.08 0.06" };
  if (door.side === "n" || door.side === "s") {
    const dir = door.side === "n" ? 1 : -1;
    return <path {...common} d={`M${door.from} ${door.line} L${door.from} ${door.line + dir * r} A ${r} ${r} 0 0 ${dir > 0 ? 0 : 1} ${door.to} ${door.line}`} />;
  }
  const dir = door.side === "w" ? 1 : -1;
  return <path {...common} d={`M${door.line} ${door.to} L${door.line + dir * r} ${door.to} A ${r} ${r} 0 0 ${dir > 0 ? 0 : 1} ${door.line} ${door.from}`} />;
}

type ShapeProps = {
  status: Status;
  selected: boolean;
  dimmed: boolean;
  interactive: boolean;
  onClick: () => void;
  onKeyDown: (e: KeyboardEvent) => void;
  onHover: () => void;
  onLeave: () => void;
};

function RoomArea({ room, status, selected, dimmed, interactive, onClick, onKeyDown, onHover, onLeave }: ShapeProps & { room: RoomResource }) {
  const { x, y, w, h } = room.rect;
  const booked = status === "booked";
  const fill = selected ? "#e8f8c9" : booked ? "url(#fp-hatch)" : room.kind === "podcast" ? "#f1efee" : "#f5fbfa";
  const label = `${room.name}, ${kindLabel[room.kind]}, ${room.capacity} seats, ${STATUS_COPY[status]}, ${priceLabel(room)}`;
  const cx = x + w / 2;
  const cy = y + h / 2;
  const small = h < 2.5;
  const sub = booked ? "Booked" : `${room.capacity} seats · ${priceLabel(room)}`;
  // Size the label pill to its text, never wider than the room.
  const pill = Math.min(w - 0.25, Math.max(room.name.length * (small ? 0.2 : 0.235), sub.length * (small ? 0.15 : 0.172)) + 0.6);
  return (
    <g
      role={interactive ? "button" : undefined}
      tabIndex={interactive ? 0 : undefined}
      aria-label={interactive ? label : undefined}
      aria-pressed={interactive ? selected : undefined}
      onClick={interactive ? onClick : undefined}
      onKeyDown={interactive ? onKeyDown : undefined}
      onPointerEnter={interactive ? onHover : undefined}
      onPointerLeave={interactive ? onLeave : undefined}
      className={cn("group outline-none", interactive && "cursor-pointer")}
      opacity={dimmed ? 0.3 : 1}
      style={{ transition: "opacity 200ms" }}
    >
      <rect x={x} y={y} width={w} height={h} fill={fill} className="transition-[fill] duration-150" />
      {booked && <rect x={x} y={y} width={w} height={h} fill="#e3e9e8" opacity={0.55} />}
      {interactive && !selected && (
        <rect x={x} y={y} width={w} height={h} fill={TEAL} className="opacity-0 transition-opacity duration-100 group-hover:opacity-[0.08] group-focus-visible:opacity-[0.12]" />
      )}
      <g pointerEvents="none" opacity={booked ? 0.55 : 1}>
        {room.furniture.tables.map((t, i) => (
          <TableGlyph key={i} table={t} />
        ))}
        {room.furniture.chairs.map((c, i) => (
          <ChairGlyph key={i} chair={c} />
        ))}
      </g>
      {selected && <rect x={x + 0.09} y={y + 0.09} width={w - 0.18} height={h - 0.18} fill="none" stroke="#a6d93a" strokeWidth={0.14} rx={0.06} />}
      <g pointerEvents="none">
        <rect
          x={cx - pill / 2}
          y={cy - (small ? 0.42 : 0.55)}
          width={pill}
          height={small ? 0.84 : 1.1}
          rx={0.2}
          fill="#ffffff"
          opacity={0.94}
          stroke={selected ? "#a6d93a" : "#d5e2e0"}
          strokeWidth={0.04}
        />
        <text x={cx} y={cy - (small ? 0.04 : 0.08)} fontSize={small ? 0.34 : 0.4} textAnchor="middle" fill={INK} fontWeight={600}>
          {room.name}
        </text>
        <text x={cx} y={cy + (small ? 0.3 : 0.38)} fontSize={small ? 0.26 : 0.3} textAnchor="middle" fill={booked ? "#7b8b89" : TEAL}>
          {sub}
        </text>
        {status === "partial" && <circle cx={x + w - 0.35} cy={y + 0.35} r={0.15} fill="#e8743f" />}
      </g>
    </g>
  );
}

function Seat({ desk, status, selected, dimmed, interactive, onClick, onKeyDown, onHover, onLeave }: ShapeProps & { desk: DeskResource }) {
  const { x, y, yaw } = desk.seat;
  const booked = status === "booked";
  const back = yaw === 0 ? 0.4 : -0.4;
  return (
    <g
      role={interactive ? "button" : undefined}
      tabIndex={interactive ? 0 : undefined}
      aria-label={interactive ? `Desk ${desk.code}, ${STATUS_COPY[status]}, ${priceLabel(desk)}` : undefined}
      aria-pressed={interactive ? selected : undefined}
      onClick={interactive ? onClick : undefined}
      onKeyDown={interactive ? onKeyDown : undefined}
      onPointerEnter={interactive ? onHover : undefined}
      onPointerLeave={interactive ? onLeave : undefined}
      transform={`translate(${x} ${y})`}
      className={cn("group outline-none", interactive && "cursor-pointer")}
      opacity={dimmed ? 0.3 : 1}
      style={{ transition: "opacity 200ms" }}
    >
      <circle r={0.58} fill="transparent" />
      {selected && (
        <circle r={0.46} fill="none" stroke="#a6d93a" strokeWidth={0.07} style={{ transformBox: "fill-box", transformOrigin: "center", animation: "seat-ripple 1.6s cubic-bezier(0.22,1,0.36,1) infinite" }} />
      )}
      <motion.g initial={false} animate={{ scale: selected ? 1.18 : 1 }} transition={{ type: "spring", duration: 0.35, bounce: 0.45 }} className="origin-center [transform-box:fill-box]">
        <path d={`M-0.3 ${back} Q0 ${back * 1.3} 0.3 ${back}`} fill="none" stroke={booked ? "#b3c1bf" : selected ? INK : "#2e3a3a"} strokeWidth={0.1} strokeLinecap="round" />
        <circle
          r={0.33}
          fill={selected ? "#c8f169" : booked ? "#dfe6e5" : "#ffffff"}
          stroke={selected ? INK : booked ? "#b3c1bf" : TEAL}
          strokeWidth={selected ? 0.07 : 0.055}
          className={cn("transition-[fill,stroke-width] duration-150", !selected && "group-hover:[fill:#e2f3ef] group-focus-visible:[stroke-width:0.11]")}
        />
        <text y={0.1} fontSize={0.27} textAnchor="middle" fill={booked ? "#8a9b99" : INK} fontWeight={600} pointerEvents="none">
          {desk.code}
        </text>
      </motion.g>
      {selected && (
        <g style={{ animation: "pin-drop 520ms cubic-bezier(0.22,1,0.36,1) both" }} pointerEvents="none">
          <path d="M0 -0.5 C-0.3 -0.88 -0.4 -1.06 -0.4 -1.25 A0.4 0.4 0 1 1 0.4 -1.25 C0.4 -1.06 0.3 -0.88 0 -0.5Z" fill={INK} />
          <circle cy={-1.25} r={0.15} fill="#c8f169" />
        </g>
      )}
    </g>
  );
}
