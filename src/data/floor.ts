// The real Worklush third floor, traced from the fire evacuation diagram on
// site. One source of truth: the 2D plan (SVG), the 3D walkthrough (three.js)
// and the walk paths all render from this file, so a chair moved here moves
// everywhere.
//
// Units are metres. Plan axes match the diagram: x runs left → right, y runs
// top → bottom. The window wall is at the top (y = 0); the lift lobby and the
// main entrance are on the left. In 3D, plan y becomes world z.

export const FLOOR = { width: 19, depth: 27, wallHeight: 3 } as const;

/** The floor's outline: the lift lobby juts out on the upper left. */
export const OUTLINE: [number, number][] = [
  [0, 0],
  [19, 0],
  [19, 27],
  [3, 27],
  [3, 14.25],
  [0, 14.25],
];

export type Rect = { x: number; y: number; w: number; h: number };
export type Side = "n" | "s" | "e" | "w";

/** 0 = facing up the plan (north), clockwise, radians. */
export type Chair = { x: number; y: number; yaw: number; kind?: "office" | "visitor" | "lounge" | "stool" };
export type Table = { x: number; y: number; w: number; h: number; shape?: "rect" | "round" | "oval"; finish?: "wood" | "white" | "dark"; height?: number };
export type Furniture = { chairs: Chair[]; tables: Table[] };

export type ResourceKind = "desk" | "boss" | "cabin" | "conference" | "podcast";

/** What a space can be booked by. A cabin works as an hourly meeting room or
 *  as a monthly private office. */
export type Pricing = {
  day?: { amount: number; note: string };
  hour?: number;
  month?: { amount: number; listAmount?: number; note: string } | { enquire: true };
};

/** A 3D viewpoint: eye position and facing. yaw: 0 = north, clockwise. */
export type View = { x: number; y: number; yaw: number; eye?: number; pitch?: number };

type Base = {
  id: string;
  code: string;
  name: string;
  kind: ResourceKind;
  capacity: number;
  pricing: Pricing;
  /** Real photos from the space, first one is the cover. */
  photos: string[];
  blurb: string;
  features: string[];
  view: View;
};

export type DeskResource = Base & {
  kind: "desk";
  cluster: ClusterId;
  seat: Chair;
};

export type RoomResource = Base & {
  kind: Exclude<ResourceKind, "desk">;
  rect: Rect;
  /** The corridor side, glass unless the room is acoustic, with its door. */
  front: Side;
  door: { from: number; to: number };
  glass: boolean;
  furniture: Furniture;
};

export type Resource = DeskResource | RoomResource;

/** Yaw (0 = north, clockwise) for an eye at (x, y) looking at (tx, ty). */
export function yawToward(x: number, y: number, tx: number, ty: number) {
  return Math.atan2(tx - x, -(ty - y));
}

const N = 0;
const E = Math.PI / 2;
const S = Math.PI;
const W = -Math.PI / 2;

const toward = (x: number, y: number, tx: number, ty: number): View => ({ x, y, yaw: yawToward(x, y, tx, ty) });

const PHOTO = {
  desksFront: ["/images/rooms-1.jpg", "/images/rooms-7.jpg", "/images/open-booking.jpg"],
  desksMiddle: ["/images/open-booking.jpg", "/images/rooms-9.jpg", "/images/rooms-5b.jpg"],
  desksBack: ["/images/rooms-9.jpg", "/images/day-room.jpg", "/images/rooms-1.jpg"],
  boss: ["/images/rooms-6.jpg", "/images/cabin.jpg"],
  conference: ["/images/conference.jpg"],
  podcast: ["/images/podcast.jpg"],
};

// ---------------------------------------------------------------------------
// Open desks: three clusters in the middle of the floor, 6 + 8 + 8 = 22.
// ---------------------------------------------------------------------------

export type ClusterId = "A" | "B" | "C";

export const DESK_DEPTH = 1.0;
const CHAIR_GAP = 0.85; // chair centre from the cluster's centre line

