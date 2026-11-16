"use client";

import Image from "next/image";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { motion, useMotionValueEvent, useScroll } from "motion/react";
import { useRef, useState } from "react";
import { gallery } from "@/data/site";

export function Gallery() {
  const track = useRef<HTMLDivElement>(null);
  const { scrollXProgress } = useScroll({ container: track });
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);
  useMotionValueEvent(scrollXProgress, "change", (v) => {
    setAtStart(v < 0.02);
    setAtEnd(v > 0.98);
  });

  const page = (dir: 1 | -1) => {
    const el = track.current;
    if (!el) return;
    el.scrollBy({ left: dir * el.clientWidth * 0.8, behavior: "smooth" });
  };

  return (
    <section id="gallery" className="scroll-mt-20 py-20 sm:py-28">
      <div className="mx-auto flex max-w-7xl items-end justify-between gap-6 px-4 sm:px-6">
        <div className="reveal-scroll">
          <p className="type-eyebrow">Inside Worklush</p>
          <h2 className="type-h1 mt-3 text-ink">Moss walls, good light, real coffee.</h2>
        </div>
        <div className="hidden gap-2 sm:flex">
          <button type="button" onClick={() => page(-1)} disabled={atStart} aria-label="Previous photos" className="grid h-12 w-12 place-items-center rounded-full border border-ink/15 text-ink transition-[background-color,opacity] hover:bg-mint disabled:opacity-30">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <button type="button" onClick={() => page(1)} disabled={atEnd} aria-label="Next photos" className="grid h-12 w-12 place-items-center rounded-full border border-ink/15 text-ink transition-[background-color,opacity] hover:bg-mint disabled:opacity-30">
            <ArrowRight className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div
        ref={track}
        className="no-scrollbar mt-10 flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth pb-2"
        // Line the first photo up with the page content, and tell snapping
        // about that inset so it doesn't scroll the padding away.
        style={{ paddingInline: "var(--gutter)", scrollPaddingInline: "var(--gutter)", ["--gutter" as string]: "max(1rem, calc((100vw - 80rem) / 2 + 1.5rem))" }}
        tabIndex={0}
        aria-label="Photo gallery, scroll sideways"
      >
        {gallery.map((g, i) => (
          <figure key={g.src} className="group relative w-[78vw] shrink-0 snap-start sm:w-[440px]">
            <div className={`relative overflow-hidden rounded-3xl ${i % 3 === 1 ? "aspect-[4/5]" : "aspect-[4/3.2]"}`}>
              <Image src={g.src} alt={g.alt} fill sizes="(max-width: 640px) 78vw, 440px" className="object-cover transition-transform duration-700 ease-out-premium group-hover:scale-[1.04]" />
            </div>
            <figcaption className="type-small mt-3 flex items-center justify-between">
              <span className="font-semibold text-ink">{g.caption}</span>
              <span className="type-caption nums text-muted-foreground">{String(i + 1).padStart(2, "0")}</span>
            </figcaption>
          </figure>
        ))}
      </div>
      <div className="mx-auto mt-6 max-w-7xl px-4 sm:px-6">
        <div className="h-[3px] overflow-hidden rounded-full bg-border">
          <motion.div className="h-full origin-left rounded-full bg-teal" style={{ scaleX: scrollXProgress }} />
        </div>
      </div>
    </section>
  );
}
