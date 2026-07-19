import express, { type Express, type Request, type Response } from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

// ─── Security headers ─────────────────────────────────────────────────────────
app.use(
  helmet({
    crossOriginEmbedderPolicy: false, // allow iframe preview in Replit
    contentSecurityPolicy: false,     // API-only server; no HTML to protect
  })
);

// ─── CORS ─────────────────────────────────────────────────────────────────────
// In production the frontend is same-origin via the proxy, so we restrict
// to the Replit dev domain. In development allow all origins.
const isProd = process.env.NODE_ENV === "production";
app.use(
  cors({
    origin: isProd
      ? (origin, cb) => {
          if (!origin || /\.replit\.app$|\.replit\.dev$/.test(origin)) {
            cb(null, true);
          } else {
            cb(new Error("CORS: origin not allowed"));
          }
        }
      : true,
    methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

// ─── Request logging ──────────────────────────────────────────────────────────
app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return { statusCode: res.statusCode };
      },
    },
  })
);

// ─── Body parsing (with size limits) ──────────────────────────────────────────
app.use(express.json({ limit: "256kb" }));
app.use(express.urlencoded({ extended: true, limit: "256kb" }));

// ─── Global rate limiting ────────────────────────────────────────────────────
// Generous baseline — the AI-pipeline routes have tighter limits below.
const globalLimiter = rateLimit({
  windowMs: 60_000,       // 1 minute
  max: 120,               // 120 req/min per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests, please slow down." },
});

// Tighter limit for LLM-backed endpoints (extract + generate) — each call
// invokes Claude, so we cap at 10/min per IP to control costs.
const llmLimiter = rateLimit({
  windowMs: 60_000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "LLM rate limit exceeded. Please wait a moment and try again." },
  keyGenerator: (req: Request) =>
    (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
    req.socket.remoteAddress ||
    "unknown",
});

app.use("/api", globalLimiter);
app.use("/api/sessions/:sessionId/extract", llmLimiter);
app.use("/api/sessions/:sessionId/generate", llmLimiter);

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use("/api", router);

// ─── 404 handler ─────────────────────────────────────────────────────────────
app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: "Not found" });
});

// ─── Global error handler ─────────────────────────────────────────────────────
app.use((err: Error, _req: Request, res: Response, _next: unknown) => {
  logger.error({ err }, "Unhandled error");
  const status = (err as { status?: number }).status ?? 500;
  res.status(status).json({
    error:
      process.env.NODE_ENV === "production"
        ? "Internal server error"
        : err.message,
  });
});

export default app;