export const clusters: { id: ClusterId; y: number; xs: number[]; note: string; photos: string[] }[] = [
  { id: "A", y: 13.65, xs: [9.85, 11.0, 12.15], note: "Front cluster, a few steps from reception", photos: PHOTO.desksFront },
  { id: "B", y: 17.35, xs: [9.6, 10.75, 11.9, 13.05], note: "Middle cluster, in the heart of the floor", photos: PHOTO.desksMiddle },
  { id: "C", y: 20.85, xs: [9.6, 10.75, 11.9, 13.05], note: "Back cluster by the conference room, the quietest", photos: PHOTO.desksBack },
];

export function clusterTable(c: (typeof clusters)[number]): Table {
  const pad = 0.6;
  const x0 = c.xs[0] - pad;
  const x1 = c.xs[c.xs.length - 1] + pad;
  return { x: x0, y: c.y - DESK_DEPTH / 2, w: x1 - x0, h: DESK_DEPTH, finish: "wood" };
}

const DAY_PASS: Pricing = { day: { amount: 500, note: "Full day, 9 am – 6 pm" } };

function deskSeats(): DeskResource[] {
  const out: DeskResource[] = [];
  for (const c of clusters) {
    (["top", "bottom"] as const).forEach((row, r) => {
      c.xs.forEach((x, i) => {
        const n = r * c.xs.length + i + 1;
        const y = row === "top" ? c.y - CHAIR_GAP : c.y + CHAIR_GAP;
        const facing = row === "top" ? S : N;
        const edge = i === 0 || i === c.xs.length - 1;
        const features = ["Your own desk for the day", "Power and USB at the desk", "Ergonomic mesh chair", "Café, lounge and window bar included"];
        if (edge) features.splice(3, 0, "End seat, easy in and out");
        out.push({
          id: `desk-${c.id}${n}`,
          code: `${c.id}${n}`,
          name: `Desk ${c.id}${n}`,
          kind: "desk",
          cluster: c.id,
          capacity: 1,
          pricing: DAY_PASS,
          photos: c.photos,
          blurb: c.note,
          features,
          seat: { x, y, yaw: facing, kind: "office" },
          // Standing just behind the chair, looking over it at the desk.
          view: { x, y: row === "top" ? y - 0.6 : y + 0.6, yaw: facing, eye: 1.45, pitch: -0.26 },
        });
      });
    });
  }
  return out;
}

// ---------------------------------------------------------------------------
// Rooms. Hourly prices are the current site's meeting-room rates for each
// size; monthly prices come from the cabin offer cards. Sizes without a
// published monthly rate say "on request".
// ---------------------------------------------------------------------------

function deskRows(x0: number, x1: number, y0: number, rows: number[], gap = 1.75): Furniture {
  const chairs: Chair[] = [];
  const tables: Table[] = [];
  rows.forEach((count, r) => {
    const cy = y0 + 1.05 + r * gap;
    tables.push({ x: x0 + 0.3, y: cy - 0.85, w: x1 - x0 - 0.6, h: 0.6, finish: "wood" });
    const span = x1 - x0 - 1.4;
    for (let i = 0; i < count; i++) chairs.push({ x: x0 + 0.85 + (span * i) / 2, y: cy, yaw: N, kind: "office" });
  });
  return { chairs, tables };
}

function bossFurniture(y0: number): Furniture {
  return {
    tables: [{ x: 16.6, y: y0 + 0.25, w: 0.65, h: 1.45, finish: "wood" }],
    chairs: [
      { x: 17.7, y: y0 + 0.97, yaw: W, kind: "office" },
      { x: 16.05, y: y0 + 0.55, yaw: E, kind: "visitor" },
      { x: 16.05, y: y0 + 1.4, yaw: E, kind: "visitor" },
    ],
  };
}

const CABIN_FEATURES = ["Lockable glass cabin", "Screen for calls and decks", "Power at every desk", "RFID access for members"];
const MONTH_OFFER = (amount: number, listAmount: number) => ({ amount, listAmount, note: "Introductory offer · one month's deposit at move-in" });

