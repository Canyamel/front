import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import type { Plugin } from "vite";

/**
 * Если где-то всё ещё подтянется код с `process.env` (legacy), в браузере без полифилла будет ошибка.
 */
function processPolyfillPlugin(mode: string): Plugin {
  const nodeEnv = mode === "production" ? "production" : "development";
  return {
    name: "cytology-process-polyfill",
    transformIndexHtml: {
      order: "pre",
      handler() {
        return [
          {
            tag: "script",
            children: `globalThis.process={env:{NODE_ENV:${JSON.stringify(nodeEnv)}}};`,
            injectTo: "head-prepend",
          },
        ];
      },
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const apiBaseUrl = env.VITE_API_BASE_URL ?? "/api/v3";
  const proxyTarget =
    env.VITE_CYTOLOGY_PROXY_TARGET ?? env.VITE_API_PROXY_TARGET ?? "http://msa.mephi.ru:7000";

  return {
    plugins: [processPolyfillPlugin(mode), react()],
    define: {
      "import.meta.env.VITE_API_BASE_URL": JSON.stringify(apiBaseUrl),
      "import.meta.env.VITE_AUTH_REFRESH_PATH": JSON.stringify("/auth/refresh"),
      "import.meta.env.VITE_AUTH_REFRESH_HEADER_TOKEN": JSON.stringify("true"),
    },
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
        "@medml/ui/styles": path.resolve(__dirname, "../../lib/ui/src/styles"),
      },
    },
    server: {
      port: 3001,
      proxy: {
        "/api": {
          target: proxyTarget,
          changeOrigin: true,
        },
      },
    },
  };
});
