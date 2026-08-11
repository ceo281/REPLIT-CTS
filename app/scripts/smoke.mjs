import { chromium } from "playwright";

const BASE = process.env.BASE || "http://localhost:4173";
const EXE = "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";

const errors = [];
const browser = await chromium.launch({ executablePath: EXE });
const page = await browser.newPage();
page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
page.on("pageerror", (e) => errors.push(String(e)));

function step(msg) {
  console.log("• " + msg);
}

try {
  await page.goto(BASE, { waitUntil: "networkidle" });

  // --- Onboarding: create the finance vault ---
  step("Onboarding renders");
  await page.getByText("Set up Ledger").waitFor({ timeout: 10000 });
  await page.locator('input[type=password]').first().fill("finance-pass-123");
  await page.locator('input[type=password]').nth(1).fill("finance-pass-123");
  await page.getByRole("button", { name: /Create workspace/i }).click();

  step("Finance dashboard loads after provisioning");
  await page.getByText("Total balance").waitFor({ timeout: 20000 });

  // --- Create an account ---
  step("Create an account");
  await page.getByRole("button", { name: /Create your first account/i }).click();
  await page.locator(".sheet input").first().fill("Cash");
  await page.locator(".sheet input").nth(1).fill("1000");
  await page.getByRole("button", { name: /Create account/i }).click();
  await page.getByText("Cash").first().waitFor();

  // --- Add a transaction ---
  step("Add a transaction");
  await page.locator(".fab").click();
  await page.getByRole("button", { name: /^Income$/ }).click();
  await page.locator('.sheet input[inputmode=decimal]').first().fill("250");
  await page.getByRole("button", { name: /Save transaction/i }).click();
  await page.getByText("Salary").first().waitFor();

  // Verify balance updated to 1,250.00
  const balance = await page.locator(".hero .value").first().innerText();
  if (!/1,?250/.test(balance)) throw new Error("Balance did not update, got: " + balance);
  step("Balance derived correctly: " + balance);

  // --- Add a private vault via Settings ---
  step("Add private vault");
  await page.locator('.tab', { hasText: "Settings" }).click();
  await page.getByRole("button", { name: /Add private workspace/i }).click();
  await page.locator(".sheet input[type=password]").first().fill("private-pass-456");
  await page.locator(".sheet input[type=password]").nth(1).fill("private-pass-456");
  await page.getByRole("button", { name: /Create private workspace/i }).click();
  await page.waitForTimeout(500);

  // --- Lock, then unlock into the PRIVATE vault ---
  step("Lock now");
  await page.getByRole("button", { name: /^Lock now$/ }).click();
  await page.getByRole("heading", { name: "Locked" }).waitFor({ timeout: 10000 });

  step("Unlock into private vault");
  await page.locator('input[type=password]').first().fill("private-pass-456");
  await page.getByRole("button", { name: /^Unlock$/ }).click();
  await page.getByText("Private", { exact: false }).first().waitFor({ timeout: 20000 });
  await page.getByText("Total recorded").waitFor({ timeout: 20000 });
  step("Private vault opened (separate key)");

  // --- Add a person and a record ---
  step("Add a person");
  await page.locator('.tab', { hasText: "People" }).click();
  await page.getByRole("button", { name: /Add your first person/i }).click();
  await page.locator(".sheet input").first().fill("Sample Client");
  await page.locator(".sheet").getByRole("button", { name: /Add person/i }).click();
  await page.getByText("Total for Sample Client").waitFor({ timeout: 10000 });

  step("Add a record");
  await page.locator(".fab").click();
  await page.locator('.sheet input[inputmode=decimal]').first().fill("40");
  await page.locator('.sheet input[inputmode=numeric]').first().fill("2");
  await page.getByRole("button", { name: /Save record/i }).click();
  await page.getByText("running").first().waitFor({ timeout: 10000 });
  step("Record saved with running total");

  // --- Verify finance passphrase opens finance, not private ---
  step("Lock and unlock into finance vault");
  await page.locator('.tab', { hasText: "Settings" }).click();
  await page.getByRole("button", { name: /^Lock now$/ }).click();
  await page.getByRole("heading", { name: "Locked" }).waitFor();
  await page.locator('input[type=password]').first().fill("finance-pass-123");
  await page.getByRole("button", { name: /^Unlock$/ }).click();
  await page.getByText("Total balance").waitFor({ timeout: 20000 });
  step("Finance passphrase routes to finance vault");

  if (errors.length) {
    console.log("\nConsole errors captured:");
    errors.forEach((e) => console.log("  ! " + e));
    // Non-fatal unless they broke a step; report and exit non-zero to surface.
    throw new Error(errors.length + " console error(s)");
  }
  console.log("\n✅ SMOKE TEST PASSED");
  await browser.close();
  process.exit(0);
} catch (e) {
  console.error("\n❌ SMOKE TEST FAILED:", e.message);
  await page.screenshot({ path: "scripts/smoke-fail.png" }).catch(() => {});
  await browser.close();
  process.exit(1);
}