export const rooms: RoomResource[] = [
  {
    id: "boss-1",
    code: "BC1",
    name: "Boss Cabin 1",
    kind: "boss",
    capacity: 3,
    pricing: { hour: 450, month: MONTH_OFFER(24999, 29999) },
    photos: PHOTO.boss,
    blurb: "A private cabin beside the moss wall: your desk and two chairs for visitors.",
    features: ["Executive desk and two visitor chairs", "Lockable glass cabin", "Right next to reception", "Book by the hour or by the month"],
    rect: { x: 14.75, y: 6.5, w: 4.25, h: 1.95 },
    front: "w",
    door: { from: 6.62, to: 7.38 },
    glass: true,
    furniture: bossFurniture(6.5),
    view: toward(15.25, 7.0, 18.6, 7.5),
  },
  {
    id: "boss-2",
    code: "BC2",
    name: "Boss Cabin 2",
    kind: "boss",
    capacity: 3,
    pricing: { hour: 450, month: MONTH_OFFER(24999, 29999) },
    photos: [...PHOTO.boss].reverse(),
    blurb: "The second boss cabin, on the other side of the moss wall.",
    features: ["Executive desk and two visitor chairs", "Lockable glass cabin", "Right next to reception", "Book by the hour or by the month"],
    rect: { x: 14.75, y: 8.45, w: 4.25, h: 2.0 },
    front: "w",
    door: { from: 9.55, to: 10.33 },
    glass: true,
    furniture: bossFurniture(8.45),
    view: toward(15.25, 9.95, 18.6, 9.4),
  },
  {
    id: "cabin-6a",
    code: "TC6A",
    name: "Cabin 6 · North",
    kind: "cabin",
    capacity: 6,
    pricing: { hour: 650, month: MONTH_OFFER(34999, 39999) },
    photos: ["/images/cabin.jpg", "/images/rooms-10.jpg", "/images/rooms-5.jpg"],
    blurb: "Six desks in two rows with the window along one side.",
    features: ["6 desks in two rows", ...CABIN_FEATURES, "Book by the hour or by the month"],
    rect: { x: 15, y: 11.6, w: 4, h: 3.9 },
    front: "w",
    door: { from: 14.55, to: 15.35 },
    glass: true,
    furniture: deskRows(15, 19, 11.6, [3, 3]),
    view: toward(15.55, 15.0, 18.4, 12.3),
  },
  {
    id: "cabin-5",
    code: "TC5",
    name: "Cabin 5",
    kind: "cabin",
    capacity: 5,
    pricing: { hour: 550, month: { enquire: true } },
    photos: ["/images/rooms-10.jpg", "/images/rooms-6.jpg", "/images/cabin.jpg"],
    blurb: "Five desks for a small team, between the two six-seaters.",
    features: ["5 desks in two rows", ...CABIN_FEATURES, "Hourly, or monthly on request"],
    rect: { x: 15, y: 15.5, w: 4, h: 3.5 },
    front: "w",
    door: { from: 18.1, to: 18.9 },
    glass: true,
    furniture: deskRows(15, 19, 15.5, [3, 2], 1.6),
    view: toward(15.55, 18.5, 18.4, 16.1),
  },
  {
    id: "cabin-6b",
    code: "TC6B",
    name: "Cabin 6 · South",
    kind: "cabin",
    capacity: 6,
    pricing: { hour: 650, month: MONTH_OFFER(34999, 39999) },
    photos: ["/images/rooms-5.jpg", "/images/cabin.jpg", "/images/rooms-10.jpg"],
    blurb: "The second six-seater, closest to the podcast studio.",
    features: ["6 desks in two rows", ...CABIN_FEATURES, "Book by the hour or by the month"],
    rect: { x: 15, y: 19, w: 4, h: 3.75 },
    front: "w",
    door: { from: 21.8, to: 22.6 },
    glass: true,
    furniture: deskRows(15, 19, 19, [3, 3], 1.65),
    view: toward(15.55, 22.0, 18.4, 19.7),
  },
  {
    id: "podcast",
    code: "PS",
    name: "Podcast Studio",
    kind: "podcast",
    capacity: 4,
    pricing: { hour: 1900 },
    photos: PHOTO.podcast,
    blurb: "Sound-treated, lit and mic'd. Walk in and hit record.",
    features: ["Pro mics and headphones", "Acoustic treatment", "Mixer and recorder", "Camera, lights and backdrop"],
    rect: { x: 15, y: 22.75, w: 4, h: 4.25 },
    front: "w",
    door: { from: 23.0, to: 23.85 },
    glass: false,
    furniture: {
      tables: [
        { x: 16.55, y: 23.55, w: 0.9, h: 0.9, shape: "round", finish: "white", height: 0.6 },
        { x: 15.7, y: 26.1, w: 2.6, h: 0.65, finish: "dark" },
      ],
      chairs: [
        { x: 15.95, y: 24.0, yaw: E, kind: "lounge" },
        { x: 18.05, y: 24.0, yaw: W, kind: "lounge" },
        { x: 16.4, y: 25.6, yaw: S, kind: "office" },
        { x: 17.6, y: 25.6, yaw: S, kind: "office" },
      ],
    },
    view: toward(15.5, 23.45, 17.4, 25.2),
  },
  {
    id: "conference",
    code: "CR",
    name: "Conference Room",
    kind: "conference",
    capacity: 10,
    pricing: { hour: 1500 },
    photos: PHOTO.conference,
    blurb: "Ten seats around one long table, a big screen and the moss wall.",
    features: ["10 seats", "65\" screen with HDMI and casting", "Whiteboard", "Video-call ready"],
    rect: { x: 8.9, y: 22.6, w: 5.1, h: 4.4 },
    front: "n",
    door: { from: 12.85, to: 13.75 },
    glass: true,
    furniture: {
      tables: [{ x: 9.6, y: 24.2, w: 3.7, h: 1.3, shape: "oval", finish: "dark" }],
      chairs: [
        ...[10.2, 11.05, 11.9, 12.75].map((x) => ({ x, y: 23.85, yaw: S, kind: "office" as const })),
        ...[10.2, 11.05, 11.9, 12.75].map((x) => ({ x, y: 25.85, yaw: N, kind: "office" as const })),
        { x: 9.3, y: 24.85, yaw: E, kind: "office" },
        { x: 13.6, y: 24.85, yaw: W, kind: "office" },
      ],
    },
    view: toward(13.3, 23.15, 10.2, 25.4),
  },
  {
    id: "cabin-7",
    code: "TC7",
    name: "Cabin 7",
    kind: "cabin",
    capacity: 7,
    pricing: { hour: 750, month: { enquire: true } },
    photos: ["/images/rooms-10.jpg", "/images/cabin.jpg"],
    blurb: "The largest cabin: desks along both walls for seven.",
    features: ["7 desks along two walls", ...CABIN_FEATURES, "Hourly, or monthly on request"],
    rect: { x: 3, y: 14.25, w: 4.4, h: 5.65 },
    front: "e",
    door: { from: 14.6, to: 15.45 },
    glass: true,
    furniture: {
      tables: [
        { x: 3.15, y: 14.6, w: 0.6, h: 5.0, finish: "wood" },
        { x: 6.65, y: 15.85, w: 0.6, h: 3.75, finish: "wood" },
      ],
      chairs: [
        ...[15.15, 16.3, 17.45, 18.6].map((y) => ({ x: 4.2, y, yaw: W, kind: "office" as const })),
        ...[16.4, 17.55, 18.7].map((y) => ({ x: 6.2, y, yaw: E, kind: "office" as const })),
      ],
    },
    view: toward(6.85, 15.05, 4.3, 18.8),
  },
  {
    id: "cabin-4",
    code: "TC4",
    name: "Cabin 4",
    kind: "cabin",
    capacity: 4,
    pricing: { hour: 450, month: { enquire: true } },
    photos: ["/images/cabin.jpg", "/images/rooms-6.jpg"],
    blurb: "Four desks facing each other, for a founding team.",
    features: ["4 desks, face to face", ...CABIN_FEATURES, "Hourly, or monthly on request"],
    rect: { x: 3, y: 19.9, w: 4.4, h: 3.4 },
    front: "e",
    door: { from: 22.35, to: 23.15 },
    glass: true,
    furniture: {
      tables: [{ x: 3.85, y: 21.2, w: 2.7, h: 0.8, finish: "wood" }],
      chairs: [
        { x: 4.55, y: 20.7, yaw: S, kind: "office" },
        { x: 5.85, y: 20.7, yaw: S, kind: "office" },
        { x: 4.55, y: 22.5, yaw: N, kind: "office" },
        { x: 5.85, y: 22.5, yaw: N, kind: "office" },
      ],
    },
    view: toward(6.85, 22.75, 4.3, 20.7),
  },
];

