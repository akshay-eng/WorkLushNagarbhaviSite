"use client";

import { Check } from "lucide-react";
import type { Zone } from "@/data/floor";
import { DialogShell } from "./dialog-shell";
import { PhotoGallery } from "./photo-gallery";

export function ZoneDialog({ zone, onClose }: { zone: Zone | null; onClose: () => void }) {
  return (
    <DialogShell open={!!zone} onClose={onClose} label={zone?.name ?? "Area"} className="sm:max-w-[880px]">
      {zone && (
        <div className="grid sm:grid-cols-[1.2fr_1fr]">
          <div className="p-4 pt-3 sm:p-6 sm:pr-3">
            <PhotoGallery photos={zone.photos} alt={zone.name} />
          </div>
          <div className="flex flex-col gap-4 p-5 pt-1 sm:p-6 sm:pl-3 sm:pt-8">
            <span className="type-caption w-fit rounded-full bg-mint px-2.5 py-1 text-teal">Shared space</span>
            <h2 className="type-h2 pr-12 text-ink">{zone.name}</h2>
            <p className="type-body text-muted-foreground">{zone.blurb}</p>
            {zone.tone !== "lobby" && (
              <p className="type-small flex items-start gap-2 rounded-xl bg-mint/60 px-3 py-2.5 text-foreground">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-teal" />
                Included with every desk, cabin and room booking. No need to reserve.
              </p>
            )}
          </div>
        </div>
      )}
    </DialogShell>
  );
}
