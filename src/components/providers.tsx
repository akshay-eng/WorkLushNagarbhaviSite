"use client";

import type { ReactNode } from "react";
import { FluidProvider } from "@/lib/fluid-provider";
import { AuthProvider } from "@/components/auth/auth-context";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <FluidProvider shape="rounded" size="default">
      <AuthProvider>{children}</AuthProvider>
    </FluidProvider>
  );
}