export const desks: DeskResource[] = deskSeats();
export const resources: Resource[] = [...desks, ...rooms];
export const resourceById = new Map<string, Resource>(resources.map((r) => [r.id, r]));

// ---------------------------------------------------------------------------
// Shared spaces: drawn, walkable and clickable for photos, not bookable.
// ---------------------------------------------------------------------------

export type ZoneTone = "lobby" | "lounge" | "window" | "cafe" | "reception" | "service";

export type Zone = {
  id: string;
  name: string;
  rect: Rect;
  tone: ZoneTone;
  photos: string[];
  blurb: string;
  furniture: Furniture;
  /** Where the label sits, if not the centre. */
  label?: { x: number; y: number };
};

export const zones: Zone[] = [
  {
    id: "lobby",
    name: "Lift lobby",
    rect: { x: 0, y: 0, w: 6.5, h: 14.25 },
    tone: "lobby",
    photos: ["/images/entrance.jpg", "/images/building.jpg"],
    blurb: "Take the lift or the stairs to the third floor. The main entrance opens into the lounge.",
    furniture: { chairs: [], tables: [] },
    label: { x: 1.9, y: 10.25 },
  },
  {
    id: "lounge",
    name: "Lounge",
    rect: { x: 6.5, y: 0, w: 4.25, h: 11.6 },
    tone: "lounge",
    photos: ["/images/living-room.jpg", "/images/relax-room.jpg", "/images/chess.jpg"],
    blurb: "Sofas, a chess table and café tables for breaks, calls and catching up. Free for everyone on the floor.",
    furniture: {
      tables: [
        { x: 8.2, y: 1.5, w: 1.0, h: 1.0, shape: "round", finish: "white" },
        { x: 8.75, y: 6.05, w: 0.9, h: 0.9, shape: "round", finish: "white", height: 0.45 },
      ],
      chairs: [
        { x: 7.65, y: 1.75, yaw: E, kind: "lounge" },
        { x: 9.75, y: 1.75, yaw: W, kind: "lounge" },
        { x: 8.7, y: 2.95, yaw: N, kind: "lounge" },
        { x: 9.85, y: 5.85, yaw: W, kind: "lounge" },
        { x: 9.7, y: 7.25, yaw: W, kind: "lounge" },
      ],
    },
    label: { x: 8.6, y: 4.3 },
  },
  {
    id: "window-bar",
    name: "Window bar",
    rect: { x: 10.75, y: 0, w: 8.25, h: 2.6 },
    tone: "window",
    photos: ["/images/rooms-3.jpg", "/images/rooms-2.jpg", "/images/rooms-4.jpg", "/images/relax-view.jpg"],
    blurb: "Eight stools along the glass, looking out over Nagarbhavi. The best seat for a coffee.",
    furniture: {
      tables: [{ x: 11.1, y: 0.22, w: 7.6, h: 0.5, finish: "dark", height: 1.05 }],
      chairs: Array.from({ length: 8 }, (_, i) => ({ x: 11.6 + i * 0.98, y: 1.15, yaw: N, kind: "stool" as const })),
    },
    label: { x: 14.9, y: 2.15 },
  },
  {
    id: "cafe",
    name: "Café",
    rect: { x: 10.75, y: 2.6, w: 8.25, h: 3.9 },
    tone: "cafe",
    photos: ["/images/cafeteria.jpg"],
    blurb: "Unlimited coffee and tea all day, a microwave and a fridge. Brew, chat, get back to it.",
    furniture: { tables: [{ x: 14.1, y: 4.05, w: 4.0, h: 0.9, finish: "white", height: 0.92 }], chairs: [] },
    label: { x: 12.5, y: 4.55 },
  },
  {
    id: "reception",
    name: "Reception",
    rect: { x: 10.75, y: 6.5, w: 4.0, h: 5.1 },
    tone: "reception",
    photos: ["/images/rooms-11.jpg", "/images/reception.jpg", "/images/entrance.jpg"],
    blurb: "The front desk in front of the moss wall. Show your booking reference and ID here when you arrive.",
    furniture: {
      tables: [{ x: 12.45, y: 7.5, w: 0.9, h: 2.1, finish: "white", height: 1.05 }],
      chairs: [{ x: 13.85, y: 8.55, yaw: W, kind: "office" }],
    },
    label: { x: 11.55, y: 10.9 },
  },
  {
    id: "washrooms",
    name: "Washrooms",
    rect: { x: 3, y: 23.3, w: 5.9, h: 3.7 },
    tone: "service",
    photos: ["/images/washroom.jpg"],
    blurb: "Separate, clean washrooms, looked after every day.",
    furniture: { chairs: [], tables: [] },
    label: { x: 6.3, y: 25.0 },
  },
];

