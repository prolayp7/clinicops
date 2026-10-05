import { randomUUID } from "node:crypto";
import { PrismaClient, Role, Sex, StaffStatus } from "@prisma/client";
import { expect, test, type Page } from "@playwright/test";

const prisma = new PrismaClient();
const suffix = randomUUID().slice(0, 8).toUpperCase();
const patientIdLabel = `PT-E2E-${suffix}`;
const patientFirstName = "Synthetic";
const patientLastName = `Lab ${suffix}`;
const labTestName = `E2E Synthetic Test ${suffix}`;
let patientId: string | undefined;
let labTestId: string | undefined;

async function signIn(page: Page, email: string) {
  const password = process.env.E2E_SEED_PASSWORD;
  expect(password, "Set E2E_SEED_PASSWORD for fictional staging accounts").toBeTruthy();
  await page.goto("/login");
  await page.getByLabel("Work Email", { exact: true }).fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password!);
  await page.getByRole("button", { name: "Sign in securely" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
}

// Fixture data is explicitly fictional. Catalog and patient fixtures are soft-archived after use;
// the released synthetic lab order is retained for the append-only clinical history.
test.beforeAll(async () => {
  const patient = await prisma.patient.create({
    data: {
      patientId: patientIdLabel,
      firstName: patientFirstName,
      lastName: patientLastName,
      dateOfBirth: new Date("1990-06-15T00:00:00.000Z"),
      sex: Sex.UNKNOWN,
      phone: `+1-555-${suffix.slice(0, 4)}-${suffix.slice(4)}`,
      normalizedPhone: `1555${suffix}`,
      email: `e2e.lab.${suffix.toLowerCase()}@example.test`,
      normalizedEmail: `e2e.lab.${suffix.toLowerCase()}@example.test`,
      allergies: [],
      previousDiagnoses: [],
      currentMedications: [],
    },
  });
  patientId = patient.id;

  const labTest = await prisma.labTest.create({
    data: {
      name: labTestName,
      category: "E2E Synthetic",
      priceCents: 2500,
      unit: "mg/dL",
      referenceRangeText: "3.0-6.0",
    },
  });
  labTestId = labTest.id;
});

test.afterAll(async () => {
  try {
    if (patientId) {
      await prisma.patient.update({
        where: { id: patientId },
        data: { status: "ARCHIVED", archivedAt: new Date() },
      });
    }
    if (labTestId) {
      await prisma.labTest.update({
        where: { id: labTestId },
        data: { status: "ARCHIVED", archivedAt: new Date() },
      });
    }
  } finally {
    await prisma.$disconnect();
  }
});

test("admin orders a synthetic test, lab technician enters results, admin releases it", async ({ page, browser }) => {
  test.setTimeout(120_000);
  expect(patientId).toBeTruthy();
  expect(labTestId).toBeTruthy();

  await signIn(page, "admin@example.test");
  await page.goto("/laboratory/new");
  await page.getByLabel("Patient", { exact: true }).click();
  await page.getByRole("option", { name: new RegExp(patientIdLabel) }).click();
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Create Order" }).click();
  await expect(page).toHaveURL(/\/laboratory\/[0-9a-f-]{36}$/i);
  const orderUrl = page.url();
  await expect(page.getByRole("heading", { name: /LAB-/ })).toBeVisible();
  await expect(page.getByText("ORDERED", { exact: true }).first()).toBeVisible();
  await expect(page.getByText(labTestName, { exact: false }).first()).toBeVisible();

  const labContext = await browser.newContext();
  try {
    const labPage = await labContext.newPage();
    await signIn(labPage, "lab@example.test");
    await labPage.goto(orderUrl);
    await expect(labPage).toHaveURL(orderUrl);
    await expect(labPage.getByRole("heading", { name: /LAB-/ })).toBeVisible();
    await expect(labPage.getByRole("button", { name: "Mark sample collected" })).toBeVisible();
    await labPage.getByRole("button", { name: "Mark sample collected" }).click();
    await expect(labPage.getByText("SAMPLE COLLECTED", { exact: true }).first()).toBeVisible();
    await labPage.getByRole("button", { name: "Start processing" }).click();
    await expect(labPage.getByLabel("Result", { exact: true })).toBeVisible();
    await labPage.getByLabel("Result", { exact: true }).fill("5.1");
    await labPage.getByRole("button", { name: "Save Results" }).click();
    await labPage.getByRole("button", { name: "Mark completed" }).click();
    await expect(labPage.getByText("COMPLETED", { exact: true }).first()).toBeVisible();
  } finally {
    await labContext.close();
  }

  await page.goto(orderUrl);
  await page.getByRole("button", { name: "Review & release" }).click();
  await expect(page.getByText("REVIEWED", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("5.1", { exact: true })).toBeVisible();
  await expect(page.getByText(/Reviewed by/)).toBeVisible();

  await page.goto(`/laboratory?search=${encodeURIComponent(patientIdLabel)}&status=REVIEWED`);
  const releasedRow = page.getByRole("row").filter({ hasText: patientIdLabel });
  await expect(releasedRow).toBeVisible();
  await expect(releasedRow).toContainText("REVIEWED");
});
