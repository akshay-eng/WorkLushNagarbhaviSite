"use client";

import Link from "next/link";
import { ArrowRight, Loader2 } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";

// The site's call-to-action: 48px tall for thumbs, a press that gives, and an
// arrow that leans towards where you're going.

type Variant = "lime" | "ink" | "outline" | "white";

const base =
  "type-body group relative inline-flex h-12 items-center justify-center gap-2 rounded-full px-6 font-semibold whitespace-nowrap " +
  "transition-[transform,background-color,box-shadow,color] duration-200 ease-out-premium active:scale-[0.97] " +
  "disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal";

const variants: Record<Variant, string> = {
  lime: "bg-lime text-ink shadow-[0_8px_24px_-10px_rgb(166_217_58/0.9)] hover:bg-lime-strong hover:shadow-[0_12px_28px_-10px_rgb(166_217_58/1)]",
  ink: "bg-ink text-white shadow-[0_10px_30px_-12px_rgb(2_60_64/0.7)] hover:bg-[#03494e]",
  outline: "border border-ink/15 bg-white/60 text-ink backdrop-blur hover:border-ink/30 hover:bg-white",
  white: "bg-white text-ink shadow-[0_10px_30px_-12px_rgb(0_0_0/0.35)] hover:bg-mint",
};

type Common = { variant?: Variant; arrow?: boolean; children: ReactNode; className?: string };

function Inner({ arrow, loading, children }: { arrow?: boolean; loading?: boolean; children: ReactNode }) {
  return (
    <>
      {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
      <span className="inline-flex items-center">{children}</span>
      {arrow && !loading && <ArrowRight className="h-4 w-4 transition-transform duration-200 ease-out-premium group-hover:translate-x-1" aria-hidden />}
    </>
  );
}

export function CtaLink({ href, variant = "lime", arrow, children, className, ...rest }: Common & ComponentProps<typeof Link>) {
  return (
    <Link href={href} className={cn(base, variants[variant], className)} {...rest}>
      <Inner arrow={arrow}>{children}</Inner>
    </Link>
  );
}

export function CtaButton({ variant = "lime", arrow, loading, children, className, ...rest }: Common & { loading?: boolean } & ComponentProps<"button">) {
  return (
    <button className={cn(base, variants[variant], className)} disabled={loading || rest.disabled} aria-busy={loading || undefined} {...rest}>
      <Inner arrow={arrow} loading={loading}>
        {children}
      </Inner>
    </button>
  );
}