export const zoneById = new Map(zones.map((z) => [z.id, z]));

/** Fixed fittings drawn in both views. */
export const fittings = {
  stairs: { x: 0.35, y: 0.6, w: 5.8, h: 7.6 },
  lift: { x: 2.9, y: 11.3, w: 1.9, h: 2.6 },
  sofa: { x: 6.95, y: 5.3, w: 0.85, h: 2.5 },
  /** The preserved moss wall with the W, between the two boss cabin doors. */
  moss: { x: 14.6, y: 7.5, w: 0.1, h: 1.95 },
  wcs: [
    { x: 4.4, y: 24.35 },
    { x: 4.4, y: 25.55 },
  ],
  sinks: [
    { x: 5.9, y: 26.55 },
    { x: 7.0, y: 26.55 },
    { x: 8.0, y: 26.55 },
  ],
  plants: [
    { x: 7.05, y: 0.6, r: 0.4 },
    { x: 10.4, y: 11.2, r: 0.35 },
    { x: 14.4, y: 11.2, r: 0.3 },
    { x: 18.55, y: 6.0, r: 0.35 },
    { x: 7.0, y: 11.0, r: 0.35 },
  ],
  /** Lounge chess table. */
  chess: { x: 8.25, y: 9.2, r: 0.42 },
};

