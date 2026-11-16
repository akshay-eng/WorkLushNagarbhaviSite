"use client";

import { Environment, Lightformer } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import { AnimatePresence, motion } from "motion/react";
import { ArrowLeft, Compass, Hand, MousePointerClick } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { FLOOR, OUTLINE, clusterTable, clusters, desks, resourceById, rooms, walkNodeById, walkNodes, walls } from "@/data/floor";
import { statusFor, type Availability, type Status } from "@/lib/booking/availability";
import { spring } from "@/lib/springs";
import { FloorModel } from "./model";
import { Hotspots, Rig, type RigApi } from "./rig";
import { createViewStore, useView, type ViewStore } from "./view-store";

export type Floor3DProps = {
  availability: Availability | null;
  selectedId: string | null;
  onSelect: (id: string) => void;
  exiting: boolean;
  onExited: () => void;
  onReady?: () => void;
  onRequestExit: () => void;
};

function FirstFrame({ onReady }: { onReady?: () => void }) {
  const done = useRef(false);
  useFrame(() => {
    if (!done.current) {
      done.current = true;
      onReady?.();
    }
  });
  return null;
}

export default function Floor3D({ availability, selectedId, onSelect, exiting, onExited, onReady, onRequestExit }: Floor3DProps) {
  const startNode = selectedId && walkNodeById.has(selectedId) ? selectedId : "entrance";
  const store = useMemo(
    () => createViewStore({ x: 20, y: 13, yaw: 0, fov: 50, nodeId: startNode, phase: "intro" }),
    // One store per mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );
  const api = useRef<RigApi | null>(null);
  const phase = useView(store, (s) => s.phase);
  const nodeId = useView(store, (s) => s.nodeId);
  const [interacted, setInteracted] = useState(false);
  // This module only ever loads in the browser (dynamic, ssr: false).
  const [mobile] = useState(() => window.matchMedia("(max-width: 768px), (pointer: coarse)").matches);
  const [reduceMotion] = useState(() => window.matchMedia("(prefers-reduced-motion: reduce)").matches);

  const statuses = useMemo(() => {
    const m = new Map<string, Status>();
    const now = new Date();
    for (const r of [...desks, ...rooms]) m.set(r.id, statusFor(r, availability, now));
    return m;
  }, [availability]);

  // When the selection changes (from the panel or a click), walk there. Only
  // a change counts: walking away from your seat must not pull you back. A
  // change during the intro waits for it to finish.
  const followed = useRef(selectedId);
  useEffect(() => {
    if (selectedId === followed.current || phase === "intro" || phase === "outro") return;
    followed.current = selectedId;
    if (selectedId && store.get().nodeId !== selectedId && walkNodeById.has(selectedId)) api.current?.navigate(selectedId);
  }, [selectedId, phase, store]);

  const pick = (id: string) => {
    setInteracted(true);
    onSelect(id);
    // Booked seats can still be visited, just not chosen.
    if (statuses.get(id) === "booked") api.current?.navigate(id);
  };

  const onKey = (e: KeyboardEvent) => {
    const step = 0.08;
    const map: Record<string, () => void> = {
      ArrowLeft: () => api.current?.look(-step, 0),
      ArrowRight: () => api.current?.look(step, 0),
      ArrowUp: () => api.current?.look(0, step),
      ArrowDown: () => api.current?.look(0, -step),
      "+": () => api.current?.zoom(-4),
      "=": () => api.current?.zoom(-4),
      "-": () => api.current?.zoom(4),
      Escape: onRequestExit,
    };
    const fn = map[e.key];
    if (fn) {
      e.preventDefault();
      setInteracted(true);
      fn();
    }
  };

  const here = walkNodeById.get(nodeId);
  const hereResource = resourceById.get(nodeId);
  const hereStatus = hereResource ? statuses.get(hereResource.id) : undefined;
  const walking = phase === "walk" || phase === "gliding";

  return (
    <div
      className="relative h-full w-full overflow-hidden bg-[#e7efee] outline-none"
      tabIndex={0}
      onKeyDown={onKey}
      onPointerDown={() => setInteracted(true)}
      aria-label="3D view of the floor. Drag or use arrow keys to look around, plus and minus to zoom, Escape to return to the plan."
    >
      <Canvas
        shadows={mobile ? false : "percentage"}
        dpr={mobile ? [1, 1.5] : [1, 1.75]}
        gl={{ antialias: true, powerPreference: "high-performance" }}
        camera={{ fov: 50, near: 0.05, far: 300, position: [0, 40, 0] }}
      >
        <color attach="background" args={["#e7efee"]} />
        <hemisphereLight args={["#ffffff", "#9fb0ad", 0.55]} />
        <ambientLight intensity={0.12} />
        <directionalLight
          position={[16, 30, -14]}
          intensity={1.15}
          castShadow={!mobile}
          shadow-mapSize={[2048, 2048]}
          shadow-camera-left={-24}
          shadow-camera-right={24}
          shadow-camera-top={16}
          shadow-camera-bottom={-16}
          shadow-camera-near={1}
          shadow-camera-far={80}
          shadow-bias={-0.0005}
        />
        <Environment resolution={128} frames={1} environmentIntensity={0.5}>
          <Lightformer form="rect" intensity={2.2} position={[0, 6, -14]} scale={[30, 4, 1]} />
          <Lightformer form="rect" intensity={1.2} position={[-22, 4, 0]} rotation={[0, Math.PI / 2, 0]} scale={[20, 3, 1]} />
          <Lightformer form="ring" intensity={0.8} color="#fff1dc" position={[8, 8, 6]} scale={6} />
        </Environment>

        <FloorModel statuses={statuses} selectedId={selectedId} onPick={pick} showLabels={walking}>
          <Hotspots
            store={store}
            onNavigate={(id) => {
              setInteracted(true);
              api.current?.navigate(id);
            }}
            onPickRoom={pick}
          />
        </FloorModel>
        <Rig
          store={store}
          startNodeId={startNode}
          apiRef={api}
          exiting={exiting}
          onExited={onExited}
          reduceMotion={reduceMotion}
        />
        <FirstFrame onReady={onReady} />
      </Canvas>

      {/* Overlay ------------------------------------------------------------ */}
      <div className="pointer-events-none absolute inset-0">
        <AnimatePresence>
          {walking && (
            <motion.div
              key="chrome"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, transition: spring.moderate.exit }}
              transition={spring.slow}
              className="absolute inset-0"
            >
              {/* Where you are */}
              <div className="pointer-events-auto absolute left-3 top-3 max-w-[70%] rounded-2xl bg-ink/90 px-4 py-2.5 text-white shadow-lg backdrop-blur">
                <div className="type-caption font-normal text-white/65">You&apos;re standing at</div>
                <AnimatePresence mode="popLayout" initial={false}>
                  <motion.div
                    key={nodeId}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6, transition: spring.fast.exit }}
                    transition={spring.moderate}
                    className="type-title flex items-center gap-2"
                  >
                    {hereResource ? <span className="nums text-lime">{hereResource.code}</span> : null}
                    {here?.label ?? "The floor"}
                    {hereStatus === "booked" && <span className="type-caption rounded-full bg-white/15 px-2 py-0.5">Booked</span>}
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* Exit + compass */}
              <div className="pointer-events-auto absolute right-3 top-3 flex items-center gap-2">
                <CompassBadge store={store} />
                <button
                  type="button"
                  onClick={onRequestExit}
                  className="type-small inline-flex h-11 items-center gap-2 rounded-full bg-white px-4 font-semibold text-ink shadow-lg transition-transform duration-150 hover:-translate-y-0.5 active:scale-[0.97]"
                >
                  <ArrowLeft className="h-4 w-4" /> Back to plan
                </button>
              </div>

              {/* Minimap */}
              <div className="pointer-events-auto absolute bottom-3 left-3 hidden w-[170px] overflow-hidden rounded-2xl border border-white/60 bg-white/90 p-2 shadow-xl backdrop-blur sm:block">
                <Minimap store={store} selectedId={selectedId} statuses={statuses} onJump={(id) => api.current?.navigate(id)} />
              </div>

              {/* First-run hint */}
              <AnimatePresence>
                {!interacted && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 6, transition: spring.moderate.exit }}
                    transition={{ ...spring.slow, delay: 0.3 }}
                    className="type-small absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-4 whitespace-nowrap rounded-full bg-ink/85 px-4 py-2.5 text-white shadow-lg backdrop-blur"
                  >
                    <span className="inline-flex items-center gap-1.5">
                      <Hand className="h-4 w-4 text-lime" /> Drag to look
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <MousePointerClick className="h-4 w-4 text-lime" /> Tap a disc to walk
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function CompassBadge({ store }: { store: ViewStore }) {
  const yaw = useView(store, (s) => s.yaw);
  return (
    <div className="grid h-11 w-11 place-items-center rounded-full bg-white shadow-lg" aria-hidden>
      <div style={{ transform: `rotate(${-yaw}rad)` }} className="relative grid place-items-center">
        <Compass className="h-5 w-5 text-ink" />
        <span className="type-caption absolute -top-3 text-ember">N</span>
      </div>
    </div>
  );
}

