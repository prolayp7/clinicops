import { defineConfig } from "@playwright/test";

// Requires NEXT_PUBLIC_SUPABASE_URL/ANON_KEY, DATABASE_URL and a seeded fictional user to be
// set against a real Supabase project — not run as part of `npm run test` or CI until Phase 0's
// staging Supabase project is provisioned (see IMPLEMENTATION_PLAN.md blocking question).
export default defineConfig({
  testDir: "./e2e",
  webServer: {
    command: "npm run build && npm run start",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
  },
  use: {
    baseURL: "http://localhost:3000",
  },
});
