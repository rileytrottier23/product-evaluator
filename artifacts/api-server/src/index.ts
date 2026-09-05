import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import app from "./app";
import { logger } from "./lib/logger";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

// Serve the built prd-to-evals client from this same origin. The client calls
// the API at a relative /api path, so the two have to share an origin — on
// Replit a platform router did that, and off Replit it has to be explicit.
//
// Resolved from this module's own URL rather than process.cwd(), so the start
// command works when run from the workspace root.
const clientDir = fileURLToPath(
  new URL("../../prd-to-evals/dist/public", import.meta.url),
);

app.use(express.static(clientDir));

// SPA fallback: any GET that isn't an API call and didn't match a static file
// gets index.html, so client-side routes survive a page refresh. Written as
// middleware rather than a wildcard route to stay clear of Express 5's
// path-matching changes.
app.use((req, res, next) => {
  if (req.method !== "GET" || req.path.startsWith("/api")) {
    next();
    return;
  }

  res.sendFile(path.join(clientDir, "index.html"));
});

app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port, clientDir }, "Server listening");
});
