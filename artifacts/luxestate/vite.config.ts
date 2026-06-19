import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
import { VitePWA } from "vite-plugin-pwa";

const port = Number(process.env.PORT || 5173);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${process.env.PORT}"`);
}

// BASE_PATH should be optional during build.
// Vercel, Netlify, Replit builds often do not provide it.
const basePath = process.env.BASE_PATH || "/";

export default defineConfig({
  base: basePath,
  plugins: [
    react(),
    tailwindcss({ optimize: false }),
    runtimeErrorOverlay(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: [
        "favicon.svg",
        "logo.svg",
        "robots.txt",
        "pwa-*.png",
        "apple-touch-icon.png",
      ],
      manifest: {
        name: "LuxeState CRM",
        short_name: "LuxeState",
        description:
          "Premium real estate CRM — manage leads, deals, properties, and analytics from any device.",
        theme_color: "#C4841A",
        background_color: "#0f0f0f",
        display: "standalone",
        orientation: "portrait-primary",
        scope: basePath,
        start_url: basePath,
        categories: ["business", "productivity"],
        icons: [
          {
            src: "pwa-72x72.png",
            sizes: "72x72",
            type: "image/png",
          },
          {
            src: "pwa-96x96.png",
            sizes: "96x96",
            type: "image/png",
          },
          {
            src: "pwa-128x128.png",
            sizes: "128x128",
            type: "image/png",
          },
          {
            src: "pwa-144x144.png",
            sizes: "144x144",
            type: "image/png",
          },
          {
            src: "pwa-152x152.png",
            sizes: "152x152",
            type: "image/png",
          },
          {
            src: "pwa-192x192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "pwa-384x384.png",
            sizes: "384x384",
            type: "image/png",
          },
          {
            src: "pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
          },
          {
            src: "pwa-maskable-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
      maximumFileSizeToCacheInBytes: 10 * 1024 * 1024,

      globPatterns: ["**/*.{js,css,html,ico,png,svg,woff,woff2}"],
      navigateFallback: null,
      runtimeCaching: [
      {
      urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
      handler: "CacheFirst",
      options: {
      cacheName: "google-fonts-cache",
      expiration: {
      maxEntries: 10,
      maxAgeSeconds: 60 * 60 * 24 * 365,
      },
      cacheableResponse: {
      statuses: [0, 200],
      },
      },
      },
      {
      urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
      handler: "CacheFirst",
      options: {
      cacheName: "gstatic-fonts-cache",
      expiration: {
      maxEntries: 10,
      maxAgeSeconds: 60 * 60 * 24 * 365,
      },
      cacheableResponse: {
      statuses: [0, 200],
      },
      },
      },
      ],
      },

      devOptions: {
        enabled: false,
      },
    }),
    ...(process.env.NODE_ENV !== "production" &&
    process.env.REPL_ID !== undefined
      ? [
          await import("@replit/vite-plugin-cartographer").then((m) =>
            m.cartographer({
              root: path.resolve(import.meta.dirname, ".."),
            }),
          ),
          await import("@replit/vite-plugin-dev-banner").then((m) =>
            m.devBanner(),
          ),
        ]
      : []),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
      "@assets": path.resolve(
        import.meta.dirname,
        "..",
        "..",
        "attached_assets",
      ),
    },
    dedupe: ["react", "react-dom"],
  },
  root: path.resolve(import.meta.dirname),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
  },
  server: {
    port,
    strictPort: true,
    host: "0.0.0.0",
    allowedHosts: true,
    fs: {
      strict: true,
    },
  },
  preview: {
    port,
    host: "0.0.0.0",
    allowedHosts: true,
  },
});
