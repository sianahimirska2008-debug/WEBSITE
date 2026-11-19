"use client";

import "leaflet/dist/leaflet.css";
import L from "leaflet";
import Link from "next/link";
import { useEffect, useMemo } from "react";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";

export type MapSlot = {
  id: string;
  treatmentName: string;
  when: string;
  price: string;
  originalPrice: string;
  percentOff: number;
};

export type MapBusiness = {
  id: string;
  name: string;
  slug: string;
  area: string;
  lat: number;
  lng: number;
  fromPrice: string;
  slots: MapSlot[];
};

function priceIcon(label: string) {
  // Size the clickable box to the label so the whole pill is the hit target.
  const width = Math.round(label.length * 7 + 24);
  return L.divIcon({
    className: "gt-marker",
    html: `<span style="display:flex;align-items:center;justify-content:center;height:26px;width:${width}px;white-space:nowrap;border-radius:999px;font:600 12px/1 var(--font-inter),system-ui,sans-serif;background:#34483b;color:#f6f5f1;box-shadow:0 0 0 2px #f6f5f1">${label.replace(/&/g, "&amp;").replace(/</g, "&lt;")}</span>`,
    iconSize: [width, 26],
    iconAnchor: [width / 2, 26],
    popupAnchor: [0, -28],
  });
}

function FitBounds({ points }: { points: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (points.length === 0) return;
    if (points.length === 1) map.setView(points[0], 15);
    else map.fitBounds(L.latLngBounds(points), { padding: [40, 40], maxZoom: 15 });
  }, [map, points]);
  return null;
}

export default function SlotsMap({
  businesses,
  origin,
  className = "h-[70vh] min-h-[420px]",
  singleSlotId,
}: {
  businesses: MapBusiness[];
  origin?: { lat: number; lng: number };
  className?: string;
  singleSlotId?: string;
}) {
  const points = useMemo(() => businesses.map((b) => [b.lat, b.lng] as [number, number]), [businesses]);
  const center = points[0] ?? (origin ? [origin.lat, origin.lng] : [51.5152, -0.1419]);

  return (
    <div className={`overflow-hidden rounded-[var(--radius-card)] border border-line ${className}`}>
      <MapContainer center={center as [number, number]} zoom={13} scrollWheelZoom={false} className="h-full w-full" style={{ background: "#ecefe9" }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitBounds points={points} />
        {businesses.map((b) => (
          <Marker
            key={b.id}
            position={[b.lat, b.lng]}
            icon={priceIcon(singleSlotId ? b.name : `from ${b.fromPrice}`)}
            title={`${b.name}, ${b.slots.length} slot${b.slots.length === 1 ? "" : "s"} from ${b.fromPrice}`}
            alt={`${b.name} on map`}
          >
            {!singleSlotId && (
              <Popup>
                <div className="min-w-[210px] font-sans">
                  <p className="m-0 text-xs text-ink-muted">{b.area}</p>
                  <Link href={`/b/${b.slug}`} className="font-serif text-lg text-ink">
                    {b.name}
                  </Link>
                  <ul className="m-0 mt-2 list-none space-y-1.5 p-0">
                    {b.slots.slice(0, 4).map((s) => (
                      <li key={s.id}>
                        <Link href={`/slots/${s.id}`} className="flex justify-between gap-3 text-[13px] text-ink no-underline hover:underline">
                          <span>
                            {s.treatmentName} · {s.when}
                          </span>
                          <span className="font-semibold">{s.price}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                  {b.slots.length > 4 && (
                    <Link href={`/b/${b.slug}`} className="mt-2 block text-xs font-medium text-adam">
                      +{b.slots.length - 4} more slots
                    </Link>
                  )}
                </div>
              </Popup>
            )}
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
