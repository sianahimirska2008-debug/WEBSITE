/** Public base URL of the site, used for Stripe return/refresh URLs. */
export function appUrl(): string {
  return (process.env.APP_URL ?? process.env.NEXTAUTH_URL ?? "http://localhost:3000").replace(/\/$/, "");
}
