import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const backendPort = process.env.VITE_BACKEND_PORT || "3001";
  const backendTarget = process.env.VITE_BACKEND_TARGET || `http://localhost:${backendPort}`;

  return {
    server: {
      host: "::",
      port: 8080,
      open: true,
      hmr: {
        overlay: false,
      },
      proxy: {
        '/api': {
          target: backendTarget,
          changeOrigin: true,
          // Allow large MP4 streaming through the dev proxy
          timeout: 0,
          proxyTimeout: 0,
        },
      },
    },
    plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  };
});
