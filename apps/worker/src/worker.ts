import http from "http";
import "dotenv/config";
import pino from "pino";
import { Worker } from "bullmq";
// NB: explicit .js extension — this is an ESM package ("type":"module") and the
// `start` script runs the compiled output under Node ESM, which requires
// extensions on relative imports. TS (moduleResolution: bundler) accepts it.
import { attendanceQueue, maybeRedis } from "./lib/queue.js";

const logger = pino({
  transport:
    process.env.NODE_ENV !== "production"
      ? { target: "pino-pretty" }
      : undefined,
});

// Holds the BullMQ Worker so graceful shutdown can close it. Null when no
// Redis is configured (skeleton-only mode).
let attendanceWorker: Worker | null = null;

/**
 * Register the daily attendance settlement scheduler.
 *
 * Only called when REDIS_URL is present (and therefore attendanceQueue exists).
 * Registers a cron via upsertJobScheduler — idempotent, so re-deploys don't
 * pile up duplicate schedulers — and calls the API's protected internal settle
 * endpoint. The API owns tenant-scoped DB access and the @hr/rules settlement
 * implementation; the worker is just the clock.
 */
async function registerSchedulers() {
  if (!attendanceQueue || !maybeRedis) return;

  await attendanceQueue.upsertJobScheduler(
    "daily-attendance-settle",
    { pattern: "0 2 * * *", tz: "Asia/Taipei" },
    { name: "daily-attendance-settle", data: {} },
  );

  attendanceWorker = new Worker(
    "attendance",
    async (job) => {
      const apiUrl = process.env.API_INTERNAL_URL ?? process.env.API_URL;
      const token = process.env.INTERNAL_JOB_TOKEN;
      if (!apiUrl || !token) {
        logger.warn(
          { jobId: job.id, name: job.name, hasApiUrl: !!apiUrl, hasToken: !!token },
          "daily-attendance-settle skipped: API_INTERNAL_URL/API_URL or INTERNAL_JOB_TOKEN missing",
        );
        return;
      }

      const baseUrl = apiUrl.replace(/\/$/, "");
      const body = typeof job.data?.date === "string" ? { date: job.data.date } : {};
      const response = await fetch(`${baseUrl}/internal/attendance/daily-settle`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-internal-job-token": token,
        },
        body: JSON.stringify(body),
      });
      const text = await response.text();
      let payload: unknown = text;
      try {
        payload = JSON.parse(text);
      } catch {
        /* keep text payload */
      }
      if (!response.ok) {
        throw new Error(`daily settle API failed ${response.status}: ${text.slice(0, 500)}`);
      }
      logger.info({ jobId: job.id, name: job.name, result: payload }, "daily-attendance-settle completed");
    },
    { connection: maybeRedis },
  );

  attendanceWorker.on("failed", (job, err) =>
    logger.error({ queue: "attendance", jobId: job?.id, err: err.message }, "job failed"),
  );
  attendanceWorker.on("error", (err) =>
    logger.error({ queue: "attendance", err: err.message }, "worker error"),
  );

  logger.info("Job scheduler registered (daily-attendance-settle 02:00 Asia/Taipei)");
}

// Minimal liveness endpoint so Railway's shared /health check passes for the
// worker service (it has no HTTP API otherwise).
const healthServer = http.createServer((req, res) => {
  if (req.url === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "ok", role: "worker", timestamp: new Date().toISOString() }));
    return;
  }
  res.writeHead(404);
  res.end();
});

const port = Number(process.env.PORT ?? 4001);
healthServer.listen(port, () => logger.info({ port }, "worker health server listening"));

if (process.env.REDIS_URL) {
  registerSchedulers().catch((err) => {
    logger.error({ err: err.message }, "failed to register job schedulers");
    process.exit(1);
  });
  logger.info("Worker process started (attendance)");
} else {
  // Skeleton mode: no broker, so we only run the health server. This keeps the
  // worker bootable on a bare laptop without Redis.
  logger.warn("REDIS_URL not set — running health server only, schedulers disabled");
}

let shuttingDown = false;
async function shutdown(signal: string) {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.info({ signal }, "shutting down worker");
  healthServer.close();
  await Promise.allSettled([
    attendanceWorker?.close(),
    maybeRedis?.quit(),
  ]);
  process.exit(0);
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
