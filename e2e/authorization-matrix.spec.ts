import { test, expect } from "@playwright/test";

// Fictional seeded staff only. These are real authenticated route checks, not action/record tests.
const cases = [
  { email: "doctor", denied: ["/billing", "/reports", "/users", "/settings"] },
  { email: "reception", denied: ["/reports", "/users", "/settings"] },
  { email: "nurse", denied: ["/doctors", "/billing", "/reports", "/users", "/settings"] },
  { email: "lab", denied: ["/patients", "/doctors", "/appointments", "/consultations", "/prescriptions", "/billing", "/documents", "/reports", "/users", "/settings"] },
  { email: "accounts", denied: ["/patients", "/doctors", "/appointments", "/consultations", "/prescriptions", "/laboratory", "/documents", "/users", "/settings"] },
];

for (const { email, denied } of cases) {
  test(`${email} cannot bypass module permissions with direct URLs`, async ({ page }) => {
    test.setTimeout(90_000);
    expect(process.env.E2E_SEED_PASSWORD, "Set E2E_SEED_PASSWORD for the fictional staging accounts").toBeTruthy();
    await page.goto("/login");
    await page.getByLabel("Work Email", { exact: true }).fill(`${email}@example.test`);
    await page.getByLabel("Password", { exact: true }).fill(process.env.E2E_SEED_PASSWORD!);
    await page.getByRole("button", { name: "Sign in securely" }).click();
    await expect(page).toHaveURL(/\/dashboard$/);
    for (const route of denied) {
      await expect(page.locator(`nav a[href="${route}"]`)).toHaveCount(0);
      await page.goto(route);
      await expect(page).toHaveURL(/\/dashboard$/);
    }
  });
}
