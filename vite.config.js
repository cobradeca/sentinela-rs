import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Troque "sentinela-rs" pelo nome exato do seu repositório GitHub
export default defineConfig({
  plugins: [react()],
  base: "/sentinela-rs/",
  build: {
    outDir: "dist",
  },
});