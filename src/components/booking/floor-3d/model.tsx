"use client";

import { Billboard, Instance, Instances } from "@react-three/drei";
import { useFrame, type ThreeEvent } from "@react-three/fiber";
import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import * as THREE from "three";
import {
  ENTRANCE,
  FLOOR,
  OUTLINE,
  clusterTable,
  clusters,
  desks,
  doors,
  fittings,
  rooms,
  walls,
  zones,
  type Chair,
  type RoomResource,
  type Table,
  type WallSeg,
} from "@/data/floor";
import type { Status } from "@/lib/booking/availability";
import { beamTexture, checkerTexture, concreteTexture, glowTexture, logoTexture, mossTexture, neonTexture, plateTexture, woodTexture } from "./textures";

// Plan metres → world. The floor is centred on the origin; plan y is world z.
export const WX = (x: number) => x - FLOOR.width / 2;
export const WZ = (y: number) => y - FLOOR.depth / 2;

const UNIT_BOX = new THREE.BoxGeometry(1, 1, 1);
const UNIT_CYL = new THREE.CylinderGeometry(1, 1, 1, 24);
const UNIT_SPHERE = new THREE.IcosahedronGeometry(1, 1);
const WALL_T = 0.1;
const H = FLOOR.wallHeight;

function makeMaterials() {
  const std = (color: string, extra: THREE.MeshStandardMaterialParameters = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.75, metalness: 0, ...extra });
  return {
    floor: std("#d6d3cd", { map: concreteTexture(), roughness: 0.6 }),
    woodFloor: std("#ffffff", { map: woodTexture(), roughness: 0.6 }),
    wall: std("#f2f3f0", { roughness: 0.9 }),
    wallTeal: std("#8fcfc7", { roughness: 0.85 }),
    wallDark: std("#2a2e2e", { roughness: 0.95 }),
    acoustic: std("#37605c", { roughness: 1 }),
    glass: new THREE.MeshStandardMaterial({ color: "#cfeae6", roughness: 0.05, metalness: 0.1, transparent: true, opacity: 0.18, depthWrite: false, side: THREE.DoubleSide }),
    frame: std("#1b1f1f", { roughness: 0.4, metalness: 0.6 }),
    wood: std("#c9a676", { roughness: 0.62 }),
    white: std("#f4f4f2", { roughness: 0.35 }),
    dark: std("#1f2424", { roughness: 0.25, metalness: 0.2 }),
    leg: std("#1f2323", { roughness: 0.35, metalness: 0.7 }),
    chair: std("#202424", { roughness: 0.8 }),
    chairBase: std("#2b2f2f", { roughness: 0.3, metalness: 0.8 }),
    orange: std("#c2672e", { roughness: 0.6 }),
    cabinet: std("#e8743f", { roughness: 0.6 }),
    sofa: std("#c7ccce", { roughness: 0.95 }),
    pouf: std("#24345c", { roughness: 0.95 }),
    planter: std("#e4e6e2", { roughness: 0.7 }),
    pot: std("#2d3333", { roughness: 0.6 }),
    leaf: std("#5c8f3f", { roughness: 0.85, flatShading: true }),
    leafDark: std("#3e6d2b", { roughness: 0.85, flatShading: true }),
    leafLight: std("#7fb04f", { roughness: 0.85, flatShading: true }),
    moss: std("#ffffff", { map: mossTexture(), roughness: 1 }),
    screen: std("#0d1111", { roughness: 0.2, metalness: 0.4, emissive: "#0b2a2c", emissiveIntensity: 0.25 }),
    laptop: std("#9aa3a6", { roughness: 0.3, metalness: 0.8 }),
    porcelain: std("#ffffff", { roughness: 0.3 }),
    tile: std("#e8ecec", { roughness: 0.4 }),
    checker: std("#ffffff", { map: checkerTexture(), roughness: 0.5 }),
    stair: std("#cfd5d5", { roughness: 0.8 }),
    metal: std("#b8c0c2", { roughness: 0.25, metalness: 0.85 }),
    ceiling: new THREE.MeshStandardMaterial({ color: "#59605f", emissive: "#2a2f2f", emissiveIntensity: 0.5, roughness: 1, side: THREE.FrontSide }),
    duct: std("#1a1d1d", { roughness: 0.6, metalness: 0.5 }),
    lightBar: new THREE.MeshStandardMaterial({ color: "#ffffff", emissive: "#fff6e6", emissiveIntensity: 2.2 }),
    rug: std("#3c6e70", { roughness: 1 }),
  };
}

type Mats = ReturnType<typeof makeMaterials>;
const MatsContext = createContext<Mats | null>(null);
const useMats = () => useContext(MatsContext)!;

type V3 = [number, number, number];

function Box({ p, s, m, rot, cast = true }: { p: V3; s: V3; m: THREE.Material; rot?: V3; cast?: boolean }) {
  return <mesh geometry={UNIT_BOX} position={p} scale={s} rotation={rot} material={m} castShadow={cast} receiveShadow />;
}

