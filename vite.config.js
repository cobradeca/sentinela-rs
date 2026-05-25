import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Troque "sentinel-rs" pelo nome exato do seu repositório GitHub
export default defineConfig({
  plugins: [react()],
  base: "/sentinel-rs/",
  build: {
    outDir: "dist",
  },
});
