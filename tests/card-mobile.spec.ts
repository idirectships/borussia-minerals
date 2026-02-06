import { test, expect } from "@playwright/test";

/**
 * /card page — mobile viewport layout tests
 *
 * The invite page must render correctly on phone screens:
 * - Crystal image visible in the lower portion
 * - All invite text (title, date, time, location) visible
 * - Instagram CTA visible
 * - Nothing overflows the viewport
 * - Image fills meaningful width (not tiny/shrunken)
 */

test.describe("/card page mobile layout", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/card");
    // Wait for image to load
    await page.waitForLoadState("networkidle");
  });

  test("all invite text elements are visible in viewport", async ({ page }) => {
    const viewportSize = page.viewportSize()!;

    // Branding
    const branding = page.locator("text=Borussia Minerals Presents");
    await expect(branding).toBeVisible();

    // Title parts
    await expect(page.locator("h1")).toBeVisible();
    await expect(page.locator("text=Daddy Pocket")).toBeVisible();
    await expect(page.locator("text=Release")).toBeVisible();

    // Event details
    await expect(page.locator("text=February 10th")).toBeVisible();
    await expect(page.locator("text=7:00 PM")).toBeVisible();
    await expect(page.locator("text=Mineral City")).toBeVisible();

    // Instagram CTA
    const cta = page.locator('a[href*="instagram.com"]');
    await expect(cta).toBeVisible();

    // All text elements must be within the viewport (not scrolled off)
    const ctaBox = await cta.boundingBox();
    expect(ctaBox).not.toBeNull();
    expect(ctaBox!.y + ctaBox!.height).toBeLessThan(viewportSize.height);
  });

  test("crystal image is visible and fills meaningful width", async ({
    page,
  }) => {
    const viewportSize = page.viewportSize()!;
    const img = page.locator('img[alt*="Daddy Pocket"]');

    await expect(img).toBeVisible();

    const imgBox = await img.boundingBox();
    expect(imgBox).not.toBeNull();

    // Image should take up at least 60% of viewport width on mobile
    const imgWidthRatio = imgBox!.width / viewportSize.width;
    expect(imgWidthRatio).toBeGreaterThanOrEqual(0.6);

    // Image bottom edge should be near the viewport bottom (anchored)
    const imgBottom = imgBox!.y + imgBox!.height;
    expect(imgBottom).toBeGreaterThan(viewportSize.height * 0.8);

    // Image should be visible (not pushed entirely below viewport)
    expect(imgBox!.y).toBeLessThan(viewportSize.height);
  });

  test("no horizontal overflow (no sideways scroll)", async ({ page }) => {
    const scrollWidth = await page.evaluate(() => document.body.scrollWidth);
    const viewportWidth = page.viewportSize()!.width;

    // Body should not be wider than viewport
    expect(scrollWidth).toBeLessThanOrEqual(viewportWidth + 1); // 1px tolerance
  });

  test("no vertical overflow beyond 100dvh", async ({ page }) => {
    // The main container uses h-[100dvh] + overflow-hidden
    // Nothing should cause a scrollbar
    const mainEl = page.locator("main");
    const overflow = await mainEl.evaluate((el) =>
      getComputedStyle(el).overflow
    );
    expect(overflow).toBe("hidden");

    const mainBox = await mainEl.boundingBox();
    expect(mainBox).not.toBeNull();

    // Main height should match viewport
    const viewportHeight = page.viewportSize()!.height;
    expect(mainBox!.height).toBeCloseTo(viewportHeight, -1); // within 10px
  });

  test("text and image don't completely overlap (text is readable)", async ({
    page,
  }) => {
    const viewportSize = page.viewportSize()!;

    // The text container should start at the top
    const textContainer = page.locator("main > div.relative.z-10");
    const textBox = await textContainer.boundingBox();
    expect(textBox).not.toBeNull();
    expect(textBox!.y).toBeLessThan(viewportSize.height * 0.15);

    // The image should start below at least 30% of viewport
    // (if image starts too high, it covers all the text)
    const img = page.locator('img[alt*="Daddy Pocket"]');
    const imgBox = await img.boundingBox();
    expect(imgBox).not.toBeNull();
    expect(imgBox!.y).toBeGreaterThan(viewportSize.height * 0.2);
  });
});
