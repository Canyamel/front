/** Origin API без завершающего слэша (для axios: `${origin}/uzi/...`). */
export function getThyroidApiOrigin(): string {
  const v =
    import.meta.env.VITE_BACKEND_BASE_URL ?? import.meta.env.VITE_API_BASE_URL;
  if (typeof v === "string" && v.length > 0) {
    return v.replace(/\/$/, "");
  }
  return "/api/v3";
}
