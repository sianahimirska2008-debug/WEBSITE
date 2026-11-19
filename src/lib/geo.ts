/** Default "near you" point when we don't know the visitor's location: Oxford Circus. */
export const DEFAULT_LOCATION = { lat: 51.5152, lng: -0.1419, label: "Central London" };

export function distanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

export function formatDistance(km: number): string {
  const miles = km * 0.621371;
  return miles < 0.1 ? "< 0.1 mi" : `${miles.toFixed(1)} mi`;
}

export function kmToMiles(km: number) {
  return km * 0.621371;
}
