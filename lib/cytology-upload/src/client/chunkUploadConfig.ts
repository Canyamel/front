import { withBasePath } from "@medml/shared";

import type { ChunkedUploadConfig } from "./types";

/**
 * Чанковая загрузка .svs для всех приложений цитологии.
 *
 * Адреса — с префиксом приложения (`/cytology/api/upload/...`): nginx срезает
 * его перед отправкой в сервис загрузки, сервис видит `/api/upload/...`.
 */
export const cytologyChunkUploadConfig: ChunkedUploadConfig = {
  mode: "chunked",
  startUrl: withBasePath("/api/upload/start"),
  chunkUrl: withBasePath("/api/upload/chunk"),
  completeUrl: withBasePath("/api/upload/complete"),
  chunkSizeMb: 20,
};

export const CYTOLOGY_STAGED_CREATE_URL = withBasePath("/api/upload/create-cytology");

export const CYTOLOGY_UPLOAD_MAX_SIZE_GB = 10;
