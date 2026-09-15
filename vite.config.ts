import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    // allowedHosts: true permite usar túneles temporales (Cloudflare Tunnel, ngrok...)
    // con hostname aleatorio para probar la app desde fuera de la red local.
    allowedHosts: true,
    proxy: {
      "/api": {
        target: "http://localhost:3001",
        changeOrigin: true,
      },
    },
  },
});
