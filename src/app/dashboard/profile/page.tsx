import type { Metadata } from "next";
import { requireBusinessUser } from "@/lib/auth";
import { getOwnedBusiness } from "@/lib/business";
import { parseHours } from "@/lib/hours";
import { ProfileForm } from "@/components/profile-form";

export const metadata: Metadata = { title: "Business profile" };

export default async function DashboardProfile() {
  const user = await requireBusinessUser("/dashboard/profile");
  const b = await getOwnedBusiness(user.id);
  return (
    <section aria-labelledby="profile-title" className="card max-w-3xl p-6 sm:p-8">
      <h2 id="profile-title" className="text-2xl text-ink">
        Business <em className="italic text-adam">profile</em>
      </h2>
      <p className="mt-1 text-sm text-ink-muted">This is what customers see on your public page.</p>
      <div className="mt-6">
        <ProfileForm
          p={{
            name: b.name,
            type: b.type,
            description: b.description,
            address: b.address,
            postcode: b.postcode,
            area: b.area,
            lat: b.lat,
            lng: b.lng,
            phone: b.phone ?? "",
            logoUrl: b.logoUrl ?? "",
            hours: parseHours(b.openingHours),
          }}
        />
      </div>
    </section>
  );
}
