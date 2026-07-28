import { app } from "../src/app.js"

/**
 * Vercel serverless entry point.
 *
 * The whole Express app is exposed as a single function. This file's fixed
 * address (per Vercel's `api/<name>` convention, extension stripped) is
 * `/api/index`. vercel.json routes every incoming path to that fixed
 * address and applies a `request.path` transform that restores the true
 * original path onto `req.url` before this module's export runs — a Vercel
 * route with a static `dest` does not otherwise forward the path that was
 * actually requested. That keeps every existing Express route (/health,
 * /employees, /requests, ...) matching unprefixed, exactly as it does
 * locally when src/index.ts runs the same `app` via `app.listen()`.
 *
 * No dotenv here on purpose: unlike src/index.ts (local dev only, which
 * loads the repo-root .env), env vars in this environment are provided
 * directly by Vercel's project environment variable configuration.
 */
export default app
