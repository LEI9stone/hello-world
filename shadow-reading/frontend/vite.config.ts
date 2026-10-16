import { reactRouter } from "@react-router/dev/vite";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [reactRouter()],
  server: {
    port: 28256,
    strictPort: true,
    proxy: { "/api": "http://localhost:8081" },
  },
});
