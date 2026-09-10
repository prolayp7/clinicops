import { test, expect } from "@playwright/test";

test("unauthenticated visitor is redirected from the dashboard to login", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login/);
});

test("authenticated staff user reaches the dashboard and sees role-appropriate nav", async ({
  page,
}) => {
  // Requires a seeded fictional Supabase Auth user matching prisma/seed.ts.
  await page.goto("/login");
  await page.getByLabel("Work Email", { exact: true }).fill("doctor@example.test");
  await page.getByLabel("Password", { exact: true }).fill(process.env.E2E_SEED_PASSWORD ?? "");
  await page.getByRole("button", { name: "Sign in securely" }).click();
  await expect(page).toHaveURL(/\/dashboard/);
  await expect(page.getByRole("link", { name: "Dashboard" })).toBeVisible();
});
