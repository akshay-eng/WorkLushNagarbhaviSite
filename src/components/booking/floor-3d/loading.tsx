import { cn } from "@/lib/utils";

export function Floor3DLoading({ className }: { className?: string }) {
  return (
    <div className={cn("grid h-full w-full place-items-center bg-[#e7efee]", className)}>
      <div className="flex flex-col items-center gap-3 text-ink">
        <div className="h-12 w-12 animate-spin rounded-full border-2 border-teal/20 border-t-teal motion-reduce:animate-none" />
        <p className="type-small font-semibold">Building the floor in 3D…</p>
      </div>
    </div>
  );
}
