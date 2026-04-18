import { expect, test } from "@playwright/test";

test.describe("Home page", () => {
  test("renders hero wordmark, slogan, and countdown", async ({ page }) => {
    await page.goto("/");

    // Wordmark — uses role heading (the hero wordmark is an h1).
    const hero = page.locator("h1").first();
    await expect(hero).toBeVisible();

    // Countdown units are present and show digits after 1s tick.
    const daysCell = page.locator('[data-unit="d"]');
    await expect(daysCell).toBeVisible();
    await expect(daysCell).toContainText(/^\d{2}$/, { timeout: 5_000 });

    // English slogan.
    await expect(page.getByText(/Ignite and shine/i)).toBeVisible();

    // Three member cards.
    await expect(page.locator(".member").nth(0)).toContainText("ETHAN");
    await expect(page.locator(".member").nth(1)).toContainText("ALAN");
    await expect(page.locator(".member").nth(2)).toContainText("ALBERT");
  });

  test("has OG meta tags for link previews", async ({ page }) => {
    await page.goto("/");
    const ogTitle = page.locator('meta[property="og:title"]');
    await expect(ogTitle).toHaveAttribute("content", /tKids/);
    const ogType = page.locator('meta[property="og:type"]');
    await expect(ogType).toHaveAttribute("content", "music.musician");
  });

  test("exposes JSON-LD MusicGroup structured data", async ({ page }) => {
    await page.goto("/");
    const jsonLd = await page
      .locator('script[type="application/ld+json"]')
      .textContent();
    expect(jsonLd).toBeTruthy();
    const parsed = JSON.parse(jsonLd!);
    expect(parsed["@type"]).toBe("MusicGroup");
    expect(parsed.name).toBe("tKids");
    expect(parsed.member).toHaveLength(3);
  });

  test("privacy page is reachable from the footer", async ({ page }) => {
    await page.goto("/");
    await page
      .locator("footer a", { hasText: /privacy/i })
      .first()
      .click();
    await expect(page).toHaveURL(/\/privacy/);
    await expect(page.getByRole("heading", { name: /privacy policy/i })).toBeVisible();
  });
});
