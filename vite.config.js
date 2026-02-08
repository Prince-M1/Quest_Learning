import base44 from "@base44/vite-plugin";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import path from "path";

export default defineConfig({
  plugins: [
    base44({
      legacySDKImports: process.env.BASE44_LEGACY_SDK_IMPORTS === "true",
    }),
    react(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  server: {
    // SPA fallback
    historyApiFallback: true,
    // proxy API calls to backend
    proxy: {
      "/api": "http://localhost:5000",
    },
  },
});
