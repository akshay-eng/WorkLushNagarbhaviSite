"use client";

import Image from "next/image";
import Link from "next/link";
import { motion, useMotionValue, useReducedMotion, useSpring, useTransform } from "motion/react";
import { Box, Mic } from "lucide-react";
import { CtaLink } from "@/components/site/cta";
import { clusters, desks } from "@/data/floor";
import { statusFor } from "@/lib/booking/availability";
import { cn } from "@/lib/utils";
import { useToday } from "./use-today";

const EASE = [0.22, 1, 0.36, 1] as const;

function Line({ children, delay }: { children: React.ReactNode; delay: number }) {
  const reduce = useReducedMotion();
  return (
    <span className="block overflow-hidden pb-[0.08em]">
      <motion.span className="block" initial={reduce ? false : { y: "105%" }} animate={{ y: "0%" }} transition={{ duration: 0.9, delay, ease: EASE }}>
        {children}
      </motion.span>
    </span>
  );
}

export function Hero() {
  const { availability, freeDesks, totalDesks } = useToday();
  const reduce = useReducedMotion();

  // Counter-motion: the photo drifts a little, the cards a little more, the
  // other way, so the stack reads as layers.
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const sx = useSpring(mx, { stiffness: 80, damping: 20 });
  const sy = useSpring(my, { stiffness: 80, damping: 20 });
  const photoX = useTransform(sx, (v) => v * -8);
  const photoY = useTransform(sy, (v) => v * -6);
  const cardX = useTransform(sx, (v) => v * 14);
  const cardY = useTransform(sy, (v) => v * 10);

  return (
    <section
      className="relative overflow-hidden"
      onPointerMove={(e) => {
        if (reduce || e.pointerType !== "mouse") return;
        const r = e.currentTarget.getBoundingClientRect();
        mx.set((e.clientX - r.left) / r.width - 0.5);
        my.set((e.clientY - r.top) / r.height - 0.5);
      }}
    >
      <div aria-hidden className="pointer-events-none absolute inset-0 [mask-image:linear-gradient(to_bottom,black_65%,transparent)]">
        <div className="plan-grid absolute inset-0 [mask-image:radial-gradient(ellipse_at_70%_30%,black,transparent_70%)]" />
        <div className="absolute -right-40 -top-40 h-[560px] w-[560px] rounded-full bg-teal-soft/50 blur-3xl" />
        <div className="absolute -bottom-32 left-[-10%] h-[420px] w-[420px] rounded-full bg-lime/30 blur-3xl" />
      </div>

      <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-4 pb-20 pt-10 sm:px-6 lg:grid-cols-[1.05fr_1fr] lg:gap-10 lg:pb-24 lg:pt-16">
        <div>
          <motion.div
            initial={reduce ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: EASE }}
            className="type-small inline-flex items-center gap-2 rounded-full border border-ink/10 bg-white/70 py-1.5 pl-2 pr-3.5 font-semibold text-ink backdrop-blur"
          >
            <span className="h-2 w-2 rounded-full bg-lime-strong" style={{ animation: "live-dot 2s ease-in-out infinite" }} />
            Nagarbhavi · 80 Feet Ring Road · open today
          </motion.div>

          <h1 className="type-display mt-6 text-ink">
            <Line delay={0.05}>Pick your seat.</Line>
            <Line delay={0.16}>
              <span className="text-teal">Then</span> get to work.
            </Line>
          </h1>

          <motion.p
            initial={reduce ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.38, ease: EASE }}
            className="type-lead mt-6 max-w-[34rem] text-muted-foreground"
          >
            22 open desks, private cabins, a conference room and a podcast studio, all on one floor. See exactly where you&apos;ll sit, step inside in 3D, and book in under a minute.
          </motion.p>

          <motion.div initial={reduce ? false : { opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.48, ease: EASE }} className="mt-8 flex flex-wrap gap-3">
            <CtaLink href="/book" arrow>
              Book a seat
            </CtaLink>
            <CtaLink href="/book?view=3d" variant="outline">
              <Box className="mr-2 h-4 w-4 text-teal" aria-hidden />
              Walk the floor in 3D
            </CtaLink>
          </motion.div>

          <motion.dl initial={reduce ? false : { opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.8, delay: 0.62 }} className="mt-10 grid max-w-md grid-cols-3 gap-6 border-t border-ink/10 pt-6">
            {[
              { k: "Day pass", v: "₹500" },
              { k: "Cabins from", v: "₹450/hr" },
              { k: "Members", v: "24/7" },
            ].map((s) => (
              <div key={s.k}>
                <dt className="type-small text-muted-foreground">{s.k}</dt>
                <dd className="type-h3 nums mt-1 text-ink">{s.v}</dd>
              </div>
            ))}
          </motion.dl>
        </div>

        <div className="relative mx-auto w-full max-w-[620px] lg:mx-0">
          <motion.div
            style={{ x: photoX, y: photoY }}
            initial={reduce ? false : { opacity: 0, scale: 0.97, rotate: 1.5 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            transition={{ duration: 1.1, delay: 0.1, ease: EASE }}
            className="relative aspect-[4/4.4] overflow-hidden rounded-[32px] shadow-[0_40px_80px_-40px_rgb(2_60_64/0.55)] sm:aspect-[4/3.6]"
          >
            <Image src="/images/rooms-11.jpg" alt="Worklush reception with the moss wall and the W logo" fill priority sizes="(max-width: 1024px) 100vw, 620px" className="object-cover motion-safe:animate-[slow-zoom_18s_ease-in-out_infinite_alternate]" />
            <div className="absolute inset-0 bg-gradient-to-t from-ink/45 via-transparent to-transparent" />
          </motion.div>

          {/* Live desks card: the three clusters as they stand today */}
          <motion.div
            style={{ x: cardX, y: cardY }}
            initial={reduce ? false : { opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.55, ease: EASE }}
            className="absolute -bottom-10 -left-2 w-[min(80%,300px)] sm:-left-8"
          >
            <Link href="/book?kind=desk" className="group block rounded-3xl bg-white p-4 shadow-[0_24px_60px_-24px_rgb(2_60_64/0.5)] transition-shadow duration-300 hover:shadow-[0_30px_70px_-24px_rgb(2_60_64/0.6)]" aria-label="Open the live floor plan">
              <div className="flex items-center justify-between">
                <span className="type-title text-ink">Live floor</span>
                <span className="type-caption inline-flex items-center gap-1.5 font-normal text-muted-foreground">
                  <span className="h-1.5 w-1.5 rounded-full bg-lime-strong" style={{ animation: "live-dot 2s ease-in-out infinite" }} />
                  Today
                </span>
              </div>
              <div className="mt-3 flex flex-col gap-2.5">
                {clusters.map((c) => (
                  <div key={c.id} className="flex items-center gap-3">
                    <span className="type-caption w-4 text-teal">{c.id}</span>
                    <div className="grid flex-1 gap-1.5" style={{ gridTemplateColumns: `repeat(${c.xs.length}, minmax(0, 1fr))` }}>
                      {desks
                        .filter((d) => d.cluster === c.id)
                        .map((d) => {
                          const booked = statusFor(d, availability) === "booked";
                          return <span key={d.id} className={cn("h-4 rounded-full transition-colors duration-500", !availability ? "bg-mint" : booked ? "bg-[#dfe6e5]" : "bg-teal")} />;
                        })}
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-3 flex items-center justify-between">
                <span className="type-small nums text-muted-foreground">{freeDesks === null ? "Checking…" : `${freeDesks} of ${totalDesks} desks free`}</span>
                <span className="type-small font-semibold text-teal transition-transform duration-200 group-hover:translate-x-1">Pick one →</span>
              </div>
            </Link>
          </motion.div>

          <motion.a
            href="/book?space=podcast"
            style={{ x: cardX, y: cardY }}
            initial={reduce ? false : { opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.7, ease: EASE }}
            className="absolute -right-2 top-6 flex items-center gap-3 rounded-2xl bg-ink py-2.5 pl-2.5 pr-4 text-white shadow-xl sm:-right-6"
          >
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-ember/90">
              <Mic className="h-4 w-4" />
            </span>
            <span>
              <span className="type-title block">Podcast studio</span>
              <span className="type-caption nums block font-normal text-white/70">Ready to record · ₹1,900/hr</span>
            </span>
          </motion.a>
        </div>
      </div>
    </section>
  );
}
