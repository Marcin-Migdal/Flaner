import react from "@vitejs/plugin-react";
import path from "path";
import { defineConfig } from "vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@components": path.resolve(__dirname, "./src/components"),
      "@hooks": path.resolve(__dirname, "./src/hooks"),
      "@slices": path.resolve(__dirname, "./src/app/slices"),
      "@utils": path.resolve(__dirname, "./src/utils"),
      "@commonAssets": path.resolve(__dirname, "./src/commonAssets"),
      "@services": path.resolve(__dirname, "./src/app/services"),
      "@i18n": path.resolve(__dirname, "./src/i18n.ts"),
    },
  },
});
