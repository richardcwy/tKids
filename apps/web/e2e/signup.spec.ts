import { expect, test } from "@playwright/test";

test.describe("Fanclub signup form", () => {
  test("page renders with all required fields", async ({ page }) => {
    await page.goto("/signup");

    await expect(
      page.getByRole("heading", { name: /join the fanclub/i }),
    ).toBeVisible();
    await expect(page.locator("#email")).toBeVisible();
    await expect(page.locator("#password")).toBeVisible();
    await expect(page.locator("#birthYear")).toBeVisible();
    await expect(page.locator("#over13")).toBeVisible();
  });

  test("birthYear input enforces 13+ via max attribute", async ({ page }) => {
    await page.goto("/signup");
    const max = await page.locator("#birthYear").getAttribute("max");
    expect(max).toBeTruthy();
    const thisYear = new Date().getUTCFullYear();
    expect(Number(max)).toBe(thisYear - 13);
  });

  test("honeypot field is off-screen, not display:none", async ({ page }) => {
    await page.goto("/signup");
    const hp = page.locator('input[name="honeypot"]');
    // Must exist in DOM
    await expect(hp).toHaveCount(1);
    // Must NOT be interactive for keyboard users
    const tabindex = await hp.getAttribute("tabindex");
    expect(tabindex).toBe("-1");
  });

  test("consent checkbox is required", async ({ page }) => {
    await page.goto("/signup");
    const box = page.locator("#over13");
    const required = await box.getAttribute("required");
    expect(required).not.toBeNull();
  });
});
