"use client";

// R3F drives the camera imperatively inside useFrame, which is exactly what
// this rule forbids for ordinary React state. The rig owns no React state.
/* eslint-disable react-hooks/immutability */

import { useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import * as THREE from "three";
import { FLOOR, resourceById, walkNodeById, yawToward, type WalkNode } from "@/data/floor";
import { WX, WZ } from "./model";
import { useView, type Phase, type ViewStore } from "./view-store";

// Street View-style camera: drag to look, scroll to zoom, click a disc on the
// floor to glide there. Every move is a tween the user can watch; nothing
// teleports except under reduced motion.

type Pose = { pos: THREE.Vector3; yaw: number; pitch: number; fov: number };

type Tween = {
  t0: number;
  dur: number;
  from: Pose;
  to: Pose;
  path?: THREE.CatmullRomCurve3;
  /** Maps overall progress to rotation progress, for staged swoops. */
  yawK?: (k: number) => number;
  pitchK?: (k: number) => number;
  fovDip?: number;
  phase: Phase;
  onDone?: () => void;
};

export type RigApi = {
  navigate: (nodeId: string) => void;
  look: (dYaw: number, dPitch: number) => void;
  zoom: (dFov: number) => void;
  exit: () => void;
};

const TOP_PITCH = -Math.PI / 2 + 0.0001;
const PITCH_MIN = -1.25;
const PITCH_MAX = 0.85;
const FOV_MIN = 32;
const FOV_MAX = 85;
const WALK_FOV = 68;

const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const smooth = (a: number, b: number) => (t: number) => {
  const x = Math.min(1, Math.max(0, (t - a) / (b - a)));
  return x * x * (3 - 2 * x);
};

function lerpAngle(a: number, b: number, t: number) {
  let d = (b - a) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return a + d * t;
}

function eyeFor(node: WalkNode) {
  if (node.view.eye) return node.view.eye;
  const r = resourceById.get(node.id);
  return r ? 1.45 : 1.6;
}

function poseFor(node: WalkNode, yaw?: number): Pose {
  return {
    pos: new THREE.Vector3(WX(node.view.x), eyeFor(node), WZ(node.view.y)),
    yaw: yaw ?? node.view.yaw,
    pitch: node.view.pitch ?? -0.06,
    fov: WALK_FOV,
  };
}

function overview(aspect: number): Pose {
  const fov = 50;
  const t = Math.tan(THREE.MathUtils.degToRad(fov / 2)) * 2;
  const h = Math.max((FLOOR.depth * 1.12) / t, (FLOOR.width * 1.08) / (t * aspect));
  return { pos: new THREE.Vector3(0, h, 0), yaw: 0, pitch: TOP_PITCH, fov };
}

export function Rig({
  store,
  startNodeId,
  apiRef,
  exiting,
  onExited,
  onIntroDone,
  reduceMotion,
}: {
  store: ViewStore;
  startNodeId: string;
  apiRef: RefObject<RigApi | null>;
  exiting: boolean;
  onExited: () => void;
  onIntroDone?: () => void;
  reduceMotion: boolean;
}) {
  const { camera, gl, size, clock } = useThree();
  const cam = camera as THREE.PerspectiveCamera;
  const pose = useRef<Pose>(overview(size.width / size.height));
  const tween = useRef<Tween | null>(null);
  const vel = useRef({ yaw: 0, pitch: 0 });
  const drag = useRef<{ x: number; y: number; t: number } | null>(null);
  const node = useRef(startNodeId);
  const lastPush = useRef(0);
  const phase = useRef<Phase>("intro");

  const start = (t: Omit<Tween, "t0" | "from">) => {
    const from: Pose = { ...pose.current, pos: pose.current.pos.clone() };
    tween.current = { ...t, t0: clock.getElapsedTime(), from, dur: reduceMotion ? 0.001 : t.dur };
    phase.current = t.phase;
    vel.current = { yaw: 0, pitch: 0 };
    store.set({ phase: t.phase });
  };

  // Intro: from the plan's own framing (straight down, north up) to eye level.
  useEffect(() => {
    const target = walkNodeById.get(startNodeId) ?? walkNodeById.get("entrance")!;
    const top = overview(size.width / size.height);
    pose.current = { ...top, pos: top.pos.clone() };
    const to = poseFor(target);
    const fwd = new THREE.Vector3(Math.sin(to.yaw), 0, -Math.cos(to.yaw));
    const mid1 = top.pos.clone().lerp(to.pos, 0.58).setY(top.pos.y * 0.42);
    const mid2 = to.pos.clone().addScaledVector(fwd, -3.4).setY(to.pos.y + 2.6);
    node.current = target.id;
    store.set({ nodeId: target.id });
    start({
      dur: 2.6,
      to,
      path: new THREE.CatmullRomCurve3([top.pos.clone(), mid1, mid2, to.pos.clone()], false, "centripetal"),
      pitchK: smooth(0.18, 1),
      yawK: smooth(0.08, 0.85),
      phase: "intro",
      onDone: () => {
        phase.current = "walk";
        store.set({ phase: "walk" });
        onIntroDone?.();
      },
    });
    // Runs once per mount; the scene remounts for a fresh intro.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Outro: rise back to the plan framing, then hand back to the 2D map.
  useEffect(() => {
    if (!exiting) return;
    const top = overview(size.width / size.height);
    const here = pose.current.pos.clone();
    start({
      dur: 1.35,
      to: top,
      path: new THREE.CatmullRomCurve3([here, here.clone().setY(here.y + 5), top.pos.clone()], false, "centripetal"),
      pitchK: smooth(0, 0.7),
      yawK: smooth(0, 0.8),
      phase: "outro",
      onDone: onExited,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exiting]);

  // Public controls for the DOM overlay.
  useEffect(() => {
    apiRef.current = {
      navigate: (id) => {
        if (phase.current === "intro" || phase.current === "outro") return;
        const target = walkNodeById.get(id);
        if (!target || id === node.current) return;
        const isResource = resourceById.has(id);
        const from = pose.current.pos;
        const travelYaw = yawToward(from.x + FLOOR.width / 2, from.z + FLOOR.depth / 2, target.view.x, target.view.y);
        const to = poseFor(target, isResource ? target.view.yaw : travelYaw);
        to.fov = pose.current.fov > FOV_MAX - 1 ? WALK_FOV : Math.max(50, pose.current.fov);
        const dist = from.distanceTo(to.pos);
        const lift = Math.min(0.9, dist * 0.08);
        const mid = from.clone().lerp(to.pos, 0.5);
        mid.y = Math.max(from.y, to.pos.y) + lift;
        node.current = id;
        store.set({ nodeId: id });
        start({
          dur: Math.min(1.25, Math.max(0.6, 0.42 + dist * 0.07)),
          to,
          path: new THREE.CatmullRomCurve3([from.clone(), mid, to.pos.clone()]),
          yawK: smooth(0, 0.75),
          fovDip: 9,
          phase: "gliding",
          onDone: () => {
            phase.current = "walk";
            store.set({ phase: "walk" });
          },
        });
      },
      look: (dYaw, dPitch) => {
        if (phase.current !== "walk") return;
        pose.current.yaw += dYaw;
        pose.current.pitch = THREE.MathUtils.clamp(pose.current.pitch + dPitch, PITCH_MIN, PITCH_MAX);
      },
      zoom: (dFov) => {
        if (phase.current !== "walk") return;
        pose.current.fov = THREE.MathUtils.clamp(pose.current.fov + dFov, FOV_MIN, FOV_MAX);
      },
      exit: () => {},
    };
  }, [apiRef, store]); // eslint-disable-line react-hooks/exhaustive-deps

  // Drag to look (grab-the-world, like Street View), wheel to zoom.
  useEffect(() => {
    const el = gl.domElement;
    const down = (e: PointerEvent) => {
      if (e.button !== 0 || phase.current !== "walk") return;
      drag.current = { x: e.clientX, y: e.clientY, t: performance.now() };
      vel.current = { yaw: 0, pitch: 0 };
      el.setPointerCapture(e.pointerId);
    };
    const move = (e: PointerEvent) => {
      if (!drag.current) return;
      const k = 0.0032 * (pose.current.fov / WALK_FOV);
      const dx = e.clientX - drag.current.x;
      const dy = e.clientY - drag.current.y;
      const now = performance.now();
      const dt = Math.max(1, now - drag.current.t);
      pose.current.yaw -= dx * k;
      pose.current.pitch = THREE.MathUtils.clamp(pose.current.pitch + dy * k, PITCH_MIN, PITCH_MAX);
      vel.current = { yaw: (-dx * k) / dt, pitch: (dy * k) / dt };
      drag.current = { x: e.clientX, y: e.clientY, t: now };
      if (Math.abs(dx) + Math.abs(dy) > 2) el.style.cursor = "grabbing";
    };
    const up = (e: PointerEvent) => {
      if (!drag.current) return;
      // Ignore the last sample if the pointer rested before letting go.
      if (performance.now() - drag.current.t > 80) vel.current = { yaw: 0, pitch: 0 };
      drag.current = null;
      el.style.cursor = "";
      if (el.hasPointerCapture(e.pointerId)) el.releasePointerCapture(e.pointerId);
    };
    const wheel = (e: WheelEvent) => {
      if (phase.current !== "walk") return;
      e.preventDefault();
      pose.current.fov = THREE.MathUtils.clamp(pose.current.fov + e.deltaY * 0.035, FOV_MIN, FOV_MAX);
    };
    el.addEventListener("pointerdown", down);
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerup", up);
    el.addEventListener("pointercancel", up);
    el.addEventListener("wheel", wheel, { passive: false });
    return () => {
      el.removeEventListener("pointerdown", down);
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerup", up);
      el.removeEventListener("pointercancel", up);
      el.removeEventListener("wheel", wheel);
    };
  }, [gl]);

  useFrame((state, delta) => {
    const p = pose.current;
    const tw = tween.current;
    if (tw) {
      const k = Math.min(1, (state.clock.getElapsedTime() - tw.t0) / tw.dur);
      const e = easeInOut(k);
      if (tw.path) p.pos.copy(tw.path.getPoint(e));
      else p.pos.lerpVectors(tw.from.pos, tw.to.pos, e);
      p.yaw = lerpAngle(tw.from.yaw, tw.to.yaw, tw.yawK ? tw.yawK(k) : e);
      const pk = tw.pitchK ? tw.pitchK(k) : e;
      p.pitch = tw.from.pitch + (tw.to.pitch - tw.from.pitch) * pk;
      p.fov = tw.from.fov + (tw.to.fov - tw.from.fov) * e - (tw.fovDip ?? 0) * Math.sin(Math.PI * k);
      if (k >= 1) {
        tween.current = null;
        tw.onDone?.();
      }
    } else if (!drag.current && (vel.current.yaw || vel.current.pitch)) {
      // Inertia after a flick, framerate-independent.
      const ms = delta * 1000;
      p.yaw += vel.current.yaw * ms;
      p.pitch = THREE.MathUtils.clamp(p.pitch + vel.current.pitch * ms, PITCH_MIN, PITCH_MAX);
      const decay = Math.pow(0.004, delta);
      vel.current.yaw *= decay;
      vel.current.pitch *= decay;
      if (Math.abs(vel.current.yaw) < 1e-5 && Math.abs(vel.current.pitch) < 1e-5) vel.current = { yaw: 0, pitch: 0 };
    }

    cam.position.copy(p.pos);
    cam.rotation.set(p.pitch, -p.yaw, 0, "YXZ");
    if (Math.abs(cam.fov - p.fov) > 0.01) {
      cam.fov = p.fov;
      cam.updateProjectionMatrix();
    }

    const now = state.clock.getElapsedTime();
    if (now - lastPush.current > 0.05) {
      lastPush.current = now;
      store.set({ x: p.pos.x + FLOOR.width / 2, y: p.pos.z + FLOOR.depth / 2, yaw: p.yaw, fov: p.fov });
    }
  });

  return null;
}

// --- hotspots ---------------------------------------------------------------

function chevronGeometry() {
  const s = new THREE.Shape();
  s.moveTo(-0.16, -0.05);
  s.lineTo(0, 0.1);
  s.lineTo(0.16, -0.05);
  s.lineTo(0.16, -0.12);
  s.lineTo(0, 0.03);
  s.lineTo(-0.16, -0.12);
  s.closePath();
  return new THREE.ShapeGeometry(s);
}

export function Hotspots({
  store,
  onNavigate,
  onPickRoom,
}: {
  store: ViewStore;
  onNavigate: (id: string) => void;
  onPickRoom: (id: string) => void;
}) {
  const nodeId = useView(store, (s) => s.nodeId);
  const phase = useView(store, (s) => s.phase);
  const current = walkNodeById.get(nodeId);
  const chevron = useMemo(() => chevronGeometry(), []);
  const ring = useMemo(() => new THREE.RingGeometry(0.3, 0.38, 48), []);
  const disc = useMemo(() => new THREE.CircleGeometry(0.3, 48), []);
  const [hover, setHover] = useState<string | null>(null);

  if (!current || phase === "intro" || phase === "outro") return null;

  const links = current.links
    .map((id) => walkNodeById.get(id)!)
    // Desks are reached by clicking the chair itself.
    .filter((n) => !n.id.startsWith("desk-"));

  return (
    <group>
      {links.map((n) => {
        const angle = yawToward(current.view.x, current.view.y, n.view.x, n.view.y);
        const isRoom = resourceById.has(n.id);
        const lit = hover === n.id;
        const click = (e: ThreeEvent<MouseEvent>) => {
          e.stopPropagation();
          if (e.delta > 6) return;
          if (isRoom) onPickRoom(n.id);
          else onNavigate(n.id);
        };
        return (
          <group
            key={n.id}
            position={[WX(n.view.x), 0.03, WZ(n.view.y)]}
            onClick={click}
            onPointerOver={(e) => {
              e.stopPropagation();
              setHover(n.id);
              document.body.style.cursor = "pointer";
            }}
            onPointerOut={() => {
              setHover(null);
              document.body.style.cursor = "";
            }}
            scale={lit ? 1.18 : 1}
          >
            <mesh geometry={disc} rotation={[-Math.PI / 2, 0, 0]}>
              <meshBasicMaterial color={isRoom ? "#c8f169" : "#ffffff"} transparent opacity={lit ? 0.55 : 0.28} depthWrite={false} toneMapped={false} />
            </mesh>
            <mesh geometry={ring} rotation={[-Math.PI / 2, 0, 0]}>
              <meshBasicMaterial color={isRoom ? "#c8f169" : "#ffffff"} transparent opacity={0.95} depthWrite={false} toneMapped={false} />
            </mesh>
            <mesh geometry={chevron} rotation={[-Math.PI / 2, 0, -angle]} position={[0, 0.005, 0]}>
              <meshBasicMaterial color={isRoom ? "#023c40" : "#023c40"} transparent opacity={0.85} depthWrite={false} toneMapped={false} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}
