/** Only allow same-site relative paths as post-login destinations. */
export function safeCallbackUrl(url: string | null | undefined, fallback = "/"): string {
  if (!url || !url.startsWith("/") || url.startsWith("//") || url.startsWith("/\\")) return fallback;
  return url;
}
