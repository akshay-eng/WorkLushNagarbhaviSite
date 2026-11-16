"use client";

import { motion, useReducedMotion, useScroll, useTransform } from "motion/react";
import { Check } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef } from "react";
import { FloorPlan2D } from "@/components/booking/floor-plan-2d";
import { Legend } from "@/components/booking/legend";
import { CtaLink } from "@/components/site/cta";
import { useToday } from "./use-today";

export function FloorTeaser() {
  const router = useRouter();
  const { availability, freeDesks, totalDesks } = useToday();
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  // The plan starts tilted like a drawing on a table and lies flat as it
  // scrolls into view.
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "center center"] });
  const rotateX = useTransform(scrollYProgress, [0, 1], [reduce ? 0 : 24, 0]);
  const scale = useTransform(scrollYProgress, [0, 1], [reduce ? 1 : 0.94, 1]);

  return (
    <section id="floor" className="scroll-mt-20 bg-ink py-20 text-white sm:py-28">
      <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 sm:px-6 lg:grid-cols-[1fr_1.05fr]">
        <div className="reveal-scroll max-w-xl">
          <p className="type-eyebrow !text-lime">The floor, live</p>
          <h2 className="type-h1 mt-3">Every desk and room, exactly where it is.</h2>
          <p className="type-lead mt-5 text-white/70">
            This is our third floor, traced from the plan on the wall. Tap a seat to book it, or tap the lounge, café or window bar to see what&apos;s there.
          </p>
          <ul className="type-body mt-6 flex flex-col gap-2.5 text-white/85">
            {[
              freeDesks === null ? `${totalDesks} open desks in three clusters` : `${freeDesks} of ${totalDesks} open desks free today`,
              "2 boss cabins and 5 team cabins, by the hour or the month",
              "A conference room for 10 and a podcast studio",
              "Lounge, café and window bar, free for everyone",
            ].map((t) => (
              <li key={t} className="flex items-start gap-2.5">
                <Check className="mt-1 h-4 w-4 shrink-0 text-lime" /> {t}
              </li>
            ))}
          </ul>
          <div className="mt-8 flex flex-wrap gap-3">
            <CtaLink href="/book" arrow>
              Open the full plan
            </CtaLink>
            <CtaLink href="/book?view=3d" variant="white">
              Walk it in 3D
            </CtaLink>
          </div>
          <Legend tone="dark" className="mt-8" />
        </div>

        <div ref={ref} className="[perspective:1600px]">
          <motion.div style={{ rotateX, scale, transformOrigin: "50% 100%" }} className="mx-auto max-w-[520px] rounded-[28px] bg-[#f6f9f8] p-3 shadow-[0_60px_120px_-40px_rgb(0_0_0/0.6)] sm:p-5">
            <div className="plan-grid aspect-[20.8/28.8] w-full overflow-hidden rounded-2xl">
              <FloorPlan2D availability={availability} selectedId={null} onSelect={(id) => router.push(`/book?space=${id}`)} onZone={() => router.push("/book")} controlsClassName="hidden" />
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
