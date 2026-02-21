import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerBillingWebhookRoutes } from "./billing";
import { registerOAuthRoutes } from "./oauth";
import { ENV } from "./env";
import { appRouter } from "../routers";
import { createContext } from "./context";

const DEFAULT_DEV_ALLOWED_ORIGINS = [
  "http://localhost:8081",
  "http://127.0.0.1:8081",
  "http://localhost:19006",
  "http://127.0.0.1:19006",
  "http://localhost:3000",
  "http://127.0.0.1:3000",
];

function parseAllowedOrigins(raw: string): Set<string> {
  return new Set(
    raw
      .split(",")
      .map((part) => part.trim())
      .filter((part) => part.length > 0),
  );
}

function getAllowedOrigins(): Set<string> {
  const configured = parseAllowedOrigins(ENV.corsAllowedOrigins);
  if (configured.size > 0) return configured;
  if (!ENV.isProduction) return new Set(DEFAULT_DEV_ALLOWED_ORIGINS);
  return new Set();
}

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);
  const allowedOrigins = getAllowedOrigins();

  // CORS: explicit allowlist, with credentials only for trusted origins.
  app.use((req, res, next) => {
    const origin = typeof req.headers.origin === "string" ? req.headers.origin : "";
    const hasOrigin = origin.length > 0;
    const isAllowedOrigin = hasOrigin && allowedOrigins.has(origin);

    res.header("Vary", "Origin");

    if (isAllowedOrigin) {
      res.header("Access-Control-Allow-Origin", origin);
      res.header("Access-Control-Allow-Credentials", "true");
    }

    res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    res.header(
      "Access-Control-Allow-Headers",
      "Origin, X-Requested-With, Content-Type, Accept, Authorization, X-Signature",
    );

    if (req.method === "OPTIONS") {
      if (hasOrigin && !isAllowedOrigin) {
        res.status(403).json({ error: "origin not allowed" });
        return;
      }
      res.sendStatus(204);
      return;
    }

    if (hasOrigin && !isAllowedOrigin) {
      res.status(403).json({ error: "origin not allowed" });
      return;
    }

    next();
  });

  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  registerOAuthRoutes(app);
  registerBillingWebhookRoutes(app);

  app.get("/api/health", (_req, res) => {
    res.json({ ok: true, timestamp: Date.now() });
  });

  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    }),
  );

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`[api] server listening on port ${port}`);
  });
}

startServer().catch(console.error);
