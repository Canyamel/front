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
  const proxyTarget =
    env.VITE_CYTOLOGY_PROXY_TARGET ?? env.VITE_API_PROXY_TARGET ?? "http://localhost:8080";

  return {
    plugins: [processPolyfillPlugin(mode), react()],
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
