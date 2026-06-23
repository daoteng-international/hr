import { fileURLToPath } from "node:url"
import { dirname, resolve } from "node:path"
import { defineConfig } from "vitest/config"

const __dirname = dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  test: {
    // Load the repo-root .env before any test module is imported, so eagerly
    // constructed Supabase clients (lib/supabase.ts) get real credentials.
    setupFiles: [resolve(__dirname, "src/__tests__/setup.ts")],
  },
})