function Cyl({ p, r, h, m, cast = true, sx }: { p: V3; r: number; h: number; m: THREE.Material; cast?: boolean; sx?: number }) {
  return <mesh geometry={UNIT_CYL} position={p} scale={[sx ?? r, h, r]} material={m} castShadow={cast} receiveShadow />;
}

// --- walls ----------------------------------------------------------------------

function insideOutline(x: number, y: number) {
  let inside = false;
  for (let i = 0, j = OUTLINE.length - 1; i < OUTLINE.length; j = i++) {
    const [xi, yi] = OUTLINE[i];
    const [xj, yj] = OUTLINE[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/** Shift each wall so neighbours never overlap: room partitions sit inside
 *  their room, exterior walls sit just outside the slab. */
function placed(w: WallSeg): WallSeg {
  const horizontal = w.y1 === w.y2;
  let nx = horizontal ? 0 : 1;
  let ny = horizontal ? 1 : 0;
  const mx = (w.x1 + w.x2) / 2;
  const my = (w.y1 + w.y2) / 2;
  let off = 0;
  if (w.room) {
    const r = rooms.find((rr) => rr.id === w.room)!;
    const cx = r.rect.x + r.rect.w / 2;
    const cy = r.rect.y + r.rect.h / 2;
    if ((cx - mx) * nx + (cy - my) * ny < 0) {
      nx = -nx;
      ny = -ny;
    }
    off = w.kind === "glass" ? 0.02 : WALL_T / 2;
  } else if (w.kind === "exterior" || w.kind === "window") {
    if (insideOutline(mx + nx * 0.2, my + ny * 0.2)) {
      nx = -nx;
      ny = -ny;
    }
    off = WALL_T / 2;
  }
  return { ...w, x1: w.x1 + nx * off, x2: w.x2 + nx * off, y1: w.y1 + ny * off, y2: w.y2 + ny * off };
}

function Wall({ seg }: { seg: WallSeg }) {
  const mats = useMats();
  const len = Math.hypot(seg.x2 - seg.x1, seg.y2 - seg.y1);
  if (len < 0.01) return null;
  const cx = WX((seg.x1 + seg.x2) / 2);
  const cz = WZ((seg.y1 + seg.y2) / 2);
  const rotY = seg.y1 === seg.y2 ? 0 : Math.PI / 2;
  const finish = seg.finish === "teal" ? mats.wallTeal : seg.finish === "dark" ? mats.wallDark : mats.wall;
  if (seg.kind === "solid" || seg.kind === "exterior") {
    return (
      <group position={[cx, 0, cz]} rotation={[0, rotY, 0]}>
        <Box p={[0, H / 2, 0]} s={[len, H, WALL_T]} m={finish} />
      </group>
    );
  }
  const sill = seg.kind === "window" ? 0.9 : 0;
  const mullions = Math.max(1, Math.round(len / 1.25));
  return (
    <group position={[cx, 0, cz]} rotation={[0, rotY, 0]}>
      {sill > 0 && <Box p={[0, sill / 2, 0]} s={[len, sill, WALL_T * 1.4]} m={mats.wall} />}
      <mesh geometry={UNIT_BOX} position={[0, sill + (H - sill) / 2, 0]} scale={[len, H - sill, 0.02]} material={mats.glass} />
      <Box p={[0, H - 0.03, 0]} s={[len, 0.06, 0.07]} m={mats.frame} cast={false} />
      <Box p={[0, sill + 0.025, 0]} s={[len, 0.05, 0.07]} m={mats.frame} cast={false} />
      {Array.from({ length: mullions + 1 }).map((_, i) => (
        <Box key={i} p={[-len / 2 + (i * len) / mullions, sill + (H - sill) / 2, 0]} s={[0.05, H - sill, 0.07]} m={mats.frame} cast={false} />
      ))}
    </group>
  );
}

function DoorFrames() {
  const mats = useMats();
  return (
    <>
      {doors.map((d) => {
        const room = rooms.find((r) => r.id === d.id);
        const horizontal = d.side === "n" || d.side === "s";
        const mid = (d.from + d.to) / 2;
        const width = d.to - d.from;
        const cx = horizontal ? WX(mid) : WX(d.line);
        const cz = horizontal ? WZ(d.line) : WZ(mid);
        const solid = room ? !room.glass : true;
        return (
          <group key={d.id} position={[cx, 0, cz]} rotation={[0, horizontal ? 0 : Math.PI / 2, 0]}>
            <Box p={[-width / 2, 1.05, 0]} s={[0.06, 2.1, 0.12]} m={mats.frame} cast={false} />
            <Box p={[width / 2, 1.05, 0]} s={[0.06, 2.1, 0.12]} m={mats.frame} cast={false} />
            <Box p={[0, 2.13, 0]} s={[width + 0.06, 0.06, 0.12]} m={mats.frame} cast={false} />
            {solid && <Box p={[0, 2.58, 0]} s={[width + 0.1, 0.84, WALL_T]} m={room?.kind === "podcast" ? mats.wallDark : mats.wall} />}
            {room && <RoomPlate room={room} width={width} />}
          </group>
        );
      })}
    </>
  );
}

function RoomPlate({ room, width }: { room: RoomResource; width: number }) {
  const [plate] = useState(() => plateTexture(room.name, `${room.code} · ${room.capacity} seats`));
  // Faces the corridor: away from the room's centre.
  const horizontal = room.front === "n" || room.front === "s";
  const out = room.front === "n" || room.front === "w" ? -1 : 1;
  const rot = horizontal ? (out > 0 ? 0 : Math.PI) : out > 0 ? Math.PI : 0;
  return (
    <mesh position={[width / 2 + 0.6, 1.8, (horizontal ? out : -out) * 0.08]} rotation={[0, rot, 0]}>
      <planeGeometry args={[0.96, 0.3]} />
      <meshBasicMaterial map={plate} transparent toneMapped={false} />
    </mesh>
  );
}

// --- furniture --------------------------------------------------------------------

type Spot = { x: number; y: number; yaw: number };

/** Office chairs, instanced: one draw call per part for the whole floor. */
function OfficeChairs({ spots }: { spots: Spot[] }) {
  const mats = useMats();
  const parts: { g: THREE.BufferGeometry; m: THREE.Material; p: V3; s: V3; r?: V3 }[] = [
    { g: UNIT_CYL, m: mats.chairBase, p: [0, 0.05, 0], s: [0.3, 0.04, 0.3] },
    { g: UNIT_CYL, m: mats.chairBase, p: [0, 0.27, 0], s: [0.028, 0.4, 0.028] },
    { g: UNIT_BOX, m: mats.chair, p: [0, 0.48, 0], s: [0.5, 0.08, 0.48] },
    { g: UNIT_BOX, m: mats.chair, p: [0, 0.86, 0.25], s: [0.46, 0.6, 0.05], r: [-0.12, 0, 0] },
    { g: UNIT_BOX, m: mats.chairBase, p: [0.24, 0.62, 0.02], s: [0.04, 0.22, 0.3] },
    { g: UNIT_BOX, m: mats.chairBase, p: [-0.24, 0.62, 0.02], s: [0.04, 0.22, 0.3] },
  ];
  return (
    <>
      {parts.map((part, i) => (
        <Instances key={i} geometry={part.g} material={part.m} limit={Math.max(1, spots.length)} castShadow receiveShadow>
          {spots.map((c, j) => (
            <group key={j} position={[WX(c.x), 0, WZ(c.y)]} rotation={[0, -c.yaw, 0]}>
              <Instance position={part.p} scale={part.s} rotation={part.r ?? [0, 0, 0]} />
            </group>
          ))}
        </Instances>
      ))}
    </>
  );
}

function Stools({ spots }: { spots: { x: number; y: number }[] }) {
  const mats = useMats();
  return (
    <>
      <Instances geometry={UNIT_CYL} material={mats.chair} limit={spots.length} castShadow>
        {spots.map((s, i) => (
          <Instance key={i} position={[WX(s.x), 0.74, WZ(s.y)]} scale={[0.19, 0.06, 0.19]} />
        ))}
      </Instances>
      <Instances geometry={UNIT_CYL} material={mats.metal} limit={spots.length * 2}>
        {spots.flatMap((s, i) => [
          <Instance key={`a${i}`} position={[WX(s.x), 0.37, WZ(s.y)]} scale={[0.025, 0.72, 0.025]} />,
          <Instance key={`b${i}`} position={[WX(s.x), 0.02, WZ(s.y)]} scale={[0.2, 0.03, 0.2]} />,
        ])}
      </Instances>
    </>
  );
}

function LoungeChair({ c, variant }: { c: Chair; variant: "armchair" | "pouf" }) {
  const mats = useMats();
  if (variant === "pouf") return <Cyl p={[WX(c.x), 0.22, WZ(c.y)]} r={0.24} h={0.44} m={mats.pouf} />;
  return (
    <group position={[WX(c.x), 0, WZ(c.y)]} rotation={[0, -c.yaw, 0]}>
      <Box p={[0, 0.42, 0]} s={[0.72, 0.16, 0.68]} m={mats.orange} />
      <Box p={[0, 0.78, 0.3]} s={[0.72, 0.6, 0.12]} m={mats.orange} rot={[-0.15, 0, 0]} />
      <Cyl p={[0, 0.17, 0]} r={0.2} h={0.34} m={mats.chairBase} />
    </group>
  );
}

function TableMesh({ t }: { t: Table }) {
  const mats = useMats();
  const top = t.finish === "dark" ? mats.dark : t.finish === "white" ? mats.white : mats.wood;
  const h = t.height ?? (t.finish === "dark" && t.shape === "oval" ? 0.75 : 0.74);
  const cx = WX(t.x + t.w / 2);
  const cz = WZ(t.y + t.h / 2);
  if (t.shape === "round" || t.shape === "oval") {
    return (
      <group>
        <mesh geometry={UNIT_CYL} position={[cx, h, cz]} scale={[t.w / 2, 0.04, t.h / 2]} material={top} castShadow receiveShadow />
        <Cyl p={[cx, h / 2, cz]} r={t.shape === "oval" ? 0.12 : 0.05} h={h} m={mats.leg} sx={t.shape === "oval" ? t.w / 3 : undefined} />
      </group>
    );
  }
  // Counters (taller) sit on a solid base; desks on slim legs.
  if (h > 0.85) {
    const base = t.finish === "white" && t.w > 3 ? mats.cabinet : t.finish === "dark" ? mats.leg : mats.white;
    return (
      <group>
        <Box p={[cx, h / 2, cz]} s={[t.w - 0.06, h - 0.04, t.h - 0.08]} m={base} />
        <Box p={[cx, h, cz]} s={[t.w, 0.04, t.h]} m={t.finish === "white" ? mats.white : top} />
      </group>
    );
  }
  const legs: V3[] = [
    [t.x + 0.06, 0, t.y + 0.06],
    [t.x + t.w - 0.06, 0, t.y + 0.06],
    [t.x + 0.06, 0, t.y + t.h - 0.06],
    [t.x + t.w - 0.06, 0, t.y + t.h - 0.06],
  ];
  return (
    <group>
      <Box p={[cx, h, cz]} s={[t.w, 0.04, t.h]} m={top} />
      {legs.map(([lx, , lz], i) => (
        <Box key={i} p={[WX(lx), h / 2, WZ(lz)]} s={[0.04, h, 0.04]} m={mats.leg} cast={false} />
      ))}
    </group>
  );
}

function Shrubs({ spots }: { spots: { x: number; y: number; h: number; r: number }[] }) {
  const mats = useMats();
  const blobs = useMemo(() => {
    const out: { p: V3; s: number; k: number }[] = [];
    let seed = 3;
    const rand = () => (seed = (seed * 9301 + 49297) % 233280) / 233280;
    for (const s of spots) {
      const n = 4 + Math.round(s.r * 8);
      for (let i = 0; i < n; i++) {
        const a = rand() * Math.PI * 2;
        const d = rand() * s.r * 0.6;
        out.push({ p: [WX(s.x + Math.cos(a) * d), s.h + rand() * s.r * 0.9, WZ(s.y + Math.sin(a) * d)], s: s.r * (0.35 + rand() * 0.3), k: i % 3 });
      }
    }
    return out;
  }, [spots]);
  const groups = [mats.leaf, mats.leafDark, mats.leafLight];
  return (
    <>
      {groups.map((m, k) => (
        <Instances key={k} geometry={UNIT_SPHERE} material={m} limit={Math.max(1, blobs.length)} castShadow>
          {blobs
            .filter((b) => b.k === k)
            .map((b, i) => (
              <Instance key={i} position={b.p} scale={b.s} />
            ))}
        </Instances>
      ))}
    </>
  );
}

function Fittings() {
  const mats = useMats();
  const [logo, setLogo] = useState<THREE.Texture | null>(null);
  const [coffee] = useState(() => neonTexture("maybe coffee", "#ffffff"));
  useEffect(() => {
    let alive = true;
    const t = logoTexture(() => alive && setLogo(t));
    return () => {
      alive = false;
    };
  }, []);
  const st = fittings.stairs;
  const lift = fittings.lift;
  const moss = fittings.moss;
  const steps = 12;
  return (
    <group>
      {/* Stairs: two flights rising away from the landing */}
      {Array.from({ length: steps }).map((_, i) => {
        const depth = (st.h - 1.2) / steps;
        const y = st.y + 1 + i * depth;
        return (
          <group key={i}>
            <Box p={[WX(st.x + st.w * 0.24), ((steps - i) * 0.14) / 2, WZ(y + depth / 2)]} s={[st.w * 0.46, (steps - i) * 0.14, depth]} m={mats.stair} cast={false} />
            <Box p={[WX(st.x + st.w * 0.76), ((i + 1) * 0.14) / 2, WZ(y + depth / 2)]} s={[st.w * 0.46, (i + 1) * 0.14, depth]} m={mats.stair} cast={false} />
          </group>
        );
      })}
      <Box p={[WX(st.x + st.w / 2), 1.0, WZ(st.y + 1 + (st.h - 1.2) / 2)]} s={[0.08, 2.0, st.h - 1.2]} m={mats.wall} />

      {/* Lift: a metal box with doors facing the lobby */}
      <Box p={[WX(lift.x + lift.w / 2), H / 2, WZ(lift.y + lift.h / 2)]} s={[lift.w, H, lift.h]} m={mats.wall} />
      {[-0.32, 0.32].map((dz) => (
        <Box key={dz} p={[WX(lift.x + lift.w) + 0.01, 1.1, WZ(lift.y + lift.h / 2) + dz]} s={[0.02, 2.2, 0.62]} m={mats.metal} cast={false} />
      ))}

      {/* Moss wall with the W, behind reception */}
      <mesh position={[WX(moss.x - 0.02), H / 2, WZ(moss.y + moss.h / 2)]} rotation={[0, -Math.PI / 2, 0]} material={mats.moss}>
        <planeGeometry args={[moss.h, H]} />
      </mesh>
      <Box p={[WX(moss.x + 0.03), H / 2, WZ(moss.y + moss.h / 2)]} s={[0.08, H, moss.h]} m={mats.wallTeal} />
      {logo && (
        <mesh position={[WX(moss.x - 0.05), 1.75, WZ(moss.y + moss.h / 2)]} rotation={[0, -Math.PI / 2, 0]}>
          <planeGeometry args={[0.9, 0.9]} />
          <meshStandardMaterial map={logo} transparent emissive="#ffffff" emissiveIntensity={0.2} emissiveMap={logo} />
        </mesh>
      )}
      {/* Sputnik chandelier over the reception desk */}
      <group position={[WX(12.9), 2.55, WZ(8.55)]}>
        {Array.from({ length: 10 }).map((_, i) => {
          const a = (i / 10) * Math.PI * 2;
          return (
            <group key={i}>
              <Box p={[Math.cos(a) * 0.3, -0.05 * (i % 3), Math.sin(a) * 0.3]} s={[0.6, 0.012, 0.012]} rot={[0, -a, 0.2 * (i % 2 ? 1 : -1)]} m={mats.frame} cast={false} />
              <mesh position={[Math.cos(a) * 0.6, -0.05 * (i % 3), Math.sin(a) * 0.6]} geometry={UNIT_SPHERE} scale={0.05} material={mats.lightBar} />
            </group>
          );
        })}
      </group>

      {/* Café neon on the boss cabin wall facing the counter */}
      <mesh position={[WX(16.9), 2.35, WZ(6.5) - 0.07]} rotation={[0, Math.PI, 0]}>
        <planeGeometry args={[2.4, 0.6]} />
        <meshBasicMaterial map={coffee} transparent toneMapped={false} />
      </mesh>

      {/* Lounge: sofa, chess table and poufs */}
      <group position={[WX(fittings.sofa.x + fittings.sofa.w / 2), 0, WZ(fittings.sofa.y + fittings.sofa.h / 2)]}>
        <Box p={[0, 0.25, 0]} s={[fittings.sofa.w, 0.4, fittings.sofa.h]} m={mats.sofa} />
        <Box p={[-fittings.sofa.w / 2 + 0.12, 0.6, 0]} s={[0.24, 0.5, fittings.sofa.h]} m={mats.sofa} />
      </group>
      <Cyl p={[WX(fittings.chess.x), 0.6, WZ(fittings.chess.y)]} r={fittings.chess.r} h={0.03} m={mats.white} />
      <mesh position={[WX(fittings.chess.x), 0.62, WZ(fittings.chess.y)]} rotation={[-Math.PI / 2, 0, 0]} material={mats.checker}>
        <planeGeometry args={[0.42, 0.42]} />
      </mesh>
      <Cyl p={[WX(fittings.chess.x), 0.3, WZ(fittings.chess.y)]} r={0.05} h={0.6} m={mats.leg} />
      {[-0.7, 0.7].map((dx) => (
        <Cyl key={dx} p={[WX(fittings.chess.x + dx), 0.22, WZ(fittings.chess.y)]} r={0.22} h={0.44} m={mats.pouf} />
      ))}

      {/* Washrooms */}
      {fittings.wcs.map((w, i) => (
        <group key={i} position={[WX(w.x), 0, WZ(w.y)]}>
          <Box p={[0, 0.2, 0]} s={[0.6, 0.4, 0.4]} m={mats.porcelain} />
          <Box p={[-0.32, 0.45, 0]} s={[0.15, 0.5, 0.4]} m={mats.porcelain} />
        </group>
      ))}
      <Box p={[WX(4.0), 1.0, WZ(24.95)]} s={[2.0, 2.0, 0.05]} m={mats.wallTeal} />
      <Box p={[WX(6.95), 0.82, WZ(26.6)]} s={[3.1, 0.06, 0.6]} m={mats.dark} />
      {fittings.sinks.map((s, i) => (
        <Cyl key={i} p={[WX(s.x), 0.86, WZ(s.y)]} r={0.18} h={0.06} m={mats.porcelain} />
      ))}
      <Box p={[WX(6.95), 1.55, WZ(26.94)]} s={[2.4, 0.9, 0.02]} m={mats.metal} cast={false} />

      {/* Conference: moss wall and the screen */}
      <mesh position={[WX(8.9) + 0.11, H / 2, WZ(24.8)]} rotation={[0, Math.PI / 2, 0]} material={mats.moss}>
        <planeGeometry args={[4.0, H - 0.2]} />
      </mesh>
      <Box p={[WX(14) - 0.12, 1.45, WZ(24.85)]} s={[0.05, 0.9, 1.6]} m={mats.screen} />
    </group>
  );
}

function PodcastSet() {
  const mats = useMats();
  const room = rooms.find((r) => r.id === "podcast")!;
  const { x, y, w, h } = room.rect;
  const [neon] = useState(() => neonTexture("On air", "#ff6a3d"));
  return (
    <group>
      {/* Dark lining on the outer walls */}
      <Box p={[WX(x + w) - 0.06, H / 2, WZ(y + h / 2)]} s={[0.02, H, h - 0.1]} m={mats.wallDark} cast={false} />
      <Box p={[WX(x + w / 2), H / 2, WZ(y + h) - 0.06]} s={[w - 0.1, H, 0.02]} m={mats.wallDark} cast={false} />
      {[0, 1, 2].map((i) => (
        <Box key={i} p={[WX(x + 0.75 + i * 1.25), 1.6, WZ(y) + 0.13]} s={[1.0, 1.0, 0.06]} m={mats.acoustic} />
      ))}
      <mesh position={[WX(x + w / 2), 2.45, WZ(y) + 0.17]}>
        <planeGeometry args={[1.8, 0.45]} />
        <meshBasicMaterial map={neon} transparent toneMapped={false} />
      </mesh>
      <pointLight position={[WX(x + w / 2), 2.2, WZ(y + 0.8)]} color="#ff6a3d" intensity={2.2} distance={4} />
      {/* Mics on booms at the round table */}
      {[-0.55, 0.55].map((dx) => (
        <group key={dx} position={[WX(17.0 + dx), 0, WZ(24.0)]}>
          <Cyl p={[0, 0.95, 0]} r={0.012} h={0.7} m={mats.frame} />
          <Cyl p={[0, 1.3, 0]} r={0.04} h={0.14} m={mats.frame} />
        </group>
      ))}
      {/* Camera on a tripod */}
      <group position={[WX(17.0), 0, WZ(25.0)]}>
        <Box p={[0, 1.45, 0]} s={[0.22, 0.14, 0.3]} m={mats.frame} />
        {[0, 2.1, 4.2].map((a) => (
          <Box key={a} p={[Math.sin(a) * 0.18, 0.7, Math.cos(a) * 0.18]} s={[0.03, 1.4, 0.03]} rot={[Math.cos(a) * 0.25, 0, -Math.sin(a) * 0.25]} m={mats.frame} />
        ))}
      </group>
    </group>
  );
}

function Ceiling() {
  const mats = useMats();
  const group = useRef<THREE.Group>(null);
  // Only from below: from the overview the ceiling would hide the plan.
  useFrame(({ camera }) => {
    if (group.current) group.current.visible = camera.position.y < H + 0.4;
  });
  return (
    <group ref={group} visible={false}>
      <mesh position={[0, H, 0]} rotation={[Math.PI / 2, 0, 0]} material={mats.ceiling}>
        <planeGeometry args={[FLOOR.width + 1, FLOOR.depth + 1]} />
      </mesh>
      {[WX(8.15), WX(14.45)].map((dx) => (
        <mesh key={dx} geometry={UNIT_CYL} position={[dx, H - 0.35, 0]} rotation={[Math.PI / 2, 0, 0]} scale={[0.2, FLOOR.depth - 2, 0.2]} material={mats.duct} />
      ))}
      {Array.from({ length: 7 }).map((_, i) =>
        [WX(8.15), WX(11.3), WX(14.45)].map((dx) => (
          <mesh key={`${i}-${dx}`} geometry={UNIT_BOX} position={[dx, H - 0.55, -11 + i * 3.6]} scale={[0.08, 0.04, 2.0]} material={mats.lightBar} />
        ))
      )}
    </group>
  );
}

// --- status markers ------------------------------------------------------------------

const RING = new THREE.RingGeometry(0.4, 0.5, 40);

function SeatMarkers({ statuses, selectedId, hoveredId }: { statuses: Map<string, Status>; selectedId: string | null; hoveredId: string | null }) {
  const [glow] = useState(glowTexture);
  const [beam] = useState(beamTexture);
  const pulse = useRef<THREE.Mesh>(null);
  const beamRef = useRef<THREE.Mesh>(null);
  const selectedDesk = desks.find((d) => d.id === selectedId);
  const pos = useMemo(() => (selectedDesk ? new THREE.Vector2(WX(selectedDesk.seat.x), WZ(selectedDesk.seat.y)) : null), [selectedDesk]);
  useFrame(({ clock, camera }) => {
    const t = clock.getElapsedTime();
    if (pulse.current) {
      const k = (t % 1.6) / 1.6;
      pulse.current.scale.setScalar(1 + k * 1.6);
      (pulse.current.material as THREE.MeshBasicMaterial).opacity = 0.7 * (1 - k);
    }
    if (beamRef.current && pos) {
      const near = Math.hypot(camera.position.x - pos.x, camera.position.z - pos.y) < 1.6 && camera.position.y < 4;
      beamRef.current.visible = !near;
      (beamRef.current.material as THREE.MeshBasicMaterial).opacity = 0.75 + Math.sin(t * 2.4) * 0.15;
    }
  });
  return (
    <group>
      {desks.map((d) => {
        const status = statuses.get(d.id) ?? "available";
        const selected = d.id === selectedId;
        const hovered = d.id === hoveredId;
        const color = selected ? "#c8f169" : status === "booked" ? "#9aa8a6" : hovered ? "#2bb39d" : "#037e6e";
        return (
          <mesh key={d.id} geometry={RING} position={[WX(d.seat.x), 0.012, WZ(d.seat.y)]} rotation={[-Math.PI / 2, 0, 0]} scale={hovered || selected ? 1.15 : 1}>
            <meshBasicMaterial color={color} transparent opacity={status === "booked" ? 0.45 : 0.9} toneMapped={false} />
          </mesh>
        );
      })}
      {selectedDesk && (
        <group position={[WX(selectedDesk.seat.x), 0, WZ(selectedDesk.seat.y)]}>
          <mesh ref={pulse} geometry={RING} position={[0, 0.014, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <meshBasicMaterial color="#c8f169" transparent opacity={0.6} toneMapped={false} depthWrite={false} />
          </mesh>
          <mesh position={[0, 0.016, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[1.6, 1.6]} />
            <meshBasicMaterial map={glow} transparent depthWrite={false} toneMapped={false} blending={THREE.AdditiveBlending} />
          </mesh>
          <mesh ref={beamRef} position={[0, 1.4, 0]}>
            <cylinderGeometry args={[0.32, 0.32, 2.8, 32, 1, true]} />
            <meshBasicMaterial map={beam} transparent depthWrite={false} side={THREE.DoubleSide} toneMapped={false} blending={THREE.AdditiveBlending} />
          </mesh>
        </group>
      )}
    </group>
  );
}

function SeatLabel({ code, status, selected, x, y }: { code: string; status: Status; selected: boolean; x: number; y: number }) {
  const texture = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = 128;
    c.height = 64;
    const g = c.getContext("2d")!;
    g.fillStyle = selected ? "#c8f169" : status === "booked" ? "#d9e0df" : "#023c40";
    g.beginPath();
    g.roundRect(4, 8, 120, 48, 24);
    g.fill();
    g.fillStyle = selected ? "#023c40" : status === "booked" ? "#6c7d7b" : "#ffffff";
    g.font = `600 30px "DM Sans", system-ui, sans-serif`;
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillText(code, 64, 33);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, [code, status, selected]);
  useEffect(() => () => texture.dispose(), [texture]);
  const ref = useRef<THREE.Group>(null);
  useFrame(({ camera }) => {
    if (ref.current) ref.current.visible = Math.hypot(camera.position.x - WX(x), camera.position.z - WZ(y)) > 1.5;
  });
  return (
    <Billboard ref={ref} position={[WX(x), 1.55, WZ(y)]}>
      <mesh>
        <planeGeometry args={[0.42, 0.21]} />
        <meshBasicMaterial map={texture} transparent toneMapped={false} depthWrite={false} />
      </mesh>
    </Billboard>
  );
}

function RoomTint({ room, status, selected }: { room: RoomResource; status: Status; selected: boolean }) {
  const { x, y, w, h } = room.rect;
  const ref = useRef<THREE.Mesh>(null);
  useFrame(({ camera }) => {
    if (ref.current) ref.current.visible = camera.position.y > 3.4;
  });
  if (!selected && status !== "booked") return null;
  return (
    <mesh ref={ref} position={[WX(x + w / 2), 0.01, WZ(y + h / 2)]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[w - 0.2, h - 0.2]} />
      <meshBasicMaterial color={selected ? "#c8f169" : "#9aa8a6"} transparent opacity={selected ? 0.32 : 0.18} depthWrite={false} toneMapped={false} />
    </mesh>
  );
}

// --- root ---------------------------------------------------------------------------------

export type ModelProps = {
  statuses: Map<string, Status>;
  selectedId: string | null;
  onPick: (id: string) => void;
  showLabels: boolean;
  children?: ReactNode;
};

export function FloorModel({ statuses, selectedId, onPick, showLabels, children }: ModelProps) {
  const mats = useMemo(() => makeMaterials(), []);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  useEffect(
    () => () => {
      Object.values(mats).forEach((m) => {
        (m as THREE.MeshStandardMaterial).map?.dispose();
        m.dispose();
      });
    },
    [mats]
  );

  const placedWalls = useMemo(() => walls.map(placed), []);

  const furniture = useMemo(() => {
    const office: Spot[] = desks.map((d) => d.seat);
    const stools: { x: number; y: number }[] = [];
    const lounge: { c: Chair; variant: "armchair" | "pouf" }[] = [];
    const tables: Table[] = clusters.map(clusterTable);
    for (const r of rooms) {
      tables.push(...r.furniture.tables);
      for (const c of r.furniture.chairs) {
        if (c.kind === "lounge") lounge.push({ c, variant: "armchair" });
        else office.push(c);
      }
    }
    for (const z of zones) {
      tables.push(...z.furniture.tables);
      for (const c of z.furniture.chairs) {
        if (c.kind === "stool") stools.push(c);
        else if (c.kind === "lounge") lounge.push({ c, variant: "pouf" });
        else office.push(c);
      }
    }
    return { office, stools, lounge, tables };
  }, []);

  const shrubs = useMemo(
    () => [
      ...fittings.plants.map((p) => ({ x: p.x, y: p.y, h: 0.6, r: p.r })),
      ...Array.from({ length: 4 }, (_, i) => ({ x: 12 + i * 2.1, y: 0.42, h: 1.2, r: 0.17 })),
    ],
    []
  );

  const pick = (id: string) => (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    if (e.delta > 6) return; // that was a drag to look around
    onPick(id);
  };

  const woodZones = zones.filter((z) => z.tone === "lounge" || z.tone === "reception" || z.tone === "cafe");
  const washrooms = zones.find((z) => z.tone === "service")!.rect;

  return (
    <MatsContext value={mats}>
      <group>
        {/* Slab, wood floors in the social areas, tiles in the washrooms */}
        <mesh position={[0, -0.05, 0]} receiveShadow geometry={UNIT_BOX} scale={[FLOOR.width + 0.4, 0.1, FLOOR.depth + 0.4]} material={mats.floor} />
        {woodZones.map((z) => (
          <mesh key={z.id} position={[WX(z.rect.x + z.rect.w / 2), 0.003, WZ(z.rect.y + z.rect.h / 2)]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow material={mats.woodFloor}>
            <planeGeometry args={[z.rect.w, z.rect.h]} />
          </mesh>
        ))}
        <mesh position={[WX(washrooms.x + washrooms.w / 2), 0.004, WZ(washrooms.y + washrooms.h / 2)]} rotation={[-Math.PI / 2, 0, 0]} material={mats.tile}>
          <planeGeometry args={[washrooms.w, washrooms.h]} />
        </mesh>
        <Box p={[WX(8.6), 0.006, WZ(6.4)]} s={[3.2, 0.01, 2.6]} m={mats.rug} cast={false} />

        {placedWalls.map((seg, i) => (
          <Wall key={i} seg={seg} />
        ))}
        <DoorFrames />
        {/* Entrance threshold sign */}
        <Box p={[WX(ENTRANCE.x) - 0.06, 2.55, WZ((ENTRANCE.from + ENTRANCE.to) / 2)]} s={[0.02, 0.3, 1.2]} m={mats.dark} cast={false} />

        {furniture.tables.map((t, i) => (
          <TableMesh key={i} t={t} />
        ))}
        <OfficeChairs spots={furniture.office} />
        <Stools spots={furniture.stools} />
        {furniture.lounge.map(({ c, variant }, i) => (
          <LoungeChair key={i} c={c} variant={variant} />
        ))}
        {fittings.plants.map((p, i) => (
          <Cyl key={i} p={[WX(p.x), 0.3, WZ(p.y)]} r={p.r * 0.7} h={0.6} m={mats.pot} />
        ))}
        <Shrubs spots={shrubs} />
        <Fittings />
        <PodcastSet />
        <Ceiling />

        {/* Booked desks have someone's things on them */}
        {desks.map((d) => {
          if (statuses.get(d.id) !== "booked") return null;
          const toward = d.seat.yaw === 0 ? -1 : 1;
          return (
            <group key={d.id} position={[WX(d.seat.x), 0.76, WZ(d.seat.y + toward * 0.55)]} rotation={[0, toward > 0 ? 0 : Math.PI, 0]}>
              <Box p={[0, 0.008, 0]} s={[0.34, 0.016, 0.24]} m={mats.laptop} />
              <Box p={[0, 0.12, 0.11]} s={[0.34, 0.22, 0.012]} rot={[-0.25, 0, 0]} m={mats.screen} />
              <Cyl p={[0.32, 0.05, -0.05]} r={0.04} h={0.1} m={mats.porcelain} />
            </group>
          );
        })}

        <SeatMarkers statuses={statuses} selectedId={selectedId} hoveredId={hoveredId} />
        {rooms.map((r) => (
          <RoomTint key={r.id} room={r} status={statuses.get(r.id) ?? "available"} selected={selectedId === r.id} />
        ))}
        {showLabels &&
          desks.map((d) => <SeatLabel key={d.id} code={d.code} status={statuses.get(d.id) ?? "available"} selected={selectedId === d.id} x={d.seat.x} y={d.seat.y} />)}

        {/* Hit targets: invisible, generous, drag-aware */}
        {desks.map((d) => (
          <mesh
            key={d.id}
            position={[WX(d.seat.x), 0.6, WZ(d.seat.y)]}
            geometry={UNIT_CYL}
            scale={[0.48, 1.2, 0.48]}
            onClick={pick(d.id)}
            onPointerOver={(e) => {
              e.stopPropagation();
              setHoveredId(d.id);
              document.body.style.cursor = "pointer";
            }}
            onPointerOut={() => {
              setHoveredId(null);
              document.body.style.cursor = "";
            }}
          >
            <meshBasicMaterial transparent opacity={0} depthWrite={false} />
          </mesh>
        ))}
        {rooms.map((r) => (
          <mesh
            key={r.id}
            position={[WX(r.rect.x + r.rect.w / 2), 0.02, WZ(r.rect.y + r.rect.h / 2)]}
            rotation={[-Math.PI / 2, 0, 0]}
            onClick={pick(r.id)}
            onPointerOver={(e) => {
              e.stopPropagation();
              document.body.style.cursor = "pointer";
            }}
            onPointerOut={() => (document.body.style.cursor = "")}
          >
            <planeGeometry args={[r.rect.w - 0.3, r.rect.h - 0.3]} />
            <meshBasicMaterial transparent opacity={0} depthWrite={false} />
          </mesh>
        ))}
        {children}
      </group>
    </MatsContext>
  );
}
