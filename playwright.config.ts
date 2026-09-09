import "dotenv/config";
import { defineConfig } from "@playwright/test";

// Requires NEXT_PUBLIC_SUPABASE_URL/ANON_KEY, DATABASE_URL and a seeded fictional user
// (`npm run db:seed`) against a real Supabase project. Not run as part of `npm run test` or
// CI until a staging project's secrets are wired into the CI environment.
export default defineConfig({
  testDir: "./e2e",
  // Assertions here wait on real Supabase Auth network calls (and, on a cold server, first-hit
  // Prisma/Supabase client init) rather than local component state — the 5s default is too tight.
  expect: { timeout: 15_000 },
  webServer: {
    command: "npm run build && npm run start",
    url: "http://localhost:3000",
    timeout: 120_000,
    reuseExistingServer: !process.env.CI,
  },
  use: {
    baseURL: "http://localhost:3000",
  },
});
