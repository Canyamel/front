/** База DZI/tiler для OpenSeadragon (как NEXT_PUBLIC_DZI_API_BASE_URL в OLD CYTO). */
export function getDziApiBaseUrl(): string {
  const v = import.meta.env.VITE_DZI_API_BASE_URL;
  if (typeof v === "string" && v.length > 0) {
    return v.replace(/\/+$/, "");
  }
  return "/api/bid/v1/dzi";
}

/** Путь к тайлам из поля original_image.image API. */
export function buildDziTileSources(imageUrl: string): string {
  const base = getDziApiBaseUrl();
  const path = imageUrl.replace(/^\/media\//, "").replace(/^\//, "");
  return `${base}/${path}`;
}
