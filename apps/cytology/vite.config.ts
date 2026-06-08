import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

import { cytologyUploadApiPlugin } from "../../lib/cytology-upload/src/vitePlugin";

function processPolyfillPlugin(mode: string) {
  const nodeEnv = mode === "production" ? "production" : "development";
  return {
    name: "cytology-process-polyfill",
    transformIndexHtml: {
      order: "pre" as const,
      handler() {
        return [
          {
            tag: "script",
            children: `globalThis.process={env:{NODE_ENV:${JSON.stringify(nodeEnv)}}};`,
            injectTo: "head-prepend" as const,
          },
        ];
      },
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const proxyTarget =
    env.VITE_CYTOLOGY_PROXY_TARGET ??
    env.VITE_API_PROXY_TARGET ??
    env.VITE_PROXY_TARGET ??
    "http://msa.mephi.ru:7000";
  const dziProxyTarget =
    env.VITE_DZI_PROXY_TARGET ?? "http://msa.mephi.ru:8005";
  const apiBaseUrl = env.VITE_API_BASE_URL ?? "/api/v3";
  const dziBaseUrl = env.VITE_DZI_API_BASE_URL ?? "/api/bid/v1/dzi";
  const cytologyCreatePath =
    env.VITE_CYTOLOGY_CREATE_PATH ??
    `${apiBaseUrl.replace(/\/$/, "")}/cytology/create/`;

  const proxy: Record<string, { target: string; changeOrigin: boolean }> = {
    "/api/bid": { target: dziProxyTarget, changeOrigin: true },
    "/api": { target: proxyTarget, changeOrigin: true },
  };

  return {
    plugins: [
      processPolyfillPlugin(mode),
      react(),
      cytologyUploadApiPlugin({
        apiProxyTarget: proxyTarget,
        cytologyCreatePath,
      }),
    ],
    define: {
      "import.meta.env.VITE_API_BASE_URL": JSON.stringify(apiBaseUrl),
      "import.meta.env.VITE_DZI_API_BASE_URL": JSON.stringify(dziBaseUrl),
      "import.meta.env.VITE_AUTH_REFRESH_PATH": JSON.stringify(
        env.VITE_AUTH_REFRESH_PATH ?? "/auth/token/refresh/"
      ),
      "import.meta.env.VITE_AUTH_REFRESH_HEADER_TOKEN": JSON.stringify(
        env.VITE_AUTH_REFRESH_HEADER_TOKEN ?? "true"
      ),
    },
    resolve: {
      alias: [
        {
          find: "@",
          replacement: path.resolve(__dirname, "./src"),
        },
        {
          find: "@cytology",
          replacement: path.resolve(__dirname, "./src/features/cytology-view"),
        },
        {
          find: "@medml/ui/styles",
          replacement: path.resolve(__dirname, "../../lib/ui/src/styles"),
        },
        {
          find: "@annotorious/react/annotorious-react.css",
          replacement: path.resolve(
            __dirname,
            "node_modules/@annotorious/react/dist/annotorious-react.css"
          ),
        },
        {
          find: /^@annotorious\/(react|openseadragon|annotorious|core)$/,
          replacement: path.resolve(__dirname, "node_modules/@annotorious/$1"),
        },
      ],
      dedupe: [
        "@annotorious/react",
        "@annotorious/openseadragon",
        "@annotorious/annotorious",
        "@annotorious/core",
      ],
    },
    server: {
      port: 3001,
      proxy,
    },
  };
});
