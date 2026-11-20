"use client";

import { useState } from "react";
import { SlotForm, RemoveSlotButton } from "./slot-form";

type Treatment = { id: string; name: string; durationMins: number; standardPrice: number };

export function SlotRowActions({ slotId, treatments, minDate, bps, initial }: { slotId: string; treatments: Treatment[]; minDate: string; bps: number; initial: React.ComponentProps<typeof SlotForm>["initial"] }) {
  const [editing, setEditing] = useState(false);
  return (
    <div className="w-full">
      <div className="flex flex-wrap justify-end gap-2">
        <button type="button" onClick={() => setEditing((e) => !e)} aria-expanded={editing} className="btn-secondary px-3.5 py-1.5">
          {editing ? "Close" : "Edit"}
        </button>
        <RemoveSlotButton slotId={slotId} />
      </div>
      {editing && (
        <div className="mt-4 border-t border-line pt-4">
          <SlotForm treatments={treatments} minDate={minDate} bps={bps} slotId={slotId} initial={initial} />
        </div>
      )}
    </div>
  );
}
