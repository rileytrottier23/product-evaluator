import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
import { mockupPreviewPlugin } from "./mockupPreviewPlugin";

// PORT feeds the dev server and the preview server only. A production build
// writes static files and never listens on a port, so PORT is required for
// `vite dev` / `vite preview` and optional for `vite build`. That is what lets
// this project build in CI and on a fresh clone rather than only on Replit,
// which injects the variable.
function resolvePort(required: boolean): number | undefined {
  const raw = process.env.PORT;

  if (!raw) {
    if (required) {
      throw new Error(
        "PORT environment variable is required but was not provided.",
      );
    }
    return undefined;
  }

  const port = Number(raw);

  if (Number.isNaN(port) || port <= 0) {
    throw new Error(`Invalid PORT value: "${raw}"`);
  }

  return port;
}

// Replit sets BASE_PATH explicitly, so deployed asset paths are unchanged.
// "/" is Vite's own default and the right fallback everywhere else.
const basePath = process.env.BASE_PATH || "/";

export default defineConfig(async ({ command }) => {
  const port = resolvePort(command === "serve");

  return {
    base: basePath,
    plugins: [
      mockupPreviewPlugin(),
      react(),
      tailwindcss(),
      runtimeErrorOverlay(),
      ...(process.env.NODE_ENV !== "production" &&
      process.env.REPL_ID !== undefined
        ? [
            await import("@replit/vite-plugin-cartographer").then((m) =>
              m.cartographer({
                root: path.resolve(import.meta.dirname, ".."),
              }),
            ),
          ]
        : []),
    ],
    resolve: {
      alias: {
        "@": path.resolve(import.meta.dirname, "src"),
      },
    },
    root: path.resolve(import.meta.dirname),
    build: {
      outDir: path.resolve(import.meta.dirname, "dist"),
      emptyOutDir: true,
    },
    server: {
      port,
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
  };
});
