"use client";

import Image from "next/image";
import { AnimatePresence, motion, type PanInfo } from "motion/react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";
import { spring } from "@/lib/springs";
import { cn } from "@/lib/utils";

// Real photos of a space: swipe or use the arrows; the next photo slides in
// from the side you're heading to, thumbnails underneath.

export function PhotoGallery({ photos, alt, className, sizes = "(max-width: 900px) 100vw, 560px" }: { photos: string[]; alt: string; className?: string; sizes?: string }) {
  const [[index, dir], setState] = useState<[number, number]>([0, 0]);
  const count = photos.length;
  const go = (next: number) => {
    const wrapped = (next + count) % count;
    setState([wrapped, next > index ? 1 : -1]);
  };
  const onDragEnd = (_: unknown, info: PanInfo) => {
    if (count < 2) return;
    if (info.offset.x < -50 || info.velocity.x < -400) go(index + 1);
    else if (info.offset.x > 50 || info.velocity.x > 400) go(index - 1);
  };

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div
        className="group relative aspect-[4/3] overflow-hidden rounded-2xl bg-mint"
        role="region"
        aria-roledescription="carousel"
        aria-label={`${alt} photos`}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "ArrowRight") go(index + 1);
          if (e.key === "ArrowLeft") go(index - 1);
        }}
      >
        <AnimatePresence initial={false} custom={dir} mode="popLayout">
          <motion.div
            key={photos[index]}
            custom={dir}
            variants={{
              enter: (d: number) => ({ x: d >= 0 ? "12%" : "-12%", opacity: 0, scale: 1.02 }),
              center: { x: 0, opacity: 1, scale: 1 },
              exit: (d: number) => ({ x: d >= 0 ? "-8%" : "8%", opacity: 0, transition: spring.slow.exit }),
            }}
            initial="enter"
            animate="center"
            exit="exit"
            transition={spring.slow}
            drag={count > 1 ? "x" : false}
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.2}
            onDragEnd={onDragEnd}
            className="absolute inset-0 cursor-grab active:cursor-grabbing"
          >
            <Image src={photos[index]} alt={`${alt}, photo ${index + 1} of ${count}`} fill sizes={sizes} className="pointer-events-none object-cover" priority={index === 0} draggable={false} />
          </motion.div>
        </AnimatePresence>

        {count > 1 && (
          <>
            <button
              type="button"
              onClick={() => go(index - 1)}
              aria-label="Previous photo"
              className="absolute left-3 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-ink shadow-md transition-[opacity,transform] duration-200 hover:scale-105 active:scale-95 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={() => go(index + 1)}
              aria-label="Next photo"
              className="absolute right-3 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-ink shadow-md transition-[opacity,transform] duration-200 hover:scale-105 active:scale-95 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
            <span className="type-caption nums absolute bottom-3 right-3 rounded-full bg-ink/75 px-2.5 py-1 text-white backdrop-blur">
              {index + 1} / {count}
            </span>
          </>
        )}
      </div>

      {count > 1 && (
        <div className="flex gap-2" role="tablist" aria-label="Choose a photo">
          {photos.map((p, i) => (
            <button
              key={p}
              type="button"
              role="tab"
              aria-selected={i === index}
              aria-label={`Photo ${i + 1}`}
              onClick={() => go(i)}
              className={cn(
                "relative h-14 w-20 overflow-hidden rounded-lg transition-[opacity,box-shadow] duration-200",
                i === index ? "opacity-100 ring-2 ring-ink ring-offset-2 ring-offset-card" : "opacity-60 hover:opacity-100"
              )}
            >
              <Image src={p} alt="" fill sizes="80px" className="object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
