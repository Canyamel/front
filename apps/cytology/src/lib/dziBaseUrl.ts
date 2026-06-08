/** База DZI/tiler для OpenSeadragon (как NEXT_PUBLIC_DZI_API_BASE_URL в OLD CYTO). */
export function getDziApiBaseUrl(): string {
  const v = import.meta.env.VITE_DZI_API_BASE_URL;
  if (typeof v === "string" && v.length > 0) {
    return v.replace(/\/+$/, "");
  }
  return "/api/bid/v1/dzi";
}

/** Нормализует путь из API для tiler (без /media/ и без origin). */
export function normalizeDziImagePath(imageUrl: string): string {
  const trimmed = imageUrl.trim();
  if (!trimmed) {
    return "";
  }

  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    try {
      const { pathname } = new URL(trimmed);
      return pathname.replace(/^\/media\//, "").replace(/^\//, "");
    } catch {
      return trimmed.replace(/^\/media\//, "").replace(/^\//, "");
    }
  }

  return trimmed.replace(/^\/media\//, "").replace(/^\//, "");
}

/** Путь к тайлам из поля original_image.file_path / image API. */
export function buildDziTileSources(imageUrl: string): string {
  const path = normalizeDziImagePath(imageUrl);
  if (!path) {
    return "";
  }
  const base = getDziApiBaseUrl();
  return `${base}/${path}`;
}