function Minimap({
  store,
  selectedId,
  statuses,
  onJump,
}: {
  store: ViewStore;
  selectedId: string | null;
  statuses: Map<string, Status>;
  onJump: (id: string) => void;
}) {
  const x = useView(store, (s) => s.x);
  const y = useView(store, (s) => s.y);
  const yaw = useView(store, (s) => s.yaw);
  const fov = useView(store, (s) => s.fov);
  const svg = useRef<SVGSVGElement>(null);

  // Horizontal field of view, roughly, for a 16:10 viewport.
  const half = Math.atan(Math.tan(((fov * Math.PI) / 180) / 2) * 1.6);
  const r = 6;
  const a1 = yaw - half;
  const a2 = yaw + half;
  const cone = `M${x} ${y} L${x + Math.sin(a1) * r} ${y - Math.cos(a1) * r} A ${r} ${r} 0 0 1 ${x + Math.sin(a2) * r} ${y - Math.cos(a2) * r} Z`;

  const jump = (e: React.MouseEvent) => {
    const el = svg.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * (FLOOR.width + 2) - 1;
    const py = ((e.clientY - rect.top) / rect.height) * (FLOOR.depth + 2) - 1;
    let best = walkNodes[0];
    let bestD = Infinity;
    for (const n of walkNodes) {
      if (n.id.startsWith("desk-")) continue;
      const d = Math.hypot(n.view.x - px, n.view.y - py);
      if (d < bestD) {
        bestD = d;
        best = n;
      }
    }
    onJump(best.id);
  };

  return (
    <svg ref={svg} viewBox={`-1 -1 ${FLOOR.width + 2} ${FLOOR.depth + 2}`} className="block w-full cursor-crosshair" onClick={jump} role="img" aria-label="Minimap">
      <polygon points={OUTLINE.map(([px, py]) => `${px},${py}`).join(" ")} fill="#f6f9f8" />
      {rooms.map((room) => (
        <rect
          key={room.id}
          x={room.rect.x}
          y={room.rect.y}
          width={room.rect.w}
          height={room.rect.h}
          fill={room.id === selectedId ? "#c8f169" : statuses.get(room.id) === "booked" ? "#dfe6e5" : "#ffffff"}
        />
      ))}
      {walls.map((w, i) => (
        <line key={i} x1={w.x1} y1={w.y1} x2={w.x2} y2={w.y2} stroke={w.kind === "glass" ? "#3a9c8f" : "#023c40"} strokeWidth={w.kind === "exterior" || w.kind === "window" ? 0.3 : 0.15} />
      ))}
      {clusters.map((c) => {
        const t = clusterTable(c);
        return <rect key={c.id} x={t.x} y={t.y} width={t.w} height={t.h} rx={0.1} fill="#efe3cf" />;
      })}
      {desks.map((d) => (
        <circle
          key={d.id}
          cx={d.seat.x}
          cy={d.seat.y}
          r={0.32}
          fill={d.id === selectedId ? "#a6d93a" : statuses.get(d.id) === "booked" ? "#c3cfcd" : "#037e6e"}
        />
      ))}
      <path d={cone} fill="#037e6e" opacity={0.28} />
      <circle cx={x} cy={y} r={0.75} fill="#023c40" stroke="#ffffff" strokeWidth={0.3} />
    </svg>
  );
}
