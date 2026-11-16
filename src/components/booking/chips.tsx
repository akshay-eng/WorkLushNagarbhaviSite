"use client";

import { motion } from "motion/react";
import { useRef, type ReactNode } from "react";
import { FluidHoverHighlight } from "@/components/fluid-hover-highlight";
import { useFluidHover, useRegisterFluidHoverItem } from "@/hooks/use-fluid-hover";
import { fontWeights } from "@/lib/font-weight";
import { spring } from "@/lib/springs";
import { cn } from "@/lib/utils";

// One choice from a row or grid of chips: a single hover highlight glides
// between them (Fluid Functionalism), and the selected pill slides to the new
// pick instead of blinking.

export type ChipItem<T> = { value: T; label: ReactNode; sub?: ReactNode; disabled?: boolean; ariaLabel?: string };

export function ChipGroup<T extends string | number>({
  items,
  value,
  onChange,
  layoutId,
  columns,
  label,
  className,
  itemClassName,
}: {
  items: ChipItem<T>[];
  value: T | null;
  onChange: (value: T) => void;
  layoutId: string;
  /** Grid columns; omit for a single scrolling row. */
  columns?: number;
  label: string;
  className?: string;
  itemClassName?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const hover = useFluidHover(ref, {
    axis: columns ? "xy" : "x",
    isItemDisabled: (el) => (el as HTMLButtonElement).disabled,
  });

  return (
    <div
      ref={ref}
      role="radiogroup"
      aria-label={label}
      {...hover.handlers}
      className={cn("relative", columns ? "grid" : "flex", className)}
      style={columns ? { gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` } : undefined}
    >
      <FluidHoverHighlight hover={hover} className="rounded-xl" />
      {items.map((item, i) => (
        <Chip
          key={String(item.value)}
          index={i}
          item={item}
          selected={item.value === value}
          onSelect={() => !item.disabled && onChange(item.value)}
          registerItem={hover.registerItem}
          layoutId={layoutId}
          className={itemClassName}
        />
      ))}
    </div>
  );
}

function Chip<T extends string | number>({
  item,
  index,
  selected,
  onSelect,
  registerItem,
  layoutId,
  className,
}: {
  item: ChipItem<T>;
  index: number;
  selected: boolean;
  onSelect: () => void;
  registerItem: (index: number, el: HTMLElement | null) => void;
  layoutId: string;
  className?: string;
}) {
  const ref = useRef<HTMLButtonElement>(null);
  useRegisterFluidHoverItem(registerItem, index, ref);
  return (
    <button
      ref={ref}
      type="button"
      role="radio"
      aria-checked={selected}
      aria-label={item.ariaLabel}
      disabled={item.disabled}
      onClick={onSelect}
      className={cn(
        "relative z-[1] flex min-h-11 flex-col items-center justify-center rounded-xl px-3 py-2 text-center outline-none",
        "transition-colors duration-100 focus-visible:ring-2 focus-visible:ring-teal",
        item.disabled ? "cursor-not-allowed text-muted-foreground/60 line-through decoration-muted-foreground/40" : "text-foreground",
        selected && "text-white",
        className
      )}
    >
      {selected && (
        <motion.span
          layoutId={layoutId}
          transition={spring.moderate}
          className="absolute inset-0.5 -z-[1] rounded-[10px] bg-ink shadow-[0_6px_16px_-8px_rgb(2_60_64/0.8)]"
        />
      )}
      <span className="type-small inline-grid">
        <span
          className="col-start-1 row-start-1 transition-[font-variation-settings] duration-80"
          style={{ fontVariationSettings: selected ? fontWeights.semibold : fontWeights.normal }}
        >
          {item.label}
        </span>
        <span aria-hidden className="invisible col-start-1 row-start-1" style={{ fontVariationSettings: fontWeights.semibold }}>
          {item.label}
        </span>
      </span>
      {item.sub && <span className={cn("type-caption nums font-normal", selected ? "text-lime" : "text-muted-foreground")}>{item.sub}</span>}
    </button>
  );
}
