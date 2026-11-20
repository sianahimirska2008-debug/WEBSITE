"use client";

import { useActionState } from "react";
import { createTreatmentAction, type FormState } from "@/app/actions/dashboard";
import { CATEGORIES } from "@/lib/categories";
import { FormError } from "./auth-shell";

export function TreatmentForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(createTreatmentAction, {});
  return (
    <form action={action} className="space-y-4">
      <FormError message={state.error} />
      {state.ok && <p role="status" className="text-sm text-ink">{state.message}</p>}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="t-name" className="label">
            Name
          </label>
          <input id="t-name" name="name" required placeholder="e.g. Cut & blow-dry" className="field" />
        </div>
        <div>
          <label htmlFor="t-category" className="label">
            Category
          </label>
          <select id="t-category" name="category" required className="field" defaultValue="">
            <option value="" disabled>
              Choose one
            </option>
            {CATEGORIES.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="t-duration" className="label">
            Usual duration (minutes)
          </label>
          <input id="t-duration" name="durationMins" type="number" min={5} step={5} defaultValue={60} required className="field" />
        </div>
        <div>
          <label htmlFor="t-price" className="label">
            Standard price (£)
          </label>
          <input id="t-price" name="standardPrice" inputMode="decimal" required className="field" />
        </div>
      </div>
      <button type="submit" disabled={pending} className="btn-secondary">
        {pending ? "Adding…" : "Add treatment"}
      </button>
    </form>
  );
}
