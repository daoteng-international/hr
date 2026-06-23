import express, { type Request, type Response, type NextFunction } from "express"
import cors from "cors"
import { logger } from "./lib/logger.js"
import { adminTenantsRouter } from "./routes/admin-tenants.js"
import { tenantRouter } from "./routes/tenant.js"
import { employeesRouter } from "./routes/employees.js"

const WEB_ORIGINS = (process.env.WEB_ORIGINS ?? "http://localhost:3000")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean)

export const app = express()

// CORS — restrict to the configured web origins.
app.use(
  cors({
    origin: WEB_ORIGINS,
    credentials: true,
  }),
)

app.use(express.json())

app.get("/health", (_req: Request, res: Response) => {
  res.status(200).json({ status: "ok" })
})

// Feature routes.
app.use(adminTenantsRouter)
app.use(tenantRouter)
app.use(employeesRouter)

// 404 fallback.
app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: "not_found" })
})

// Centralised error handler — must be last and have 4 args for Express to
// recognise it as an error handler.
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  logger.error({ err }, "unhandled error")
  res.status(500).json({ error: "internal_server_error" })
})