export const ENTRANCE = { x: 6.5, from: 9.4, to: 10.8 } as const;

// ---------------------------------------------------------------------------
// Walls. One list, used by the plan, the 3D model and the walk paths.
// ---------------------------------------------------------------------------

export type WallKind = "exterior" | "window" | "solid" | "glass";
export type WallFinish = "white" | "teal" | "dark";
export type WallSeg = { x1: number; y1: number; x2: number; y2: number; kind: WallKind; finish?: WallFinish; room?: string; side?: Side };

function onOutline(x1: number, y1: number, x2: number, y2: number) {
  for (let i = 0; i < OUTLINE.length; i++) {
    const [ax, ay] = OUTLINE[i];
    const [bx, by] = OUTLINE[(i + 1) % OUTLINE.length];
    if (ax === bx && x1 === ax && x2 === ax) {
      if (Math.min(y1, y2) >= Math.min(ay, by) && Math.max(y1, y2) <= Math.max(ay, by)) return true;
    }
    if (ay === by && y1 === ay && y2 === ay) {
      if (Math.min(x1, x2) >= Math.min(ax, bx) && Math.max(x1, x2) <= Math.max(ax, bx)) return true;
    }
  }
  return false;
}

function buildWalls(): WallSeg[] {
  const out: WallSeg[] = [];
  const add = (seg: WallSeg) => out.push(seg);

  // Exterior, with glass where the photos show it.
  add({ x1: 0, y1: 0, x2: 6.5, y2: 0, kind: "exterior" });
  add({ x1: 6.5, y1: 0, x2: 19, y2: 0, kind: "window" });
  add({ x1: 19, y1: 0, x2: 19, y2: 22.75, kind: "window" });
  add({ x1: 19, y1: 22.75, x2: 19, y2: 27, kind: "exterior" });
  add({ x1: 19, y1: 27, x2: 3, y2: 27, kind: "exterior" });
  add({ x1: 3, y1: 27, x2: 3, y2: 23.3, kind: "exterior" });
  add({ x1: 3, y1: 23.3, x2: 3, y2: 14.25, kind: "window" });
  add({ x1: 3, y1: 14.25, x2: 0, y2: 14.25, kind: "exterior" });
  add({ x1: 0, y1: 14.25, x2: 0, y2: 0, kind: "exterior" });

  // Lobby to coworking, with the main entrance.
  add({ x1: 6.5, y1: 0, x2: 6.5, y2: ENTRANCE.from, kind: "solid" });
  add({ x1: 6.5, y1: ENTRANCE.to, x2: 6.5, y2: 14.25, kind: "solid" });

  // Rooms: glass (solid for the studio) on the corridor side with a door.
  for (const r of rooms) {
    const { x, y, w, h } = r.rect;
    const finish: WallFinish = r.kind === "podcast" ? "dark" : r.kind === "conference" ? "white" : "teal";
    const sides: Record<Side, [number, number, number, number]> = {
      n: [x, y, x + w, y],
      s: [x, y + h, x + w, y + h],
      w: [x, y, x, y + h],
      e: [x + w, y, x + w, y + h],
    };
    (Object.keys(sides) as Side[]).forEach((side) => {
      const [x1, y1, x2, y2] = sides[side];
      if (onOutline(x1, y1, x2, y2)) return;
      if (side === r.front) {
        const kind: WallKind = r.glass ? "glass" : "solid";
        const pieces: [number, number][] = [
          [side === "n" || side === "s" ? x1 : y1, r.door.from],
          [r.door.to, side === "n" || side === "s" ? x2 : y2],
        ];
        for (const [p, q] of pieces) {
          add(side === "n" || side === "s"
            ? { x1: p, y1, x2: q, y2: y1, kind, finish, room: r.id, side }
            : { x1, y1: p, x2: x1, y2: q, kind, finish, room: r.id, side });
        }
      } else {
        add({ x1, y1, x2, y2, kind: "solid", finish, room: r.id, side });
      }
    });
  }

  // Washrooms open onto the west corridor.
  add({ x1: 7.4, y1: 23.3, x2: 7.6, y2: 23.3, kind: "solid" });
  add({ x1: 8.5, y1: 23.3, x2: 8.9, y2: 23.3, kind: "solid" });
  return out;
}

