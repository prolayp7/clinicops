import { test, expect } from "@playwright/test";

// Fictional seeded staff only. These are real authenticated route checks, not action/record tests.
const cases = [
  { email: "super.admin", allowed: ["/users", "/settings", "/doctors", "/patients", "/appointments"], denied: [], patientCreateRedirect: "/patients/new", appointmentCreateRedirect: "/appointments/new" },
  { email: "admin", allowed: ["/users", "/settings", "/doctors", "/patients", "/appointments"], denied: [], patientCreateRedirect: "/patients/new", appointmentCreateRedirect: "/appointments/new" },
  { email: "doctor", allowed: ["/doctors", "/patients", "/appointments"], denied: ["/billing", "/reports", "/users", "/settings"], patientCreateRedirect: "/patients", appointmentCreateRedirect: "/appointments" },
  { email: "reception", allowed: ["/doctors", "/patients", "/appointments"], denied: ["/reports", "/users", "/settings"], patientCreateRedirect: "/patients/new", appointmentCreateRedirect: "/appointments/new" },
  { email: "nurse", allowed: ["/patients", "/appointments"], denied: ["/doctors", "/billing", "/reports", "/users", "/settings"], patientCreateRedirect: "/patients", appointmentCreateRedirect: "/appointments" },
  { email: "lab", denied: ["/patients", "/doctors", "/appointments", "/consultations", "/prescriptions", "/billing", "/documents", "/reports", "/users", "/settings"], patientCreateRedirect: "/dashboard", appointmentCreateRedirect: "/dashboard" },
  { email: "accounts", allowed: ["/reports"], denied: ["/patients", "/doctors", "/appointments", "/consultations", "/prescriptions", "/laboratory", "/documents", "/users", "/settings"], patientCreateRedirect: "/dashboard", appointmentCreateRedirect: "/dashboard" },
];

for (const { email, allowed = [], denied, patientCreateRedirect, appointmentCreateRedirect } of cases) {
  test(`${email} cannot bypass module permissions with direct URLs`, async ({ page }) => {
    test.setTimeout(90_000);
    expect(process.env.E2E_SEED_PASSWORD, "Set E2E_SEED_PASSWORD for the fictional staging accounts").toBeTruthy();
    await page.goto("/login");
    await page.getByLabel("Work Email", { exact: true }).fill(`${email}@example.test`);
    await page.getByLabel("Password", { exact: true }).fill(process.env.E2E_SEED_PASSWORD!);
    await page.getByRole("button", { name: "Sign in securely" }).click();
    await expect(page).toHaveURL(/\/dashboard$/);
    for (const route of allowed) {
      await expect(page.locator(`nav a[href="${route}"]`)).toBeVisible();
      await page.goto(route);
      await expect(page).toHaveURL(new RegExp(`${route}$`));
      if (route === "/doctors") {
        await expect(page.getByRole("heading", { name: "Doctors & Clinical Staff Directory" })).toBeVisible();
      }
      if (route === "/patients") {
        await expect(page.getByRole("heading", { name: "Patients" })).toBeVisible();
      }
      if (route === "/appointments") {
        await expect(page.getByRole("heading", { name: "Appointments" })).toBeVisible();
      }
      if (route === "/users") {
        await page.goto("/users?tab=activity");
        await expect(page.getByRole("columnheader", { name: "Action" })).toBeVisible();
        await page.goto("/users");
        await page.getByText("Edit profile").first().click();
        await expect(page.getByLabel("Full name").first()).toBeVisible();
      }
    }
    for (const route of denied) {
      await expect(page.locator(`nav a[href="${route}"]`)).toHaveCount(0);
      await page.goto(route);
      await expect(page).toHaveURL(/\/dashboard$/);
    }
    await page.goto("/patients/new");
    await expect(page).toHaveURL(new RegExp(`${patientCreateRedirect}$`));
    if (patientCreateRedirect === "/patients/new") {
      await expect(page.getByRole("heading", { name: "Register Patient" })).toBeVisible();
    }
    await page.goto("/appointments/new");
    await expect(page).toHaveURL(new RegExp(`${appointmentCreateRedirect}$`));
  });
}
