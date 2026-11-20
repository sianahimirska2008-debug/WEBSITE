"use client";

import { useActionState } from "react";
import { updateProfileAction, type FormState } from "@/app/actions/dashboard";
import { FormError } from "./auth-shell";

const DAYS = [
  ["mon", "Monday"],
  ["tue", "Tuesday"],
  ["wed", "Wednesday"],
  ["thu", "Thursday"],
  ["fri", "Friday"],
  ["sat", "Saturday"],
  ["sun", "Sunday"],
] as const;

type Profile = {
  name: string;
  type: string;
  description: string;
  address: string;
  postcode: string;
  area: string;
  lat: number;
  lng: number;
  phone: string;
  logoUrl: string;
  hours: Record<string, string>;
};

export function ProfileForm({ p }: { p: Profile }) {
  const [state, action, pending] = useActionState<FormState, FormData>(updateProfileAction, {});
  return (
    <form action={action} className="space-y-8">
      <FormError message={state.error} />
      {state.ok && (
        <p role="status" className="rounded-[var(--radius-field)] bg-band px-3.5 py-2.5 text-sm text-on-band">
          {state.message}
        </p>
      )}
      <fieldset className="grid gap-4 sm:grid-cols-2">
        <legend className="mb-2 font-serif text-xl text-ink">About</legend>
        <div>
          <label htmlFor="p-name" className="label">Business name</label>
          <input id="p-name" name="name" defaultValue={p.name} required className="field" />
        </div>
        <div>
          <label htmlFor="p-type" className="label">Type</label>
          <select id="p-type" name="type" defaultValue={p.type} className="field">
            <option value="SALON">Hair salon</option>
            <option value="BEAUTY">Beauty studio</option>
            <option value="BARBER">Barber</option>
          </select>
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="p-desc" className="label">Description</label>
          <textarea id="p-desc" name="description" defaultValue={p.description} rows={3} maxLength={1000} className="field" />
        </div>
        <div>
          <label htmlFor="p-phone" className="label">Phone</label>
          <input id="p-phone" name="phone" type="tel" defaultValue={p.phone} className="field" />
        </div>
        <div>
          <label htmlFor="p-logo" className="label">Logo URL <span className="font-normal text-ink-muted">(optional)</span></label>
          <input id="p-logo" name="logoUrl" type="url" defaultValue={p.logoUrl} placeholder="https://" className="field" />
        </div>
      </fieldset>
      <fieldset className="grid gap-4 sm:grid-cols-2">
        <legend className="mb-2 font-serif text-xl text-ink">Location</legend>
        <div className="sm:col-span-2">
          <label htmlFor="p-address" className="label">Street address</label>
          <input id="p-address" name="address" defaultValue={p.address} required className="field" />
        </div>
        <div>
          <label htmlFor="p-postcode" className="label">Postcode</label>
          <input id="p-postcode" name="postcode" defaultValue={p.postcode} className="field" />
        </div>
        <div>
          <label htmlFor="p-area" className="label">Area</label>
          <input id="p-area" name="area" defaultValue={p.area} className="field" />
        </div>
        <div>
          <label htmlFor="p-lat" className="label">Latitude</label>
          <input id="p-lat" name="lat" type="number" step="0.000001" defaultValue={p.lat} required className="field" />
        </div>
        <div>
          <label htmlFor="p-lng" className="label">Longitude</label>
          <input id="p-lng" name="lng" type="number" step="0.000001" defaultValue={p.lng} required className="field" />
        </div>
        <p className="text-xs text-ink-muted sm:col-span-2">Used for your map pin and distances. Find them by right-clicking your shop on openstreetmap.org and choosing &ldquo;Show address&rdquo;.</p>
      </fieldset>
      <fieldset>
        <legend className="mb-3 font-serif text-xl text-ink">Opening hours</legend>
        <div className="space-y-2">
          {DAYS.map(([key, label]) => {
            const v = p.hours[key] ?? "closed";
            const [open, close] = v === "closed" ? ["09:00", "18:00"] : v.split("-");
            return (
              <div key={key} className="grid grid-cols-[6.5rem_1fr_1fr_auto] items-center gap-2 sm:gap-3">
                <span className="text-sm text-ink">{label}</span>
                <label className="sr-only" htmlFor={`${key}-open`}>{label} opens</label>
                <input id={`${key}-open`} name={`${key}_open`} type="time" defaultValue={open} className="field px-2" />
                <label className="sr-only" htmlFor={`${key}-close`}>{label} closes</label>
                <input id={`${key}-close`} name={`${key}_close`} type="time" defaultValue={close} className="field px-2" />
                <label className="flex items-center gap-1.5 text-xs text-ink-muted">
                  <input type="checkbox" name={`${key}_closed`} defaultChecked={v === "closed"} className="h-4 w-4 accent-adam" />
                  Closed
                </label>
              </div>
            );
          })}
        </div>
      </fieldset>
      <button type="submit" disabled={pending} className="btn-primary">
        {pending ? "Saving…" : "Save profile"}
      </button>
    </form>
  );
}
