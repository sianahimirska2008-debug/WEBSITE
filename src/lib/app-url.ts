/** Public base URL of the site, used for Stripe return/refresh URLs. */
export function appUrl(): string {
  const explicit = process.env.APP_URL ?? process.env.NEXTAUTH_URL;
  if (explicit) return explicit.replace(/\/$/, "");
  // On Vercel, fall back to the production domain (or this deployment's URL for previews).
  const vercel = process.env.VERCEL_ENV === "production" ? process.env.VERCEL_PROJECT_PRODUCTION_URL : process.env.VERCEL_URL;
  if (vercel) return `https://${vercel}`;
  return "http://localhost:3000";
}
