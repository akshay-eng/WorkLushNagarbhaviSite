import { cn } from "@/lib/utils";

export function Legend({ className, tone = "light" }: { className?: string; tone?: "light" | "dark" }) {
  return (
    <div className={cn("type-small flex flex-wrap items-center gap-x-4 gap-y-2", tone === "dark" ? "text-white/75" : "text-muted-foreground", className)}>
      <span className="inline-flex items-center gap-1.5">
        <span className="h-3.5 w-3.5 rounded-full border-2 border-teal bg-white" /> Free
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span className="h-3.5 w-3.5 rounded-full border-2 border-ink bg-lime" /> Your pick
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span className="h-3.5 w-3.5 rounded-full border-2 border-booked bg-[#dfe6e5]" /> Booked
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span className="h-2.5 w-2.5 rounded-full bg-ember" /> Some slots taken
      </span>
    </div>
  );
}
