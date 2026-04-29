// Prefix client-side fetch URLs with the configured basePath so requests
// resolve correctly when the app is mounted under a path (e.g. /framery)
// or proxied from a parent domain.

const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export function apiUrl(path: string): string {
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  return BASE + (path.startsWith("/") ? path : "/" + path);
}
