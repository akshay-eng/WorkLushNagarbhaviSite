"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type User = { id: string; name: string; email: string; phone: string };

type AuthState = {
  user: User | null;
  /** True until the first /api/auth/me answer arrives. */
  loading: boolean;
  setUser: (user: User | null) => void;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

async function fetchMe(): Promise<User | null> {
  try {
    const res = await fetch("/api/auth/me", { cache: "no-store" });
    const data = (await res.json()) as { user: User | null };
    return data.user;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setUser(await fetchMe());
    setLoading(false);
  }, []);

  const logout = useCallback(async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
  }, []);

  useEffect(() => {
    let alive = true;
    fetchMe().then((u) => {
      if (!alive) return;
      setUser(u);
      setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, []);

  const value = useMemo(() => ({ user, loading, setUser, refresh, logout }), [user, loading, refresh, logout]);
  return <AuthContext value={value}>{children}</AuthContext>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
