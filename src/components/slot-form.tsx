"use client";

import { useActionState, useState } from "react";
import { createSlotAction, removeSlotAction, updateSlotAction, type FormState } from "@/app/actions/dashboard";
import { FormError } from "./auth-shell";

type Treatment = { id: string; name: string; durationMins: number; standardPrice: number };
type Initial = { treatmentId: string; date: string; time: string; durationMins: number; originalPrice: number; price: number; stylistName: string };

const pounds = (p: number) => (p / 100).toFixed(p % 100 === 0 ? 0 : 2);

/** Post a new slot, or edit an open one when `slotId` is given. */
export function SlotForm({ treatments, minDate, bps, slotId, initial, onDone }: { treatments: Treatment[]; minDate: string; bps: number; slotId?: string; initial?: Initial; onDone?: () => void }) {
  const action = slotId ? updateSlotAction.bind(null, slotId) : createSlotAction;
  const [state, formAction, pending] = useActionState<FormState, FormData>(action, {});
  const first = treatments.find((t) => t.id === initial?.treatmentId) ?? treatments[0];
  const [treatmentId, setTreatmentId] = useState(first?.id ?? "");
  const [duration, setDuration] = useState(String(initial?.durationMins ?? first?.durationMins ?? 60));
  const [original, setOriginal] = useState(initial ? pounds(initial.originalPrice) : first ? pounds(first.standardPrice) : "");
  const [price, setPrice] = useState(initial ? pounds(initial.price) : first ? pounds(Math.round((first.standardPrice * 0.7) / 50) * 50) : "");
  const p = slotId ?? "new";

  if (treatments.length === 0) return <p className="text-sm text-ink-muted">Add a treatment first (below), then you can post slots for it.</p>;

  const pctOff = (() => {
    const o = parseFloat(original);
    const n = parseFloat(price);
    return o > 0 && n >= 0 && n < o ? Math.round(((o - n) / o) * 100) : null;
  })();

  return (
    <form action={formAction} className="space-y-4" onSubmit={() => onDone && setTimeout(onDone, 600)}>
      <FormError message={state.error} />
      {state.ok && (
        <p role="status" className="rounded-[var(--radius-field)] bg-band px-3.5 py-2.5 text-sm text-on-band">
          {state.message}
        </p>
      )}
      <div>
        <label htmlFor={`${p}-treatment`} className="label">
          Treatment
        </label>
        <select
          id={`${p}-treatment`}
          name="treatmentId"
          value={treatmentId}
          onChange={(e) => {
            setTreatmentId(e.target.value);
            const t = treatments.find((x) => x.id === e.target.value);
            if (t && !slotId) {
              setDuration(String(t.durationMins));
              setOriginal(pounds(t.standardPrice));
              setPrice(pounds(Math.round((t.standardPrice * 0.7) / 50) * 50));
            }
          }}
          className="field"
        >
          {treatments.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <div>
          <label htmlFor={`${p}-date`} className="label">
            Date
          </label>
          <input id={`${p}-date`} name="date" type="date" min={minDate} defaultValue={initial?.date ?? minDate} required className="field" />
        </div>
        <div>
          <label htmlFor={`${p}-time`} className="label">
            Start time
          </label>
          <input id={`${p}-time`} name="time" type="time" step={900} defaultValue={initial?.time ?? "14:00"} required className="field" />
        </div>
        <div className="col-span-2 sm:col-span-1">
          <label htmlFor={`${p}-duration`} className="label">
            Duration (minutes)
          </label>
          <input id={`${p}-duration`} name="durationMins" type="number" min={5} max={480} step={5} value={duration} onChange={(e) => setDuration(e.target.value)} required className="field" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor={`${p}-original`} className="label">
            Original price (£)
          </label>
          <input id={`${p}-original`} name="originalPrice" inputMode="decimal" value={original} onChange={(e) => setOriginal(e.target.value)} required className="field" />
        </div>
        <div>
          <label htmlFor={`${p}-price`} className="label">
            Discounted price (£)
          </label>
          <input id={`${p}-price`} name="price" inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} required aria-describedby={`${p}-price-hint`} className="field" />
        </div>
      </div>
      <p id={`${p}-price-hint`} className="text-xs text-ink-muted">
        {pctOff != null ? `${pctOff}% off. ` : ""}
        {parseFloat(price) > 0 ? `You'll receive £${((Math.round(parseFloat(price) * 100) - Math.round((Math.round(parseFloat(price) * 100) * bps) / 10000)) / 100).toFixed(2)} after GETTABLE's ${bps / 100}% commission.` : ""}
      </p>
      <div>
        <label htmlFor={`${p}-stylist`} className="label">
          Stylist <span className="font-normal text-ink-muted">(optional)</span>
        </label>
        <input id={`${p}-stylist`} name="stylistName" defaultValue={initial?.stylistName} className="field" />
      </div>
      <button type="submit" disabled={pending} className="btn-primary w-full sm:w-auto">
        {pending ? "Saving…" : slotId ? "Save changes" : "Post slot"}
      </button>
    </form>
  );
}

export function RemoveSlotButton({ slotId }: { slotId: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(removeSlotAction.bind(null, slotId), {});
  const [confirming, setConfirming] = useState(false);
  if (state.ok) return <span className="text-sm text-ink-muted">Removed</span>;
  return (
    <div className="flex flex-wrap items-center gap-2">
      {state.error && <span role="alert" className="text-sm text-danger">{state.error}</span>}
      {confirming ? (
        <form action={action} className="flex gap-2">
          <button type="submit" disabled={pending} className="btn bg-danger px-3.5 py-1.5 text-on-adam hover:bg-danger/90">
            {pending ? "Removing…" : "Remove"}
          </button>
          <button type="button" onClick={() => setConfirming(false)} className="btn-secondary px-3.5 py-1.5">
            Keep
          </button>
        </form>
      ) : (
        <button type="button" onClick={() => setConfirming(true)} className="btn-ghost px-3.5 py-1.5 text-danger">
          Remove
        </button>
      )}
    </div>
  );
}
