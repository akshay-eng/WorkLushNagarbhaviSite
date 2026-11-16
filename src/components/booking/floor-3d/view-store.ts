import { useSyncExternalStore } from "react";

// Tiny store shared by the 3D camera rig (inside the canvas) and the DOM
// overlay (minimap, compass, hints). The rig writes at most ~20 times a
// second; React components subscribe with useSyncExternalStore.

export type Phase = "intro" | "walk" | "gliding" | "outro";

export type ViewState = {
  /** Plan coordinates of the eye, in metres. */
  x: number;
  y: number;
  /** 0 = north, clockwise, radians. */
  yaw: number;
  fov: number;
  nodeId: string;
  phase: Phase;
};

type Listener = () => void;

export function createViewStore(initial: ViewState) {
  let state = initial;
  const listeners = new Set<Listener>();
  return {
    get: () => state,
    set: (patch: Partial<ViewState>) => {
      state = { ...state, ...patch };
      listeners.forEach((l) => l());
    },
    subscribe: (l: Listener) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
  };
}

export type ViewStore = ReturnType<typeof createViewStore>;

export function useView<T>(store: ViewStore, pick: (s: ViewState) => T): T {
  return useSyncExternalStore(
    store.subscribe,
    () => pick(store.get()),
    () => pick(store.get())
  );
}
