import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@medml/ui/styles": path.resolve(__dirname, "../../lib/ui/src/styles"),
    },
  },
  server: {
    port: 3001,
  },
});
