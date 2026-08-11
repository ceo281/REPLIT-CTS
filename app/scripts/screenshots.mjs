import { chromium } from "playwright";

const BASE = process.env.BASE || "http://localhost:4173";
const EXE = "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const OUT = "scripts/shots";

const browser = await chromium.launch({ executablePath: EXE });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
const page = await ctx.newPage();
const shot = (name) => page.screenshot({ path: `${OUT}/${name}.png` });

async function fillSheet(sel, val, idx = 0) {
  await page.locator(`.sheet ${sel}`).nth(idx).fill(val);
}

await page.goto(BASE, { waitUntil: "networkidle" });

// Onboarding
await page.getByText("Set up Ledger").waitFor();
await shot("01-onboarding");
await page.locator("input[type=password]").first().fill("finance-pass-123");
await page.locator("input[type=password]").nth(1).fill("finance-pass-123");
await page.getByRole("button", { name: /Create workspace/i }).click();
await page.getByText("Total balance").waitFor({ timeout: 20000 });

// Account
await page.getByRole("button", { name: /Create your first account/i }).click();
await fillSheet("input", "Everyday", 0);
await fillSheet("input", "3200", 1);
await page.getByRole("button", { name: /Create account/i }).click();
await page.getByText("Everyday").first().waitFor();

// A few transactions
const txns = [
  ["Income", "2400", "Salary"],
  ["Expense", "68", "Groceries"],
  ["Expense", "1450", "Rent"],
  ["Sale", "320", "Goods"],
  ["Expense", "42", "Transport"],
];
for (const [kind, amt] of txns) {
  await page.locator(".fab").click();
  await page.locator(".sheet").getByRole("button", { name: new RegExp(`^${kind}$`) }).click();
  await page.locator(".sheet input[inputmode=decimal]").first().fill(amt);
  if (kind === "Sale") await page.locator(".sheet input[inputmode=numeric]").first().fill("4");
  await page.getByRole("button", { name: /Save transaction/i }).click();
  await page.waitForTimeout(200);
}
await page.waitForTimeout(400);
await shot("02-finance-dashboard");

// Reports
await page.locator(".tab", { hasText: "Reports" }).click();
await page.getByText("Cashflow (6 months)").waitFor();
await page.waitForTimeout(600);
await shot("03-finance-reports");

// Budgets
await page.locator(".tab", { hasText: "Budgets" }).click();
await page.getByRole("button", { name: /Create a budget/i }).click();
await fillSheet("input", "Groceries", 0);
await fillSheet("input", "400", 1);
await page.getByRole("button", { name: /Save budget/i }).click();
await page.waitForTimeout(400);
await shot("04-finance-budgets");

// Add private vault, switch to it
await page.locator(".tab", { hasText: "Settings" }).click();
await page.getByRole("button", { name: /Add private workspace/i }).click();
await page.locator(".sheet input[type=password]").first().fill("private-pass-456");
await page.locator(".sheet input[type=password]").nth(1).fill("private-pass-456");
await page.getByRole("button", { name: /Create private workspace/i }).click();
await page.waitForTimeout(400);
await shot("05-settings");
await page.getByRole("button", { name: /^Lock now$/ }).click();
await page.getByRole("heading", { name: "Locked" }).waitFor();
await shot("06-lock");
await page.locator("input[type=password]").first().fill("private-pass-456");
await page.getByRole("button", { name: /^Unlock$/ }).click();
await page.getByText("Total recorded").waitFor({ timeout: 20000 });

// People: add a couple people + records
await page.locator(".tab", { hasText: "People" }).click();
const people = [
  ["Northside Cafe", [["45", "3"], ["60", "4"]]],
  ["Green Grocer", [["120", "10"]]],
];
let first = true;
for (const [name, recs] of people) {
  if (first) { await page.getByRole("button", { name: /Add your first person/i }).click(); first = false; }
  else { await page.locator(".fab").click(); await page.getByText("New person").waitFor(); }
  await page.locator(".sheet input").first().fill(name);
  await page.locator(".sheet").getByRole("button", { name: /Add person/i }).click();
  await page.getByText(`Total for ${name}`).waitFor({ timeout: 10000 });
  for (const [amt, qty] of recs) {
    await page.locator(".fab").click();
    await page.locator(".sheet input[inputmode=decimal]").first().fill(amt);
    await page.locator(".sheet input[inputmode=numeric]").first().fill(qty);
    await page.getByRole("button", { name: /Save record/i }).click();
    await page.waitForTimeout(200);
  }
  await page.waitForTimeout(300);
  if (name === "Northside Cafe") await shot("08-person-detail");
  await page.getByRole("button", { name: /People/ }).first().click().catch(() => {});
  await page.locator(".tab", { hasText: "People" }).click();
}
await shot("07-people-list");

// Overview
await page.locator(".tab", { hasText: "Overview" }).click();
await page.getByText("Total recorded").waitFor();
await page.waitForTimeout(400);
await shot("09-people-overview");

// Records explorer
await page.locator(".tab", { hasText: "Records" }).click();
await page.getByText("Results").waitFor();
await page.waitForTimeout(300);
await shot("10-records-explorer");

console.log("screenshots written to " + OUT);
await browser.close();