export const walls: WallSeg[] = buildWalls();

export type Door = { id: string; side: Side; line: number; from: number; to: number };

export const doors: Door[] = [
  ...rooms.map((r) => ({
    id: r.id,
    side: r.front,
    line: r.front === "n" ? r.rect.y : r.front === "s" ? r.rect.y + r.rect.h : r.front === "w" ? r.rect.x : r.rect.x + r.rect.w,
    from: r.door.from,
    to: r.door.to,
  })),
  { id: "entrance", side: "e", line: ENTRANCE.x, from: ENTRANCE.from, to: ENTRANCE.to },
  { id: "washrooms", side: "n", line: 23.3, from: 7.6, to: 8.5 },
];

// ---------------------------------------------------------------------------
// Walk graph for the 3D view: Street View-style hops between viewpoints.
// Links never pass through a wall.
// ---------------------------------------------------------------------------

export type WalkNode = { id: string; label: string; view: View; links: string[] };

function crosses(ax: number, ay: number, bx: number, by: number, w: WallSeg) {
  const d = (px: number, py: number, qx: number, qy: number, rx: number, ry: number) => (qx - px) * (ry - py) - (qy - py) * (rx - px);
  const d1 = d(w.x1, w.y1, w.x2, w.y2, ax, ay);
  const d2 = d(w.x1, w.y1, w.x2, w.y2, bx, by);
  const d3 = d(ax, ay, bx, by, w.x1, w.y1);
  const d4 = d(ax, ay, bx, by, w.x2, w.y2);
  return d1 * d2 < 0 && d3 * d4 < 0;
}

