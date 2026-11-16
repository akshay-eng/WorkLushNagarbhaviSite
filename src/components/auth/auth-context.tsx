"use client";

import { createContext, useCallback, useContext, useMemo, useSyncExternalStore, type ReactNode } from "react";
import { currentUser, logoutUser, subscribe, type LocalUser } from "@/lib/local/store";

export type User = LocalUser;

type AuthState = {
  user: User | null;
  /** True until the browser has read the saved session. */
  loading: boolean;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

const hydrated = () => true;
const notHydrated = () => false;
const noop = () => () => {};

export function AuthProvider({ children }: { children: ReactNode }) {
  const user = useSyncExternalStore(subscribe, currentUser, () => null);
  const ready = useSyncExternalStore(noop, hydrated, notHydrated);
  const logout = useCallback(async () => logoutUser(), []);
  const value = useMemo(() => ({ user, loading: !ready, logout }), [user, ready, logout]);
  return <AuthContext value={value}>{children}</AuthContext>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
