import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("адреса чанковой загрузки", () => {
  it("без префикса — от корня", async () => {
    const config = await import("./chunkUploadConfig");

    expect(config.cytologyChunkUploadConfig.startUrl).toBe("/api/upload/start");
    expect(config.CYTOLOGY_STAGED_CREATE_URL).toBe("/api/upload/create-cytology");
  });

  it("с префиксом приложения", async () => {
    vi.stubEnv("BASE_URL", "/cytology/");
    const config = await import("./chunkUploadConfig");

    expect(config.cytologyChunkUploadConfig).toMatchObject({
      startUrl: "/cytology/api/upload/start",
      chunkUrl: "/cytology/api/upload/chunk",
      completeUrl: "/cytology/api/upload/complete",
    });
    expect(config.CYTOLOGY_STAGED_CREATE_URL).toBe("/cytology/api/upload/create-cytology");
  });
});