export function clearPath(a: { x: number; y: number }, b: { x: number; y: number }) {
  return !walls.some((w) => crosses(a.x, a.y, b.x, b.y, w));
}

const spot = (id: string, label: string, x: number, y: number, yaw: number): WalkNode => ({ id, label, view: { x, y, yaw }, links: [] });

const openNodes: WalkNode[] = [
  spot("lobby", "Lift lobby", 5.0, 10.1, E),
  spot("entrance", "Main entrance", 7.4, 10.1, E),
  spot("lounge", "Lounge", 9.4, 4.0, S),
  spot("lounge-n", "Lounge", 9.6, 0.95, E),
  spot("window", "Window bar", 15.0, 1.9, N),
  spot("cafe", "Café", 12.6, 5.4, E),
  spot("reception", "Reception", 11.6, 8.6, E),
  spot("hall", "By reception", 13.3, 11.1, S),
  spot("w1", "West corridor", 8.15, 12.4, S),
  spot("w2", "West corridor", 8.15, 15.6, S),
  spot("w3", "West corridor", 8.15, 19.1, S),
  spot("w4", "West corridor", 8.15, 22.6, S),
  spot("e1", "East corridor", 14.45, 12.6, S),
  spot("e2", "East corridor", 14.45, 15.3, S),
  spot("e3", "East corridor", 14.45, 18.7, S),
  spot("e4", "East corridor", 14.45, 23.1, S),
  spot("a1", "Between the desks", 11.3, 15.5, E),
  spot("a2", "Between the desks", 11.3, 19.1, E),
];

function buildWalkGraph(): WalkNode[] {
  const nodes = new Map<string, WalkNode>();
  for (const n of openNodes) nodes.set(n.id, { ...n, links: [] });
  const link = (a: string, b: string) => {
    if (a === b) return;
    const na = nodes.get(a)!;
    const nb = nodes.get(b)!;
    if (!na.links.includes(b)) na.links.push(b);
    if (!nb.links.includes(a)) nb.links.push(a);
  };
  const dist = (a: View, b: View) => Math.hypot(a.x - b.x, a.y - b.y);
  const open = [...nodes.values()];
  for (let i = 0; i < open.length; i++) {
    for (let j = i + 1; j < open.length; j++) {
      if (dist(open[i].view, open[j].view) <= 5.4 && clearPath(open[i].view, open[j].view)) link(open[i].id, open[j].id);
    }
  }
  const nearest = (v: View, needClear: boolean) =>
    open.filter((n) => !needClear || clearPath(v, n.view)).sort((p, q) => dist(v, p.view) - dist(v, q.view))[0];

  for (const room of rooms) {
    nodes.set(room.id, { id: room.id, label: room.name, view: room.view, links: [] });
    link(room.id, (nearest(room.view, true) ?? nearest(room.view, false)).id);
  }
  for (const desk of desks) nodes.set(desk.id, { id: desk.id, label: desk.name, view: desk.view, links: [] });
  for (const desk of desks) {
    for (const other of desks) if (other.cluster === desk.cluster && other.id !== desk.id) link(desk.id, other.id);
    link(desk.id, (nearest(desk.view, true) ?? nearest(desk.view, false)).id);
  }
  return [...nodes.values()];
}

export const walkNodes: WalkNode[] = buildWalkGraph();
export const walkNodeById = new Map(walkNodes.map((n) => [n.id, n]));

export const kindLabel: Record<ResourceKind, string> = {
  desk: "Open desk",
  boss: "Boss cabin",
  cabin: "Team cabin",
  conference: "Conference room",
  podcast: "Podcast studio",
};

export type Mode = "day" | "hour" | "month";

/** The booking modes a space offers, in the order to show them. */
export function modesFor(r: Resource): Mode[] {
  const m: Mode[] = [];
  if (r.pricing.day) m.push("day");
  if (r.pricing.hour) m.push("hour");
  if (r.pricing.month) m.push("month");
  return m;
}

export function monthPrice(r: Resource): { amount: number; listAmount?: number; note: string } | null {
  const m = r.pricing.month;
  return m && "amount" in m ? m : null;
}
