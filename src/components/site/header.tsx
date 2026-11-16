"use client";

import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { Menu, UserRound, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/components/auth/auth-context";
import { FluidHoverHighlight } from "@/components/fluid-hover-highlight";
import { useFluidHover, useRegisterFluidHoverItem } from "@/hooks/use-fluid-hover";
import { spring } from "@/lib/springs";
import { cn } from "@/lib/utils";
import { CtaLink } from "./cta";

const NAV = [
  { href: "/#spaces", label: "Spaces" },
  { href: "/#floor", label: "Floor plan" },
  { href: "/#amenities", label: "Amenities" },
  { href: "/#gallery", label: "Gallery" },
  { href: "/#visit", label: "Visit" },
];

export function SiteHeader({ variant = "overlay" }: { variant?: "overlay" | "solid" }) {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const { user } = useAuth();
  const navRef = useRef<HTMLDivElement>(null);
  const hover = useFluidHover(navRef, { axis: "x" });

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const solid = variant === "solid" || scrolled || open;

  return (
    <header
      className={cn(
        "sticky top-0 z-40 transition-[background-color,box-shadow,backdrop-filter] duration-300",
        solid ? "bg-background/85 shadow-[0_1px_0_rgb(2_60_64/0.08)] backdrop-blur-xl" : "bg-transparent"
      )}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6">
        <Link href="/" className="flex shrink-0 items-center" aria-label="Worklush Spaces home">
          <Image src="/images/logo-wide.png" alt="Worklush" width={150} height={16} className="h-[15px] w-auto" priority />
        </Link>

        <nav className="ml-6 hidden flex-1 lg:block" aria-label="Main">
          <div ref={navRef} {...hover.handlers} className="relative flex w-fit">
            <FluidHoverHighlight hover={hover} className="rounded-full" />
            {NAV.map((n, i) => (
              <NavItem key={n.href} index={i} href={n.href} label={n.label} registerItem={hover.registerItem} />
            ))}
          </div>
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <Link
            href="/account"
            className="type-small hidden h-10 items-center gap-2 rounded-full px-3 font-semibold text-ink transition-colors hover:bg-hover sm:inline-flex"
          >
            <UserRound className="h-4 w-4" />
            {user ? user.name.split(" ")[0] : "Sign in"}
          </Link>
          <CtaLink href="/book" className="type-small h-10 px-5" arrow>
            Book now
          </CtaLink>
          <button
            type="button"
            className="grid h-10 w-10 place-items-center rounded-full text-ink hover:bg-hover lg:hidden"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            onClick={() => setOpen((o) => !o)}
          >
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.span
                key={open ? "x" : "menu"}
                initial={{ opacity: 0, scale: 0.6, filter: "blur(4px)" }}
                animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
                exit={{ opacity: 0, scale: 0.6, filter: "blur(4px)", transition: spring.fast.exit }}
                transition={{ type: "tween", duration: spring.fast.duration * 2, ease: "easeOut" }}
              >
                {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </motion.span>
            </AnimatePresence>
          </button>
        </div>
      </div>

      <AnimatePresence>
        {open && (
          <motion.nav
            aria-label="Mobile"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6, transition: spring.moderate.exit }}
            transition={spring.slow}
            className="absolute inset-x-0 top-16 h-[calc(100dvh-64px)] bg-background px-4 pb-8 pt-2 lg:hidden"
          >
            <ul className="flex flex-col">
              {[...NAV, { href: "/account", label: user ? "My bookings" : "Sign in" }].map((n, i) => (
                <motion.li
                  key={n.href}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ ...spring.slow, delay: 0.03 * i }}
                >
                  <Link
                    href={n.href}
                    onClick={() => setOpen(false)}
                    className="type-h3 flex h-14 items-center border-b border-border text-ink"
                  >
                    {n.label}
                  </Link>
                </motion.li>
              ))}
            </ul>
            <CtaLink href="/book" className="mt-6 w-full" arrow onClick={() => setOpen(false)}>
              Book a seat
            </CtaLink>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  );
}

function NavItem({ href, label, index, registerItem }: { href: string; label: string; index: number; registerItem: (i: number, el: HTMLElement | null) => void }) {
  const ref = useRef<HTMLAnchorElement>(null);
  useRegisterFluidHoverItem(registerItem, index, ref);
  return (
    <Link ref={ref} href={href} className="type-small relative z-[1] inline-flex h-10 items-center rounded-full px-4 font-semibold text-ink/80 transition-colors duration-100 hover:text-ink">
      {label}
    </Link>
  );
}
